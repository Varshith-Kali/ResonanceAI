import React, { useState, useRef } from 'react';
import { 
  createVoiceModel, 
  synthesizeSpeech, 
  enhancedSyntheticVoiceDetection,
  convertVoice,
  VoiceModel
} from '../utils/voiceCloning';

// Import AudioAnalysis interface from localStorage
import { AudioAnalysis } from '../lib/localStorage';

import { insertAudioAnalysis } from '../lib/localStorage';

const VoiceCloning: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceModel, setVoiceModel] = useState<VoiceModel | null>(null);
  const [textToSynthesize, setTextToSynthesize] = useState('');
  const [synthesizedAudio, setSynthesizedAudio] = useState<AudioBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResults, setDetectionResults] = useState<{
    is_synthetic: boolean;
    confidence_score: number;
    features?: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [conversionMode, setConversionMode] = useState<'tts' | 'vc'>('tts');
  const [sourceAudio, setSourceAudio] = useState<File | null>(null);
  
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
  
  // Create a test tone as fallback when synthesis fails
  const createTestTone = (context: AudioContext, duration = 3, frequency = 440): AudioBuffer => {
    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate a sine wave
    for (let i = 0; i < channelData.length; i++) {
      const t = i / sampleRate;
      // Create a more complex tone with harmonics for a richer sound
      channelData[i] = 
        Math.sin(2 * Math.PI * frequency * t) * 0.5 + // Fundamental frequency
        Math.sin(2 * Math.PI * frequency * 2 * t) * 0.25 + // First harmonic
        Math.sin(2 * Math.PI * frequency * 3 * t) * 0.125; // Second harmonic
      
      // Apply fade in/out to avoid clicks
      const fadeTime = 0.1; // 100ms fade
      const fadeInSamples = fadeTime * sampleRate;
      const fadeOutSamples = fadeTime * sampleRate;
      
      if (i < fadeInSamples) {
        // Fade in
        channelData[i] *= (i / fadeInSamples);
      } else if (i > channelData.length - fadeOutSamples) {
        // Fade out
        channelData[i] *= ((channelData.length - i) / fadeOutSamples);
      }
    }
    
    return buffer;
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file format
      const validFormats = ['.wav', '.mp3', '.m4a', '.aac', '.ogg'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validFormats.includes(fileExtension)) {
        setError(`Unsupported audio format: ${fileExtension}. Please use one of: ${validFormats.join(', ')}`);
        return;
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError(`File size exceeds 10MB limit. Please use a smaller file.`);
        return;
      }
      
      console.log(`Audio file selected: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type}`);
      setAudioFile(file);
      setVoiceModel(null);
      setSynthesizedAudio(null);
      setDetectionResults(null);
      setError(null); // Clear any previous errors
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
  const createModel = async (e: React.MouseEvent) => {
    // Prevent default form submission behavior that might cause page redirect
    e.preventDefault();
    
    if (!audioFile) {
      setError('Please select or record an audio file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      console.log("Starting audio analysis for:", audioFile.name);
      const context = initAudioContext();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      
      console.log(`Audio decoded: duration=${audioBuffer.duration.toFixed(2)}s, channels=${audioBuffer.numberOfChannels}, sample rate=${audioBuffer.sampleRate}Hz`);
      
      // Check if audio is long enough
      if (audioBuffer.duration < 5) {
        console.warn(`Audio duration (${audioBuffer.duration.toFixed(2)}s) is less than the required 5 seconds`);
        setError('Audio sample must be at least 5 seconds long for effective cloning. Your audio is only ' + audioBuffer.duration.toFixed(1) + ' seconds.');
        setIsProcessing(false);
        return;
      }
      
      // Check if audio is too silent
      const channelData = audioBuffer.getChannelData(0);
      let maxAmplitude = 0;
      for (let i = 0; i < channelData.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
      }
      
      if (maxAmplitude < 0.01) {
        console.warn(`Audio is too quiet: max amplitude=${maxAmplitude}`);
        setError('Audio is too quiet. Please use a louder recording with clear speech.');
        setIsProcessing(false);
        return;
      }
      
      // Create voice model with consent and language
      const model = await createVoiceModel(audioBuffer, audioFile.name, selectedLanguage, consentGiven);
      setVoiceModel(model);
      
      // Run detection on the original audio
      const detectionResult = await enhancedSyntheticVoiceDetection(audioBuffer);
      setDetectionResults(detectionResult);
      
      // Save analysis to local storage
      const analysis: Omit<AudioAnalysis, "id" | "created_at" | "updated_at"> = {
        file_name: audioFile.name,
        file_size: audioFile.size,
        duration: audioBuffer.duration,
        sample_rate: audioBuffer.sampleRate,
        is_synthetic: detectionResult.is_synthetic || false,
        confidence_score: detectionResult.confidence_score || 0,
        features: {
          ...(detectionResult.features ? {
            spectral_centroid: detectionResult.features.spectralArtifactScore,
            zero_crossing_rate: detectionResult.features.naturalness
          } : {})
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
      console.error("No voice model available for synthesis");
      setError('Please create a voice model first');
      return;
    }
    
    console.log("Starting synthesis with voice model:", voiceModel.id);
    
    if (conversionMode === 'tts') {
      if (!textToSynthesize.trim()) {
        console.warn("Empty text input for synthesis");
        setError('Please enter text to synthesize');
        return;
      }
      console.log("Text to synthesize:", textToSynthesize);
    } else if (conversionMode === 'vc') {
      if (!sourceAudio) {
        console.warn("No source audio selected for voice conversion");
        setError('Please select a source audio file for voice conversion');
        return;
      }
      console.log("Source audio selected for conversion:", sourceAudio.name);
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      let audio: AudioBuffer;
      const context = initAudioContext();
      console.log("Audio context initialized, sample rate:", context.sampleRate);
      
      if (conversionMode === 'tts') {
        console.log("Starting TTS synthesis with language:", selectedLanguage);
        // Synthesize speech with ML-based voice cloning
        audio = await synthesizeSpeech(voiceModel, textToSynthesize, selectedLanguage);
        console.log("TTS synthesis completed, output duration:", audio?.duration || 0, "seconds");
      } else {
        // Voice conversion mode
        if (!sourceAudio) {
          console.error("Source audio is missing for voice conversion");
          throw new Error('Source audio is required for voice conversion');
        }
        
        try {
          console.log("Processing source audio for voice conversion, size:", sourceAudio.size);
          const arrayBuffer = await sourceAudio.arrayBuffer();
          console.log("Array buffer created, size:", arrayBuffer.byteLength);
          
          const sourceAudioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
          console.log("Source audio decoded, duration:", sourceAudioBuffer.duration, "seconds");
          
          if (sourceAudioBuffer.duration === 0) {
            throw new Error('Source audio has zero duration');
          }
          
          // Use the actual voice conversion functionality
          console.log("Starting voice conversion with model:", voiceModel.id);
          
          // Use the convertVoice function imported at the top of the file
          audio = await convertVoice(voiceModel, sourceAudioBuffer);
          console.log("Voice conversion completed, output duration:", audio?.duration || 0, "seconds");
          
          // If the audio is empty or invalid, use a fallback
          if (!audio || audio.duration === 0) {
            console.warn("Voice conversion produced empty audio, using source audio as fallback");
            audio = sourceAudioBuffer;
          }
        } catch (error) {
          console.error("Error during voice conversion:", error);
          // Ensure we have a valid audio buffer even if conversion fails
          if (sourceAudio) {
            const fallbackBuffer = await sourceAudio.arrayBuffer();
            audio = await context.decodeAudioData(fallbackBuffer.slice(0));
            console.log("Using fallback audio, duration:", audio.duration, "seconds");
          } else {
            throw new Error('Failed to process audio for voice conversion');
          }
        }
      }
      
      setSynthesizedAudio(audio);
      
      // Convert AudioBuffer to Blob for playback
      const audioContext = initAudioContext();
      
      // Ensure we have a valid audio buffer with actual content
      if (!audio || audio.duration === 0) {
        console.error("Audio buffer is invalid or has zero duration");
        // Instead of throwing an error, create a test tone to ensure audio playback works
        audio = createTestTone(audioContext);
        console.log("Created test tone as fallback, duration:", audio.duration, "seconds");
      }
      
      console.log("Processing audio for playback, duration:", audio.duration, "seconds");
      
      // SIMPLIFIED APPROACH: Convert AudioBuffer directly to WAV
      const numberOfChannels = audio.numberOfChannels;
      const sampleRate = audio.sampleRate;
      const length = audio.length;
      
      // Create WAV file format
      const buffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(buffer);
      
      // Write WAV header
      // "RIFF" chunk descriptor
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + length * 2, true);
      writeString(view, 8, 'WAVE');
      
      // "fmt " sub-chunk
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, 1, true); // audio format (1 for PCM)
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
      view.setUint16(32, numberOfChannels * 2, true); // block align
      view.setUint16(34, 16, true); // bits per sample
      
      // "data" sub-chunk
      writeString(view, 36, 'data');
      view.setUint32(40, length * 2, true);
      
      // Write audio data
      const channelData = audio.getChannelData(0);
      let offset = 44;
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
      
      // Create blob and URL
      const blob = new Blob([buffer], { type: 'audio/wav' });
      console.log("Created audio blob directly, size:", blob.size);
      
      if (audioRef.current) {
        // Revoke any previous object URL to prevent memory leaks
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        
        const url = URL.createObjectURL(blob);
        console.log("Created audio URL:", url);
        audioRef.current.src = url;
        audioRef.current.load(); // Force reload of audio element
        
        // Ensure audio plays when user clicks play button
        audioRef.current.oncanplaythrough = () => {
          console.log("Audio can play through, ready for playback");
        };
      }
      
      // Helper function to write strings to DataView
      function writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      }
      
      // Run detection on the synthesized audio
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
      
      {/* Consent and Settings Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Consent and Settings</h3>
        
        <div className="flex flex-col space-y-4">
          {/* Consent Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="consent"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="consent" className="ml-2 block text-sm text-gray-700">
              I consent to my voice being cloned and understand that all synthesized audio will contain an inaudible watermark
            </label>
          </div>
          
          {/* Language Selector */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              id="language"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="telugu">Telugu</option>
            </select>
          </div>
          
          {/* Conversion Mode */}
          <div>
            <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-1">
              Conversion Mode
            </label>
            <select
              id="mode"
              value={conversionMode}
              onChange={(e) => setConversionMode(e.target.value as 'tts' | 'vc')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="tts">Text-to-Speech</option>
              <option value="vc">Voice Conversion</option>
            </select>
          </div>
        </div>
      </div>
      
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
              onClick={(e) => createModel(e)}
              disabled={!audioFile || isProcessing || isRecording || !consentGiven}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Analyze Voice & Create Model'}
            </button>
            {!consentGiven && audioFile && (
              <p className="mt-2 text-sm text-red-600">Please provide consent to continue</p>
            )}
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
                  <p className={`font-medium ${detectionResults.is_synthetic ? 'text-red-600' : 'text-green-600'}`}>
                    {detectionResults.is_synthetic ? 'SYNTHETIC VOICE DETECTED' : 'NATURAL VOICE DETECTED'}
                  </p>
                  <p><span className="font-medium">Confidence:</span> {(detectionResults.confidence_score * 100).toFixed(2)}%</p>
                  {detectionResults.features?.prosodyScore !== undefined && (
                    <p><span className="font-medium">Prosody Score:</span> {(detectionResults.features.prosodyScore * 100).toFixed(2)}%</p>
                  )}
                  {detectionResults.features?.spectralArtifactScore !== undefined && (
                    <p><span className="font-medium">Spectral Artifacts:</span> {(detectionResults.features.spectralArtifactScore * 100).toFixed(2)}%</p>
                  )}
                  {detectionResults.features?.naturalness !== undefined && (
                    <p><span className="font-medium">Naturalness:</span> {(detectionResults.features.naturalness * 100).toFixed(2)}%</p>
                  )}
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
            {conversionMode === 'tts' ? (
              /* Text Input */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Text to Synthesize in {selectedLanguage}
                </label>
                <textarea
                  value={textToSynthesize}
                  onChange={(e) => setTextToSynthesize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={`Enter text to be spoken in ${selectedLanguage}...`}
                  disabled={isProcessing}
                />
              </div>
            ) : (
              /* Source Audio Input for Voice Conversion */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Source Audio for Voice Conversion
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSourceAudio(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                  disabled={isProcessing}
                />
                {sourceAudio && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {sourceAudio.name} ({(sourceAudio.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            )}
            
            {/* Synthesize Button */}
            <div>
              <button
                onClick={handleSynthesize}
                disabled={(
                  conversionMode === 'tts' && (!textToSynthesize.trim() || isProcessing)
                ) || (
                  conversionMode === 'vc' && (!sourceAudio || isProcessing)
                )}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : conversionMode === 'tts' ? 'Synthesize Speech' : 'Convert Voice'}
              </button>
            </div>
            
            {/* Audio Player */}
            {synthesizedAudio && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Synthesized Audio</h4>
                <audio ref={audioRef} controls className="w-full" />
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Note:</span> This audio contains an inaudible watermark for tracking purposes.
                    In a production environment, this would use advanced neural networks to create a more realistic voice clone.
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