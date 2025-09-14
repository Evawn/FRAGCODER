import { useState } from 'react'

function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </h1>
        
        <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
          <p className="text-gray-300 mb-6">
            Authentication features coming soon!
          </p>
          
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="Email"
              className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input 
              type="password" 
              placeholder="Password"
              className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isSignUp && (
              <input 
                type="text" 
                placeholder="Username"
                className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </div>
          
          <p className="mt-6 text-gray-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-blue-400 hover:text-blue-300"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Auth