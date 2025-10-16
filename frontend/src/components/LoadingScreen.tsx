// Professional full-screen loading screen with animated logo and radiating light beams
// Four animation stages: entrance (grow from center + 360° spin) → loading → exit → hidden
// Properly handles fast loads by waiting for entrance completion before exiting
// Uses GPU-accelerated transforms and opacity for smooth performance

import { useState, useEffect, useRef } from 'react';
import { Logo } from './Logo';

interface LoadingScreenProps {
  isLoading: boolean;
}

type AnimationStage = 'entering' | 'loading' | 'exiting' | 'hidden';

export const LoadingScreen = ({ isLoading }: LoadingScreenProps) => {
  const [stage, setStage] = useState<AnimationStage>('hidden');
  const logoRotateRef = useRef<((targetOffset: number) => void) | null>(null);
  const beamRotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const entranceCompleteRef = useRef<boolean>(false);
  const entranceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingStartTimeRef = useRef<number | null>(null);
  const minimumLoadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitSequenceStartedRef = useRef<boolean>(false);

  // Entrance trigger effect - starts entrance when isLoading becomes true
  useEffect(() => {
    if (isLoading && stage === 'hidden') {
      // Reset state for new entrance
      entranceCompleteRef.current = false;
      loadingStartTimeRef.current = null;
      exitSequenceStartedRef.current = false;

      // Start entrance animation
      setStage('entering');
    }
  }, [isLoading, stage]);

  // Entrance completion effect - transitions from entering to loading
  useEffect(() => {
    if (stage === 'entering') {
      // Trigger logo entrance rotation (360 degrees, 400ms, easing 2)
      if (logoRotateRef.current) {
        logoRotateRef.current(360);
      }

      // After entrance animation completes, move to loading stage
      entranceTimerRef.current = setTimeout(() => {
        entranceCompleteRef.current = true;

        // Record when we entered the loading state
        loadingStartTimeRef.current = Date.now();

        setStage('loading');
        entranceTimerRef.current = null;
      }, 400);

      return () => {
        if (entranceTimerRef.current) {
          clearTimeout(entranceTimerRef.current);
          entranceTimerRef.current = null;
        }
      };
    }
  }, [stage]);

  // Exit animation effect - triggers when isLoading becomes false
  // Properly handles all timing scenarios including fast loads during entrance
  useEffect(() => {
    // Only proceed if we should exit and we're in a visible stage
    if (!isLoading && (stage === 'entering' || stage === 'loading')) {
      // If entrance animation is still running, wait for it to complete
      if (!entranceCompleteRef.current) {
        // The entrance completion effect will set entranceCompleteRef.current = true
        // and change stage to 'loading', which will re-trigger this effect
        return;
      }

      // Entrance is complete, ensure minimum loading time before exiting
      const elapsed = loadingStartTimeRef.current ? Date.now() - loadingStartTimeRef.current : 0;
      const remainingTime = Math.max(0, 200 - elapsed);

      // Mark that exit sequence has started
      exitSequenceStartedRef.current = true;

      minimumLoadingTimerRef.current = setTimeout(() => {
        setStage('exiting');

        exitTimerRef.current = setTimeout(() => {
          setStage('hidden');
          exitTimerRef.current = null;
        }, 400);

        minimumLoadingTimerRef.current = null;
      }, remainingTime);

      return () => {
        // Only clear timers if the exit sequence hasn't started yet
        // Once started, let it complete uninterrupted
        if (!exitSequenceStartedRef.current) {
          if (minimumLoadingTimerRef.current) {
            clearTimeout(minimumLoadingTimerRef.current);
            minimumLoadingTimerRef.current = null;
          }
          if (exitTimerRef.current) {
            clearTimeout(exitTimerRef.current);
            exitTimerRef.current = null;
          }
        }
      };
    }
  }, [isLoading, stage]);

  // Continuous logo rotation during loading stage
  useEffect(() => {
    if (stage === 'loading' && logoRotateRef.current) {
      let rotation = 0;
      const rotationSpeed = 0.5; // degrees per frame

      const animate = () => {
        rotation = (rotation + rotationSpeed) % 360;
        if (logoRotateRef.current) {
          logoRotateRef.current(rotation);
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [stage]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (entranceTimerRef.current) {
        clearTimeout(entranceTimerRef.current);
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
      if (minimumLoadingTimerRef.current) {
        clearTimeout(minimumLoadingTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Don't render anything when hidden
  if (stage === 'hidden') {
    return null;
  }

  // Calculate animation classes based on stage
  const backdropClasses =
    stage === 'entering' ? 'opacity-100' :
      stage === 'exiting' ? 'animate-[fadeOut_0.4s_ease-out_forwards]' :
        'opacity-100';

  const logoContainerClasses =
    stage === 'entering' ? 'animate-[growFromCenter_0.4s_ease-out_forwards]' :
      stage === 'exiting' ? 'animate-[scaleAndFade_0.4s_ease-out_forwards]' :
        '';

  const beamsClasses =
    stage === 'entering' ? 'animate-[fadeIn_0.4s_ease-out_forwards]' :
      stage === 'exiting' ? 'animate-[fadeOut_0.4s_ease-out_forwards]' :
        'opacity-100';

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${backdropClasses}`}
      style={{
        backgroundColor: 'hsl(38, 10%, 9%)',
        pointerEvents: stage === 'exiting' ? 'none' : 'auto'
      }}
    >
      {/* Radiating light beams container */}
      <div className={`absolute inset-0 overflow-hidden ${beamsClasses}`}>
        <div
          className="absolute top-1/2 left-1/2 w-[200vmax] h-[200vmax] -translate-x-1/2 -translate-y-1/2"
          style={{
            animation: stage === 'loading' ? 'rotateBeams 20s linear infinite' : 'none'
          }}
        >

        </div>

        {/* Central glow effect */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsla(38, 92%, 50%, 0.4) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: stage === 'loading' ? 'pulseBeam 2s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Logo container with entrance/exit animations */}
      <div className={`relative z-10 ${logoContainerClasses}`}>
        <Logo
          width={128}
          height={128}
          topLayerOpacity={0.95}
          duration={400}
          easingIntensity={2}
          onRotate={(setTargetAngle) => { logoRotateRef.current = setTargetAngle; }}
        />
      </div>
    </div>
  );
};
