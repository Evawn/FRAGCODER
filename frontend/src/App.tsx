import { Routes, Route } from 'react-router-dom'
import Gallery from './pages/GalleryPage'
import EditorPage from './pages/EditorPage'

function App() {
  return (
    <div className="relative min-h-screen bg-gray-900 text-white w-full">
      {/* <Navigation /> */}
      <Routes>
        <Route path="/" element={<Gallery />} />
        {/* <Route path="/editor" element={<ShaderEditor />} /> */}
        <Route path="/new" element={<EditorPage />} />
        <Route path="/shader/:slug" element={<EditorPage />} />
      </Routes>
    </div>
  )
}

export default App
