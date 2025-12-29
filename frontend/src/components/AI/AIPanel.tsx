'use client';

import { useState, useCallback, useRef, useEffect, type FormEvent } from 'react';
import { X, Trash2, Sparkles, Eye, EyeOff, Square } from 'lucide-react';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
} from '../ui/shadcn-io/ai/prompt-input';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { sendPrompt } from '../../api/ai';
import { getErrorMessage } from '../../api/client';
import { Chat } from './Chat';
import { useChatState } from './hooks/useChatState';
import { useThumbnailCapture } from './hooks/useThumbnailCapture';
import type { TabData, ChatHistoryEntry, CompilationError, AIIntent } from '@fragcoder/shared';
import { AVAILABLE_AI_MODELS, DEFAULT_MODEL_ID } from '@fragcoder/shared';
import type { ChatMessageNode, BranchInfo } from '../../types/chat';

/** Props for interactive mode (default) */
interface InteractiveModeProps {
  mode?: 'interactive';
  onClose: () => void;
  setCodeAndCompile: (newCode: string, tabId: string) => void;
  tabs: TabData[];
  compilationErrors?: CompilationError[];
  compilationSuccess?: boolean;
  lastCompilationTime?: number;
  onLoadingChange?: (isLoading: boolean) => void;
  /** Pre-load chat messages (e.g., when navigating from response scorer) */
  initialMessages?: ChatMessageNode[];
}

/** Props for browse mode (read-only, for ResponseScorer) */
interface BrowseModeProps {
  mode: 'browse';
  browseMessages: ChatMessageNode[];
  onSelectArtifact: (code: string) => void;
  selectedArtifactCode?: string;
  getBranchInfo?: (userMessageId: string) => BranchInfo;
  onBranchChange?: (parentKey: string, index: number) => void;
}

type AIPanelProps = {
  isOpen: boolean;
  isMobile?: boolean;
} & (InteractiveModeProps | BrowseModeProps);

