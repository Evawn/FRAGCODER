import { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import ShaderGrid from '../components/ShaderGrid';
import LoadingSpinner from '../components/LoadingSpinner';

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

function Gallery() {
  const [shaders, setShaders] = useState<Shader[]>([]);
  const [filteredShaders, setFilteredShaders] = useState<Shader[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShaders();
  }, []);

  useEffect(() => {
    filterShaders();
  }, [shaders, searchTerm]);

  const fetchShaders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/shaders');
      
      if (!response.ok) {
        throw new Error('Failed to fetch shaders');
      }
      
      const data = await response.json();
      setShaders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching shaders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterShaders = () => {
    if (!searchTerm.trim()) {
      setFilteredShaders(shaders);
      return;
    }

    const filtered = shaders.filter((shader) => 
      shader.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shader.description && shader.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      shader.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredShaders(filtered);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Loading shaders..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-red-400 text-lg mb-4">Error loading shaders</p>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchShaders}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Shader Gallery</h1>
          <div className="max-w-md">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              placeholder="Search shaders, authors..."
            />
          </div>
          {searchTerm && (
            <p className="text-gray-400 mt-2 text-sm">
              Found {filteredShaders.length} shader{filteredShaders.length !== 1 ? 's' : ''} 
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          )}
        </div>

        <ShaderGrid shaders={filteredShaders} />
      </div>
    </div>
  );
}

export default Gallery;