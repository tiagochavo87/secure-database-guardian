import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface BackupSetting {
  id: string;
  setting_type: string;
  label: string;
  config: Record<string, string>;
  enabled: boolean;
}

interface VersionData {
  id: string;
  name: string;
  version_number: string;
  database_id: string;
  row_count: number;
  data: unknown;
}

export async function downloadVersionAsFile(version: VersionData, format: "json" | "xlsx" = "json") {
  const data = version.data as any[];
  const filename = `backup_${version.name.replace(/\s/g, "_")}_${version.version_number}`;

  if (format === "xlsx" && data && Array.isArray(data)) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } else {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function sendBackupToDestinations(version: VersionData) {
  const { data: settings } = await supabase
    .from("backup_settings")
    .select("*")
    .eq("enabled", true);

  if (!settings || settings.length === 0) return;

  const results: { label: string; success: boolean; error?: string }[] = [];

  for (const setting of settings as unknown as BackupSetting[]) {
    try {
      switch (setting.setting_type) {
        case "external_server":
          await sendToExternalServer(version, setting.config);
          results.push({ label: setting.label, success: true });
          break;
        case "university_server":
          await sendToUniversityServer(version, setting.config);
          results.push({ label: setting.label, success: true });
          break;
        case "cloud_storage":
          // Cloud storage is handled by the version_backups table already
          results.push({ label: setting.label, success: true });
          break;
        case "manual_download":
        case "google_drive":
          // These are handled on-demand, not automatically
          break;
      }
    } catch (err: any) {
      results.push({ label: setting.label, success: false, error: err.message });
    }
  }

  return results;
}

async function sendToExternalServer(version: VersionData, config: Record<string, string>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.auth_token) headers["Authorization"] = `Bearer ${config.auth_token}`;

  const resp = await fetch(config.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      version_name: version.name,
      version_number: version.version_number,
      row_count: version.row_count,
      data: version.data,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

async function sendToUniversityServer(version: VersionData, config: Record<string, string>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (config.username && config.password) {
    headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
  }

  const url = config.remote_path
    ? `${config.server_url}${config.remote_path}`
    : config.server_url;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      version_name: version.name,
      version_number: version.version_number,
      row_count: version.row_count,
      data: version.data,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}
