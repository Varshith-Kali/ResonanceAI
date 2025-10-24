/**
 * Voice Cloning Detection Utilities
 * 
 * This module provides enhanced detection capabilities for identifying synthetic or cloned voices
 * based on the ResonanceAI project plan.
 */

/**
 * Analyzes prosody patterns in audio to detect unnatural speech patterns
 * often present in synthetic voices
 */
export function analyzeProsodyPatterns(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const frameSize = 1024;
  const hopSize = 512;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  
  // Extract energy contour
  const energyContour: number[] = [];
  for (let i = 0; i < numFrames; i++) {
    const offset = i * hopSize;
    const frame = channelData.slice(offset, offset + frameSize);
    
    // Calculate frame energy
    let energy = 0;
    for (let j = 0; j < frame.length; j++) {
      energy += frame[j] * frame[j];
    }
    energy /= frame.length;
    energyContour.push(energy);
  }
  
  // Calculate energy variance (natural speech has more variance)
  const energyVariance = calculateVariance(energyContour);
  
  // Normalize to a score between 0-1 (higher means more likely to be natural)
  const normalizedScore = Math.min(1, Math.max(0, energyVariance / 0.01));
  
  return normalizedScore;
}

/**
 * Detects unnatural spectral artifacts that may indicate voice synthesis
 */
export function detectSpectralArtifacts(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const frameSize = 2048;
  const frame = channelData.slice(0, frameSize);
  
  // Apply window function
  const windowed = applyHammingWindow(frame);
  
  // Compute spectrum
  const spectrum = computeFFT(windowed);
  
  // Look for unusual spectral patterns (e.g., regular harmonic spacing)
  const artifactScore = analyzeSpectralRegularity(spectrum);
  
  return artifactScore;
}

/**
 * Analyzes the regularity of spectral components
 * Synthetic voices often have too-regular harmonic spacing
 */
function analyzeSpectralRegularity(spectrum: Float32Array): number {
  // Find peaks in spectrum
  const peaks: number[] = [];
  for (let i = 2; i < spectrum.length - 2; i++) {
    if (spectrum[i] > spectrum[i-1] && 
        spectrum[i] > spectrum[i-2] && 
        spectrum[i] > spectrum[i+1] && 
        spectrum[i] > spectrum[i+2]) {
      peaks.push(i);
    }
  }
  
  // Calculate distances between adjacent peaks
  const peakDistances: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    peakDistances.push(peaks[i] - peaks[i-1]);
  }
  
  // Calculate variance of peak distances
  // Natural voices have more variance in harmonic spacing
  const distanceVariance = calculateVariance(peakDistances);
  
  // Normalize to a score between 0-1 (higher means more likely to be synthetic)
  // Low variance = more regular = more likely synthetic
  const normalizedScore = Math.max(0, Math.min(1, 1 - (distanceVariance / 100)));
  
  return normalizedScore;
}

/**
 * Apply Hamming window to reduce spectral leakage
 */
function applyHammingWindow(frame: Float32Array): Float32Array {
  const windowed = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) {
    windowed[i] = frame[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1)));
  }
  return windowed;
}

/**
 * Simple FFT implementation for spectral analysis
 */
function computeFFT(frame: Float32Array): Float32Array {
  const n = frame.length;
  const spectrum = new Float32Array(n / 2);
  
  // Simple magnitude spectrum calculation
  // In a real implementation, use a proper FFT library
  for (let k = 0; k < n / 2; k++) {
    let real = 0;
    let imag = 0;
    
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      real += frame[t] * Math.cos(angle);
      imag -= frame[t] * Math.sin(angle);
    }
    
    spectrum[k] = Math.sqrt(real * real + imag * imag) / n;
  }
  
  return spectrum;
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Enhanced detection algorithm that combines multiple features
 * for more accurate synthetic voice detection
 */
export function enhancedSyntheticVoiceDetection(audioBuffer: AudioBuffer): { 
  isSynthetic: boolean; 
  confidence: number;
  features: {
    prosodyScore: number;
    spectralArtifactScore: number;
    naturalness: number;
  }
} {
  // Analyze prosody patterns (higher score = more natural)
  const prosodyScore = analyzeProsodyPatterns(audioBuffer);
  
  // Detect spectral artifacts (higher score = more synthetic)
  const spectralArtifactScore = detectSpectralArtifacts(audioBuffer);
  
  // Calculate overall naturalness score (0-1, higher = more natural)
  const naturalness = (1 - spectralArtifactScore) * 0.6 + prosodyScore * 0.4;
  
  // Determine if synthetic based on naturalness threshold
  const isSynthetic = naturalness < 0.65;
  
  // Calculate confidence based on distance from decision boundary
  const confidence = Math.min(0.95, Math.max(0.6, Math.abs(naturalness - 0.65) * 3 + 0.6));
  
  return {
    isSynthetic,
    confidence,
    features: {
      prosodyScore,
      spectralArtifactScore,
      naturalness
    }
  };
}