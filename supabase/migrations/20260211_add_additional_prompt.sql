-- ============================================================
-- Migration: Add additional_prompt and missing columns
-- Date: 2026-02-11
-- Description: Adds additional_prompt to thumbnails table and
--              updates schema to match application requirements
-- ============================================================

-- Update avatars table: change photos to JSONB and add updated_at
DO $$
BEGIN
  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avatars' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE avatars ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Note: Converting photos from TEXT[] to JSONB requires manual data migration
  -- This should be done carefully in production with proper backup
END $$;

-- Update references table: add missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'references' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE "references" ADD COLUMN file_name TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'references' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE "references" ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'references' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE "references" ADD COLUMN mime_type TEXT NOT NULL DEFAULT 'image/jpeg';
  END IF;
END $$;

-- Update thumbnails table: add missing columns
DO $$
BEGIN
  -- Add avatar_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thumbnails' AND column_name = 'avatar_name'
  ) THEN
    ALTER TABLE thumbnails ADD COLUMN avatar_name TEXT NOT NULL DEFAULT '';
  END IF;

  -- Add text_idea if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thumbnails' AND column_name = 'text_idea'
  ) THEN
    ALTER TABLE thumbnails ADD COLUMN text_idea TEXT NOT NULL DEFAULT '';
  END IF;

  -- Add additional_prompt if it doesn't exist (US-005)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thumbnails' AND column_name = 'additional_prompt'
  ) THEN
    ALTER TABLE thumbnails ADD COLUMN additional_prompt TEXT;
  END IF;
END $$;

-- Create index on additional_prompt for potential search/filtering
CREATE INDEX IF NOT EXISTS idx_thumbnails_additional_prompt ON thumbnails(additional_prompt)
WHERE additional_prompt IS NOT NULL;

-- Update existing records (optional - only if there's existing data)
-- UPDATE thumbnails SET text_idea = prompt WHERE text_idea = '';
-- UPDATE thumbnails SET avatar_name = 'Unknown' WHERE avatar_name = '';
