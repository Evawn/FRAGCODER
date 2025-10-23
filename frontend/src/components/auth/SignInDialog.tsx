/**
 * Sign-in dialog with Google OAuth integration
 * Handles both existing user authentication and new user registration with username selection
 */
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../AuthContext';
import { checkGoogleAuth, registerUser } from '../../api/auth';
import { LogIn } from 'lucide-react';
import { logger } from '../../utils/logger';

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignInSuccess?: () => void;
}

export function SignInDialog({ open, onOpenChange, onSignInSuccess }: SignInDialogProps) {
  const { signIn } = useAuth();
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);

  // Get dynamic title and description based on state
  const title = showUsernameInput ? 'Create Your Account' : 'Sign In';
  const description = showUsernameInput
    ? 'Choose a username to complete your registration'
    : 'Sign in with your Google account to save and share your shaders';

  const handleGoogleSignIn = async (response: CredentialResponse) => {
    setLoading(true);
    setError(null);

    try {
      const credential = response.credential;
      if (!credential) {
        setError('Failed to get credential from Google. Please try again.');
        setLoading(false);
        return;
      }

      setGoogleCredential(credential);

      // Check if user exists via backend API
      const result = await checkGoogleAuth(credential);

      if (result.exists && result.user && result.token) {
        // User exists - sign them in
        signIn(result.user, result.token);
        handleClose();
      } else {
        // New user - show username input
        setShowUsernameInput(true);
      }
    } catch (err: unknown) {
      logger.error('Error during Google sign-in', err);
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to sign in. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    logger.error('Google Sign-In failed');
    setError('Failed to sign in with Google. Please try again.');
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

    if (!googleCredential) {
      setError('Authentication error. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Register new user via backend API
      const result = await registerUser(googleCredential, username.trim());

      // Success - sign in the user
      signIn(result.user, result.token);
      handleClose();
    } catch (err: unknown) {
      logger.error('Error creating new user account', err);
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to create account. Please try again.';
      setError(message);
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
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
    // Call success callback if provided
    onSignInSuccess?.();
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-80 p-4">
        <DialogHeader>
          <DialogTitle icon={<LogIn size={18} strokeWidth={2} />}>
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error rounded-none p-3">
              <p className="text-sm text-foreground-highlighted">{error}</p>
            </div>
          )}

          {/* Content */}
          {!showUsernameInput ? (
            <div className="flex flex-col items-center space-y-4">
              <GoogleLogin
                onSuccess={handleGoogleSignIn}
                onError={handleGoogleError}
                size="large"
                text="signin_with"
                shape="rectangular"
                width="280"
              />
              {loading && (
                <div className="flex items-center space-x-2 text-foreground-muted">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Signing in...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-small font-medium text-foreground-highlighted">
                  Username
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleCreateAccount();
                    }
                  }}
                  placeholder="Enter your username"
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-foreground-muted">
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
                  className="flex-1 bg-background text-large font-light border-background-highlighted text-foreground hover:bg-background-highlighted hover:text-foreground-highlighted"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateAccount}
                  className="flex-1 text-large font-light bg-accent-shadow border-accent hover:bg-accent text-foreground-highlighted"
                  disabled={loading || !username.trim()}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
          <div className="pt-4 border-t border-background-highlighted">
            <p className="text-xs text-foreground-muted text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
