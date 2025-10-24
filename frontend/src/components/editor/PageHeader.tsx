/** Unified page header spanning full width with Logo/home button on left and editor controls on right. */
import { Logo } from '../Logo';
import { TitleDropdown } from './TitleDropdown';
import { BrowseButton } from './BrowseButton';
import { NewShaderButton } from './NewShaderButton';
import { UserMenu } from './UserMenu';

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
  onSave: () => void;
  onSaveAs: () => void;
  onRename: () => void;
  onClone: () => void;
  onDelete: () => void;

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
  onSave,
  onSaveAs,
  onRename,
  onClone,
  onDelete,
  isSignedIn,
  username,
  userPicture,
  onSignIn,
  onSignOut,
}: PageHeaderProps) {
  return (
    <div className="w-full flex items-center px-2 py-0.5 bg-background-header border-b-2 border-accent-shadow relative" style={{ zIndex: 20 }}>
      {/* Left side - Logo/Home button */}
      <button
        onClick={onHomeClick}
        onMouseEnter={onLogoMouseEnter}
        onMouseLeave={onLogoMouseLeave}
        className="home-button text-title font-regular bg-transparent text-foreground hover:text-accent px-1 flex items-center gap-1"
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
        <span>FRAGCODER</span>
      </button>

      {/* Center - Title Dropdown (desktop only) */}
      <div className="hidden md:flex flex-1 items-center justify-center min-w-0">
        <TitleDropdown
          title={localShaderTitle}
          creatorUsername={creatorUsername}
          isSavedShader={isSavedShader}
          isOwner={isOwner}
          onSave={onSave}
          onSaveAs={onSaveAs}
          onRename={onRename}
          onClone={onClone}
          onDelete={onDelete}
        />
      </div>

      {/* Right side - Navigation and user controls */}
      <div className="flex items-center gap-1 md:gap-2 ml-auto md:ml-0">
        <BrowseButton onClick={() => window.location.href = '/gallery'} />
        <NewShaderButton onClick={() => window.location.href = '/new'} />
        <UserMenu
          isSignedIn={isSignedIn}
          username={username}
          userPicture={userPicture}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
        />
      </div>
    </div>
  );
}
