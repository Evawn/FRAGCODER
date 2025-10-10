import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';

interface SignInPopoverProps {
  children: React.ReactNode;
  onSignInSuccess?: (credential: string) => void;
  onError?: (error: string) => void;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function SignInPopover({ children, onSignInSuccess, onError }: SignInPopoverProps) {
  const [open, setOpen] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const isGoogleInitialized = useRef(false);

  // Initialize Google Sign-In when popover opens
  useEffect(() => {
    if (!open || isGoogleInitialized.current) return;

    // Function to attempt initialization
    const attemptInitialization = () => {
      // Check if Google Identity Services is loaded
      if (!window.google?.accounts?.id) {
        console.error('Google Identity Services not loaded');
        setError('Google Sign-In is not available. Please refresh the page.');
        return false;
      }

      // Get and validate Client ID
      const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

      if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
        console.warn('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID environment variable.');
        setError('Google Sign-In not configured. Please contact the administrator.');
        return false;
      }

      // Check if button ref is available
      if (!googleButtonRef.current) {
        return false;
      }

      try {
        // Initialize Google Sign-In
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignIn,
          auto_select: false,
        });

        // Render the Google Sign-In button
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_blue',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 280,
        });

        isGoogleInitialized.current = true;
        return true;
      } catch (err) {
        console.error('Error initializing Google Sign-In:', err);
        setError('Failed to initialize Google Sign-In');
        return false;
      }
    };

    // Try immediate initialization
    const success = attemptInitialization();

    // If failed due to timing, retry after a short delay
    if (!success && window.google?.accounts?.id) {
      const retryTimeout = setTimeout(() => {
        attemptInitialization();
      }, 100);

      return () => clearTimeout(retryTimeout);
    }
  }, [open]);

  const handleGoogleSignIn = async (response: GoogleCredentialResponse) => {
    console.log('Google Sign-In successful');
    setLoading(true);
    setError(null);

    try {
      // Store the credential for later use
      setGoogleCredential(response.credential);

      // TODO: In Phase 2, check if user exists via backend API
      // For now, simulate checking if user exists
      const userExists = false; // This will be replaced with actual API call

      if (userExists) {
        // User exists, sign them in directly
        onSignInSuccess?.(response.credential);
        setOpen(false);
        resetState();
      } else {
        // New user, show username input
        setShowUsernameInput(true);
      }
    } catch (err) {
      console.error('Error during sign-in:', err);
      setError('Failed to sign in. Please try again.');
      onError?.('Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: In Phase 2, create user account via backend API
      console.log('Creating account with username:', username);
      console.log('Google credential:', googleCredential);

      // Simulate account creation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Success - sign in the user
      if (googleCredential) {
        onSignInSuccess?.(googleCredential);
      }
      setOpen(false);
      resetState();
    } catch (err) {
      console.error('Error creating account:', err);
      setError('Failed to create account. Please try again.');
      onError?.('Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setShowUsernameInput(false);
    setUsername('');
    setError(null);
    setGoogleCredential(null);
    setLoading(false);
    isGoogleInitialized.current = false;
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 bg-gray-800 border-gray-700 text-white p-6"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              {showUsernameInput ? 'Create Your Account' : 'Sign In'}
            </h3>
            <p className="text-sm text-gray-400">
              {showUsernameInput
                ? 'Choose a username to complete your registration'
                : 'Sign in with your Google account to save and share your shaders'
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Content */}
          {!showUsernameInput ? (
            // Google Sign-In Button
            <div className="flex flex-col items-center space-y-4">
              <div
                ref={googleButtonRef}
                className="w-full flex justify-center"
              />
              {loading && (
                <div className="flex items-center space-x-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Signing in...</span>
                </div>
              )}
            </div>
          ) : (
            // Username Input Form
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-300">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleCreateAccount();
                    }
                  }}
                  placeholder="Enter your username"
                  disabled={loading}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  This will be your public display name
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setShowUsernameInput(false);
                    setUsername('');
                    setError(null);
                  }}
                  variant="outline"
                  className="flex-1 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateAccount}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading || !username.trim()}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
