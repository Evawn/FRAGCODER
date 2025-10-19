// Professional gallery page for browsing public shaders with search and pagination
// Features: centered header with logo/title/search, server-side search, paginated results, staggered animations
// Layout: Header (logo left, Browse Shaders + search center, user menu right) → Thin Results Bar (pagination + count) → Shader Grid

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import ShaderGrid from '../components/ShaderGrid';
import Pagination from '../components/Pagination';
import { LoadingScreen } from '../components/LoadingScreen';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/editor/UserMenu';
import { NewShaderButton } from '../components/editor/NewShaderButton';
import { useAuth } from '../AuthContext';
import { SignInDialog } from '../components/auth/SignInDialog';
import { ThumbnailRenderer } from '../utils/ThumbnailRenderer';
import type { TabShaderData } from '../utils/GLSLCompiler';

// Animation timing constant - base delay after loading screen
const ANIMATION_BASE_DELAY = 600; // ms

interface Shader {
  id: string;
  title: string;
  slug: string;
  description?: string;
  tabs: TabShaderData[];
  userId: string;
  user: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
  forkedFrom?: string;
  isPublic: boolean;
}

interface PaginatedResponse {
  shaders: Shader[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

function Gallery() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [shaders, setShaders] = useState<Shader[]>([]);
  const [inputValue, setInputValue] = useState(''); // What user is typing
  const [searchTerm, setSearchTerm] = useState(''); // Committed search term
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaginationTransition, setIsPaginationTransition] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);

  // Thumbnail management state
  const [thumbnails, setThumbnails] = useState<Map<string, string | null>>(new Map());
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set());
  const thumbnailRendererRef = useRef<ThumbnailRenderer | null>(null);

  // Ref to store Logo rotation function
  const logoRotateRef = useRef<((targetOffset: number) => void) | null>(null);

  // Fetch shaders from backend with search and pagination
  const fetchShaders = useCallback(async (page: number, search: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(search && { search })
      });

      const response = await fetch(`http://localhost:3001/api/shaders?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch shaders');
      }

      const data: PaginatedResponse = await response.json();
      setShaders(data.shaders);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setCurrentPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching shaders:', err);
    } finally {
      setLoading(false);
      setIsPaginationTransition(false);
    }
  }, []);

  // Initialize ThumbnailRenderer on mount
  useEffect(() => {
    thumbnailRendererRef.current = new ThumbnailRenderer();

    // Cleanup on unmount
    return () => {
      if (thumbnailRendererRef.current) {
        thumbnailRendererRef.current.dispose();
        thumbnailRendererRef.current = null;
      }
    };
  }, []);

  // Generate thumbnails for fetched shaders
  useEffect(() => {
    if (!thumbnailRendererRef.current || shaders.length === 0) return;

    const renderer = thumbnailRendererRef.current;

    // Mark all shaders as loading
    setLoadingThumbnails(new Set(shaders.map(s => s.id)));

    // Queue each shader for thumbnail generation
    shaders.forEach(shader => {
      renderer.queueThumbnail(shader.id, shader.tabs, (dataURL) => {
        // Update thumbnails map
        setThumbnails(prev => {
          const next = new Map(prev);
          next.set(shader.id, dataURL);
          return next;
        });

        // Remove from loading set
        setLoadingThumbnails(prev => {
          const next = new Set(prev);
          next.delete(shader.id);
          return next;
        });
      });
    });
  }, [shaders]);

  // Initial load
  useEffect(() => {
    fetchShaders(1, '');
  }, [fetchShaders]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleSearchSubmit = () => {
    // Update search term and fetch results (resets to page 1)
    setSearchTerm(inputValue);
    fetchShaders(1, inputValue);
  };

  const handlePageChange = (page: number) => {
    setIsPaginationTransition(true);
    fetchShaders(page, searchTerm);
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-error text-lg mb-4">Error loading shaders</p>
            <p className="text-foreground-muted mb-4">{error}</p>
            <button
              onClick={() => fetchShaders(currentPage, searchTerm)}
              className="bg-accent hover:bg-accent-highlighted text-accent-foreground px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-x-visible overflow-y-hidden py-0">
      {/* Background Glow Gradient - Fixed to bottom */}
      <div
        className="fixed top-[-75vw] left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          zIndex: 0,
          width: '95vw',
          aspectRatio: '1',
        }}
      >
        {/* Static glow gradient */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(circle, hsla(38, 92%, 50%, 0.4) 0%, transparent 70%)',
            filter: 'blur(400px)',
          }}
        />
      </div>

      {/* Professional Loading Screen - only show for initial load, not pagination */}
      <LoadingScreen isLoading={loading && !isPaginationTransition} />

      {/* Header - Group 1 Animation */}
      <div
        className="w-full bg-background-header px-0 py-0 relative flex-shrink-0"
        style={{
          animation: 'fadeInDown 0.4s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 0}ms`,
          zIndex: 10
        }}
      >
        <div className="flex items-center justify-between relative border-b-2 py-px px-2 border-accent-shadow">

          {/* Logo and Title (Left) */}
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
            <span>FRAGCODER</span>
          </button>

          {/* Center Title (optional - currently empty) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* Reserved for future center content */}
          </div>

          {/* Right-side buttons */}
          <div className="flex items-center gap-2">
            <NewShaderButton onClick={() => navigate('/new')} />
            <UserMenu
              isSignedIn={!!user}
              username={user?.username}
              userPicture={user?.picture || undefined}
              onSignIn={() => setIsSignInDialogOpen(true)}
              onSignOut={signOut}
            />
          </div>
        </div>
      </div>

      {/* Search Results Section - Group 2 Animation */}
      <div
        className="w-[90vw] mx-auto py-4  flex-shrink-0"
        style={{
          animation: 'fadeInDown 0.4s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 200}ms`
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Bar */}
          <div className="w-full md:w-[400px]">
            <SearchBar
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onSearchSubmit={handleSearchSubmit}
              placeholder="Search shaders, authors..."
            />
          </div>

          {/* Results Text and Pagination Group (wraps on mobile) */}
          <div className="flex flex-wrap items-center gap-4 flex-1 w-full md:w-auto">
            {/* Results Text */}
            <p className="text-foreground-muted italic font-normal text-xs">
              {searchTerm
                ? `Viewing ${shaders.length} / ${total} results for '${searchTerm}'`
                : `Viewing ${shaders.length} / ${total} shaders`
              }
            </p>

            {/* Spacer to push pagination to the right on desktop */}
            <div className="hidden md:flex flex-1" />

            {/* Pagination Controls */}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

          </div>
        </div>
      </div>

      {/* Results Container - Group 3 Animation, Fixed Height */}
      <div
        className="w-[90vw] mx-auto p-0 flex-1 overflow-y-auto hide-scrollbar"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 400}ms`
        }}
      >
        <div className="h-full">
          <ShaderGrid
            shaders={shaders}
            thumbnails={thumbnails}
            loadingThumbnails={loadingThumbnails}
            currentPage={currentPage}
          />
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

export default Gallery;