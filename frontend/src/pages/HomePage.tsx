// Home page with hero section, title, description, CTA buttons, and video preview
// Features sequential fade-in animations and consistent styling with EditorPage

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/editor/UserMenu';
import { Button } from '../components/ui/button';
import { useAuth } from '../AuthContext';
import { SignInDialog } from '../components/auth/SignInDialog';
import { LoadingScreen } from '../components/LoadingScreen';

// Animation timing constant - base delay after loading screen
const ANIMATION_BASE_DELAY = 400; // ms

function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simulate initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Ref to store Logo rotation function
  const logoRotateRef = useRef<((targetOffset: number) => void) | null>(null);

  // Handle Logo rotation on mouse enter/leave
  const handleLogoMouseEnter = useCallback(() => {
    if (logoRotateRef.current) {
      logoRotateRef.current(180); // Set target to 180°
    }
  }, []);

  const handleLogoMouseLeave = useCallback(() => {
    if (logoRotateRef.current) {
      logoRotateRef.current(0); // Set target to 0°
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Professional Loading Screen */}
      <LoadingScreen isLoading={loading} />

      {/* Header - Group 1 Animation */}
      <div
        className="w-full bg-background-header border-b-2 border-accent-shadow px-2 py-0.5"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 0}ms`
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo and Title */}
          <button
            onClick={() => navigate('/')}
            onMouseEnter={handleLogoMouseEnter}
            onMouseLeave={handleLogoMouseLeave}
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
              onRotate={(setTargetAngle) => { logoRotateRef.current = setTargetAngle; }}
            />
            <span>FRAGCODER</span>
          </button>

          {/* User Menu */}
          <UserMenu
            isSignedIn={!!user}
            username={user?.username}
            userPicture={user?.picture || undefined}
            onSignIn={() => setIsSignInDialogOpen(true)}
            onSignOut={signOut}
          />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col">
        {/* Hero Section - Group 2 Animation */}
        <div
          className="w-full px-8 py-16 md:py-24"
          style={{
            animation: 'fadeInDown 0.6s ease-out forwards',
            opacity: 0,
            animationDelay: `${ANIMATION_BASE_DELAY + 300}ms`
          }}
        >
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Large Title */}
            <h1 className="text-6xl md:text-7xl font-bold text-foreground-highlighted tracking-tight">
              FRAGCODER
            </h1>

            {/* Description */}
            <p className="text-xl md:text-2xl text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Create, edit, and share stunning GLSL fragment shaders with live WebGL rendering.
              Inspired by Shadertoy, built for creators.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                onClick={() => navigate('/gallery')}
                className="w-full sm:w-auto px-12 py-6 text-xl bg-accent hover:bg-accent-highlighted text-accent-foreground font-medium rounded-md transition-colors"
              >
                Browse Gallery
              </Button>
              <Button
                onClick={() => navigate('/new')}
                className="w-full sm:w-auto px-12 py-6 text-xl bg-background-highlighted hover:bg-foreground-muted hover:text-background text-foreground font-medium rounded-md transition-colors"
              >
                Create Shader
              </Button>
            </div>
          </div>
        </div>

        {/* Video Preview Section - Group 3 Animation */}
        <div
          className="w-full px-8 pb-16"
          style={{
            animation: 'fadeInDown 0.6s ease-out forwards',
            opacity: 0,
            animationDelay: `${ANIMATION_BASE_DELAY + 600}ms`
          }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Video Preview Placeholder */}
            <div
              className="w-full bg-background-highlighted border-2 border-lines rounded-lg flex items-center justify-center"
              style={{
                aspectRatio: '16 / 9',
                minHeight: '400px'
              }}
            >
              <span className="text-3xl text-foreground-muted font-light tracking-widest">
                VIDEO PREVIEW
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sign In Dialog */}
      <SignInDialog
        open={isSignInDialogOpen}
        onOpenChange={setIsSignInDialogOpen}
      />
    </div>
  );
}

export default HomePage;
