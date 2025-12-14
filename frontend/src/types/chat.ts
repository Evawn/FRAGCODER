/**
 * Chat Types
 * Type definitions for the AI chat conversation system with branching support
 */

/**
 * A code artifact associated with a message
 * Represents either user's code context or AI-generated shader code
 */
export interface CodeArtifact {
  id: string;
  type: 'user-context' | 'generated';
  code: string;
  label: string;  // e.g., "Code sent" or "Generated shader"
  thumbnail?: string;  // Data URL of first frame (PNG)
}

/**
 * Represents a single message in the conversation tree
 * Uses parentId for tree structure to support branching
 */
export interface ChatMessageNode {
  id: string;
  parentId: string | null;  // null for root messages
  from: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
  codeArtifact?: CodeArtifact;  // Attached code (user's context or AI's output)
}

/**
 * Type of step in the AI processing pipeline
 */
export type ThinkingStepType = 'generating' | 'compiling' | 'retrying';

/**
 * Result status of a thinking step
 */
export type ThinkingStepResult = 'pending' | 'success' | 'failed';

/**
 * Represents a single step in the AI processing pipeline
 * Steps are added incrementally and accumulated across retries
 */
export interface ThinkingStep {
  id: string;
  type: ThinkingStepType;
  label: string;
  result: ThinkingStepResult;
  retryInfo?: { attempt: number; maxAttempts: number };  // Only for retry steps
}

/**
 * Overall status of the AI task
 */
export type TaskStatus = 'idle' | 'thinking' | 'compiling' | 'complete' | 'error';

/**
 * State of the current AI task/thinking process
 * Steps are accumulated incrementally as they happen
 */
export interface TaskState {
  status: TaskStatus;
  steps: ThinkingStep[];
  currentAttempt?: number;  // Current attempt number (1, 2, or 3)
  maxAttempts?: number;     // Maximum attempts allowed (typically 3)
}

/**
 * Branch information for a user message
 */
export interface BranchInfo {
  count: number;
  activeIndex: number;
}

/**
 * Helper type for message pairs (user + assistant responses)
 */
export interface MessagePair {
  userMessage: ChatMessageNode;
  assistantMessages: ChatMessageNode[];
}
