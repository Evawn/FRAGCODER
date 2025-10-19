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
  thumbnails: Map<string, string | null>;
  loadingThumbnails: Set<string>;
}

function ShaderGrid({ shaders, thumbnails, loadingThumbnails }: ShaderGridProps) {
  if (shaders.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground-muted text-lg">No shaders found</p>
        <p className="text-foreground-muted/70 mt-2">Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {shaders.map((shader, index) => (
        <div
          key={shader.id}
          style={{
            animation: 'fadeInDown 0.4s ease-out forwards',
            opacity: 0,
            animationDelay: `${Math.min(index * 50, 500)}ms`
          }}
        >
          <ShaderCard
            id={shader.id}
            title={shader.title}
            slug={shader.slug}
            thumbnailDataURL={thumbnails.get(shader.id) || null}
            isLoading={loadingThumbnails.has(shader.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default ShaderGrid;
