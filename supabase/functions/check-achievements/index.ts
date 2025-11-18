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

    const earnedIds = new Set(userAchievements?.map(ua => ua.conquista_id) || [])
    const newAchievements: string[] = []

    for (const achievement of achievements as Achievement[]) {
      if (earnedIds.has(achievement.id)) continue

      const criteria = achievement.criteria
      let earned = false
      let progress = 0

      switch (criteria.type) {
        case 'meetings_attended': {
          // Count 1-on-1 meetings attended
          const { count: meetingsCount } = await supabaseClient
            .from('encontros_1a1')
            .select('*', { count: 'exact', head: true })
            .or(`discipulador_id.eq.${userId},discipulo_membro_id.in.(select id from membros where user_id = '${userId}')`)

          progress = Math.min(100, Math.round(((meetingsCount || 0) / criteria.threshold) * 100))
          earned = (meetingsCount || 0) >= criteria.threshold
          break
        }

        case 'study_completed': {
          // Count completed studies
          const { count: studiesCount } = await supabaseClient
            .from('progresso')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .in('membro_id', supabaseClient
              .from('membros')
              .select('id')
              .eq('user_id', userId)
            )

          progress = Math.min(100, Math.round(((studiesCount || 0) / criteria.threshold) * 100))
          earned = (studiesCount || 0) >= criteria.threshold
          break
        }

        case 'consecutive_meetings': {
          // Check for consecutive meeting attendance (simplified)
          const { data: recentMeetings } = await supabaseClient
            .from('encontros_1a1')
            .select('scheduled_at')
            .or(`discipulador_id.eq.${userId},discipulo_membro_id.in.(select id from membros where user_id = '${userId}')`)
            .order('scheduled_at', { ascending: false })
            .limit(criteria.threshold)

          const consecutiveCount = recentMeetings?.length || 0
          progress = Math.min(100, Math.round((consecutiveCount / criteria.threshold) * 100))
          earned = consecutiveCount >= criteria.threshold
          break
        }

        case 'points_earned': {
          // Check total points
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
