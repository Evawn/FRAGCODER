/**
 * ResponseScorer - Full-featured scoring interface for AI responses
 * Three-panel layout: ShaderPlayer+Info | Editor | AIPanel
 * Bottom footer for scoring controls with expandable pipeline trace
 *
 * Uses useShaderController for WebGL rendering and playback orchestration.
 */

import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import ShaderPlayer from '@/components/ShaderPlayer';
import ShaderEditor from '@/components/editor/ShaderEditor';
import { AIPanel } from '@/components/AI/AIPanel';
import { PromptInfoPanel } from './PromptInfoPanel';
import { ScoringFooter } from './ScoringFooter';
import { PipelineTraceOverlay } from './PipelineTraceOverlay';
import { useResponseScorerState, buildChatMessages } from '@/hooks/useResponseScorerState';
import { useShaderController } from '@/hooks/useShaderController';
import { useThumbnailCapture } from '@/components/AI/hooks/useThumbnailCapture';
import type { Tab } from '@/types';
import type { ChatMessageNode } from '@/types/chat';

interface ResponseScorerProps {
  suiteId: string;
  promptId: string;
}

export function ResponseScorer({ suiteId, promptId }: ResponseScorerProps) {
  const navigate = useNavigate();

  // Load data and scoring state
  const state = useResponseScorerState({ suiteId, promptId });

  // Build tabs from the response code (read-only, single tab)
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Shader controller for WebGL rendering and playback
  const controller = useShaderController({ autoPlay: true, setTabs });

  // Thumbnail capture for code artifacts
  const { captureThumbnail } = useThumbnailCapture();

  // Pipeline trace overlay state
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);

  // Currently selected code (for artifact highlighting)
  const [selectedCode, setSelectedCode] = useState<string | undefined>(undefined);

  // Chat messages with thumbnails
  const [chatMessages, setChatMessages] = useState<ChatMessageNode[]>([]);

  // Extract promptId as a stable dependency to avoid recompilation on score changes
  const currentPromptId = state.response?.promptId;

  // Update tabs and compile when response changes
  useEffect(() => {
    if (!currentPromptId || !state.response) return;

    // Use empty string if no code (API error case) - will fail compilation naturally
    const code = state.response.response.code ?? '';
    const errors = state.response.compilationErrors ?? [];

    setTabs([{
      id: '1',
      name: 'Image',
      code,
      isDeletable: false,
      errors,
    }]);
    setSelectedCode(code || undefined);

    // Compile the shader code (empty string will fail, clearing the spinner)
    controller.compile([{ id: '1', name: 'Image', code }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPromptId]); // Only run when navigating to a different prompt

  // Generate thumbnails for chat message artifacts when response changes
  useEffect(() => {
    const generateThumbnails = async () => {
      if (!state.response || !currentPromptId) {
        setChatMessages([]);
        return;
      }

      // Extract user code from trace input (if available)
      const traceInput = state.response.trace?.steps[0]?.input as { code?: string } | undefined;
      const userCode = traceInput?.code;
      const assistantCode = state.response.response.code;

      // Generate thumbnails in parallel
      const [userThumb, assistantThumb] = await Promise.all([
        userCode ? captureThumbnail(userCode) : Promise.resolve(null),
        assistantCode ? captureThumbnail(assistantCode) : Promise.resolve(null),
      ]);

      // Build chat messages with thumbnails
      setChatMessages(buildChatMessages(state.response, {
        user: userThumb ?? undefined,
        assistant: assistantThumb ?? undefined,
      }));
    };

    generateThumbnails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPromptId, captureThumbnail]); // Only regenerate when navigating to a different prompt

  // Handle artifact selection from AIPanel
  const handleSelectArtifact = useCallback((code: string) => {
    setSelectedCode(code);

    // Update the tabs with the selected code
    setTabs(prev => prev.map(tab =>
      tab.id === '1' ? { ...tab, code, errors: [] } : tab
    ));

    // Compile the selected code
    controller.compile([{ id: '1', name: 'Image', code }]);
  }, [controller]);

  // Stub handlers for ShaderEditor (read-only mode)
  const noOp = useCallback(() => {}, []);
  const noOpString = useCallback((_: string) => {}, []);
  const noOpTwoStrings = useCallback((_: string, __: string) => {}, []);

  // Determine if content is ready (but always render canvas for WebGL init)
  const isReady = !state.isLoading && !state.error && state.suite && state.response;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-lines px-3 py-1.5 flex items-center justify-between bg-background-header flex-shrink-0">
        <Link
          to={`/debug/prompt-engineering/${suiteId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back
        </Link>

        <span className="text-xs font-mono text-foreground truncate max-w-[40%]">
          {promptId}
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => navigate('/new', {
              state: {
                initialCode: state.response?.response.code,
                initialChatMessages: chatMessages,
              }
            })}
            disabled={!state.response?.response.code}
          >
            <ExternalLink size={12} className="mr-1" />
            Open in Editor
          </Button>
          <span className="text-xs text-muted-foreground">
            {state.currentIndex + 1}/{state.totalCount}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={state.goToPrevious}
            disabled={!state.canGoPrevious}
          >
            <ArrowLeft size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={state.goToNext}
            disabled={!state.canGoNext}
          >
            <ArrowRight size={14} />
          </Button>
        </div>
      </header>

      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {!state.isLoading && (state.error || !state.suite || !state.response) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="border border-dashed border-lines rounded-lg p-8 text-center">
            <p className="text-muted-foreground">{state.error || 'Response not found'}</p>
          </div>
        </div>
      )}

      {/* Main three-panel layout - always render for WebGL init, hide when not ready */}
      <div className={`flex-1 flex overflow-hidden relative ${!isReady ? 'invisible' : ''}`}>
        <ResizablePanelGroup direction="horizontal" className="flex-1" onLayout={controller.handlePanelResize}>
          {/* LEFT: Player + Info */}
          <ResizablePanel defaultSize={35} minSize={controller.leftPanelMinSize}>
            <div className="h-full flex flex-col p-2 gap-2 overflow-hidden">
              {/* Shader Player - always rendered for WebGL context */}
              <div className="flex-1 min-h-0">
                <ShaderPlayer
                  canvasRef={controller.canvasRef}
                  isPlaying={controller.isPlaying}
                  onPlayPause={controller.togglePlayPause}
                  onReset={controller.reset}
                  compilationSuccess={controller.compilationSuccess ?? false}
                  error={controller.error}
                  uTime={controller.uTime}
                  fps={controller.fps}
                  resolution={controller.resolution}
                  onResolutionLockChange={controller.handleResolutionLockChange}
                />
              </div>

              {/* Prompt Info Panel - only render when data is available */}
              {isReady && (
                <div className="flex-shrink-0 max-h-[40%] overflow-auto">
                  <PromptInfoPanel
                    prompt={state.response!.prompt}
                    compilationSuccess={controller.compilationSuccess}
                    compilationErrors={controller.compilationErrors}
                  />
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-lines" />

          {/* CENTER: Code Editor */}
          <ResizablePanel defaultSize={65} minSize={30}>
            <div className="h-full flex flex-col overflow-hidden">
              <ShaderEditor
                tabs={tabs}
                activeTabId={activeTabId}
                compilationSuccess={controller.compilationSuccess}
                compilationTime={controller.compilationTime}
                isCompiling={controller.isCompiling}
                lastCompilationTime={controller.lastCompilationTime}
                isSavedShader={false}
                isOwner={false}
                readOnly={true}
                onTabChange={setActiveTabId}
                onAddTab={noOpString}
                onDeleteTab={noOpString}
                onCodeChange={noOpTwoStrings}
                onCompile={noOp}
                onSave={noOp}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* RIGHT: AI Panel in browse mode - outside resizable group */}
        <AIPanel
          mode="browse"
          isOpen={true}
          browseMessages={chatMessages}
          onSelectArtifact={handleSelectArtifact}
          selectedArtifactCode={selectedCode}
        />

        {/* Pipeline Trace Overlay */}
        {isTraceExpanded && state.response?.trace && (
          <PipelineTraceOverlay
            isOpen={isTraceExpanded}
            onClose={() => setIsTraceExpanded(false)}
            trace={state.response.trace}
          />
        )}
      </div>

      {/* Scoring Footer - only render when data is available */}
      {isReady && (
        <ScoringFooter
          scores={state.scores}
          onScoreChange={state.setScore}
          notes={state.notes}
          onNotesChange={state.setNotes}
          isSaving={state.isSaving}
          hasChanges={state.hasChanges}
          saveSuccess={state.saveSuccess}
          avgScore={state.avgScore}
          hasTrace={!!state.response!.trace}
          onExpandTrace={() => setIsTraceExpanded(true)}
        />
      )}
    </div>
  );
}
