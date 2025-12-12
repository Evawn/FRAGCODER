'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Pencil, Check, Loader2, ChevronLeft, ChevronRight, Code2, CircleUser, CornerDownRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Conversation,
  ConversationContent,
} from '../ui/shadcn-io/ai/conversation';
import { Actions, Action } from '../ui/shadcn-io/ai/actions';
import { CodeArtifact } from './CodeArtifact'; // Used by AssistantMessage
import type { ChatMessageNode, TaskState, BranchInfo } from '../../types/chat';

interface ChatProps {
  messages: ChatMessageNode[];
  taskState: TaskState;
  isLoading: boolean;
  onReroll: (userMessageId: string) => void;
  onEdit: (userMessageId: string, newContent: string) => void;
  onApplyCode: (code: string) => void;
  getBranchInfo: (userMessageId: string) => BranchInfo;
  onBranchChange: (parentKey: string, index: number) => void;
  currentCode?: string;
}

/**
 * UserMessage component with actions and branch navigation
 */
function UserMessage({
  message,
  branchInfo,
  onReroll,
  onEdit,
  onBranchChange,
  onApplyCode,
  isLoading,
  currentCode,
}: {
  message: ChatMessageNode;
  branchInfo: BranchInfo;
  onReroll: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onBranchChange: (parentKey: string, index: number) => void;
  onApplyCode: (code: string) => void;
  isLoading: boolean;
  currentCode?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const handleSubmitEdit = useCallback(() => {
    if (editedContent.trim() && editedContent !== message.content) {
      onEdit(message.id, editedContent.trim());
    }
    setIsEditing(false);
  }, [editedContent, message.content, message.id, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditedContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const parentKey = message.parentId ?? 'root';

  const isActive = currentCode === message.codeArtifact?.code;

  return (
    <div className="flex flex-col gap-2">
      {/* Message content with floating action bar */}
      <div className="relative group/user-msg">
        <div className="rounded-md bg-background-editor/20 text-foreground text-xs overflow-hidden">
          {/* Text content */}
          <div className="p-3 flex gap-2">
            <CircleUser className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[60px] bg-background"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmitEdit} disabled={isLoading}>
                    Submit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap flex-1">{message.content}</div>
            )}
          </div>

          {/* Code artifact footer - inside bubble */}
          {message.codeArtifact && !isEditing && (
            <div
              className={cn(
                "flex items-center bg-background-header/50 justify-end gap-2 border-t cursor-pointer transition-colors",
                "hover:bg-background-highlighted",
                isActive
                  ? "border-accent bg-accent/10"
                  : "border-lines"
              )}
              onClick={() => onApplyCode(message.codeArtifact!.code)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onApplyCode(message.codeArtifact!.code);
                }
              }}
            >
              <span className="text-[10px] text-muted-foreground italic pr-1">
                submitted shader
              </span>
              <div className="w-16 aspect-[4/3] overflow-hidden">
                {message.codeArtifact.thumbnail ? (
                  <img
                    src={message.codeArtifact.thumbnail}
                    alt={message.codeArtifact.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted/50">
                    <Code2 className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating action bar - appears on hover (but not while loading) */}
        {!isEditing && (
          <div className={cn(
            "absolute right-4 -bottom-2 translate-y-1/2 z-10 opacity-0 transition-opacity",
            !isLoading && "group-hover/user-msg:opacity-100"
          )}>
            <Actions className="bg-background-header rounded-md p-1">
              <Action
                tooltip="Retry"
                tooltipSide="bottom"
                onClick={() => onReroll(message.id)}
                disabled={isLoading}
              >
                <RefreshCw className="h-3 w-3" />
              </Action>
              <Action
                tooltip="Edit"
                tooltipSide="bottom"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
              >
                <Pencil className="h-3 w-3" />
              </Action>

              {/* Branch navigation (only shown when branches > 1) */}
              {branchInfo.count > 1 && (
                <>
                  <div className="w-px h-3 bg-border mx-1" />
                  <Action
                    tooltip="Previous version"
                    tooltipSide="bottom"
                    onClick={() => {
                      const newIndex = branchInfo.activeIndex > 0
                        ? branchInfo.activeIndex - 1
                        : branchInfo.count - 1;
                      onBranchChange(parentKey, newIndex);
                    }}
                    disabled={isLoading}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Action>
                  <span className="text-xs text-muted-foreground tabular-nums px-1">
                    {branchInfo.activeIndex + 1}/{branchInfo.count}
                  </span>
                  <Action
                    tooltip="Next version"
                    tooltipSide="bottom"
                    onClick={() => {
                      const newIndex = branchInfo.activeIndex < branchInfo.count - 1
                        ? branchInfo.activeIndex + 1
                        : 0;
                      onBranchChange(parentKey, newIndex);
                    }}
                    disabled={isLoading}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Action>
                </>
              )}
            </Actions>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AssistantMessage component with response and code artifact
 */
function AssistantMessage({
  message,
  onApplyCode,
  currentCode,
}: {
  message: ChatMessageNode;
  onApplyCode: (code: string) => void;
  currentCode?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Text content - full width, same style as user */}
      <div className={cn(
        "text-foreground text-xs whitespace-pre-wrap",
        message.isError && "text-red-400"
      )}>
        {message.isError ? `Error: ${message.content}` : message.content}
      </div>

      {/* Code artifact if present */}
      {message.codeArtifact && (
        <div className="flex items-start gap-2 pl-4">
          <CornerDownRight className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-1" />
          <CodeArtifact
            artifact={message.codeArtifact}
            onApply={onApplyCode}
            isActive={currentCode === message.codeArtifact.code}
            className="w-[45%]"
          />
        </div>
      )}
    </div>
  );
}

/**
 * TaskIndicator component showing AI processing status
 * Displays retry badge when on attempt > 1
 */
function TaskIndicator({ taskState }: { taskState: TaskState }) {
  if (taskState.status === 'idle') return null;

  const currentStep = taskState.steps.find(s => s.status === 'in_progress');
  const currentStepLabel = currentStep?.label ?? 'Processing...';

  // Show retry badge when on attempt > 1
  const isRetrying = taskState.currentAttempt !== undefined && taskState.currentAttempt > 1;
  const retryNumber = isRetrying ? taskState.currentAttempt! - 1 : 0;
  const maxRetries = taskState.maxAttempts !== undefined ? taskState.maxAttempts - 1 : 2;

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2 text-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{currentStepLabel}</span>
        {isRetrying && (
          <span className="text-amber-500 text-[10px] font-medium">
            Retry {retryNumber}/{maxRetries}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 pl-5">
        {taskState.steps.map(step => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-2',
              step.status === 'complete' && 'text-green-500',
              step.status === 'in_progress' && 'text-foreground',
              step.status === 'pending' && 'text-muted-foreground',
              step.status === 'error' && 'text-red-500'
            )}
          >
            {step.status === 'complete' && <Check className="h-3 w-3" />}
            {step.status === 'in_progress' && <Loader2 className="h-3 w-3 animate-spin" />}
            {step.status === 'pending' && <div className="h-3 w-3" />}
            {step.status === 'error' && <div className="h-3 w-3 rounded-full bg-red-500" />}
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Chat component
 * Displays conversation messages with branching support and actions
 */
export function Chat({
  messages,
  taskState,
  isLoading,
  onReroll,
  onEdit,
  onApplyCode,
  getBranchInfo,
  onBranchChange,
  currentCode,
}: ChatProps) {
  if (messages.length === 0 && taskState.status === 'idle') {
    return <div className="flex-1" />;
  }

  return (
    <Conversation className="flex-1 min-h-0">
      <ConversationContent className="space-y-6 pb-8">
        {messages.map((message) => {
          if (message.from === 'user') {
            // For user messages, get branch info based on siblings
            const branchInfo = getBranchInfo(message.id);

            return (
              <UserMessage
                key={message.id}
                message={message}
                branchInfo={branchInfo}
                onReroll={onReroll}
                onEdit={onEdit}
                onBranchChange={onBranchChange}
                onApplyCode={onApplyCode}
                isLoading={isLoading}
                currentCode={currentCode}
              />
            );
          } else {
            return (
              <AssistantMessage
                key={message.id}
                message={message}
                onApplyCode={onApplyCode}
                currentCode={currentCode}
              />
            );
          }
        })}

        {/* Show task indicator when processing */}
        {taskState.status !== 'idle' && taskState.status !== 'complete' && (
          <TaskIndicator taskState={taskState} />
        )}
      </ConversationContent>
    </Conversation>
  );
}
