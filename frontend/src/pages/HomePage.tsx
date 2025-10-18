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
const ANIMATION_BASE_DELAY = 600; // ms

// Background logo positioning and sizing configuration
const BACKGROUND_LOGO_CONFIG = {
  size: '95vw',           // Width of the logo
  topPosition: '-75vw',   // Vertical position (negative = above viewport)
  glowOpacity: 0.9,       // Opacity of the glow effect
  glowBlur: '200px',       // Blur amount for glow
  pulseDuration: '0s',    // Duration of pulse animation
  rotationSpeed: 6,       // Degrees per second
};

function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasPlayedInitialAnimationRef = useRef(false);

  // Simulate initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Track initial animation completion
  useEffect(() => {
    // Initial animation delay (600ms) + duration (2000ms) = 2600ms
    const timer = setTimeout(() => {
      hasPlayedInitialAnimationRef.current = true;
    }, ANIMATION_BASE_DELAY + 2000);
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
    <div className="min-h-screen max-w-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Professional Loading Screen */}
      <LoadingScreen isLoading={loading} />

      {/* Background Logo with Glow Effect - Entrance Animation */}
      <div
        className="absolute inset-0 pointer-events-none overflow-clip"
        style={{
          zIndex: 0,
          animation: !hasPlayedInitialAnimationRef.current
            ? `fadeInDownLarge 2.0s ease-in-out forwards`
            : undefined,
          animationDelay: !hasPlayedInitialAnimationRef.current ? `${ANIMATION_BASE_DELAY}ms` : '0ms',
          opacity: !hasPlayedInitialAnimationRef.current ? 0 : 1
        }}
      >
        {/* Logo and glow container - all positioning controlled by BACKGROUND_LOGO_CONFIG */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: BACKGROUND_LOGO_CONFIG.topPosition,
            width: BACKGROUND_LOGO_CONFIG.size,
            aspectRatio: '1',
          }}
        >
          {/* Pulsing glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full"
            style={{
              background: `radial-gradient(circle, hsla(38, 92%, 50%, ${BACKGROUND_LOGO_CONFIG.glowOpacity}) 0%, transparent 70%)`,
              filter: `blur(${BACKGROUND_LOGO_CONFIG.glowBlur})`,
              animation: `pulseBeam ${BACKGROUND_LOGO_CONFIG.pulseDuration} ease-in-out infinite`,
            }}
          />

          {/* Large rotating logo - CSS animation for smooth visual rotation */}
          <div
            className="absolute top-1/2 left-1/2 w-full h-full"
            style={{
              transform: 'translate(-50%, -50%) scaleY(-1) rotate(-45deg)',
              willChange: 'transform',
              animation: `backgroundLogoRotate ${360 / BACKGROUND_LOGO_CONFIG.rotationSpeed}s linear infinite`,
            }}
          >
            <Logo
              id="background-logo"
              width={undefined}
              height={undefined}
              className="w-full h-full"
              topLayerOpacity={0.85}
              constantRotation={true}
              rotationSpeed={BACKGROUND_LOGO_CONFIG.rotationSpeed}
            />
          </div>
        </div>
      </div>

      {/* Header - Group 1 Animation */}
      <div
        className="w-full bg-transparent px-2 py-0.5 relative"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 0}ms`,
          zIndex: 10
        }}
      >
        <div className=" flex items-center justify-between relative">
          {/* Bottom border with rounded ends */}
          <div className="absolute -bottom-1 left-1 right-1 h-0.5 bg-transparent rounded-full" />
          {/* Logo and Title */}
          <button
            onClick={() => navigate('/')}
            onMouseEnter={handleLogoMouseEnter}
            onMouseLeave={handleLogoMouseLeave}
            className="home-button text-title font-regular bg-transparent text-foreground hover:text-accent px-1 flex items-center gap-1"
            style={{ outline: 'none', border: 'none' }}
          >
            <Logo
              id="header-logo"
              width={30}
              height={30}
              className=""
              topLayerOpacity={0.85}
              duration={300}
              easingIntensity={2}
              onRotate={(setTargetAngle) => { logoRotateRef.current = setTargetAngle; }}
            />
            <span >FRAGCODER</span>
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
      <div className="flex-1 flex flex-col relative" style={{ zIndex: 10 }}>
        {/* Hero Section - Group 2 Animation */}
        <div
          className="w-full px-8 py-16 md:py-24"
          style={{
            animation: 'fadeInDown 0.6s ease-out forwards',
            opacity: 0,
            animationDelay: `${ANIMATION_BASE_DELAY + 400}ms`
          }}
        >
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Large Title */}
            <h1 className="text-6xl md:text-7xl font-bold text-foreground-highlighted tracking-tighter">
              FRAGCODER
            </h1>

            {/* Description */}
            <p className="text-xl italic md:text-2xl text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Create, edit, and share stunning GLSL fragment shaders with live WebGL rendering.
              Inspired by Shadertoy, built for creators.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                onClick={() => navigate('/gallery')}
                className="w-full sm:w-56 px-12 py-6 text-xl  border-accent hover:border-accent-highlighted bg-accent-shadow hover:bg-accent-highlighted text-accent-highlighted hover:text-background font-medium hover:font-extrabold rounded-md transition-colors"
              >
                Browse Shaders
              </Button>
              <Button
                onClick={() => navigate('/new')}
                className="w-full sm:w-56 px-12 py-6 text-xl border-accent-highlighted  bg-accent hover:bg-accent-highlighted hover:text-foreground-highlighted text-foreground font-medium hover:font-extrabold rounded-md transition-colors"
              >
                Create
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
            animationDelay: `${ANIMATION_BASE_DELAY + 800}ms`
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
