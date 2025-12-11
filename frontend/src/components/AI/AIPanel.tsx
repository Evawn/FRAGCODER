'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { X, Trash2, Sparkles, Eye, EyeOff } from 'lucide-react';
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
import type { TabData, ChatHistoryEntry, CompilationError } from '@fragcoder/shared';

const AVAILABLE_MODELS = [
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
];

interface AIPanelProps {
  isOpen: boolean;
  isMobile?: boolean;
  onClose: () => void;
  setCodeAndCompile: (newCode: string, tabId: string) => void;
  tabs: TabData[];
  compilationErrors?: CompilationError[];
}

export function AIPanel({
  isOpen,
  isMobile = false,
  onClose,
  setCodeAndCompile,
  tabs,
  compilationErrors = [],
}: AIPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [includeCode, setIncludeCode] = useState(true);

  const chatState = useChatState();
  const { captureThumbnail } = useThumbnailCapture();

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
    setCodeAndCompile(code, '1');
  }, [setCodeAndCompile]);

  /**
   * Core API call logic - used by submit, reroll, and edit
   */
  const callAPI = useCallback(async (
    promptText: string,
    userMessageId: string,
    codeContext?: string
  ) => {
    chatState.startTask();

    // Get chat history before the current message for context
    const history = extractChatHistory();
    // Get relevant compilation errors
    const errors = getImageTabErrors();

    try {
      const response = await sendPrompt(
        promptText,
        selectedModel,
        codeContext,
        history,
        errors.length > 0 ? errors : undefined
      );

      // Only update editor and capture thumbnail if code was returned
      let thumbnail: string | undefined;
      if (response.code) {
        // Transition to compiling
        chatState.setCompiling();

        // Update the editor with generated code
        setCodeAndCompile(response.code, '1');

        // Capture thumbnail of the generated shader
        thumbnail = await captureThumbnail(response.code) ?? undefined;
      }

      // Add assistant response with code artifact and thumbnail
      chatState.addAssistantMessage(
        userMessageId,
        response.explanation,
        response.code,
        false,
        thumbnail
      );

      // Complete the task
      chatState.completeTask();
    } catch (error) {
      chatState.errorTask();
      chatState.addAssistantMessage(
        userMessageId,
        getErrorMessage(error),
        undefined,
        true
      );
    }
  }, [selectedModel, setCodeAndCompile, chatState, captureThumbnail, extractChatHistory, getImageTabErrors]);

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

    setInputValue('');
    setIsLoading(true);

    await callAPI(promptText, userMsgId, codeContext);

    setIsLoading(false);
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

    setIsLoading(true);
    await callAPI(retryInfo.content, userMessageId, retryInfo.codeContext);
    setIsLoading(false);
  }, [isLoading, chatState, callAPI]);

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

    setIsLoading(true);
    await callAPI(newContent, newUserMsgId, codeContext);
    setIsLoading(false);
  }, [isLoading, chatState, callAPI]);

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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 gap-2">
        <span className="text-md font-light text-foreground">AI </span>
        <Sparkles size={16} strokeWidth={2} />
        <span className='w-full' ></span>
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
      </div>
      {/* Separator - not full width */}
      {/* <div className="mx-4 border-b border-lines" /> */}

      {/* Main Content Area - Chat component (only shown when messages exist) */}
      {chatState.messages.length > 0 && (
        <Chat
          messages={chatState.displayMessages}
          taskState={chatState.taskState}
          isLoading={isLoading}
          onReroll={handleReroll}
          onEdit={handleEdit}
          onApplyCode={handleApplyCode}
          getBranchInfo={chatState.getBranchInfo}
          onBranchChange={chatState.setActiveBranch}
          currentCode={getCurrentCode()}
        />
      )}

      {/* Footer - Prompt Input Area */}
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
                  {AVAILABLE_MODELS.map((model) => (
                    <PromptInputModelSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </div>
            <PromptInputSubmit disabled={!inputValue.trim() || isLoading} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );

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
