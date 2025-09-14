import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="absolute top-0 left-0 w-full bg-gray-900 border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h2 className="text-xl font-bold text-white">Shader Playground</h2>
            
            <div className="flex space-x-4">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Gallery
              </Link>
              
              <Link 
                to="/editor" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/editor') 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Shader Editor
              </Link>
              
              <Link 
                to="/auth" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/auth') 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation