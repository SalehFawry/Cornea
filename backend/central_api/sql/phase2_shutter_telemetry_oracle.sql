-- Phase 2 shutter telemetry (Oracle).
--
-- DEPLOY ORDER (do not skip):
--   1. Run this ALTER on production Oracle (DBA).
--   2. Deploy Central API that includes confidence / model_version
--      (SalehFawry/Cornea PR #1 / feat/phase2-shutter-telemetry).
--   3. Deploy edges on Fawry_Tracking_System production that emit the fields
--      (merged PR #371). Until (1)+(2), Central with the old schema ignores
--      unknown JSON keys; after (2) without (1), inserts that set the new
--      columns will fail.
--
-- Columns are nullable so older edges and historical rows remain valid.
-- Table: cornea_shutter_table

ALTER TABLE cornea_shutter_table ADD (
  confidence     NUMBER,
  model_version  VARCHAR2(255)
);
