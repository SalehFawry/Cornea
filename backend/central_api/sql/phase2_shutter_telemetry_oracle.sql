-- Phase 2 shutter telemetry (Oracle).
--
-- DEPLOY ORDER (do not skip):
--   1. Run this ALTER on production Oracle (DBA) — already applied on fawry.
--   2. Deploy Central API that maps confidence / model_version as VARCHAR2(100)
--      with a stringify+truncate validator (edges send confidence as JSON number).
--   3. Edges on Fawry_Tracking_System production emit the fields (PR #371).
--
-- Columns are nullable so older edges and historical rows remain valid.
-- Do NOT use NUMBER for confidence: production columns are VARCHAR2(100) so the
-- edge's formatting is preserved and float→text coercion happens in the API.
-- Table: cornea_shutter_table

ALTER TABLE cornea_shutter_table ADD (
  confidence     VARCHAR2(100),
  model_version  VARCHAR2(100)
);
