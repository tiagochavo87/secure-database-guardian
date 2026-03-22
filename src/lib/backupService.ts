import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "./activityLog";

/**
 * Creates an automatic backup of all existing versions for a database
 * Called when a new version is loaded/created
 */
export async function createVersionBackup(
  databaseId: string,
  reason: string = "auto"
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get all existing versions for this database
  const { data: versions, error } = await supabase
    .from("database_versions")
    .select("*")
    .eq("database_id", databaseId);

  if (error || !versions || versions.length === 0) return;

  // Check if backup already exists for each version
  for (const version of versions) {
    const { data: existingBackup } = await supabase
      .from("version_backups")
      .select("id")
      .eq("version_id", version.id)
      .eq("backup_reason", reason)
      .limit(1);

    // Only create backup if one doesn't already exist for this version+reason
    if (!existingBackup || existingBackup.length === 0) {
      await supabase.from("version_backups").insert({
        database_id: databaseId,
        version_id: version.id,
        version_name: version.name,
        version_number: version.version_number,
        row_count: version.row_count,
        data: version.data,
        backup_reason: reason,
        created_by: user.id,
      });
    }
  }

  await logActivity("backup_created", "backup", databaseId, {
    reason,
    versions_backed_up: versions.length,
  });
}

/**
 * Creates a backup for a specific version
 */
export async function createSingleVersionBackup(
  version: {
    id: string;
    database_id: string;
    name: string;
    version_number: string;
    row_count: number;
    data: unknown;
  },
  reason: string = "pre_update"
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("version_backups").insert({
    database_id: version.database_id,
    version_id: version.id,
    version_name: version.name,
    version_number: version.version_number,
    row_count: version.row_count,
    data: version.data,
    backup_reason: reason,
    created_by: user.id,
  });

  if (!error) {
    await logActivity("backup_created", "backup", version.id, {
      reason,
      version_name: version.name,
    });
  }
}

/**
 * Restores a version from backup
 */
export async function restoreFromBackup(backupId: string) {
  const { data: backup, error: fetchError } = await supabase
    .from("version_backups")
    .select("*")
    .eq("id", backupId)
    .single();

  if (fetchError || !backup) return { error: fetchError };

  const { error } = await supabase
    .from("database_versions")
    .update({
      name: backup.version_name + " (restaurado)",
      data: backup.data,
      row_count: backup.row_count,
    })
    .eq("id", backup.version_id);

  if (!error) {
    await logActivity("backup_restored", "backup", backupId, {
      version_name: backup.version_name,
    });
  }

  return { error };
}
