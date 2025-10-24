# ResonanceAI

A powerful voice cloning and detection application that uses machine learning to create realistic voice clones from short audio samples and detect synthetic voices.

## Features

- **Fast ML-Based Voice Cloning**: Create voice models from 5-8 second audio samples
- **High-Quality Speech Synthesis**: Generate natural-sounding speech using the cloned voice
- **Advanced Voice Detection**: Detect synthetic voices with high accuracy
- **Real-time Processing**: Lightning-fast processing using ONNX Runtime and TensorFlow.js

## Technology Stack

- React + TypeScript
- TensorFlow.js for client-side ML inference
- ONNX Runtime for optimized model execution
- ML-FFT and ML-Matrix for signal processing
- Comlink for web worker communication

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Open the application in your browser at `http://localhost:5173`

## Voice Cloning Process

1. Upload or record a 5-8 second audio sample
2. The system extracts voice features using ML models
3. Create a voice model that captures the unique characteristics of the voice
4. Enter text to synthesize speech using the cloned voice

## Voice Detection Mechanism

The application uses multiple techniques to detect synthetic voices:
- Prosody pattern analysis
- Spectral artifact detection
- Naturalness evaluation
- Spectral regularity analysis

## ML Models

The application uses three ONNX models:
- `encoder.onnx`: Extracts voice embeddings from audio
- `decoder.onnx`: Generates mel spectrograms from text and voice embeddings
- `vocoder.onnx`: Converts mel spectrograms to waveforms