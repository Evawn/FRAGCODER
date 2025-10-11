import { Link } from 'react-router-dom';

interface ShaderCardProps {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  author: {
    id: string;
    username: string;
  };
  createdAt: string;
  forkedFrom?: string;
}

function ShaderCard({ id, title, slug, description, thumbnail, author, createdAt, forkedFrom }: ShaderCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <Link
      to={`/shader/${slug}`}
      className="block bg-gray-800 rounded-lg overflow-hidden hover:transform hover:scale-105 transition-transform duration-200 hover:shadow-lg"
    >
      <div className="aspect-video bg-gray-900 relative overflow-hidden">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg 
              className="w-12 h-12" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" 
              />
            </svg>
          </div>
        )}
        {forkedFrom && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            Forked
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1 truncate">
          {title}
        </h3>
        {description && (
          <p className="text-gray-400 text-sm mb-2 line-clamp-2">
            {description}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>by {author.username}</span>
          <span>{formatDate(createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export default ShaderCard;