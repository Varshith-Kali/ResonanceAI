import { v4 as uuidv4 } from 'uuid';

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

const STORAGE_KEYS = {
  AUDIO_ANALYSES: 'resonance_audio_analyses',
  DETECTION_MODELS: 'resonance_detection_models'
};

// Initialize default detection models if not present
const initializeDefaultModels = (): void => {
  const existingModels = localStorage.getItem(STORAGE_KEYS.DETECTION_MODELS);
  
  if (!existingModels) {
    const defaultModels: DetectionModel[] = [
      {
        id: uuidv4(),
        name: 'DeepFake Audio Detector',
        version: 'v1.0',
        description: 'CNN-based model for detecting synthetic speech',
        accuracy: 0.94,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        name: 'Voice Clone Classifier',
        version: 'v2.1',
        description: 'Transformer model for identifying cloned voices',
        accuracy: 0.91,
        is_active: false,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        name: 'Spectrogram Analysis Model',
        version: 'v1.5',
        description: 'Traditional ML approach using spectrogram features',
        accuracy: 0.87,
        is_active: false,
        created_at: new Date().toISOString()
      }
    ];
    
    localStorage.setItem(STORAGE_KEYS.DETECTION_MODELS, JSON.stringify(defaultModels));
  }
};

// Initialize storage
export const initializeStorage = (): void => {
  if (!localStorage.getItem(STORAGE_KEYS.AUDIO_ANALYSES)) {
    localStorage.setItem(STORAGE_KEYS.AUDIO_ANALYSES, JSON.stringify([]));
  }
  
  initializeDefaultModels();
};

// Audio Analyses CRUD operations
export const getAudioAnalyses = (): AudioAnalysis[] => {
  const data = localStorage.getItem(STORAGE_KEYS.AUDIO_ANALYSES);
  return data ? JSON.parse(data) : [];
};

export const insertAudioAnalysis = (analysis: Omit<AudioAnalysis, 'id' | 'created_at' | 'updated_at'>): { data: AudioAnalysis | null, error: Error | null } => {
  try {
    const now = new Date().toISOString();
    const newAnalysis: AudioAnalysis = {
      ...analysis,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    };
    
    const analyses = getAudioAnalyses();
    analyses.unshift(newAnalysis); // Add to beginning of array
    
    localStorage.setItem(STORAGE_KEYS.AUDIO_ANALYSES, JSON.stringify(analyses));
    
    return { data: newAnalysis, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
};

export const updateAudioAnalysis = (id: string, updates: Partial<AudioAnalysis>): { data: AudioAnalysis | null, error: Error | null } => {
  try {
    const analyses = getAudioAnalyses();
    const index = analyses.findIndex(a => a.id === id);
    
    if (index === -1) {
      return { data: null, error: new Error('Analysis not found') };
    }
    
    const updatedAnalysis = {
      ...analyses[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    analyses[index] = updatedAnalysis;
    localStorage.setItem(STORAGE_KEYS.AUDIO_ANALYSES, JSON.stringify(analyses));
    
    return { data: updatedAnalysis, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
};

export const deleteAudioAnalysis = (id: string): { error: Error | null } => {
  try {
    const analyses = getAudioAnalyses();
    const filteredAnalyses = analyses.filter(a => a.id !== id);
    
    localStorage.setItem(STORAGE_KEYS.AUDIO_ANALYSES, JSON.stringify(filteredAnalyses));
    
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
};

// Detection Models CRUD operations
export const getDetectionModels = (): DetectionModel[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DETECTION_MODELS);
  return data ? JSON.parse(data) : [];
};

export const getActiveDetectionModel = (): DetectionModel | null => {
  const models = getDetectionModels();
  return models.find(m => m.is_active) || null;
};

// Initialize storage on module import
initializeStorage();