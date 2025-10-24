import { BookOpen, Cpu, Mic, Shield, AlertCircle } from 'lucide-react';

export default function EducationPanel() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Voice Technology Research Overview</h3>
        </div>

        <div className="prose max-w-none">
          <p className="text-gray-700 mb-4">
            This educational platform demonstrates the technical architecture and detection methods for
            synthetic voice analysis. Understanding these systems is crucial for developing defensive
            technologies against voice-based fraud and misinformation.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Voice Synthesis System Architecture</h3>

        <div className="space-y-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center space-x-2 mb-2">
              <Mic className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">1. Audio Processing Pipeline</h4>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Audio signals are preprocessed through feature extraction, including:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Mel-frequency cepstral coefficients (MFCCs)</li>
              <li>• Fundamental frequency (F0) extraction</li>
              <li>• Spectral envelope analysis</li>
              <li>• Prosodic feature extraction (duration, energy, pitch)</li>
            </ul>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex items-center space-x-2 mb-2">
              <Cpu className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">2. Neural Network Models</h4>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Modern voice synthesis systems typically use:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• WaveNet-style autoregressive models for waveform generation</li>
              <li>• Transformer architectures for sequence modeling</li>
              <li>• Variational autoencoders (VAEs) for voice conversion</li>
              <li>• GANs (Generative Adversarial Networks) for quality enhancement</li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">3. Detection Mechanisms</h4>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Defensive systems identify synthetic speech through:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Phase inconsistency detection in spectrograms</li>
              <li>• Analyzing unnatural coarticulation patterns</li>
              <li>• Statistical analysis of prosodic features</li>
              <li>• Deep learning classifiers trained on synthetic/real pairs</li>
              <li>• Temporal artifact detection in mel-spectrograms</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Deep Dive</h3>

        <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm space-y-4">
          <div>
            <p className="text-gray-600 mb-2">// Simplified detection pipeline</p>
            <code className="text-gray-800">
              {`function detectSyntheticAudio(audioBuffer) {
  // 1. Extract acoustic features
  const mfcc = extractMFCC(audioBuffer);
  const pitch = extractPitch(audioBuffer);
  const formants = extractFormants(audioBuffer);

  // 2. Analyze spectral characteristics
  const spectralAnomalies = detectSpectralArtifacts(audioBuffer);

  // 3. Check prosodic naturalness
  const prosodyScore = analyzeProsody(pitch, duration);

  // 4. Run through neural classifier
  const features = combineFeatures(mfcc, pitch, formants);
  const prediction = neuralClassifier.predict(features);

  return {
    isSynthetic: prediction > 0.5,
    confidence: prediction,
    indicators: { spectralAnomalies, prosodyScore }
  };
}`}
            </code>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Applications</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Forensic Analysis</h4>
            <p className="text-sm text-gray-600">
              Authentication of audio evidence in legal proceedings, detecting manipulated recordings.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Media Verification</h4>
            <p className="text-sm text-gray-600">
              Identifying deepfake audio in news, social media, and public communications.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Security Systems</h4>
            <p className="text-sm text-gray-600">
              Protecting voice authentication systems from replay and synthesis attacks.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Academic Research</h4>
            <p className="text-sm text-gray-600">
              Advancing detection algorithms and understanding synthesis artifacts.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-red-900 mb-2">Ethical Considerations</h4>
            <p className="text-sm text-red-800 mb-3">
              Voice cloning technology presents significant ethical challenges:
            </p>
            <ul className="text-sm text-red-800 space-y-1 ml-4">
              <li>• Potential for fraud, impersonation, and identity theft</li>
              <li>• Creation of non-consensual deepfakes</li>
              <li>• Spread of misinformation through fake audio</li>
              <li>• Erosion of trust in audio communications</li>
              <li>• Privacy violations and unauthorized voice replication</li>
            </ul>
            <p className="text-sm text-red-800 mt-3">
              <span className="font-semibold">Focus on Defense:</span> Research should prioritize detection and
              prevention technologies to protect individuals and institutions from voice-based attacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
