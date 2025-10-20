/** Editor header with title dropdown, navigation buttons, and user authentication menu. */
import { TitleDropdown } from './TitleDropdown';
import { BrowseButton } from './BrowseButton';
import { NewShaderButton } from './NewShaderButton';
import { UserMenu } from './UserMenu';

interface EditorHeaderProps {
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

export function EditorHeader({
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
}: EditorHeaderProps) {
  return (
    <div className="relative flex items-center justify-between px-2 py-0.5" style={{ zIndex: 20 }}>
      {/* Title Button with Options Dropdown */}
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

      {/* Right-side buttons */}
      <div className="flex items-center gap-2">
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
