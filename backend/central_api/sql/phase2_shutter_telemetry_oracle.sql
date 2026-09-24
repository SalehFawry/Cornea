-- Phase 2 shutter telemetry (Oracle).
--
-- DEPLOY ORDER (do not skip):
--   1. Run this ALTER on production Oracle (DBA) — already applied on fawry.
--   2. Deploy Central API that maps confidence / model_version as VARCHAR2(100)
--      with a before-validator that stringifies JSON floats (see schemas/shutter.py).
--   3. Edges on Fawry_Tracking_System production emit the fields (PR #371).
--
-- IMPORTANT: production columns are VARCHAR2(100), not NUMBER. CVPC sends
-- ``confidence`` as a JSON number; Central stores the node's own text form.
-- Columns are nullable so older edges and historical rows remain valid.
-- Table: cornea_shutter_table

ALTER TABLE cornea_shutter_table ADD (
  confidence     VARCHAR2(100),
  model_version  VARCHAR2(100)
);
