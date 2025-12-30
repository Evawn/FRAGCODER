/**
 * useResponseScorerState Hook
 * Manages data loading, navigation, and scoring state for ResponseScorer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSuite, saveScore } from '@/data/promptEngineeringSuites';
import type { ResponseSuite, PromptResponse, ResponseScore } from '../../../../prompt-engineering/types';
import type { ChatMessageNode, CodeArtifact } from '@/types/chat';
import type { ChatHistoryEntry } from '@fragcoder/shared';

export type ScoreCategory = 'visualQuality' | 'promptCorrectness' | 'codeQuality' | 'explanationQuality' | 'creativity' | 'overallSatisfaction';

const DEFAULT_SCORES: Record<ScoreCategory, number> = {
  visualQuality: 0,
  promptCorrectness: 0,
  codeQuality: 0,
  explanationQuality: 0,
  creativity: 0,
  overallSatisfaction: 0,
};

interface UseResponseScorerStateProps {
  suiteId: string;
  promptId: string;
}

interface UseResponseScorerStateReturn {
  // Data
  suite: ResponseSuite | null;
  response: PromptResponse | null;
  currentIndex: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // Navigation
  goToNext: () => void;
  goToPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;

  // Scoring
  scores: Record<ScoreCategory, number>;
  notes: string;
  setScore: (category: ScoreCategory, value: number) => void;
  setNotes: (notes: string) => void;
  saveScore: () => Promise<void>;
  isSaving: boolean;
  hasChanges: boolean;
  saveSuccess: boolean;
  avgScore: number;

  // Chat messages (constructed from response data)
  chatMessages: ChatMessageNode[];
}

/**
 * Build chat messages from a PromptResponse
 * Reconstructs conversation from trace history + prompt + AI response
 * Accepts optional thumbnails for code artifacts
 */
export function buildChatMessages(
  response: PromptResponse,
  thumbnails?: { user?: string; assistant?: string }
): ChatMessageNode[] {
  const messages: ChatMessageNode[] = [];
  let messageId = 0;
  const nextId = () => `msg-${messageId++}`;

  // 1. Add prior history from trace (if available)
  // The code and history are in the engineerPrompt step (index 2)
  const engineerPromptInput = response.trace?.steps.find(s => s.stepName === 'engineerPrompt')?.input as { history?: ChatHistoryEntry[]; code?: string } | undefined;
  const history = engineerPromptInput?.history;

  if (history && history.length > 0) {
    for (const entry of history) {
      const userId = nextId();
      const assistantId = nextId();
      const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;

      // User message from history
      messages.push({
        id: userId,
        parentId: lastId,
        from: 'user',
        content: entry.userPrompt,
        timestamp: Date.now() - 1000, // Slightly in the past
      });

      // Assistant response from history
      messages.push({
        id: assistantId,
        parentId: userId,
        from: 'assistant',
        content: entry.aiExplanation,
        timestamp: Date.now() - 500,
      });
    }
  }

  // 2. Add the actual prompt as final user message
  const userCode = engineerPromptInput?.code;
  const userMsgId = nextId();
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;

  const userCodeArtifact: CodeArtifact | undefined = userCode ? {
    id: nextId(),
    type: 'user-context',
    code: userCode,
    label: 'Code sent',
    thumbnail: thumbnails?.user,
  } : undefined;

  messages.push({
    id: userMsgId,
    parentId: lastMsgId,
    from: 'user',
    content: response.prompt.input.prompt,
    timestamp: Date.now() - 100,
    codeArtifact: userCodeArtifact,
  });

  // 3. Add AI response as final assistant message
  const aiCodeArtifact: CodeArtifact | undefined = response.response.code ? {
    id: nextId(),
    type: 'generated',
    code: response.response.code,
    label: 'Generated shader',
    thumbnail: thumbnails?.assistant,
  } : undefined;

  messages.push({
    id: nextId(),
    parentId: userMsgId,
    from: 'assistant',
    content: response.response.explanation,
    timestamp: Date.now(),
    codeArtifact: aiCodeArtifact,
  });

  return messages;
}

