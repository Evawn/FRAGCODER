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

// Animation timing constant - base delay after loading screen
const ANIMATION_BASE_DELAY = 600; // ms

interface Shader {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);

  // Ref to store Logo rotation function
  const logoRotateRef = useRef<((targetOffset: number) => void) | null>(null);

  // Fetch shaders from backend with search and pagination
  const fetchShaders = useCallback(async (page: number, search: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '16',
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
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchShaders(1, '');
  }, [fetchShaders]);

  // Handle search change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Reset to page 1 when search term changes
      fetchShaders(1, searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchShaders]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handlePageChange = (page: number) => {
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
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden py-0">
      {/* Professional Loading Screen */}
      <LoadingScreen isLoading={loading} />

      {/* Header - Group 1 Animation */}
      <div
        className="w-full bg-background-header px-2 py-0 relative flex-shrink-0"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 0}ms`,
          zIndex: 10
        }}
      >
        <div className="flex items-center justify-between relative border-b-2 py-px border-accent-shadow">

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

          {/* Browse Shaders Title and Search Bar (Center) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
            {/* <h1 className="text-title italic font-regular whitespace-nowrap">Browse</h1> */}
            <div className="w-[400px]">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                placeholder="Search shaders, authors..."
              />
            </div>
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
        className="w-full px-8 py-3 flex-shrink-0 border-b border-border"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 400}ms`
        }}
      >
        <div className="flex justify-between items-center">
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
          {totalPages <= 1 && <div />}

          {/* Results Text */}
          <p className="text-foreground-muted text-sm">
            {searchTerm
              ? `Found ${total} result${total !== 1 ? 's' : ''} for '${searchTerm}'`
              : `Viewing all shaders (${total})`
            }
          </p>
        </div>
      </div>

      {/* Results Container - Group 3 Animation, Fixed Height */}
      <div
        className="w-[90vw] mx-auto px-6 py-6 flex-1 overflow-hidden"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 800}ms`
        }}
      >
        <div className="h-full overflow-y-clip">
          <ShaderGrid shaders={shaders} />
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