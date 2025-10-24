import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AudioAnalysis {
  id: string;
  user_id?: string;
  file_name: string;
  file_size: number;
  duration: number;
  sample_rate: number;
  is_synthetic: boolean;
  confidence_score: number;
  features: {
    mfcc?: number[];
    pitch?: number[];
    formants?: number[];
    spectral_centroid?: number;
    zero_crossing_rate?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface DetectionModel {
  id: string;
  name: string;
  version: string;
  description: string;
  accuracy: number;
  is_active: boolean;
  created_at: string;
}
