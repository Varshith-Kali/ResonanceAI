import { Activity, TrendingUp, Waves } from 'lucide-react';

interface FeatureDisplayProps {
  features: {
    mfcc?: number[];
    pitch?: number[];
    formants?: number[];
    spectral_centroid?: number;
    zero_crossing_rate?: number;
  };
}

export default function FeatureDisplay({ features }: FeatureDisplayProps) {
  const formatArray = (arr: number[] | undefined, limit: number = 5) => {
    if (!arr || arr.length === 0) return 'N/A';
    return arr.slice(0, limit).map(v => v.toFixed(3)).join(', ') + '...';
  };

  const featureCards = [
    {
      title: 'MFCC (Mel-Frequency Cepstral Coefficients)',
      icon: Waves,
      value: formatArray(features.mfcc, 8),
      description: 'Represents the short-term power spectrum of sound, widely used in speech recognition.',
      color: 'blue'
    },
    {
      title: 'Pitch Contour',
      icon: TrendingUp,
      value: formatArray(features.pitch, 6),
      description: 'Fundamental frequency variations over time, indicates speaker prosody and intonation.',
      color: 'green'
    },
    {
      title: 'Formant Frequencies',
      icon: Activity,
      value: formatArray(features.formants, 5),
      description: 'Resonant frequencies of the vocal tract, critical for vowel identification.',
      color: 'purple'
    },
    {
      title: 'Spectral Centroid',
      icon: Activity,
      value: features.spectral_centroid?.toFixed(2) || 'N/A',
      description: 'Center of mass of the spectrum, indicates where most energy is concentrated.',
      color: 'orange'
    },
    {
      title: 'Zero Crossing Rate',
      icon: Waves,
      value: features.zero_crossing_rate?.toFixed(4) || 'N/A',
      description: 'Rate at which signal changes sign, useful for distinguishing voiced vs unvoiced speech.',
      color: 'cyan'
    }
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    cyan: 'bg-cyan-100 text-cyan-700'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Extracted Audio Features</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {featureCards.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${colorMap[feature.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm mb-1">{feature.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">{feature.description}</p>
                  <div className="bg-gray-50 rounded px-3 py-2 mt-2">
                    <code className="text-xs text-gray-800 font-mono break-all">
                      {feature.value}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Educational Note:</span> These acoustic features are commonly used in voice authentication,
          speaker recognition, and synthetic speech detection systems. Each feature captures different aspects of the audio signal's
          characteristics.
        </p>
      </div>
    </div>
  );
}
