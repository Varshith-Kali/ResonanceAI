import { useState } from 'react';
import Navigation from './components/Navigation';
import AudioUpload from './components/AudioUpload';
import SpectrogramViewer from './components/SpectrogramViewer';
import FeatureDisplay from './components/FeatureDisplay';
import DetectionPanel from './components/DetectionPanel';
import EducationPanel from './components/EducationPanel';
import AnalysisHistory from './components/AnalysisHistory';
import VoiceCloning from './components/VoiceCloning';
import { insertAudioAnalysis } from './lib/localStorage';
import {
  extractMFCC,
  extractPitch,
  extractFormants,
  calculateSpectralCentroid,
  calculateZeroCrossingRate
} from './utils/audioAnalysis';
// Import function from voiceCloning module
import { detectSpectralArtifacts, enhancedSyntheticVoiceDetection } from './utils/voiceCloning.js';

interface AnalysisResult {
  audioBuffer: AudioBuffer;
  fileName: string;
  fileSize: number;
  features: {
    mfcc: number[];
    pitch: number[];
    formants: number[];
    spectral_centroid: number;
    zero_crossing_rate: number;
  };
  detection: {
    isSynthetic: boolean;
    confidence: number;
  };
}

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleAnalyze = async (file: File, audioBuffer: AudioBuffer) => {
    const features = {
      mfcc: extractMFCC(audioBuffer),
      pitch: extractPitch(audioBuffer),
      formants: extractFormants(audioBuffer),
      spectral_centroid: calculateSpectralCentroid(audioBuffer),
      zero_crossing_rate: calculateZeroCrossingRate(audioBuffer)
    };

    // Use enhanced detection algorithm
    const enhancedDetection = enhancedSyntheticVoiceDetection(audioBuffer);
    
    const detection = {
      isSynthetic: enhancedDetection.isSynthetic,
      confidence: enhancedDetection.confidence,
      enhancedFeatures: enhancedDetection.features
    };

    const analysisResult: AnalysisResult = {
      audioBuffer,
      fileName: file.name,
      fileSize: file.size,
      features,
      detection
    };

    setCurrentAnalysis(analysisResult);

    try {
      const { error } = insertAudioAnalysis({
        file_name: file.name,
        file_size: file.size,
        duration: audioBuffer.duration,
        sample_rate: audioBuffer.sampleRate,
        is_synthetic: detection.isSynthetic,
        confidence_score: detection.confidence,
        features: features
      });

      if (error) {
        console.error('Error saving analysis:', error);
      } else {
        setRefreshHistory(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <AudioUpload onAnalyze={handleAnalyze} />

            {currentAnalysis && (
              <>
                <SpectrogramViewer audioBuffer={currentAnalysis.audioBuffer} />
                <FeatureDisplay features={currentAnalysis.features} />
              </>
            )}
          </div>
        )}

        {activeTab === 'detection' && (
          <div>
            {currentAnalysis ? (
              <DetectionPanel
                isSynthetic={currentAnalysis.detection.isSynthetic}
                confidence={currentAnalysis.detection.confidence}
                modelName="DeepFake Audio Detector v1.0"
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analysis Available</h3>
                <p className="text-gray-600">
                  Upload and analyze an audio file first to see detection results.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <AnalysisHistory key={refreshHistory} />
        )}

        {activeTab === 'cloning' && (
          <VoiceCloning />
        )}

        {activeTab === 'education' && <EducationPanel />}
      </div>
    </div>
  );
}

export default App;
