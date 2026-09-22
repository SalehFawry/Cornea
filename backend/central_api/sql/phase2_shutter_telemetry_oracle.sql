-- Phase 2 shutter telemetry (Oracle).
-- Run by DBA against the production Central Oracle before rolling edges
-- that emit confidence / model_version. Columns are nullable so older edges
-- and historical rows remain valid.
--
-- Table: cornea_shutter_table

ALTER TABLE cornea_shutter_table ADD (
  confidence     NUMBER,
  model_version  VARCHAR2(255)
);