export function useResponseScorerState({
  suiteId,
  promptId,
}: UseResponseScorerStateProps): UseResponseScorerStateReturn {
  const navigate = useNavigate();

  // Data state
  const [suite, setSuite] = useState<ResponseSuite | null>(null);
  const [response, setResponse] = useState<PromptResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scoring state
  const [scores, setScores] = useState<Record<ScoreCategory, number>>(DEFAULT_SCORES);
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Chat messages (derived from response)
  const [chatMessages, setChatMessages] = useState<ChatMessageNode[]>([]);

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

          // Build chat messages from response
          setChatMessages(buildChatMessages(resp));

          // Load existing score if present
          if (resp.score) {
            setScores({
              visualQuality: resp.score.visualQuality,
              promptCorrectness: resp.score.promptCorrectness,
              codeQuality: resp.score.codeQuality,
              explanationQuality: resp.score.explanationQuality,
              creativity: resp.score.creativity,
              overallSatisfaction: resp.score.overallSatisfaction,
            });
            setNotes(resp.score.notes || '');
          } else {
            setScores(DEFAULT_SCORES);
            setNotes('');
          }
          setHasChanges(false);
          setSaveSuccess(false);
        } else {
          setResponse(null);
          setChatMessages([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load suite');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuite();
  }, [suiteId, promptId]);

  // Navigation
  const goToNext = useCallback(() => {
    if (suite && currentIndex < suite.responses.length - 1) {
      const nextResp = suite.responses[currentIndex + 1];
      navigate(`/debug/prompt-engineering/${suiteId}/${nextResp.promptId}`);
    }
  }, [suite, currentIndex, suiteId, navigate]);

  const goToPrevious = useCallback(() => {
    if (suite && currentIndex > 0) {
      const prevResp = suite.responses[currentIndex - 1];
      navigate(`/debug/prompt-engineering/${suiteId}/${prevResp.promptId}`);
    }
  }, [suite, currentIndex, suiteId, navigate]);

  // Score changes
  const setScore = useCallback((category: ScoreCategory, value: number) => {
    setScores(prev => ({ ...prev, [category]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleSetNotes = useCallback((newNotes: string) => {
    setNotes(newNotes);
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  // Save score
  const handleSaveScore = useCallback(async () => {
    if (!suite || !response) return;

    const newScore: ResponseScore = {
      visualQuality: scores.visualQuality,
      promptCorrectness: scores.promptCorrectness,
      codeQuality: scores.codeQuality,
      explanationQuality: scores.explanationQuality,
      creativity: scores.creativity,
      overallSatisfaction: scores.overallSatisfaction,
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
  }, [suite, response, scores, notes, suiteId, promptId]);

  // Auto-save with 500ms debounce when scores or notes change
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't auto-save if nothing has changed or no response loaded
    if (!hasChanges || !response) return;

    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for 500ms debounce
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveScore();
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [scores, notes, hasChanges, handleSaveScore, response]);

  // Computed values
  const avgScore = (
    scores.visualQuality +
    scores.promptCorrectness +
    scores.codeQuality +
    scores.explanationQuality +
    scores.creativity +
    scores.overallSatisfaction
  ) / 6;
  const canGoNext = suite ? currentIndex < suite.responses.length - 1 : false;
  const canGoPrevious = currentIndex > 0;
  const totalCount = suite?.responses.length ?? 0;

  return {
    // Data
    suite,
    response,
    currentIndex,
    totalCount,
    isLoading,
    error,

    // Navigation
    goToNext,
    goToPrevious,
    canGoNext,
    canGoPrevious,

    // Scoring
    scores,
    notes,
    setScore,
    setNotes: handleSetNotes,
    saveScore: handleSaveScore,
    isSaving,
    hasChanges,
    saveSuccess,
    avgScore,

    // Chat
    chatMessages,
  };
}
