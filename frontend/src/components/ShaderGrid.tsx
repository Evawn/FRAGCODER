// Grid layout component for displaying shader cards with staggered fade-in animations
// Responsive grid: 1-4 columns based on screen size, with smooth entrance animations

import ShaderCard from './ShaderCard';
import type { TabShaderData } from '../utils/GLSLCompiler';

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

interface ShaderGridProps {
  shaders: Shader[];
  thumbnailStates: Map<string, { dataURL: string | null; isLoading: boolean }>;
  currentPage?: number; // Used as key to trigger page transition animations
}

function ShaderGrid({ shaders, thumbnailStates, currentPage }: ShaderGridProps) {
  if (shaders.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground-muted text-lg">No shaders found</p>
        <p className="text-foreground-muted/70 mt-2">Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div
      key={currentPage}
      className="grid grid-cols-1 px-2 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
      style={{
        animation: 'slideInFromRight 0.3s ease-out forwards',
        opacity: 0
      }}
    >
      {shaders.map((shader, index) => {
        const thumbnailState = thumbnailStates.get(shader.id);
        return (
          <div
            key={shader.id}
            style={{
              animation: 'fadeInScale 0.25s ease-out forwards',
              opacity: 0,
              animationDelay: `${Math.min(index * 30, 300)}ms`
            }}
          >
            <ShaderCard
              id={shader.id}
              title={shader.title}
              slug={shader.slug}
              thumbnailDataURL={thumbnailState?.dataURL || null}
              isLoading={thumbnailState?.isLoading || false}
              author={shader.user.username}
              isForked={!!shader.forkedFrom}
            />
          </div>
        );
      })}

      <style>{`
        @keyframes slideInFromRight {
          0% {
            transform: translateX(30px);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeInScale {
          0% {
            transform: scale(0.95);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default ShaderGrid;
