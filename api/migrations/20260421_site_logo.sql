ALTER TABLE site_settings
  ADD COLUMN logo_url VARCHAR(255) DEFAULT NULL AFTER site_title;

UPDATE site_settings
SET logo_url = '/assets/parakot-logo.webp'
WHERE id = 1 AND (logo_url IS NULL OR logo_url = '');
