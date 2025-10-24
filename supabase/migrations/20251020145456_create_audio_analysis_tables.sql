/*
  # Voice Analysis & Detection System Database Schema

  1. New Tables
    - `audio_analyses`
      - `id` (uuid, primary key) - Unique identifier for each analysis
      - `user_id` (uuid, nullable) - Reference to user who uploaded (for future auth)
      - `file_name` (text) - Original audio file name
      - `file_size` (integer) - File size in bytes
      - `duration` (numeric) - Audio duration in seconds
      - `sample_rate` (integer) - Audio sample rate in Hz
      - `is_synthetic` (boolean) - Detection result: true if synthetic/cloned
      - `confidence_score` (numeric) - Detection confidence (0-1)
      - `features` (jsonb) - Extracted features (MFCC, pitch, formants, etc.)
      - `created_at` (timestamptz) - Analysis timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `detection_models`
      - `id` (uuid, primary key) - Model identifier
      - `name` (text) - Model name
      - `version` (text) - Model version
      - `description` (text) - Model description
      - `accuracy` (numeric) - Model accuracy metric
      - `is_active` (boolean) - Whether model is currently in use
      - `created_at` (timestamptz) - Model creation timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access (research/demo purpose)
    - Add policies for authenticated write access (for future auth integration)

  3. Indexes
    - Index on created_at for efficient time-based queries
    - Index on is_synthetic for filtering detection results
*/

CREATE TABLE IF NOT EXISTS audio_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  duration numeric NOT NULL,
  sample_rate integer NOT NULL,
  is_synthetic boolean DEFAULT false,
  confidence_score numeric DEFAULT 0.0,
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS detection_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  description text,
  accuracy numeric DEFAULT 0.0,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_analyses_created_at ON audio_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_analyses_is_synthetic ON audio_analyses(is_synthetic);
CREATE INDEX IF NOT EXISTS idx_detection_models_is_active ON detection_models(is_active);

-- Enable Row Level Security
ALTER TABLE audio_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE detection_models ENABLE ROW LEVEL SECURITY;

-- Policies for audio_analyses
CREATE POLICY "Public can view all analyses"
  ON audio_analyses FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert analyses"
  ON audio_analyses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own analyses"
  ON audio_analyses FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can delete own analyses"
  ON audio_analyses FOR DELETE
  USING (user_id IS NULL OR user_id = auth.uid());

-- Policies for detection_models
CREATE POLICY "Public can view models"
  ON detection_models FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage models"
  ON detection_models FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default detection models
INSERT INTO detection_models (name, version, description, accuracy, is_active)
VALUES 
  ('DeepFake Audio Detector', 'v1.0', 'CNN-based model for detecting synthetic speech', 0.94, true),
  ('Voice Clone Classifier', 'v2.1', 'Transformer model for identifying cloned voices', 0.91, false),
  ('Spectrogram Analysis Model', 'v1.5', 'Traditional ML approach using spectrogram features', 0.87, false)
ON CONFLICT DO NOTHING;