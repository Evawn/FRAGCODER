/**
 * Suite viewer showing a table of prompts with thumbnails and scores
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadSuite, verifyCompilation } from '@/data/promptEngineeringSuites';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Star, Loader2, ExternalLink } from 'lucide-react';
import type { ResponseSuite, PromptResponse, ResponseScore } from '../../../../prompt-engineering/types';
import { buildChatMessages } from '@/hooks/useResponseScorerState';
import { useThumbnailPool, type ThumbnailResult } from '@/hooks/useThumbnailPool';
import type { TabShaderData } from '@/utils/GLSLCompiler';

interface SuiteViewerProps {
  suiteId: string;
}

function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

/**
 * Determine if a response is explain-only (no code expected)
 * vs code-expecting (should have code, may have failed)
 */
function isExplainOnly(response: PromptResponse): boolean {
  // A response is explain-only if it has no code AND the LLM's classified intent is 'explain'
  return !response.response.code && response.response.intent === 'explain';
}

// Generate thumbnail for a shader using the shared pool
function ShaderThumbnail({
  code,
  promptId,
  isExplainOnlyResponse,
  queueThumbnail,
  onCompilationResult
}: {
  code?: string;
  promptId: string;
  isExplainOnlyResponse: boolean;
  queueThumbnail: (id: string, tabs: TabShaderData[], cb: (result: ThumbnailResult) => void) => void;
  onCompilationResult: (compiled: boolean | null) => void;
}) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    // Explain-only responses: no compilation needed
    if (isExplainOnlyResponse) {
      onCompilationResult(null); // null signals "not applicable"
      return;
    }

    // No code but NOT explain-only = API error or failed generation
    if (!code) {
      onCompilationResult(false);
      return;
    }

    queueThumbnail(
      promptId,
      [{ id: 'image', name: 'Image', code }],
      (result) => {
        setThumbnail(result.url);
        onCompilationResult(result.compiled);
      }
    );
  }, [code, promptId, isExplainOnlyResponse, queueThumbnail, onCompilationResult]);

  // Explain-only: show N/A
  if (isExplainOnlyResponse) {
    return (
      <div className="w-16 h-12 bg-background-highlighted rounded flex items-center justify-center">
        <span className="text-xs text-muted-foreground">N/A</span>
      </div>
    );
  }

  // No code (API error): show error state
  if (!code) {
    return (
      <div className="w-16 h-12 bg-background-highlighted rounded flex items-center justify-center">
        <span className="text-xs text-error">Error</span>
      </div>
    );
  }

  // Loading thumbnail
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
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const s = response.score;
  // Average of all 6 scoring categories (-10 to +10 scale)
  const avg = (
    s.visualQuality +
    s.promptCorrectness +
    s.codeQuality +
    s.explanationQuality +
    s.creativity +
    s.overallSatisfaction
  ) / 6;

  // Color based on -10 to +10 scale
  const colorClass = avg >= 4
    ? 'text-success border-success'
    : avg >= 0
      ? 'text-warning border-warning'
      : 'text-orange-400 border-orange-400';

  const displayValue = avg >= 0 ? `+${avg.toFixed(1)}` : avg.toFixed(1);

  return (
    <Badge variant="outline" className={`text-xs ${colorClass}`}>
      <Star size={12} className="mr-1" />
      {displayValue}
    </Badge>
  );
}