export function AIPanel(props: AIPanelProps) {
  const { isOpen, isMobile = false } = props;
  const isBrowseMode = props.mode === 'browse';

  // Interactive mode props (with defaults for browse mode)
  const onClose = isBrowseMode ? undefined : (props as InteractiveModeProps).onClose;
  const setCodeAndCompile = isBrowseMode ? undefined : (props as InteractiveModeProps).setCodeAndCompile;
  const tabs = isBrowseMode ? [] : ((props as InteractiveModeProps).tabs ?? []);
  const compilationErrors = isBrowseMode ? [] : ((props as InteractiveModeProps).compilationErrors ?? []);
  const compilationSuccess = isBrowseMode ? undefined : (props as InteractiveModeProps).compilationSuccess;
  const lastCompilationTime = isBrowseMode ? 0 : ((props as InteractiveModeProps).lastCompilationTime ?? 0);
  const onLoadingChange = isBrowseMode ? undefined : (props as InteractiveModeProps).onLoadingChange;
  const initialMessages = isBrowseMode ? undefined : (props as InteractiveModeProps).initialMessages;

  // Browse mode props
  const browseMessages = isBrowseMode ? (props as BrowseModeProps).browseMessages : [];
  const onSelectArtifact = isBrowseMode ? (props as BrowseModeProps).onSelectArtifact : undefined;
  const selectedArtifactCode = isBrowseMode ? (props as BrowseModeProps).selectedArtifactCode : undefined;
  const browseBranchInfo = isBrowseMode ? (props as BrowseModeProps).getBranchInfo : undefined;
  const browseOnBranchChange = isBrowseMode ? (props as BrowseModeProps).onBranchChange : undefined;
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [includeCode, setIncludeCode] = useState(true);

  const chatState = useChatState();
  const { captureThumbnail } = useThumbnailCapture();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial messages if provided (e.g., from response scorer navigation)
  const initialMessagesLoadedRef = useRef(false);
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && !initialMessagesLoadedRef.current) {
      chatState.loadMessages(initialMessages);
      initialMessagesLoadedRef.current = true;
    }
  }, [initialMessages, chatState]);

  // Refs for tracking compilation completion in retry loop
  const compilationResolveRef = useRef<((success: boolean) => void) | null>(null);
  const lastKnownCompilationTimeRef = useRef<number>(0);

  // Detect when compilation completes (lastCompilationTime changes)
  useEffect(() => {
    if (lastCompilationTime > lastKnownCompilationTimeRef.current) {
      lastKnownCompilationTimeRef.current = lastCompilationTime;
      // Resolve pending compilation promise if any
      if (compilationResolveRef.current) {
        compilationResolveRef.current(compilationSuccess ?? false);
        compilationResolveRef.current = null;
      }
    }
  }, [lastCompilationTime, compilationSuccess]);

  /**
   * Compile code and wait for result
   * Returns true if compilation succeeded, false otherwise
   */
  const compileAndWaitForResult = useCallback((code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Set up promise resolution on next compilation complete
      compilationResolveRef.current = resolve;
      // Trigger compilation
      setCodeAndCompile(code, '1');
    });
  }, [setCodeAndCompile]);

  // Helper to update loading state and notify parent
  const updateLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
    onLoadingChange?.(loading);
  }, [onLoadingChange]);

  // Cancel ongoing AI request
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    updateLoadingState(false);
    chatState.resetTask();
  }, [updateLoadingState, chatState]);

  /**
   * Extract up to 5 recent prompt/explanation pairs from chat history
   * Only includes successful (non-error) assistant responses
   */
  const extractChatHistory = useCallback((): ChatHistoryEntry[] => {
    const history: ChatHistoryEntry[] = [];
    const messages = chatState.displayMessages;

    // Iterate through message pairs (user + assistant)
    for (let i = 0; i < messages.length - 1 && history.length < 5; i += 2) {
      const userMsg = messages[i];
      const assistantMsg = messages[i + 1];

      if (
        userMsg?.from === 'user' &&
        assistantMsg?.from === 'assistant' &&
        !assistantMsg.isError
      ) {
        history.push({
          userPrompt: userMsg.content,
          aiExplanation: assistantMsg.content,
        });
      }
    }

    return history;
  }, [chatState.displayMessages]);

  /**
   * Get the current code from the Image tab
   */
  const getCurrentCode = useCallback((): string | undefined => {
    if (!includeCode) return undefined;
    const imageTab = tabs.find(t => t.id === '1');
    return imageTab?.code;
  }, [tabs, includeCode]);

  /**
   * Get compilation errors relevant to the Image tab
   * Filters errors that either have no passName or passName === 'Image'
   */
  const getImageTabErrors = useCallback((): CompilationError[] => {
    if (!includeCode) return [];
    return compilationErrors.filter(
      err => !err.passName || err.passName === 'Image'
    );
  }, [compilationErrors, includeCode]);

  /**
   * Handle applying code from an artifact to the editor
   */
  const handleApplyCode = useCallback((code: string) => {
    if (isBrowseMode && onSelectArtifact) {
      onSelectArtifact(code);
    } else if (setCodeAndCompile) {
      setCodeAndCompile(code, '1');
    }
  }, [isBrowseMode, onSelectArtifact, setCodeAndCompile]);

  // Maximum retry attempts for compilation failures
  const MAX_ATTEMPTS = 3;

  /**
   * Core API call logic with retry loop - used by submit, reroll, and edit
   * Implements compile-before-display with automatic retries on failure
   */
  const callAPIWithRetry = useCallback(async (
    promptText: string,
    userMessageId: string,
    codeContext?: string,
    initialErrors?: CompilationError[]
  ) => {
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Track state across retry attempts
    let lastResponse: { code?: string; explanation: string; intent: AIIntent } | null = null;
    let lastCompilationErrors: CompilationError[] = initialErrors || [];
    let attempt = 0;

    // Get chat history before the current message for context
    const history = extractChatHistory();

    // Start task (adds intent step)
    chatState.startTask(MAX_ATTEMPTS);

    while (attempt < MAX_ATTEMPTS) {
      attempt++;

      // Check for cancellation at start of each attempt
      if (abortControllerRef.current?.signal.aborted) {
        chatState.resetTask();
        return;
      }

      // Add retry step for attempts after first (accumulates, doesn't replace)
      if (attempt > 1) {
        chatState.addRetryStep(attempt, MAX_ATTEMPTS);
      }

      try {
        // Determine intent: force 'debug' on retries to include compilation errors
        const intent: AIIntent | undefined = attempt > 1 ? 'debug' : undefined;
        const errorsToSend = attempt > 1 ? lastCompilationErrors : initialErrors;

        // Make API call
        const response = await sendPrompt(
          promptText,
          selectedModel,
          codeContext,
          history,
          errorsToSend && errorsToSend.length > 0 ? errorsToSend : undefined,
          abortControllerRef.current.signal,
          intent
        );

        lastResponse = response;

        // Update the generating step label with classified intent
        chatState.updateGeneratingLabel(response.intent);

        // If no code returned (e.g., 'explain' intent), display immediately
        if (!response.code) {
          chatState.addAssistantMessage(userMessageId, response.explanation, undefined, false, undefined);
          chatState.completeTask();
          return;
        }

        // Add compiling step (marks generating as success)
        chatState.addCompilingStep();

        // Compile and wait for result - code visually appears in editor (read-only)
        const compilationSucceeded = await compileAndWaitForResult(response.code);

        // Mark compilation result (success or failed)
        chatState.markCompilationResult(compilationSucceeded);

        if (compilationSucceeded) {
          // SUCCESS! Capture thumbnail and display response
          const thumbnail = await captureThumbnail(response.code) ?? undefined;
          chatState.addAssistantMessage(userMessageId, response.explanation, response.code, false, thumbnail);
          chatState.completeTask();
          return;
        }

        // Compilation failed - store errors for next retry
        lastCompilationErrors = [...compilationErrors];

        // If this was the last attempt, break out to display anyway
        if (attempt >= MAX_ATTEMPTS) {
          break;
        }

        // Continue to next retry attempt (loop continues)

      } catch (error) {
        // Network/API error - don't retry, show error immediately
        if (error instanceof Error && error.name === 'CanceledError') {
          chatState.resetTask();
          return;
        }
        chatState.errorTask();
        chatState.addAssistantMessage(userMessageId, getErrorMessage(error), undefined, true);
        return;
      }
    }

    // All attempts exhausted - display last response anyway (with failed code)
    if (lastResponse?.code) {
      const thumbnail = await captureThumbnail(lastResponse.code) ?? undefined;
      chatState.addAssistantMessage(
        userMessageId,
        lastResponse.explanation,
        lastResponse.code,
        false,
        thumbnail
      );
    } else if (lastResponse) {
      chatState.addAssistantMessage(userMessageId, lastResponse.explanation, undefined, false);
    }
    chatState.completeTask();

  }, [selectedModel, chatState, captureThumbnail, extractChatHistory, compileAndWaitForResult, compilationErrors]);

  /**
   * Handle new prompt submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const promptText = inputValue.trim();
    const codeContext = getCurrentCode();

    // Capture thumbnail of user's current code if including code
    const userThumbnail = codeContext ? await captureThumbnail(codeContext) : null;

    // Determine parent ID - for follow-up messages, use the last assistant's ID
    const parentId = chatState.getLastAssistantId();

    // Add user message with thumbnail
    const userMsgId = chatState.addUserMessage(promptText, codeContext, parentId, userThumbnail ?? undefined);

    // Get current errors if including code (for initial context)
    const currentErrors = getImageTabErrors();

    setInputValue('');
    updateLoadingState(true);

    await callAPIWithRetry(promptText, userMsgId, codeContext, currentErrors.length > 0 ? currentErrors : undefined);

    updateLoadingState(false);
  };

  /**
   * Handle regenerating a response for a user message
   * Deletes existing response and subtree, then generates fresh
   */
  const handleReroll = useCallback(async (userMessageId: string) => {
    if (isLoading) return;

    // Delete existing responses and get info for new API call
    const retryInfo = chatState.prepareRetry(userMessageId);
    if (!retryInfo) return;

    updateLoadingState(true);
    await callAPIWithRetry(retryInfo.content, userMessageId, retryInfo.codeContext);
    updateLoadingState(false);
  }, [isLoading, chatState, callAPIWithRetry, updateLoadingState]);

  /**
   * Handle editing a user message and regenerating
   */
  const handleEdit = useCallback(async (userMessageId: string, newContent: string) => {
    if (isLoading) return;

    // Get the parent of the original message to create a sibling
    const originalMessage = chatState.messages.find(m => m.id === userMessageId);
    if (!originalMessage) return;

    // Use the original code context from the message being edited, not the current editor code
    const codeContext = originalMessage.codeArtifact?.code;
    const thumbnail = originalMessage.codeArtifact?.thumbnail;
    const parentId = originalMessage.parentId;
    const parentKey = parentId ?? 'root';

    // Calculate the new branch index BEFORE adding the message
    const currentSiblings = chatState.messages.filter(
      m => m.parentId === parentId && m.from === 'user'
    );
    const newBranchIndex = currentSiblings.length;

    // Add a new user message as a sibling (same parent) with the original code context
    const newUserMsgId = chatState.addUserMessage(newContent, codeContext, parentId, thumbnail);

    // Switch to the new branch IMMEDIATELY so thinking appears under the new message
    chatState.setActiveBranch(parentKey, newBranchIndex);

    updateLoadingState(true);
    await callAPIWithRetry(newContent, newUserMsgId, codeContext);
    updateLoadingState(false);
  }, [isLoading, chatState, callAPIWithRetry, updateLoadingState]);

  // Default branch info function for browse mode
  const defaultBranchInfo = useCallback((): BranchInfo => ({ count: 1, activeIndex: 0 }), []);
  const defaultBranchChange = useCallback(() => {}, []);

  // Determine which messages and handlers to use based on mode
  const displayMessages = isBrowseMode ? browseMessages : chatState.displayMessages;
  const branchInfoFn = isBrowseMode ? (browseBranchInfo ?? defaultBranchInfo) : chatState.getBranchInfo;
  const branchChangeFn = isBrowseMode ? (browseOnBranchChange ?? defaultBranchChange) : chatState.setActiveBranch;
  const currentCodeForChat = isBrowseMode ? selectedArtifactCode : getCurrentCode();

  const panelContent = (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Subtle radial gradient glow - centered at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full aspect-square pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsla(38, 92%, 50%, 1.0) 0%, transparent 70%)',
          filter: 'blur(100vh)',
        }}
      />

      {/* Header - Different for browse vs interactive mode */}
      <div className="flex items-center justify-between px-3 py-1 gap-2">
        <span className="text-md font-light text-foreground">AI </span>
        <Sparkles size={16} strokeWidth={2} />
        <span className='w-full' ></span>
        {!isBrowseMode && (
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={chatState.clearHistory}
                    disabled={chatState.messages.length === 0}
                    className="h-7 w-7 text-foreground-muted hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Clear chat</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-7 w-7 text-foreground-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Close panel</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Main Content Area - Chat component */}
      {displayMessages.length > 0 && (
        <Chat
          messages={displayMessages}
          taskState={chatState.taskState}
          isLoading={isLoading}
          onReroll={handleReroll}
          onEdit={handleEdit}
          onApplyCode={handleApplyCode}
          getBranchInfo={branchInfoFn}
          onBranchChange={branchChangeFn}
          currentCode={currentCodeForChat}
          readOnly={isBrowseMode}
        />
      )}

      {/* Footer - Prompt Input Area (only in interactive mode) */}
      {!isBrowseMode && (
        <div className="p-2 pt-0">
          <PromptInput onSubmit={handleSubmit} className="bg-background-editor text-foreground border-background-editor">
            <PromptInputTextarea
              placeholder="Describe the shader you want to create..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="bg-transparent text-foreground text-xs placeholder:text-foreground-muted min-h-[80px]"
              disabled={isLoading}
            />
            <PromptInputToolbar>
              <div className="flex items-center gap-1">
                {/* Include code toggle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIncludeCode(!includeCode)}
                        className="h-7 w-7 text-foreground-muted hover:text-foreground"
                      >
                        {includeCode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {includeCode ? 'Include code' : "Don't include code"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <PromptInputModelSelect value={selectedModel} onValueChange={setSelectedModel}>
                  <PromptInputModelSelectTrigger className="h-6 w-auto text-xs rounded-xl font-light hover:text-background bg-accent/50">
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  <PromptInputModelSelectContent>
                    {AVAILABLE_AI_MODELS.map((model) => (
                      <PromptInputModelSelectItem key={model.id} value={model.id}>
                        {model.name}
                      </PromptInputModelSelectItem>
                    ))}
                  </PromptInputModelSelectContent>
                </PromptInputModelSelect>
              </div>
              {isLoading ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  className="h-6 w-6 rounded-sm text-accent hover:text-accent-highlighted hover:bg-accent/10"
                >
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              ) : (
                <PromptInputSubmit disabled={!inputValue.trim()} />
              )}
            </PromptInputToolbar>
          </PromptInput>
        </div>
      )}
    </div>
  );

  // Browse mode: always visible, no animation
  if (isBrowseMode) {
    return (
      <div className="h-full w-[25vw] border-l border-lines bg-background overflow-hidden flex-shrink-0">
        {panelContent}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        className={`w-full border-none border-none bg-background overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 ${
          isOpen ? 'h-[70vh]' : 'h-0 border-none'
        }`}
      >
        <div className="h-[70vh] w-full">{panelContent}</div>
      </div>
    );
  }

  return (
    <div
      className={`h-full border-l border-lines bg-background overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'w-[25vw]' : 'w-0 border-none'
      }`}
    >
      <div className="h-full w-[25vw]">{panelContent}</div>
    </div>
  );
}
