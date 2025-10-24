export function extractMFCC(audioBuffer: AudioBuffer, numCoefficients: number = 13): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const frameSize = 512;
  const hopSize = 256;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

  const mfccValues: number[] = [];

  for (let i = 0; i < Math.min(numFrames, 10); i++) {
    const offset = i * hopSize;
    const frame = channelData.slice(offset, offset + frameSize);

    const windowed = applyHammingWindow(frame);
    const spectrum = computeSpectrum(windowed);
    const melSpectrum = applyMelFilterbank(spectrum, sampleRate);
    const mfcc = computeDCT(melSpectrum, numCoefficients);

    mfccValues.push(...mfcc);
  }

  return mfccValues.slice(0, 40);
}

export function extractPitch(audioBuffer: AudioBuffer): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const frameSize = 2048;
  const hopSize = 512;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

  const pitchValues: number[] = [];

  for (let i = 0; i < Math.min(numFrames, 20); i++) {
    const offset = i * hopSize;
    const frame = channelData.slice(offset, offset + frameSize);

    const pitch = autoCorrelationPitch(frame, sampleRate);
    if (pitch > 0) {
      pitchValues.push(pitch);
    }
  }

  return pitchValues;
}

export function extractFormants(audioBuffer: AudioBuffer): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const frameSize = 512;
  const frame = channelData.slice(0, frameSize);

  const spectrum = computeSpectrum(applyHammingWindow(frame));

  const peaks = findSpectralPeaks(spectrum, sampleRate);

  return peaks.slice(0, 5);
}

export function calculateSpectralCentroid(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const frameSize = 2048;
  const frame = channelData.slice(0, frameSize);

  const spectrum = computeSpectrum(applyHammingWindow(frame));
  const sampleRate = audioBuffer.sampleRate;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < spectrum.length; i++) {
    const frequency = (i * sampleRate) / (frameSize * 2);
    numerator += frequency * spectrum[i];
    denominator += spectrum[i];
  }

  return denominator > 0 ? numerator / denominator : 0;
}

export function calculateZeroCrossingRate(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  let crossings = 0;

  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0 && channelData[i - 1] < 0) ||
        (channelData[i] < 0 && channelData[i - 1] >= 0)) {
      crossings++;
    }
  }

  return crossings / channelData.length;
}

export function simulateDetection(audioBuffer: AudioBuffer): { isSynthetic: boolean; confidence: number } {
  const features = {
    mfcc: extractMFCC(audioBuffer),
    pitch: extractPitch(audioBuffer),
    formants: extractFormants(audioBuffer),
    spectralCentroid: calculateSpectralCentroid(audioBuffer),
    zcr: calculateZeroCrossingRate(audioBuffer)
  };

  let syntheticScore = 0;
  let factors = 0;

  if (features.pitch.length > 0) {
    const pitchVariance = calculateVariance(features.pitch);
    if (pitchVariance < 100) {
      syntheticScore += 0.3;
    }
    factors++;
  }

  if (features.zcr < 0.05 || features.zcr > 0.15) {
    syntheticScore += 0.2;
    factors++;
  }

  if (features.spectralCentroid > 4000) {
    syntheticScore += 0.15;
    factors++;
  }

  if (features.mfcc.length > 0) {
    const mfccVariance = calculateVariance(features.mfcc);
    if (mfccVariance < 10) {
      syntheticScore += 0.25;
    }
    factors++;
  }

  const randomFactor = Math.random() * 0.3;
  syntheticScore += randomFactor;

  const confidence = Math.min(0.95, Math.max(0.55, syntheticScore / Math.max(factors, 1)));

  const isSynthetic = confidence > 0.7;

  return { isSynthetic, confidence };
}

function applyHammingWindow(frame: Float32Array): Float32Array {
  const windowed = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) {
    windowed[i] = frame[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1)));
  }
  return windowed;
}

function computeSpectrum(frame: Float32Array): Float32Array {
  const n = frame.length;
  const spectrum = new Float32Array(n / 2);

  const real = new Float32Array(frame);
  const imag = new Float32Array(n);

  fft(real, imag);

  for (let i = 0; i < n / 2; i++) {
    spectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }

  return spectrum;
}

function fft(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  if (n <= 1) return;

  for (let i = 0, j = 0; i < n; i++) {
    if (j > i) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wlenReal = Math.cos(angle);
    const wlenImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wReal = 1;
      let wImag = 0;

      for (let j = 0; j < halfLen; j++) {
        const tReal = wReal * real[i + j + halfLen] - wImag * imag[i + j + halfLen];
        const tImag = wReal * imag[i + j + halfLen] + wImag * real[i + j + halfLen];

        real[i + j + halfLen] = real[i + j] - tReal;
        imag[i + j + halfLen] = imag[i + j] - tImag;
        real[i + j] += tReal;
        imag[i + j] += tImag;

        const nextWReal = wReal * wlenReal - wImag * wlenImag;
        const nextWImag = wReal * wlenImag + wImag * wlenReal;
        wReal = nextWReal;
        wImag = nextWImag;
      }
    }
  }
}

function applyMelFilterbank(spectrum: Float32Array, sampleRate: number): Float32Array {
  const numFilters = 26;
  const melSpectrum = new Float32Array(numFilters);

  const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
  const melToHz = (mel: number) => 700 * (Math.pow(10, mel / 2595) - 1);

  const minFreq = 0;
  const maxFreq = sampleRate / 2;
  const minMel = hzToMel(minFreq);
  const maxMel = hzToMel(maxFreq);

  const melPoints = new Float32Array(numFilters + 2);
  for (let i = 0; i < melPoints.length; i++) {
    melPoints[i] = melToHz(minMel + (i / (numFilters + 1)) * (maxMel - minMel));
  }

  const binToHz = (bin: number) => (bin * sampleRate) / (spectrum.length * 2);

  for (let i = 0; i < numFilters; i++) {
    let filterSum = 0;
    for (let j = 0; j < spectrum.length; j++) {
      const freq = binToHz(j);
      if (freq >= melPoints[i] && freq <= melPoints[i + 2]) {
        let weight = 0;
        if (freq < melPoints[i + 1]) {
          weight = (freq - melPoints[i]) / (melPoints[i + 1] - melPoints[i]);
        } else {
          weight = (melPoints[i + 2] - freq) / (melPoints[i + 2] - melPoints[i + 1]);
        }
        filterSum += spectrum[j] * weight;
      }
    }
    melSpectrum[i] = Math.log(filterSum + 1e-10);
  }

  return melSpectrum;
}

function computeDCT(melSpectrum: Float32Array, numCoefficients: number): number[] {
  const mfcc: number[] = [];
  const N = melSpectrum.length;

  for (let k = 0; k < numCoefficients; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += melSpectrum[n] * Math.cos((Math.PI * k * (n + 0.5)) / N);
    }
    mfcc.push(sum);
  }

  return mfcc;
}

function autoCorrelationPitch(frame: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 50);

  let maxCorrelation = 0;
  let bestLag = 0;

  for (let lag = minLag; lag < maxLag && lag < frame.length / 2; lag++) {
    let correlation = 0;
    for (let i = 0; i < frame.length - lag; i++) {
      correlation += frame[i] * frame[i + lag];
    }

    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      bestLag = lag;
    }
  }

  return bestLag > 0 ? sampleRate / bestLag : 0;
}

function findSpectralPeaks(spectrum: Float32Array, sampleRate: number): number[] {
  const peaks: number[] = [];
  const binToHz = (bin: number) => (bin * sampleRate) / (spectrum.length * 2);

  for (let i = 1; i < spectrum.length - 1; i++) {
    if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1]) {
      const freq = binToHz(i);
      if (freq > 200 && freq < 5000) {
        peaks.push(freq);
      }
    }
  }

  return peaks.sort((a, b) => b - a);
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}
