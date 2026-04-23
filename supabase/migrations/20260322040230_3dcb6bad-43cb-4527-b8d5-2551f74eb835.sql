
CREATE TABLE public.backup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type text NOT NULL,
  label text NOT NULL DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage backup settings"
  ON public.backup_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view backup settings"
  ON public.backup_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_backup_settings_updated_at
  BEFORE UPDATE ON public.backup_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
