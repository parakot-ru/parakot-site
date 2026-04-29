ALTER TABLE sections
  ADD COLUMN meta_json TEXT DEFAULT NULL AFTER image_path;