function PromptRow({
  response,
  suiteId,
  index,
  isVerified,
  queueThumbnail,
  onCompilationResult,
}: {
  response: PromptResponse;
  suiteId: string;
  index: number;
  isVerified: boolean;
  queueThumbnail: (id: string, tabs: TabShaderData[], cb: (result: ThumbnailResult) => void) => void;
  onCompilationResult: (promptId: string, compiled: boolean | null) => void;
}) {
  const navigate = useNavigate();
  // null = pending or N/A, true/false = actual result
  const [compilationStatus, setCompilationStatus] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const explainOnly = isExplainOnly(response);

  const handleCompilationResult = useCallback((compiled: boolean | null) => {
    setCompilationStatus(compiled);
    onCompilationResult(response.promptId, compiled);
  }, [onCompilationResult, response.promptId]);

  const handleOpenInEditor = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/new', {
      state: {
        initialCode: response.response.code,
        initialChatMessages: buildChatMessages(response),
      }
    });
  }, [navigate, response]);

  // For verified suites, use stored compilationSuccess
  useEffect(() => {
    if (isVerified) {
      if (explainOnly) {
        setCompilationStatus(null);
      } else {
        setCompilationStatus(response.compilationSuccess);
      }
    }
  }, [isVerified, explainOnly, response.compilationSuccess]);

  return (
    <tr
      onClick={() => navigate(`/debug/prompt-engineering/${suiteId}/${response.promptId}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        {explainOnly ? (
          <span className="text-muted-foreground">—</span>
        ) : compilationStatus === null ? (
          <Loader2 size={18} className="text-muted-foreground inline-block animate-spin" />
        ) : compilationStatus ? (
          <CheckCircle size={18} className="text-success inline-block" />
        ) : (
          <XCircle size={18} className="text-error inline-block" />
        )}
      </td>

      {/* Thumbnail */}
      <td className="px-3 py-3">
        {isVerified ? (
          // For verified suites, show static thumbnail or N/A
          explainOnly ? (
            <div className="w-16 h-12 bg-background-highlighted rounded flex items-center justify-center">
              <span className="text-xs text-muted-foreground">N/A</span>
            </div>
          ) : !response.response.code ? (
            <div className="w-16 h-12 bg-background-highlighted rounded flex items-center justify-center">
              <span className="text-xs text-error">Error</span>
            </div>
          ) : (
            <ShaderThumbnail
              code={response.response.code}
              promptId={response.promptId}
              isExplainOnlyResponse={false}
              queueThumbnail={queueThumbnail}
              onCompilationResult={() => {}} // No-op for verified suites
            />
          )
        ) : (
          <ShaderThumbnail
            code={response.response.code}
            promptId={response.promptId}
            isExplainOnlyResponse={explainOnly}
            queueThumbnail={queueThumbnail}
            onCompilationResult={handleCompilationResult}
          />
        )}
      </td>

      {/* Score */}
      <td className="px-3 py-3">
        <ScoreBadge response={response} />
      </td>

      {/* Latency */}
      <td className="px-3 py-3 text-sm text-muted-foreground text-right">
        {formatLatency(response.latencyMs)}
      </td>

      {/* Actions (visible on hover) */}
      <td className="px-3 py-3 w-10">
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ${isHovered && response.response.code ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleOpenInEditor}
          title="Open in Editor"
        >
          <ExternalLink size={14} />
        </Button>
      </td>
    </tr>
  );
}

export function SuiteViewer({ suiteId }: SuiteViewerProps) {
  const [suite, setSuite] = useState<ResponseSuite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track compilation results: promptId -> true/false/null (null = explain-only, not counted)
  const [compilationResults, setCompilationResults] = useState<Record<string, boolean | null>>({});
  const { queueThumbnail } = useThumbnailPool();
  const verificationSentRef = useRef(false);

  const handleCompilationResult = useCallback((promptId: string, compiled: boolean | null) => {
    setCompilationResults(prev => ({ ...prev, [promptId]: compiled }));
  }, []);

  useEffect(() => {
    const fetchSuite = async () => {
      try {
        setIsLoading(true);
        setError(null);
        verificationSentRef.current = false;
        setCompilationResults({});
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

  // Handle one-time verification after all compilation results are in
  useEffect(() => {
    if (!suite || suite.metadata.compilationVerified || verificationSentRef.current) {
      return;
    }

    // Count responses that need compilation (not explain-only)
    const responsesExpectingCode = suite.responses.filter(r => !isExplainOnly(r));
    const totalExpectingCode = responsesExpectingCode.length;

    // Check if all code-expecting responses have been processed
    const processedCodeResponses = Object.entries(compilationResults).filter(
      ([promptId]) => {
        const response = suite.responses.find(r => r.promptId === promptId);
        return response && !isExplainOnly(response);
      }
    );

    if (processedCodeResponses.length < totalExpectingCode) {
      return; // Not all done yet
    }

    // All done - calculate stats and send verification
    verificationSentRef.current = true;

    const successCount = processedCodeResponses.filter(([, compiled]) => compiled === true).length;

    // Build auto-scores for failed compilations
    const failedPromptScores: Array<{ promptId: string; score: ResponseScore }> = [];
    for (const response of suite.responses) {
      if (isExplainOnly(response)) continue;

      const compiled = compilationResults[response.promptId];
      if (compiled === false && !response.score) {
        failedPromptScores.push({
          promptId: response.promptId,
          score: {
            visualQuality: -10,
            promptCorrectness: -10,
            codeQuality: -10,
            explanationQuality: -10,
            creativity: -10,
            overallSatisfaction: -10,
            scoredAt: new Date().toISOString(),
            notes: 'Auto-scored: compilation failed',
          },
        });
      }
    }

    // Send verification to backend
    verifyCompilation(suiteId, {
      successfulCompilations: successCount,
      responsesExpectingCode: totalExpectingCode,
      failedPromptScores,
    }).then(() => {
      // Reload suite to get updated data
      loadSuite(suiteId).then(updated => setSuite(updated));
    }).catch(err => {
      console.error('Failed to verify compilation:', err);
    });
  }, [suite, suiteId, compilationResults]);

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

  const isVerified = suite.metadata.compilationVerified === true;

  // Calculate compilation stats
  let successRate: number | null = null;
  let completedCount = 0;
  let totalExpectingCode = 0;

  if (isVerified) {
    // Use stored metadata for verified suites
    totalExpectingCode = suite.metadata.responsesExpectingCode ?? suite.metadata.totalPrompts;
    completedCount = totalExpectingCode;
    successRate = totalExpectingCode > 0
      ? Math.round((suite.metadata.successfulCompilations / totalExpectingCode) * 100)
      : null;
  } else {
    // Calculate dynamically from thumbnail generation
    const responsesExpectingCode = suite.responses.filter(r => !isExplainOnly(r));
    totalExpectingCode = responsesExpectingCode.length;

    // Count completed (only code-expecting responses)
    const codeResultEntries = Object.entries(compilationResults).filter(([promptId]) => {
      const response = suite.responses.find(r => r.promptId === promptId);
      return response && !isExplainOnly(response);
    });
    completedCount = codeResultEntries.length;

    const successCount = codeResultEntries.filter(([, compiled]) => compiled === true).length;
    const isComplete = completedCount === totalExpectingCode;

    successRate = isComplete && totalExpectingCode > 0
      ? Math.round((successCount / totalExpectingCode) * 100)
      : null;
  }

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
            {successRate !== null ? (
              <span className={successRate >= 80 ? 'text-success' : 'text-error'}>
                {successRate}%
              </span>
            ) : (
              <span className="text-muted-foreground">
                {completedCount}/{totalExpectingCode}
              </span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Avg Latency: </span>
            <span className="text-foreground">{formatLatency(suite.metadata.averageLatencyMs)}</span>
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
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {suite.responses.map((response, index) => (
              <PromptRow
                key={response.promptId}
                response={response}
                suiteId={suiteId}
                index={index}
                isVerified={isVerified}
                queueThumbnail={queueThumbnail}
                onCompilationResult={handleCompilationResult}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
