import ShaderCard from './ShaderCard';

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

interface ShaderGridProps {
  shaders: Shader[];
}

function ShaderGrid({ shaders }: ShaderGridProps) {
  if (shaders.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">No shaders found</p>
        <p className="text-gray-500 mt-2">Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {shaders.map((shader) => (
        <ShaderCard
          key={shader.id}
          id={shader.id}
          title={shader.title}
          slug={shader.slug}
          description={shader.description}
          thumbnail={shader.thumbnail}
          author={shader.user}
          createdAt={shader.createdAt}
          forkedFrom={shader.forkedFrom}
        />
      ))}
    </div>
  );
}

export default ShaderGrid;