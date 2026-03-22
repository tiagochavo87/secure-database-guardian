import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const userName = user.user_metadata?.full_name || user.email || "";

  await supabase.from("activity_log").insert({
    user_id: user.id,
    user_name: userName,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details: details || {},
  } as any);
}
