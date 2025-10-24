import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface DetectionPanelProps {
  isSynthetic: boolean;
  confidence: number;
  modelName: string;
  features?: {
    prosodyScore?: number;
    spectralArtifactScore?: number;
    naturalness?: number;
  };
}

export default function DetectionPanel({ isSynthetic, confidence, modelName, features }: DetectionPanelProps) {
  const confidencePercent = (confidence * 100).toFixed(1);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Shield className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Synthetic Audio Detection</h3>
      </div>

      <div className={`rounded-lg p-6 mb-6 ${
        isSynthetic
          ? 'bg-red-50 border-2 border-red-200'
          : 'bg-green-50 border-2 border-green-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {isSynthetic ? (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
            <div>
              <h4 className={`text-xl font-bold ${
                isSynthetic ? 'text-red-900' : 'text-green-900'
              }`}>
                {isSynthetic ? 'Synthetic Audio Detected' : 'Authentic Audio'}
              </h4>
              <p className={`text-sm ${
                isSynthetic ? 'text-red-700' : 'text-green-700'
              }`}>
                {isSynthetic
                  ? 'This audio shows characteristics of AI-generated or cloned speech'
                  : 'This audio appears to be genuine human speech'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Confidence Level</span>
              <span className="text-lg font-bold text-gray-900">{confidencePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  isSynthetic ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Detection Model:</span> {modelName}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
            <Info className="w-4 h-4" />
            <span>Detection Indicators</span>
          </h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Spectral anomalies in high-frequency bands</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Unnatural pitch contour patterns</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Inconsistent formant transitions</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Temporal artifacts in prosody</span>
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <span className="font-semibold">Research Disclaimer:</span> This detection system is for educational
            and research purposes. Detection accuracy varies based on the sophistication of synthesis methods.
            Always verify critical audio through multiple methods.
          </p>
        </div>
      </div>
    </div>
  );
}
