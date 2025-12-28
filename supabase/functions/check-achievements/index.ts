import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Achievement {
  id: string
  name: string
  criteria: {
    type: 'meetings_attended' | 'study_completed' | 'consecutive_meetings' | 'points_earned'
    threshold: number
  }
  points: number
}

// Validate UUID format to prevent injection
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('userId is required')
    }

    // Validate userId is a proper UUID to prevent SQL injection
    if (!isValidUUID(userId)) {
      throw new Error('Invalid userId format')
    }

    // Get all achievements
    const { data: achievements, error: achievementsError } = await supabaseClient
      .from('conquistas')
      .select('*')

    if (achievementsError) throw achievementsError

    // Get user's current achievements
    const { data: userAchievements, error: userAchievementsError } = await supabaseClient
      .from('conquistas_usuario')
      .select('conquista_id')
      .eq('user_id', userId)

    if (userAchievementsError) throw userAchievementsError

    // Get member IDs associated with this user (safe query)
    const { data: userMembros } = await supabaseClient
      .from('membros')
      .select('id')
      .eq('user_id', userId)

    const membroIds = userMembros?.map(m => m.id) || []

    const earnedIds = new Set(userAchievements?.map(ua => ua.conquista_id) || [])
    const newAchievements: string[] = []

    for (const achievement of achievements as Achievement[]) {
      if (earnedIds.has(achievement.id)) continue

      const criteria = achievement.criteria
      let earned = false
      let progress = 0

      switch (criteria.type) {
        case 'meetings_attended': {
          // Count 1-on-1 meetings as discipulador
          const { count: asDiscipulador } = await supabaseClient
            .from('encontros_1a1')
            .select('*', { count: 'exact', head: true })
            .eq('discipulador_id', userId)

          // Count 1-on-1 meetings as discipulo (using member IDs)
          let asDiscipulo = 0
          if (membroIds.length > 0) {
            const { count } = await supabaseClient
              .from('encontros_1a1')
              .select('*', { count: 'exact', head: true })
              .in('discipulo_membro_id', membroIds)
            asDiscipulo = count || 0
          }

          const meetingsCount = (asDiscipulador || 0) + asDiscipulo
          progress = Math.min(100, Math.round((meetingsCount / criteria.threshold) * 100))
          earned = meetingsCount >= criteria.threshold
          break
        }

        case 'study_completed': {
          // Count completed studies using member IDs
          let studiesCount = 0
          if (membroIds.length > 0) {
            const { count } = await supabaseClient
              .from('progresso')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'completed')
              .in('membro_id', membroIds)
            studiesCount = count || 0
          }

          progress = Math.min(100, Math.round((studiesCount / criteria.threshold) * 100))
          earned = studiesCount >= criteria.threshold
          break
        }

        case 'consecutive_meetings': {
          // Count meetings as discipulador
          const { data: discipuladorMeetings } = await supabaseClient
            .from('encontros_1a1')
            .select('scheduled_at')
            .eq('discipulador_id', userId)
            .order('scheduled_at', { ascending: false })
            .limit(criteria.threshold)

          // Count meetings as discipulo
          let discipuloMeetings: { scheduled_at: string }[] = []
          if (membroIds.length > 0) {
            const { data } = await supabaseClient
              .from('encontros_1a1')
              .select('scheduled_at')
              .in('discipulo_membro_id', membroIds)
              .order('scheduled_at', { ascending: false })
              .limit(criteria.threshold)
            discipuloMeetings = data || []
          }

          // Combine and sort all meetings
          const allMeetings = [
            ...(discipuladorMeetings || []),
            ...discipuloMeetings
          ].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

          const consecutiveCount = Math.min(allMeetings.length, criteria.threshold)
          progress = Math.min(100, Math.round((consecutiveCount / criteria.threshold) * 100))
          earned = consecutiveCount >= criteria.threshold
          break
        }

        case 'points_earned': {
          // Check total points (already safe - uses .eq())
          const { data: userPoints } = await supabaseClient
            .from('pontos_usuario')
            .select('total_points')
            .eq('user_id', userId)
            .single()

          const points = userPoints?.total_points || 0
          progress = Math.min(100, Math.round((points / criteria.threshold) * 100))
          earned = points >= criteria.threshold
          break
        }
      }

      // Update progress
      if (progress > 0) {
        await supabaseClient
          .from('conquistas_usuario')
          .upsert({
            user_id: userId,
            conquista_id: achievement.id,
            progress: earned ? 100 : progress,
            earned_at: earned ? new Date().toISOString() : undefined
          })
      }

      // Award achievement if earned
      if (earned) {
        newAchievements.push(achievement.name)
        
        // Add points to user
        const { data: currentPoints } = await supabaseClient
          .from('pontos_usuario')
          .select('total_points, level')
          .eq('user_id', userId)
          .single()

        const newTotalPoints = (currentPoints?.total_points || 0) + achievement.points
        const newLevel = Math.floor(newTotalPoints / 100) + 1

        await supabaseClient
          .from('pontos_usuario')
          .upsert({
            user_id: userId,
            total_points: newTotalPoints,
            level: newLevel
          })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newAchievements,
        message: newAchievements.length > 0 
          ? `Parabéns! Você desbloqueou: ${newAchievements.join(', ')}`
          : 'Nenhuma nova conquista desbloqueada'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
