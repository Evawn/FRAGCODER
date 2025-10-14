import { TitleDropdown } from './TitleDropdown';
import { NewShaderButton } from './NewShaderButton';
import { UserMenu } from './UserMenu';

interface EditorHeaderProps {
  // Title dropdown props
  localShaderTitle: string;
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
    <div className="bg-background-header border-b border-lines flex items-center justify-between px-2 py-0.5">
      {/* Title Button with Options Dropdown */}
      <TitleDropdown
        title={localShaderTitle}
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
