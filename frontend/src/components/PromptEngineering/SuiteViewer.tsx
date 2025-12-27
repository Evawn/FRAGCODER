/**
 * Suite viewer showing a table of prompts with thumbnails and scores
 */

import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadSuite } from '@/data/promptEngineeringSuites';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Star, Loader2 } from 'lucide-react';
import type { ResponseSuite, PromptResponse } from '../../../../prompt-engineering/types';
import { ThumbnailRenderer } from '@/utils/ThumbnailRenderer';

interface SuiteViewerProps {
  suiteId: string;
}

// Generate thumbnail for a shader
function ShaderThumbnail({ code, promptId }: { code?: string; promptId: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const thumbnailRendererRef = useRef<ThumbnailRenderer | null>(null);

  useEffect(() => {
    if (!code) return;

    // Get or create thumbnail renderer
    if (!thumbnailRendererRef.current) {
      thumbnailRendererRef.current = new ThumbnailRenderer();
    }

    // Use callback-based queueThumbnail method
    thumbnailRendererRef.current.queueThumbnail(
      promptId,
      [{ id: 'image', name: 'Image', code }],
      (dataURL) => setThumbnail(dataURL)
    );

    return () => {
      thumbnailRendererRef.current?.dispose();
      thumbnailRendererRef.current = null;
    };
  }, [code, promptId]);

  if (!code) {
    return (
      <div className="w-16 h-12 bg-background-highlighted rounded flex items-center justify-center">
        <span className="text-xs text-muted-foreground">N/A</span>
      </div>
    );
  }

  if (!thumbnail) {
    return (
      <div className="w-16 h-12 bg-background-highlighted rounded flex items-center justify-center">
        <span className="text-xs text-muted-foreground">...</span>
      </div>
    );
  }

  return (
    <img
      src={thumbnail}
      alt="Shader preview"
      className="w-16 h-12 object-cover rounded"
    />
  );
}

function ScoreBadge({ response }: { response: PromptResponse }) {
  if (!response.score) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Not scored
      </Badge>
    );
  }

  const s = response.score;
  const avg = (s.visualQuality + s.accuracy + s.explanationQuality + s.codeQuality) / 4;

  return (
    <Badge
      variant="outline"
      className={`text-xs ${avg >= 4 ? 'text-success border-success' : avg >= 3 ? 'text-accent border-accent' : 'text-error border-error'}`}
    >
      <Star size={12} className="mr-1" />
      {avg.toFixed(1)}/5
    </Badge>
  );
}

function PromptRow({
  response,
  suiteId,
  index,
}: {
  response: PromptResponse;
  suiteId: string;
  index: number;
}) {
  const navigate = useNavigate();

  return (
    <tr
      onClick={() => navigate(`/debug/prompt-engineering/${suiteId}/${response.promptId}`)}
      className="border-b border-lines hover:bg-background-highlighted cursor-pointer transition-colors"
    >
      {/* Index */}
      <td className="px-3 py-3 text-sm text-muted-foreground w-12">
        {index + 1}
      </td>

      {/* Prompt */}
      <td className="px-3 py-3">
        <div className="max-w-md">
          <p className="text-sm text-foreground truncate">
            {response.prompt.input.prompt}
          </p>
          <div className="flex gap-1 mt-1">
            {response.prompt.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </td>

      {/* Compilation Status */}
      <td className="px-3 py-3 text-center">
        {response.compilationSuccess ? (
          <CheckCircle size={18} className="text-success inline-block" />
        ) : (
          <XCircle size={18} className="text-error inline-block" />
        )}
      </td>

      {/* Thumbnail */}
      <td className="px-3 py-3">
        <ShaderThumbnail code={response.response.code} promptId={response.promptId} />
      </td>

      {/* Score */}
      <td className="px-3 py-3">
        <ScoreBadge response={response} />
      </td>

      {/* Latency */}
      <td className="px-3 py-3 text-sm text-muted-foreground text-right">
        {response.latencyMs}ms
      </td>
    </tr>
  );
}

export function SuiteViewer({ suiteId }: SuiteViewerProps) {
  const [suite, setSuite] = useState<ResponseSuite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuite = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loaded = await loadSuite(suiteId);
        setSuite(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load suite');
        setSuite(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuite();
  }, [suiteId]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Link
          to="/debug/prompt-engineering"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} />
          Back to suites
        </Link>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !suite) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Link
          to="/debug/prompt-engineering"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} />
          Back to suites
        </Link>
        <div className="border border-dashed border-lines rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{error || `Suite not found: ${suiteId}`}</p>
        </div>
      </div>
    );
  }

  const successRate = suite.metadata.totalPrompts > 0
    ? Math.round((suite.metadata.successfulCompilations / suite.metadata.totalPrompts) * 100)
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/debug/prompt-engineering"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} />
          Back to suites
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground-highlighted mb-1">
              {suite.description}
            </h1>
            <p className="text-muted-foreground">
              {new Date(suite.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant="outline" className="font-mono">
            {suite.model}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Compilation: </span>
            <span className={successRate >= 80 ? 'text-success' : 'text-error'}>
              {successRate}%
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Latency: </span>
            <span className="text-foreground">{suite.metadata.averageLatencyMs}ms</span>
          </div>
          <div>
            <span className="text-muted-foreground">Scored: </span>
            <span className="text-foreground">
              {suite.metadata.scoredCount}/{suite.metadata.totalPrompts}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-lines rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-background-header border-b border-lines">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-12">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Prompt</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-20">Compiled</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-20">Preview</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-24">Score</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-20">Latency</th>
            </tr>
          </thead>
          <tbody>
            {suite.responses.map((response, index) => (
              <PromptRow
                key={response.promptId}
                response={response}
                suiteId={suiteId}
                index={index}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
