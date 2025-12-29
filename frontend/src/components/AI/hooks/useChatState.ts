'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  ChatMessageNode,
  CodeArtifact,
  TaskState,
  ThinkingStep,
  BranchInfo,
} from '../../../types/chat';
import type { AIIntent } from '@fragcoder/shared';

/**
 * Initial task state when idle
 */
const INITIAL_TASK_STATE: TaskState = {
  status: 'idle',
  steps: [],
};

/**
 * Intent label mapping for generating step
 */
const INTENT_LABELS: Record<AIIntent, string> = {
  'new_shader': 'Creating new shader',
  'modify': 'Modifying your shader',
  'debug': 'Debugging your code',
  'explain': 'Explaining your code',
};

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

  // ============================================
  // Task State Management - Incremental Steps
  // ============================================

  /**
   * Start the task - initializes state with a generating step
   * Shows "Generating response..." while waiting for API
   * @param maxAttempts - Maximum retry attempts allowed
   */
  const startTask = useCallback((maxAttempts: number = 3) => {
    const generatingStep: ThinkingStep = {
      id: crypto.randomUUID(),
      type: 'generating',
      label: 'Generating response',
      result: 'pending',
    };

    setTaskState({
      status: 'thinking',
      steps: [generatingStep],
      currentAttempt: 1,
      maxAttempts,
    });
  }, []);

  /**
   * Update the generating step label after API returns with classified intent
   * @param intent - The classified intent from the API
   */
  const updateGeneratingLabel = useCallback((intent: AIIntent) => {
    setTaskState(prev => ({
      ...prev,
      steps: prev.steps.map(s =>
        s.type === 'generating' && s.result === 'pending'
          ? { ...s, label: INTENT_LABELS[intent] }
          : s
      ),
    }));
  }, []);

  /**
   * Add the compiling step after code is received
   * Marks generating step as success and adds compiling step
   */
  const addCompilingStep = useCallback(() => {
    setTaskState(prev => {
      // Mark generating/retrying step as success
      const updatedSteps = prev.steps.map(s =>
        (s.type === 'generating' || s.type === 'retrying') && s.result === 'pending'
          ? { ...s, result: 'success' as const }
          : s
      );

      const compilingStep: ThinkingStep = {
        id: crypto.randomUUID(),
        type: 'compiling',
        label: 'Compiling GLSL',
        result: 'pending',
      };

      return {
        ...prev,
        status: 'compiling',
        steps: [...updatedSteps, compilingStep],
      };
    });
  }, []);

  /**
   * Mark the latest compiling step with its result
   * @param success - Whether compilation succeeded
   */
  const markCompilationResult = useCallback((success: boolean) => {
    setTaskState(prev => {
      // Find the last compiling step and mark it
      const updatedSteps = [...prev.steps];
      for (let i = updatedSteps.length - 1; i >= 0; i--) {
        if (updatedSteps[i].type === 'compiling' && updatedSteps[i].result === 'pending') {
          updatedSteps[i] = {
            ...updatedSteps[i],
            result: success ? 'success' : 'failed',
          };
          break;
        }
      }

      return {
        ...prev,
        steps: updatedSteps,
      };
    });
  }, []);

  /**
   * Add a retry step after compilation failure
   * @param attempt - Current attempt number (2 or 3)
   * @param maxAttempts - Maximum attempts allowed
   */
  const addRetryStep = useCallback((attempt: number, maxAttempts: number) => {
    const retryStep: ThinkingStep = {
      id: crypto.randomUUID(),
      type: 'retrying',
      label: 'Debugging',
      result: 'pending',
      retryInfo: { attempt: attempt - 1, maxAttempts: maxAttempts - 1 },
    };

    setTaskState(prev => ({
      ...prev,
      status: 'thinking',
      currentAttempt: attempt,
      maxAttempts,
      steps: [...prev.steps, retryStep],
    }));
  }, []);

  /**
   * Complete the task successfully
   * Clears UI after a short delay
   */
  const completeTask = useCallback(() => {
    setTaskState(prev => ({
      ...prev,
      status: 'complete',
    }));

    // Reset to idle after a short delay
    setTimeout(() => {
      setTaskState(INITIAL_TASK_STATE);
    }, 500);
  }, []);

  /**
   * Set task to error state
   * Marks any pending step as failed
   */
  const errorTask = useCallback(() => {
    setTaskState(prev => ({
      ...prev,
      status: 'error',
      steps: prev.steps.map(step =>
        step.result === 'pending'
          ? { ...step, result: 'failed' as const }
          : step
      ),
    }));
  }, []);

  /**
   * Reset task to idle (used on cancel)
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
   * Load pre-existing messages into the chat state
   * Used when navigating from response scorer with existing conversation
   */
  const loadMessages = useCallback((newMessages: ChatMessageNode[]) => {
    setMessages(newMessages);
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

    // Task operations (incremental step API)
    startTask,
    updateGeneratingLabel,
    addCompilingStep,
    markCompilationResult,
    addRetryStep,
    completeTask,
    errorTask,
    resetTask,

    // Utility
    clearHistory,
    loadMessages,
    getLastAssistantId,
    getAssistantResponses,
  };
}

export type UseChatStateReturn = ReturnType<typeof useChatState>;
