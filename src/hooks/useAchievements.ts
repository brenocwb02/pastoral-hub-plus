import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAchievements = () => {
  useEffect(() => {
    const checkAchievements = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const response = await fetch(
          `https://yzeekoxgykzjzjprrmnl.supabase.co/functions/v1/check-achievements`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ userId: user.id }),
          }
        );

        const data = await response.json();
        
        if (data.newAchievements && data.newAchievements.length > 0) {
          toast.success(data.message, {
            duration: 5000,
            icon: "🏆",
          });
        }
      } catch (error) {
        console.error("Error checking achievements:", error);
      }
    };

    // Check achievements on mount and every 5 minutes
    checkAchievements();
    const interval = setInterval(checkAchievements, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
