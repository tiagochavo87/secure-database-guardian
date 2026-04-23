export const TABLES = {
  users: ["id", "email", "password_hash", "created_at"],
  profiles: ["id", "user_id", "full_name", "role", "laboratory", "avatar_url", "approved", "institution", "program", "advisor", "created_at", "updated_at"],
  user_roles: ["id", "user_id", "role"],
  disease_databases: ["id", "created_at", "created_by", "description", "disease", "name", "updated_at"],
  database_versions: ["id", "created_at", "created_by", "data", "database_id", "name", "row_count", "version_number"],
  database_variables: ["id", "category", "created_at", "database_id", "description", "name", "sort_order", "variable_type"],
  version_backups: ["id", "backup_reason", "created_at", "created_by", "data", "database_id", "row_count", "version_id", "version_name", "version_number"],
  backup_settings: ["id", "config", "created_at", "created_by", "enabled", "label", "setting_type", "updated_at"],
  activity_log: ["id", "action", "created_at", "details", "entity_id", "entity_type", "user_id", "user_name"],
  password_reset_tokens: ["id", "user_id", "token", "expires_at", "used_at", "created_at"],
};

export const JSON_COLUMNS = {
  database_versions: ["data"],
  version_backups: ["data"],
  backup_settings: ["config"],
  activity_log: ["details"],
};

export async function ensureSchema(client) {
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name text NOT NULL DEFAULT '',
      role text NOT NULL DEFAULT '',
      laboratory text NOT NULL DEFAULT 'LAPOGE',
      avatar_url text,
      approved boolean NOT NULL DEFAULT false,
      institution text NOT NULL DEFAULT '',
      program text NOT NULL DEFAULT '',
      advisor text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('admin','moderator','user')) DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS disease_databases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      description text,
      disease text NOT NULL,
      name text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS database_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      data jsonb,
      database_id uuid NOT NULL REFERENCES disease_databases(id) ON DELETE CASCADE,
      name text NOT NULL,
      row_count integer NOT NULL DEFAULT 0,
      version_number text NOT NULL DEFAULT '1'
    );

    CREATE TABLE IF NOT EXISTS database_variables (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      category text NOT NULL DEFAULT 'Geral',
      created_at timestamptz NOT NULL DEFAULT now(),
      database_id uuid NOT NULL REFERENCES disease_databases(id) ON DELETE CASCADE,
      description text,
      name text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      variable_type text NOT NULL DEFAULT 'text'
    );

    CREATE TABLE IF NOT EXISTS version_backups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      backup_reason text NOT NULL DEFAULT 'manual',
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      data jsonb,
      database_id uuid NOT NULL REFERENCES disease_databases(id) ON DELETE CASCADE,
      row_count integer NOT NULL DEFAULT 0,
      version_id uuid NOT NULL REFERENCES database_versions(id) ON DELETE CASCADE,
      version_name text NOT NULL,
      version_number text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backup_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      config jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      enabled boolean NOT NULL DEFAULT true,
      label text NOT NULL DEFAULT '',
      setting_type text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      action text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      details jsonb,
      entity_id text,
      entity_type text NOT NULL DEFAULT '',
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_name text NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token text UNIQUE NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}
