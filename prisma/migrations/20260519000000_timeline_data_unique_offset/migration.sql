ALTER TABLE "TIMELINE_DATA"
  ADD CONSTRAINT "TIMELINE_DATA_meeting_id_offset_ms_key" UNIQUE ("meeting_id", "offset_ms");
