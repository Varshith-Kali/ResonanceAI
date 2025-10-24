import { useEffect, useState } from 'react';
import { Clock, FileAudio, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { AudioAnalysis, getAudioAnalyses } from '../lib/localStorage';

export default function AnalysisHistory() {
  const [analyses, setAnalyses] = useState<AudioAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = () => {
    try {
      const data = getAudioAnalyses();
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading analysis history...</p>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <FileAudio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analyses Yet</h3>
        <p className="text-gray-600">Upload and analyze audio files to see your history here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Clock className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Analysis History</h3>
        </div>
        <div className="text-sm text-gray-500">
          {filteredAnalyses.length} of {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'}
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('synthetic')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'synthetic'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Synthetic
            </button>
            <button
              onClick={() => setFilterType('authentic')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'authentic'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Authentic
            </button>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Date</option>
              <option value="confidence">Confidence</option>
              <option value="duration">Duration</option>
            </select>
          </div>
        </div>
      </div>

      {filteredAnalyses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No analyses match your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnalyses.map((analysis) => (
          <div
            key={analysis.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <FileAudio className="w-5 h-5 text-gray-400" />
                  <h4 className="font-medium text-gray-900">{analysis.file_name}</h4>
                  {analysis.is_synthetic ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Synthetic
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Authentic
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {formatDuration(Number(analysis.duration))}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Sample Rate:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {(Number(analysis.sample_rate) / 1000).toFixed(1)} kHz
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Confidence:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {(Number(analysis.confidence_score) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {(analysis.file_size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Analyzed on {formatDate(analysis.created_at)}
                </div>
              </div>

              <div className="ml-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-gray-50">
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
