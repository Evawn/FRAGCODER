/**
 * List of all available response suites
 * Entry point for the prompt engineering debug UI
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSuiteSummaries, type SuiteSummary } from '@/data/promptEngineeringSuites';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Star, Plus, Loader2 } from 'lucide-react';
import { NewSuiteDialog } from './NewSuiteDialog';
import { SuiteRunProgress } from './SuiteRunProgress';
import type { ResponseSuite } from '../../../../prompt-engineering/types';

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SuiteCard({ suite }: { suite: SuiteSummary }) {
  const successRate = suite.metadata.totalPrompts > 0
    ? Math.round((suite.metadata.successfulCompilations / suite.metadata.totalPrompts) * 100)
    : 0;

  return (
    <Link
      to={`/debug/prompt-engineering/${suite.id}`}
      className="block p-4 border border-lines rounded-lg hover:border-accent transition-colors bg-background-header"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-foreground-highlighted">{suite.description}</h3>
        <Badge variant="outline" className="text-xs font-mono">
          {suite.model}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {formatDate(suite.createdAt)}
      </p>

      <div className="flex flex-wrap gap-3 text-sm">
        {/* Compilation Success */}
        <div className="flex items-center gap-1.5">
          {successRate >= 80 ? (
            <CheckCircle size={14} className="text-success" />
          ) : (
            <XCircle size={14} className="text-error" />
          )}
          <span className="text-foreground">
            {suite.metadata.successfulCompilations}/{suite.metadata.totalPrompts} compiled
          </span>
        </div>

        {/* Average Latency */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock size={14} />
          <span>{suite.metadata.averageLatencyMs}ms avg</span>
        </div>

        {/* Scored */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Star size={14} className={suite.averageScore ? 'text-accent' : ''} />
          <span>
            {suite.metadata.scoredCount}/{suite.metadata.totalPrompts} scored
            {suite.averageScore && ` (${suite.averageScore.toFixed(1)}/5)`}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function SuiteList() {
  const navigate = useNavigate();
  const [suites, setSuites] = useState<SuiteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runningDescription, setRunningDescription] = useState('');

  // Fetch suites on mount
  useEffect(() => {
    loadSuites();
  }, []);

  const loadSuites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSuiteSummaries();
      setSuites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuiteCreated = (suite: ResponseSuite) => {
    // Add new suite to the top of the list
    setSuites(prev => [{
      id: suite.id,
      description: suite.description,
      model: suite.model,
      createdAt: suite.createdAt,
      metadata: suite.metadata,
      averageScore: undefined,
    }, ...prev]);

    // Navigate to the new suite
    navigate(`/debug/prompt-engineering/${suite.id}`);
  };

  const handleRunningChange = (running: boolean) => {
    setIsRunning(running);
  };

  const handleDialogOpen = () => {
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground-highlighted mb-2">
              Prompt Engineering Evaluation
            </h1>
            <p className="text-muted-foreground">
              Review and score AI responses from test suite runs.
            </p>
          </div>
          <Button
            onClick={handleDialogOpen}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Run new test suite...
          </Button>
        </div>
      </div>

      {/* Progress indicator when running */}
      {isRunning && (
        <SuiteRunProgress description={runningDescription} />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="border border-error rounded-lg p-4 bg-error/10 text-center">
          <p className="text-error">{error}</p>
          <Button variant="outline" onClick={loadSuites} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && suites.length === 0 && (
        <div className="border border-dashed border-lines rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-2">No response suites found.</p>
          <p className="text-sm text-muted-foreground mb-4">
            Click the button above to run your first test suite.
          </p>
          <Button onClick={handleDialogOpen} disabled={isRunning}>
            <Plus size={16} className="mr-2" />
            Run new test suite...
          </Button>
        </div>
      )}

      {/* Suite list */}
      {!isLoading && !error && suites.length > 0 && (
        <div className="space-y-3">
          {suites.map(suite => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
      )}

      {/* New Suite Dialog */}
      <NewSuiteDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setRunningDescription('');
          }
        }}
        onSuiteCreated={handleSuiteCreated}
        onRunningChange={handleRunningChange}
      />
    </div>
  );
}
