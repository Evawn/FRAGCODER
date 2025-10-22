// Minimal shader card with 4:3 thumbnail and thin title footer
// Features: Client-side rendered thumbnail, pulsing loading animation, crisp shadow styling, hover overlay with author and fork icon
// Memoized to prevent unnecessary re-renders when props unchanged

import { Link } from 'react-router-dom';
import { useState, useRef, memo } from 'react';
import { GitBranchPlus } from 'lucide-react';
import { logger } from '../utils/logger';

interface ShaderCardProps {
  id: string;
  title: string;
  slug: string;
  thumbnailDataURL?: string | null;
  isLoading?: boolean;
  author?: string;
  isForked?: boolean;
}

const ShaderCard = memo(function ShaderCard({ id, title, slug, thumbnailDataURL, isLoading = false, author, isForked = false }: ShaderCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const currentThumbnailRef = useRef<string | null | undefined>(thumbnailDataURL);

  // Reset image loaded state synchronously when thumbnail URL changes
  // This prevents race condition where onLoad fires before useEffect runs
  if (currentThumbnailRef.current !== thumbnailDataURL) {
    currentThumbnailRef.current = thumbnailDataURL;
    setImageLoaded(false);
  }

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    logger.error('Shader card thumbnail failed to load', undefined, {
      shaderId: id,
      shaderTitle: title,
      thumbnailSrc: thumbnailDataURL?.substring(0, 100)
    });
  };

  return (
    <Link
      to={`/shader/${slug}`}
      className="block rounded-sm overflow-hidden hover:transform hover:scale-105 transition-transform duration-200 shadow-md hover:shadow-xl"
      style={{
        backgroundColor: 'transparent'
      }}
    >
      {/* 4:3 Thumbnail Section */}
      <div className="aspect-[4/3] bg-surface-sunken relative overflow-hidden group">
        {thumbnailDataURL && !isLoading ? (
          <img
            key={thumbnailDataURL}
            src={thumbnailDataURL}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          // Pulsing loading animation
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(90deg, rgba(100,100,120,0.1) 0%, rgba(140,140,160,0.2) 50%, rgba(100,100,120,0.1) 100%)',
              backgroundSize: '200% 100%',
              animation: 'pulse-shimmer 2s ease-in-out infinite'
            }}
          />
        )}

        {/* Fallback placeholder when thumbnail fails to load */}
        {!thumbnailDataURL && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
        )}

        {/* Hover overlay with author and fork icon */}
        {(author || isForked) && (
          <div className="absolute top-0 left-0 right-0 h-1/8 bg-gradient-to-b from-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
            <div className="p-2 flex items-start justify-between">
              {/* Author text in top-left */}
              {author && (
                <span className="text-xs text-white/90 font-normal">
                  by: {author}
                </span>
              )}

              {/* Fork icon in top-right */}
              {isForked && (
                <GitBranchPlus className="w-4 h-4 text-white/90" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Thin Footer with Title */}
      <div className="bg-background-header px-3 py-2">
        <h3 className="text-sm font-light text-foreground truncate">
          {title}
        </h3>
      </div>

      <style>{`
        @keyframes pulse-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </Link>
  );
});

export default ShaderCard;
