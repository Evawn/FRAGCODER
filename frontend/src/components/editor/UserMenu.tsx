import { Button } from '../ui/button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownOption } from '../ui/Dropdown';

interface UserMenuProps {
  isSignedIn: boolean;
  username?: string;
  userPicture?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function UserMenu({
  isSignedIn,
  username,
  userPicture,
  onSignIn,
  onSignOut,
}: UserMenuProps) {
  if (!isSignedIn || !username) {
    // Show Sign In button when not signed in
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-2 py-1 text-large font-light text-foreground bg-transparent hover:text-accent hover:bg-transparent focus:outline-none"
        style={{ outline: 'none', border: 'none' }}
        onClick={onSignIn}
      >
        <span className="text-lg">Sign In</span>
      </Button>
    );
  }

  // Show user menu when signed in
  const dropdownOptions: DropdownOption[] = [
    {
      text: `@${username}`,
      callback: () => { },
    },
    {
      text: 'My Shaders',
      callback: () => console.log('Navigate to my shaders'),
    },
    {
      text: 'Sign Out',
      callback: () => {
        onSignOut();
        console.log('User signed out');
      },
    },
  ];

  return (
    <Dropdown options={dropdownOptions}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-2 py-1 text-large font-light text-foreground bg-transparent hover:text-accent hover:bg-transparent focus:outline-none"
        style={{ outline: 'none', border: 'none' }}
      >
        <div className="flex items-center gap-2">
          {userPicture && (
            <img
              src={userPicture}
              alt={username}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-lg">{username}</span>
        </div>
      </Button>
    </Dropdown>
  );
}
