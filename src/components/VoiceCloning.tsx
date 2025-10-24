import React, { useState, useRef } from 'react';
import { 
  createVoiceModel, 
  synthesizeSpeech, 
  enhancedSyntheticVoiceDetection 
} from '../utils/voiceCloning.js';

// Define VoiceModel interface locally to avoid TypeScript errors
interface VoiceModel {
  id: string;
  name: string;
  createdAt: Date;
  duration: number;
  sourceAudioId?: string;
  language?: string;
  features: {
    sampleRate: number;
    embeddings: Float32Array;
    phonemeMapping: Record<string, any>;
    formantStructure: any[];
    intonationPatterns: any[];
    speechRate: number;
    rhythmPatterns: any[];
    voiceCharacteristics: Record<string, any>;
  };
}

// Define AudioAnalysis interface
interface AudioAnalysis {
  id?: string;
  created_at?: string;
  updated_at?: string;
  file_name: string;
  file_size: number;
  duration: number;
  sample_rate: number;
  is_synthetic: boolean;
  confidence_score: number;
  features: {
    prosodyScore: number;
    spectralArtifactScore: number;
    naturalness: number;
    spectralRegularity?: number;
  };
  detection_result: {
    is_synthetic: boolean;
    confidence: number;
  };
}

import { insertAudioAnalysis } from '../lib/localStorage';

