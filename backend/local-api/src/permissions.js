export function canReadTable(user, table, filters = []) {
  if (!user) return false;
  if (["disease_databases", "database_versions", "database_variables", "version_backups"].includes(table)) return true;
  if (table === "profiles") return user.app_role === "admin" || hasOwnFilter(filters, user.id, ["user_id", "id"]);
  if (table === "user_roles") return user.app_role === "admin" || hasOwnFilter(filters, user.id, ["user_id"]);
  if (table === "activity_log") return user.app_role === "admin" || hasOwnFilter(filters, user.id, ["user_id"]);
  if (table === "backup_settings") return user.app_role === "admin";
  return false;
}

export function canWriteTable(user, table, filters = [], values = {}) {
  if (!user) return false;
  if (["disease_databases", "database_versions", "database_variables", "version_backups"].includes(table)) return user.app_role === "admin" || user.app_role === "moderator";
  if (table === "backup_settings" || table === "user_roles") return user.app_role === "admin";
  if (table === "profiles") return user.app_role === "admin" || hasOwnFilter(filters, user.id, ["user_id", "id"]) || values.user_id === user.id;
  if (table === "activity_log") return values.user_id === user.id || user.app_role === "admin";
  return false;
}

function hasOwnFilter(filters, userId, fields) {
  return filters.some((f) => fields.includes(f.field) && String(f.value) === String(userId));
}
