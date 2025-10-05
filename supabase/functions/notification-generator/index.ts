import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔔 Starting notification generation...')

    // Get upcoming 1-on-1 meetings (within next 24 hours)
    const tomorrow = new Date()
    tomorrow.setHours(tomorrow.getHours() + 24)
    
    const { data: upcomingMeetings, error: meetingsError } = await supabase
      .from('encontros_1a1')
      .select('id, discipulador_id, scheduled_at')
      .gte('scheduled_at', new Date().toISOString())
      .lte('scheduled_at', tomorrow.toISOString())

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError)
      throw meetingsError
    }

    console.log(`📅 Found ${upcomingMeetings?.length || 0} upcoming meetings`)

    // Create notifications for upcoming meetings
    const meetingNotifications = (upcomingMeetings || []).map(meeting => ({
      user_id: meeting.discipulador_id,
      event_type: '1a1_reminder',
      related_id: meeting.id,
      remind_at: new Date(new Date(meeting.scheduled_at).getTime() - 60 * 60 * 1000).toISOString(), // 1 hour before
      channel: 'none',
      status: 'pending'
    }))

    if (meetingNotifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .upsert(meetingNotifications, { 
          onConflict: 'user_id,related_id,event_type',
          ignoreDuplicates: true 
        })

      if (insertError) {
        console.error('Error inserting meeting notifications:', insertError)
      } else {
        console.log(`✅ Created ${meetingNotifications.length} meeting notifications`)
      }
    }

    // Check for inactive members (no 1-on-1 in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: allMembers, error: membersError } = await supabase
      .from('membros')
      .select('id, discipulador_id')
      .not('discipulador_id', 'is', null)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      throw membersError
    }

    console.log(`👥 Checking ${allMembers?.length || 0} members for inactivity`)

    const inactiveNotifications = []

    for (const member of allMembers || []) {
      const { data: recentMeetings } = await supabase
        .from('encontros_1a1')
        .select('id')
        .eq('discipulo_membro_id', member.id)
        .gte('scheduled_at', thirtyDaysAgo.toISOString())
        .limit(1)

      if (!recentMeetings || recentMeetings.length === 0) {
        inactiveNotifications.push({
          user_id: member.discipulador_id,
          event_type: 'inactive_member',
          related_id: member.id,
          remind_at: new Date().toISOString(),
          channel: 'none',
          status: 'pending'
        })
      }
    }

    if (inactiveNotifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .upsert(inactiveNotifications, { 
          onConflict: 'user_id,related_id,event_type',
          ignoreDuplicates: true 
        })

      if (insertError) {
        console.error('Error inserting inactive notifications:', insertError)
      } else {
        console.log(`⚠️ Created ${inactiveNotifications.length} inactive member notifications`)
      }
    }

    console.log('✅ Notification generation completed')

    return new Response(
      JSON.stringify({
        success: true,
        meetingNotifications: meetingNotifications.length,
        inactiveNotifications: inactiveNotifications.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
