'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  ChatMessageNode,
  CodeArtifact,
  TaskState,
  TaskStep,
  BranchInfo,
} from '../../../types/chat';

/**
 * Initial task state when idle
 */
const INITIAL_TASK_STATE: TaskState = {
  status: 'idle',
  steps: [],
};

/**
 * Create the default task steps for the AI pipeline
 * @param attempt - Optional current attempt number for retry indication
 * @param maxAttempts - Optional max attempts for retry indication
 */
function createPipelineSteps(attempt?: number, maxAttempts?: number): TaskStep[] {
  // Show attempt indicator if we're in a retry scenario (maxAttempts > 1)
  const showAttempt = attempt !== undefined && maxAttempts !== undefined && maxAttempts > 1;
  const attemptSuffix = showAttempt ? ` (Attempt ${attempt}/${maxAttempts})` : '';

  return [
    { id: 'generate', label: `Generating shader${attemptSuffix}...`, status: 'pending' },
    { id: 'compile', label: 'Compiling GLSL...', status: 'pending' },
  ];
}

/**
 * Custom hook for managing conversation state with branching support
 * Uses a tree structure where messages reference their parent via parentId
 */
export function useChatState() {
  // All messages stored flat, tree structure via parentId
  const [messages, setMessages] = useState<ChatMessageNode[]>([]);

  // Track which branch is active for each user message that has multiple branches
  const [activeBranches, setActiveBranches] = useState<Map<string, number>>(new Map());

  // Current task state (thinking/compiling progress)
  const [taskState, setTaskState] = useState<TaskState>(INITIAL_TASK_STATE);

  /**
   * Get all assistant responses for a given user message
   */
  const getAssistantResponses = useCallback((userMessageId: string): ChatMessageNode[] => {
    return messages.filter(m => m.parentId === userMessageId && m.from === 'assistant');
  }, [messages]);

  /**
   * Get branch info for a user message
   */
  const getBranchInfo = useCallback((userMessageId: string): BranchInfo => {
    const msg = messages.find(m => m.id === userMessageId);
    if (!msg) return { count: 1, activeIndex: 0 };

    // Find siblings (same parentId, same from type)
    const siblings = messages.filter(
      m => m.parentId === msg.parentId && m.from === 'user'
    );

    const count = siblings.length;
    const activeIndex = activeBranches.get(msg.parentId ?? 'root') ?? 0;

    return { count, activeIndex };
  }, [messages, activeBranches]);

  /**
   * Compute the flattened display messages based on active branches
   * This traverses the tree and picks the active branch at each level
   * Note: Each user message has at most one assistant response (no assistant branching)
   */
  const displayMessages = useMemo((): ChatMessageNode[] => {
    const result: ChatMessageNode[] = [];

    // Start with root-level user messages (parentId === null)
    const rootUserMessages = messages.filter(m => m.parentId === null && m.from === 'user');

    if (rootUserMessages.length === 0) return [];

    // Get the active root user message (or first if none selected)
    const activeRootIndex = activeBranches.get('root') ?? 0;
    const activeRootUser = rootUserMessages[Math.min(activeRootIndex, rootUserMessages.length - 1)];

    if (!activeRootUser) return [];

    // Traverse the tree following active branches
    const traverse = (userMessage: ChatMessageNode) => {
      result.push(userMessage);

      // Get the assistant response for this user message (at most one)
      const assistantResponse = messages.find(
        m => m.parentId === userMessage.id && m.from === 'assistant'
      );

      if (!assistantResponse) return;

      result.push(assistantResponse);

      // Look for follow-up user messages (children of this assistant message)
      const followUpUsers = messages.filter(
        m => m.parentId === assistantResponse.id && m.from === 'user'
      );

      if (followUpUsers.length > 0) {
        const activeFollowUpIndex = activeBranches.get(assistantResponse.id) ?? 0;
        const activeFollowUp = followUpUsers[Math.min(activeFollowUpIndex, followUpUsers.length - 1)];
        if (activeFollowUp) {
          traverse(activeFollowUp);
        }
      }
    };

    traverse(activeRootUser);
    return result;
  }, [messages, activeBranches]);

  /**
   * Add a new user message to the conversation
   * @param content - The message text
   * @param codeContext - Optional code that was sent with the message
   * @param parentId - Parent message ID (null for root, assistant ID for follow-up)
   * @param thumbnail - Optional thumbnail data URL for the code
   * @returns The ID of the new message
   */
  const addUserMessage = useCallback((
    content: string,
    codeContext?: string,
    parentId: string | null = null,
    thumbnail?: string
  ): string => {
    const id = crypto.randomUUID();

    const codeArtifact: CodeArtifact | undefined = codeContext ? {
      id: crypto.randomUUID(),
      type: 'user-context',
      code: codeContext,
      label: 'Code sent',
      thumbnail,
    } : undefined;

    const newMessage: ChatMessageNode = {
      id,
      parentId,
      from: 'user',
      content,
      timestamp: Date.now(),
      codeArtifact,
    };

    setMessages(prev => [...prev, newMessage]);
    return id;
  }, []);

  /**
   * Add an assistant response to a user message
   * @param parentUserMessageId - The user message this is responding to
   * @param content - The explanation text
   * @param generatedCode - The generated shader code
   * @param isError - Whether this is an error response
   * @param thumbnail - Optional thumbnail data URL for the generated code
   * @returns The ID of the new message
   */
  const addAssistantMessage = useCallback((
    parentUserMessageId: string,
    content: string,
    generatedCode?: string,
    isError?: boolean,
    thumbnail?: string
  ): string => {
    const id = crypto.randomUUID();

    const codeArtifact: CodeArtifact | undefined = generatedCode ? {
      id: crypto.randomUUID(),
      type: 'generated',
      code: generatedCode,
      label: 'Generated shader',
      thumbnail,
    } : undefined;

    const newMessage: ChatMessageNode = {
      id,
      parentId: parentUserMessageId,
      from: 'assistant',
      content,
      timestamp: Date.now(),
      isError,
      codeArtifact,
    };

    setMessages(prev => [...prev, newMessage]);
    return id;
  }, []);

  /**
   * Set the active branch for a given parent
   * @param parentKey - Either 'root' for root messages, or the parent message ID
   * @param branchIndex - The index of the branch to activate
   */
  const setActiveBranch = useCallback((parentKey: string, branchIndex: number) => {
    setActiveBranches(prev => {
      const next = new Map(prev);
      next.set(parentKey, branchIndex);
      return next;
    });
  }, []);

  /**
   * Delete a message and all its descendants from the conversation tree
   */
  const deleteDescendants = useCallback((parentId: string) => {
    setMessages(prev => {
      // Collect all IDs to delete (all descendants of parentId)
      const idsToDelete = new Set<string>();

      const collectDescendants = (id: string) => {
        // Find all children of this message
        prev.filter(m => m.parentId === id).forEach(child => {
          idsToDelete.add(child.id);
          collectDescendants(child.id);
        });
      };

      collectDescendants(parentId);

      // Filter out all messages that should be deleted
      return prev.filter(m => !idsToDelete.has(m.id));
    });
  }, []);

  /**
   * Prepare for retrying a user message (delete existing response and regenerate)
   * Deletes all assistant responses and their subtrees, then returns info for new API call
   */
  const prepareRetry = useCallback((userMessageId: string): {
    content: string;
    codeContext?: string;
  } | null => {
    const userMessage = messages.find(m => m.id === userMessageId);
    if (!userMessage || userMessage.from !== 'user') return null;

    // Delete all descendants of this user message (assistant responses and their follow-ups)
    deleteDescendants(userMessageId);

    return {
      content: userMessage.content,
      codeContext: userMessage.codeArtifact?.code,
    };
  }, [messages, deleteDescendants]);

  /**
   * Start the task pipeline (thinking state)
   * @param attempt - Optional current attempt number (for retry tracking)
   * @param maxAttempts - Optional max attempts (for retry tracking)
   */
  const startTask = useCallback((attempt?: number, maxAttempts?: number) => {
    const steps = createPipelineSteps(attempt, maxAttempts);
    steps[0].status = 'in_progress';
    setTaskState({
      status: 'thinking',
      steps,
      currentAttempt: attempt,
      maxAttempts,
    });
  }, []);

  /**
   * Start a retry attempt (updates task state for next attempt)
   * @param attempt - The new attempt number
   */
  const startRetryAttempt = useCallback((attempt: number) => {
    setTaskState(prev => {
      const maxAttempts = prev.maxAttempts || 3;
      const steps = createPipelineSteps(attempt, maxAttempts);
      steps[0].status = 'in_progress';
      return {
        status: 'thinking',
        steps,
        currentAttempt: attempt,
        maxAttempts,
      };
    });
  }, []);

  /**
   * Transition to compiling state (preserves attempt tracking)
   */
  const setCompiling = useCallback(() => {
    setTaskState(prev => ({
      ...prev,
      status: 'compiling',
      steps: prev.steps.map(step =>
        step.id === 'generate'
          ? { ...step, status: 'complete' as const }
          : step.id === 'compile'
          ? { ...step, status: 'in_progress' as const }
          : step
      ),
    }));
  }, []);

  /**
   * Complete the task successfully
   */
  const completeTask = useCallback(() => {
    setTaskState(prev => ({
      status: 'complete',
      steps: prev.steps.map(step => ({ ...step, status: 'complete' as const })),
    }));

    // Reset to idle after a short delay
    setTimeout(() => {
      setTaskState(INITIAL_TASK_STATE);
    }, 500);
  }, []);

  /**
   * Set task to error state
   */
  const errorTask = useCallback(() => {
    setTaskState(prev => ({
      status: 'error',
      steps: prev.steps.map(step =>
        step.status === 'in_progress'
          ? { ...step, status: 'error' as const }
          : step
      ),
    }));
  }, []);

  /**
   * Reset task to idle
   */
  const resetTask = useCallback(() => {
    setTaskState(INITIAL_TASK_STATE);
  }, []);

  /**
   * Clear all conversation history
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setActiveBranches(new Map());
    setTaskState(INITIAL_TASK_STATE);
  }, []);

  /**
   * Get the last assistant message in the current display
   */
  const getLastAssistantMessage = useCallback((): ChatMessageNode | undefined => {
    const assistants = displayMessages.filter(m => m.from === 'assistant');
    return assistants[assistants.length - 1];
  }, [displayMessages]);

  /**
   * Get the parent user message ID for the current conversation
   * Used to determine where to attach follow-up messages
   */
  const getLastAssistantId = useCallback((): string | null => {
    const lastAssistant = getLastAssistantMessage();
    return lastAssistant?.id ?? null;
  }, [getLastAssistantMessage]);

  return {
    // State
    messages,
    displayMessages,
    taskState,

    // Message operations
    addUserMessage,
    addAssistantMessage,

    // Branch operations
    getBranchInfo,
    setActiveBranch,
    prepareRetry,

    // Task operations
    startTask,
    startRetryAttempt,
    setCompiling,
    completeTask,
    errorTask,
    resetTask,

    // Utility
    clearHistory,
    getLastAssistantId,
    getAssistantResponses,
  };
}

export type UseChatStateReturn = ReturnType<typeof useChatState>;
