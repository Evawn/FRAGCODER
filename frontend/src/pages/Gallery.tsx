import { useState } from 'react'
import reactLogo from '../assets/react.svg'
import viteLogo from '/vite.svg'

function Gallery() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Gallery</h1>
        <div className="flex justify-center gap-4 mb-8">
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="h-24 hover:drop-shadow-[0_0_2em_#646cffaa]" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="h-24 hover:drop-shadow-[0_0_2em_#61dafbaa] animate-spin-slow" alt="React logo" />
          </a>
        </div>
        <h2 className="text-2xl mb-8">Vite + React</h2>
        <div className="card">
          <button 
            onClick={() => setCount((count) => count + 1)}
            className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            count is {count}
          </button>
          <p className="mt-4">
            Edit <code className="bg-gray-800 px-2 py-1 rounded">src/pages/Gallery.tsx</code> and save to test HMR
          </p>
        </div>
        <p className="mt-8 text-gray-500">
          Click on the Vite and React logos to learn more
        </p>
      </div>
    </div>
  )
}

export default Gallery