const VoiceCloning: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceModel, setVoiceModel] = useState<VoiceModel | null>(null);
  const [textToSynthesize, setTextToSynthesize] = useState('');
  const [synthesizedAudio, setSynthesizedAudio] = useState<AudioBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResults, setDetectionResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioContext = useRef<AudioContext | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize audio context
  const initAudioContext = () => {
    if (!audioContext.current) {
      audioContext.current = new AudioContext();
    }
    return audioContext.current;
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAudioFile(files[0]);
      setVoiceModel(null);
      setSynthesizedAudio(null);
      setDetectionResults(null);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks.current = [];
      
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'audio/wav' });
        const file = new File([blob], 'recording.wav', { type: 'audio/wav' });
        setAudioFile(file);
      };
      
      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);
      
      // Start timer
      let time = 0;
      timerRef.current = window.setInterval(() => {
        time += 1;
        setRecordingTime(time);
      }, 1000);
      
    } catch (err) {
      setError('Error accessing microphone: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Create voice model from audio
  const createModel = async () => {
    if (!audioFile) {
      setError('Please select or record an audio file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const context = initAudioContext();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      
      // Check if audio is long enough
      if (audioBuffer.duration < 5) {
        setError('Audio sample must be at least 5 seconds long for effective cloning');
        setIsProcessing(false);
        return;
      }
      
      // Create voice model (now async)
      const model = await createVoiceModel(audioBuffer, audioFile.name);
      setVoiceModel(model);
      
      // Run detection on the original audio (now async)
      const detectionResult = await enhancedSyntheticVoiceDetection(audioBuffer);
      setDetectionResults(detectionResult);
      
      // Save analysis to local storage
      const analysis: Omit<AudioAnalysis, "id" | "created_at" | "updated_at"> = {
        file_name: audioFile.name,
        file_size: audioFile.size,
        duration: audioBuffer.duration,
        sample_rate: audioBuffer.sampleRate,
        is_synthetic: detectionResult.isSynthetic,
        confidence_score: detectionResult.confidence,
        features: detectionResult.enhancedFeatures,
        detection_result: {
          is_synthetic: detectionResult.isSynthetic,
          confidence: detectionResult.confidence
        }
      };
      
      insertAudioAnalysis(analysis);
      
    } catch (err) {
      console.error("Voice model creation error:", err);
      setError('Error processing audio: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Synthesize speech
  const handleSynthesize = async () => {
    if (!voiceModel) {
      setError('Please create a voice model first');
      return;
    }
    
    if (!textToSynthesize.trim()) {
      setError('Please enter text to synthesize');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Synthesize speech with ML-based voice cloning
      const audio = await synthesizeSpeech(voiceModel, textToSynthesize);
      setSynthesizedAudio(audio);
      
      // Convert AudioBuffer to Blob for playback
      const context = initAudioContext();
      const source = context.createBufferSource();
      source.buffer = audio;
      
      // Create a MediaStreamDestination to get a stream
      const dest = context.createMediaStreamDestination();
      source.connect(dest);
      
      // Record the stream to get a blob
      const recorder = new MediaRecorder(dest.stream);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(blob);
        }
      };
      
      // Start recording and play the source
      recorder.start();
      source.start(0);
      
      // Stop recording after the duration of the audio
      setTimeout(() => {
        recorder.stop();
        source.stop();
      }, audio.duration * 1000);
      
      // Run detection on the synthesized audio (now async)
      const detectionResult = await enhancedSyntheticVoiceDetection(audio);
      setDetectionResults(detectionResult);
      
    } catch (err) {
      console.error("Speech synthesis error:", err);
      setError('Error synthesizing speech: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Voice Cloning & Detection</h2>
      
      {/* Audio Input Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Step 1: Provide Voice Sample (min 5 seconds)</h3>
        
        <div className="flex flex-col space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Audio File
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={isRecording || isProcessing}
            />
          </div>
          
          {/* Recording Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or Record Audio
            </label>
            <div className="flex items-center space-x-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Stop Recording ({formatTime(recordingTime)})
                </button>
              )}
            </div>
          </div>
          
          {/* Selected File Info */}
          {audioFile && (
            <div className="text-sm text-gray-600">
              Selected: {audioFile.name} ({(audioFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
          
          {/* Create Model Button */}
          <div>
            <button
              onClick={createModel}
              disabled={!audioFile || isProcessing || isRecording}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Analyze Voice & Create Model'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Voice Model & Detection Results */}
      {voiceModel && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Step 2: Voice Model & Detection Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Voice Model Info */}
            <div className="p-3 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-800 mb-2">Voice Model</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Name:</span> {voiceModel.name}</p>
                <p><span className="font-medium">Created:</span> {voiceModel.createdAt.toLocaleString()}</p>
                <p><span className="font-medium">Duration:</span> {voiceModel.duration.toFixed(2)}s</p>
                <p><span className="font-medium">Sample Rate:</span> {voiceModel.features.sampleRate}Hz</p>
              </div>
            </div>
            
            {/* Detection Results */}
            {detectionResults && (
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-800 mb-2">Detection Results</h4>
                <div className="text-sm space-y-1">
                  <p className={`font-medium ${detectionResults.isSynthetic ? 'text-red-600' : 'text-green-600'}`}>
                    {detectionResults.isSynthetic ? 'SYNTHETIC VOICE DETECTED' : 'NATURAL VOICE DETECTED'}
                  </p>
                  <p><span className="font-medium">Confidence:</span> {(detectionResults.confidence * 100).toFixed(2)}%</p>
                  <p><span className="font-medium">Prosody Score:</span> {(detectionResults.enhancedFeatures.prosodyScore * 100).toFixed(2)}%</p>
                  <p><span className="font-medium">Spectral Artifacts:</span> {(detectionResults.enhancedFeatures.spectralArtifactScore * 100).toFixed(2)}%</p>
                  <p><span className="font-medium">Naturalness:</span> {(detectionResults.enhancedFeatures.naturalness * 100).toFixed(2)}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Speech Synthesis */}
      {voiceModel && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Step 3: Synthesize Speech</h3>
          
          <div className="space-y-4">
            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter Text to Synthesize
              </label>
              <textarea
                value={textToSynthesize}
                onChange={(e) => setTextToSynthesize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter text to be spoken in the cloned voice..."
                disabled={isProcessing}
              />
            </div>
            
            {/* Synthesize Button */}
            <div>
              <button
                onClick={handleSynthesize}
                disabled={!textToSynthesize.trim() || isProcessing}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Synthesize Speech'}
              </button>
            </div>
            
            {/* Audio Player */}
            {synthesizedAudio && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Synthesized Audio</h4>
                <audio ref={audioRef} controls className="w-full" />
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Note:</span> This is a simulated voice cloning. In a production environment, 
                    this would use advanced neural networks to create a more realistic voice clone.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-4">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceCloning;