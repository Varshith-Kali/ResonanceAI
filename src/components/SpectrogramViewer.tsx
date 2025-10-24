import { useEffect, useRef } from 'react';

interface SpectrogramViewerProps {
  audioBuffer: AudioBuffer | null;
}

export default function SpectrogramViewer({ audioBuffer }: SpectrogramViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const fftSize = 2048;
    const hopSize = fftSize / 4;
    const numFrames = Math.floor((channelData.length - fftSize) / hopSize);
    const numBins = fftSize / 2;

    const spectrogramData: number[][] = [];

    for (let frame = 0; frame < numFrames; frame++) {
      const offset = frame * hopSize;
      const segment = channelData.slice(offset, offset + fftSize);

      const real = new Float32Array(fftSize);
      const imag = new Float32Array(fftSize);

      for (let i = 0; i < segment.length; i++) {
        const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
        real[i] = segment[i] * windowValue;
      }

      fft(real, imag);

      const magnitudes: number[] = [];
      for (let i = 0; i < numBins; i++) {
        const magnitude = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        magnitudes.push(20 * Math.log10(magnitude + 1e-10));
      }

      spectrogramData.push(magnitudes);
    }

    const minDb = -100;
    const maxDb = 0;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const frameWidth = width / spectrogramData.length;

    for (let x = 0; x < spectrogramData.length; x++) {
      const frame = spectrogramData[x];
      for (let y = 0; y < numBins; y++) {
        const value = frame[numBins - 1 - y];
        const normalized = (value - minDb) / (maxDb - minDb);
        const intensity = Math.max(0, Math.min(1, normalized));

        const hue = 240 - intensity * 240;
        const saturation = 100;
        const lightness = intensity * 50;

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        const pixelX = x * frameWidth;
        const pixelY = (y / numBins) * height;
        const pixelHeight = height / numBins + 1;

        ctx.fillRect(pixelX, pixelY, frameWidth + 1, pixelHeight);
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      const freq = ((4 - i) / 4) * (sampleRate / 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${(freq / 1000).toFixed(1)}kHz`, 5, y - 5);
    }
  }, [audioBuffer]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Spectrogram Visualization</h3>
      <div className="bg-gray-900 rounded-lg p-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-auto"
        />
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <p>Visual representation of audio frequencies over time. Brighter colors indicate higher energy at specific frequencies.</p>
      </div>
    </div>
  );
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
