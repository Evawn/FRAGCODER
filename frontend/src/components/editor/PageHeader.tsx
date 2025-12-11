/** Unified page header spanning full width with Logo/home button on left, title centered, and controls on right. */
import { Logo } from '../Logo';
import { TitleDropdown } from './TitleDropdown';
import { BrowseButton } from './BrowseButton';
import { NewShaderButton } from './NewShaderButton';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { Play, Pause, Sparkles } from 'lucide-react';

interface PageHeaderProps {
  // Logo rotation control
  onLogoRotate?: (setTargetAngle: (targetOffset: number) => void) => void;
  onHomeClick: () => void;
  onLogoMouseEnter: () => void;
  onLogoMouseLeave: () => void;

  // Title dropdown props
  localShaderTitle: string;
  creatorUsername?: string;
  isSavedShader: boolean;
  isOwner: boolean;
  hasUnsavedChanges: boolean;
  onSaveAs: () => void;
  onRename: (newName: string) => void;
  onClone: () => void;
  onDelete: () => void;

  // Compile/play controls
  isPlaying: boolean;
  isCompiling: boolean;
  compilationSuccess?: boolean;
  lastCompilationTime: number;
  onCompile: () => void;
  onPause: () => void;

  // Save button
  onSave: () => void;

  // AI Panel toggle
  isAIPanelOpen: boolean;
  onToggleAIPanel: () => void;

  // User menu props
  isSignedIn: boolean;
  username?: string;
  userPicture?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function PageHeader({
  onLogoRotate,
  onHomeClick,
  onLogoMouseEnter,
  onLogoMouseLeave,
  localShaderTitle,
  creatorUsername,
  isSavedShader,
  isOwner,
  hasUnsavedChanges,
  onSaveAs,
  onRename,
  onClone,
  onDelete,
  isPlaying,
  isCompiling,
  compilationSuccess,
  lastCompilationTime,
  onCompile,
  onPause,
  onSave,
  isAIPanelOpen,
  onToggleAIPanel,
  isSignedIn,
  username,
  userPicture,
  onSignIn,
  onSignOut,
}: PageHeaderProps) {
  // Determine if save button should be enabled
  // For new shaders, always allow save (opens save as dialog)
  // For saved shaders owned by user, enable when there are unsaved changes
  const canSave = !isSavedShader || (isOwner && hasUnsavedChanges);

  // Handle save - for new shaders, open save as dialog; for existing, save directly
  const handleSave = () => {
    if (!isSavedShader) {
      onSaveAs();
    } else {
      onSave();
    }
  };

  // Get compile button animation based on compilation result
  const getCompileButtonAnimation = () => {
    if (isCompiling) return undefined;
    if (compilationSuccess === true) {
      return 'compileSuccess 300ms ease-out';
    }
    if (compilationSuccess === false) {
      return 'compileFail 300ms ease-out';
    }
    return undefined;
  };

  return (
    <div className="w-full flex items-center px-2 py-0.5 bg-background-header border-b-2 border-accent-shadow relative" style={{ zIndex: 20 }}>
      {/* Group 1: Left side - Logo/Home button */}
      <button
        onClick={onHomeClick}
        onMouseEnter={onLogoMouseEnter}
        onMouseLeave={onLogoMouseLeave}
        className="home-button text-title font-regular bg-transparent text-foreground hover:text-accent px-1 flex items-center gap-1 flex-shrink-0"
        style={{ outline: 'none', border: 'none' }}
      >
        <Logo
          width={30}
          height={30}
          className=""
          topLayerOpacity={0.85}
          duration={300}
          easingIntensity={2}
          onRotate={onLogoRotate}
        />
        <span className="hidden sm:inline">FRAGCODER</span>
      </button>

      {/* Group 2: Center - Title Dropdown with unsaved indicator (desktop only) */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center">
        <TitleDropdown
          title={localShaderTitle}
          creatorUsername={creatorUsername}
          isSavedShader={isSavedShader}
          isOwner={isOwner}
          hasUnsavedChanges={hasUnsavedChanges}
          onSaveAs={onSaveAs}
          onRename={onRename}
          onClone={onClone}
          onDelete={onDelete}
        />
      </div>

      {/* Group 3: Right side - Controls */}
      <TooltipProvider>
        <div className="flex items-center gap-1 ml-auto">
          {/* Pause Button - only visible when playing */}
          {isPlaying && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPause}
                  className="h-7 w-7 bg-transparent hover:bg-background-highlighted text-foreground hover:text-foreground-highlighted focus:outline-none rounded-md"
                >
                  <Pause size={14} strokeWidth={2} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Pause</TooltipContent>
            </Tooltip>
          )}

          {/* Compile/Play Button - always visible, green, with animations */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                key={`compile-btn-${lastCompilationTime}`}
                variant="ghost"
                size="icon"
                onClick={onCompile}
                disabled={isCompiling}
                className="h-7 w-7 bg-transparent hover:bg-success/20 text-success hover:text-success focus:outline-none rounded-md disabled:opacity-50"
                style={{
                  animation: getCompileButtonAnimation()
                }}
              >
                <Play
                  size={14}
                  strokeWidth={2}
                  style={{
                    animation: isCompiling ? 'compileButtonSpin 1s linear infinite' : undefined
                  }}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Compile & run</TooltipContent>
          </Tooltip>

          {/* Save Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={canSave ? handleSave : undefined}
                disabled={!canSave}
                className="h-7 px-2 py-1 text-sm font-light bg-transparent hover:bg-background-highlighted text-foreground hover:text-foreground-highlighted focus:outline-none rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canSave ? 'Save' : 'Saved'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Save shader</TooltipContent>
          </Tooltip>

          {/* New Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <NewShaderButton onClick={() => window.location.href = '/new'} />
            </TooltipTrigger>
            <TooltipContent side="bottom">New shader</TooltipContent>
          </Tooltip>

          {/* Browse Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <BrowseButton onClick={() => window.location.href = '/gallery'} />
            </TooltipTrigger>
            <TooltipContent side="bottom">Gallery</TooltipContent>
          </Tooltip>

          {/* AI Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleAIPanel}
                disabled={!isSignedIn}
                className={`h-7 px-2 py-1 text-sm font-light focus:outline-none rounded-md flex items-center gap-1 border ${
                  isAIPanelOpen
                    ? 'bg-accent/80 border-accent/80 text-foreground hover:bg-accent'
                    : 'bg-transparent border-accent-shadow text-accent hover:text-accent hover:bg-accent-shadow/80 hover:border-accent-shadow'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="hidden sm:inline select-none">AI</span>
                <Sparkles size={14} strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isSignedIn ? 'Toggle AI' : 'Sign in to use AI'}
            </TooltipContent>
          </Tooltip>

          {/* Account Button */}
          <UserMenu
            isSignedIn={isSignedIn}
            username={username}
            userPicture={userPicture}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
          />
        </div>
      </TooltipProvider>
    </div>
  );
}
