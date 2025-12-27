/**
 * Response scorer - view and score individual AI responses
 * Shows shader preview, code, explanation, and scoring form
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadSuite, saveScore } from '@/data/promptEngineeringSuites';
import { MiniShaderPlayer } from './MiniShaderPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { ResponseSuite, PromptResponse, ResponseScore } from '../../../../prompt-engineering/types';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { glsl } from '@/utils/GLSLLanguage';
import { EditorView } from '@codemirror/view';

interface ResponseScorerProps {
  suiteId: string;
  promptId: string;
}

type ScoreCategory = 'visualQuality' | 'accuracy' | 'explanationQuality' | 'codeQuality';

const SCORE_LABELS: Record<ScoreCategory, { label: string; description: string }> = {
  visualQuality: {
    label: 'Visual Quality',
    description: 'How visually appealing is the result?',
  },
  accuracy: {
    label: 'Accuracy',
    description: 'Does it match the prompt request?',
  },
  explanationQuality: {
    label: 'Explanation',
    description: 'Is the explanation clear and helpful?',
  },
  codeQuality: {
    label: 'Code Quality',
    description: 'Is the code clean and efficient?',
  },
};

const SCORE_DESCRIPTIONS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

function ScoreSlider({
  category,
  value,
  onChange,
}: {
  category: ScoreCategory;
  value: number;
  onChange: (value: number) => void;
}) {
  const info = SCORE_LABELS[category];

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-foreground">{info.label}</label>
        <span className="text-sm text-muted-foreground">
          {value}/5 - {SCORE_DESCRIPTIONS[value]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{info.description}</p>
      <Slider
        value={[value]}
        min={1}
        max={5}
        step={1}
        onValueChange={([v]) => onChange(v)}
        className="py-2"
      />
    </div>
  );
}

export function ResponseScorer({ suiteId, promptId }: ResponseScorerProps) {
  const navigate = useNavigate();
  const [suite, setSuite] = useState<ResponseSuite | null>(null);
  const [response, setResponse] = useState<PromptResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scoring state
  const [scores, setScores] = useState<Record<ScoreCategory, number>>({
    visualQuality: 3,
    accuracy: 3,
    explanationQuality: 3,
    codeQuality: 3,
  });
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load suite and find response
  useEffect(() => {
    const fetchSuite = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loaded = await loadSuite(suiteId);
        setSuite(loaded);
        const idx = loaded.responses.findIndex(r => r.promptId === promptId);
        if (idx >= 0) {
          setCurrentIndex(idx);
          const resp = loaded.responses[idx];
          setResponse(resp);

          // Load existing score if present
          if (resp.score) {
            setScores({
              visualQuality: resp.score.visualQuality,
              accuracy: resp.score.accuracy,
              explanationQuality: resp.score.explanationQuality,
              codeQuality: resp.score.codeQuality,
            });
            setNotes(resp.score.notes || '');
          } else {
            setScores({ visualQuality: 3, accuracy: 3, explanationQuality: 3, codeQuality: 3 });
            setNotes('');
          }
          setHasChanges(false);
          setSaveSuccess(false);
        } else {
          setResponse(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load suite');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuite();
  }, [suiteId, promptId]);

  // Navigate to adjacent responses
  const goToResponse = useCallback((index: number) => {
    if (suite && index >= 0 && index < suite.responses.length) {
      const resp = suite.responses[index];
      navigate(`/debug/prompt-engineering/${suiteId}/${resp.promptId}`);
    }
  }, [suite, suiteId, navigate]);

  // Handle score changes
  const handleScoreChange = (category: ScoreCategory, value: number) => {
    setScores(prev => ({ ...prev, [category]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Save score via API
  const handleSave = async () => {
    if (!suite || !response) return;

    const newScore: ResponseScore = {
      visualQuality: scores.visualQuality as 1 | 2 | 3 | 4 | 5,
      accuracy: scores.accuracy as 1 | 2 | 3 | 4 | 5,
      explanationQuality: scores.explanationQuality as 1 | 2 | 3 | 4 | 5,
      codeQuality: scores.codeQuality as 1 | 2 | 3 | 4 | 5,
      notes: notes || undefined,
      scoredAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await saveScore(suiteId, promptId, newScore);
      setHasChanges(false);
      setSaveSuccess(true);

      // Update local state to reflect saved score
      setResponse(prev => prev ? { ...prev, score: newScore } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save score');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Link
          to={`/debug/prompt-engineering/${suiteId}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to suite
        </Link>
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !suite || !response) {
    return (
      <div className="p-6">
        <Link
          to={`/debug/prompt-engineering/${suiteId}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to suite
        </Link>
        <div className="mt-6 border border-dashed border-lines rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{error || 'Response not found'}</p>
        </div>
      </div>
    );
  }

  const avgScore = (scores.visualQuality + scores.accuracy + scores.explanationQuality + scores.codeQuality) / 4;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-lines px-4 py-3 flex items-center justify-between bg-background-header">
        <div className="flex items-center gap-4">
          <Link
            to={`/debug/prompt-engineering/${suiteId}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-foreground">
            {currentIndex + 1} of {suite.responses.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToResponse(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ArrowLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToResponse(currentIndex + 1)}
            disabled={currentIndex >= suite.responses.length - 1}
          >
            <ArrowRight size={16} />
          </Button>
        </div>
      </header>

      {/* Main content - 70% scale container */}
      <div className="flex-1 overflow-hidden p-4">
        <div
          className="h-full mx-auto flex gap-4"
          style={{ maxWidth: '1400px', transform: 'scale(0.95)', transformOrigin: 'top center' }}
        >
          {/* Left: Shader preview + code */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Prompt info */}
            <div className="bg-background-header rounded-lg p-4 border border-lines">
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-semibold text-foreground-highlighted">Prompt</h2>
                <div className="flex gap-1">
                  {response.prompt.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-sm text-foreground">{response.prompt.input.prompt}</p>
              {response.prompt.expectedBehavior && (
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Expected:</strong> {response.prompt.expectedBehavior}
                </p>
              )}
            </div>

            {/* Shader preview */}
            <div className="h-64 bg-black rounded-lg overflow-hidden border border-lines">
              {response.response.code ? (
                <MiniShaderPlayer code={response.response.code} autoPlay={true} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No code generated (explain intent)
                </div>
              )}
            </div>

            {/* Code display */}
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-lines">
              <div className="bg-background-header px-3 py-2 border-b border-lines flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Generated Code</span>
                <div className="flex items-center gap-2">
                  {response.compilationSuccess ? (
                    <Badge variant="outline" className="text-xs text-success border-success">
                      <CheckCircle size={12} className="mr-1" />
                      Compiled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-error border-error">
                      <XCircle size={12} className="mr-1" />
                      Failed
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{response.latencyMs}ms</span>
                </div>
              </div>
              <div className="h-[calc(100%-40px)] overflow-auto">
                <CodeMirror
                  value={response.response.code || '// No code generated'}
                  theme={oneDark}
                  extensions={[
                    glsl(),
                    EditorView.editable.of(false),
                    EditorView.lineWrapping,
                  ]}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: false,
                    highlightActiveLine: false,
                  }}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Right: Explanation + Scoring */}
          <div className="w-80 flex flex-col gap-4">
            {/* Explanation */}
            <div className="bg-background-header rounded-lg p-4 border border-lines max-h-48 overflow-auto">
              <h3 className="font-semibold text-foreground-highlighted mb-2">AI Explanation</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {response.response.explanation}
              </p>
            </div>

            {/* Scoring form */}
            <div className="flex-1 bg-background-header rounded-lg p-4 border border-lines overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground-highlighted">Score</h3>
                <Badge
                  variant="outline"
                  className={`text-sm ${avgScore >= 4 ? 'text-success border-success' : avgScore >= 3 ? 'text-accent border-accent' : 'text-error border-error'}`}
                >
                  {avgScore.toFixed(1)}/5
                </Badge>
              </div>

              <div className="space-y-6">
                {(Object.keys(SCORE_LABELS) as ScoreCategory[]).map(category => (
                  <ScoreSlider
                    key={category}
                    category={category}
                    value={scores[category]}
                    onChange={(v) => handleScoreChange(category, v)}
                  />
                ))}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setHasChanges(true);
                      setSaveSuccess(false);
                    }}
                    placeholder="Additional observations..."
                    className="h-20 resize-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle size={16} className="mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save Score
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
