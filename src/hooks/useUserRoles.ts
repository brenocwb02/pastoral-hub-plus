import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useUserRoles() {
  const [roles, setRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUserRoles() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setRoles([])
          setIsLoading(false)
          return
        }

        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching user roles:', error)
          setRoles([])
        } else {
          setRoles(userRoles.map(row => row.role))
        }
      } catch (error) {
        console.error('Error in fetchUserRoles:', error)
        setRoles([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserRoles()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRoles()
    })

    return () => subscription.unsubscribe()
  }, [])

  return { roles, isLoading }
}