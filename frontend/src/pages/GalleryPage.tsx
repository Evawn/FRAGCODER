// Professional gallery page for browsing public shaders with search and pagination
// Features: header with logo/user menu, server-side search, paginated results, staggered animations
// Layout: Header → Search Area → Fixed-height Results Container (no page scroll)

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import ShaderGrid from '../components/ShaderGrid';
import Pagination from '../components/Pagination';
import { LoadingScreen } from '../components/LoadingScreen';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/editor/UserMenu';
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
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Professional Loading Screen */}
      <LoadingScreen isLoading={loading} />

      {/* Header - Group 1 Animation */}
      <div
        className="w-full bg-transparent px-2 py-0.5 relative flex-shrink-0"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 0}ms`,
          zIndex: 10
        }}
      >
        <div className="flex items-center justify-between relative">
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

      {/* Search Area - Group 2 Animation */}
      <div
        className="w-full px-8 py-6 flex-shrink-0"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 400}ms`
        }}
      >
        <h1 className="text-3xl font-bold mb-6">Shader Gallery</h1>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Search Bar */}
          <div className="w-full sm:max-w-md">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              placeholder="Search shaders, authors..."
            />
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>

        {/* Results Count */}
        {searchTerm && (
          <p className="text-foreground-muted mt-3 text-sm">
            Found {total} shader{total !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        )}
      </div>

      {/* Results Container - Group 3 Animation, Fixed Height */}
      <div
        className="w-full px-8 pb-8 flex-1 overflow-hidden"
        style={{
          animation: 'fadeInDown 0.6s ease-out forwards',
          opacity: 0,
          animationDelay: `${ANIMATION_BASE_DELAY + 800}ms`
        }}
      >
        <div className="h-full overflow-y-auto">
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