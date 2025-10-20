import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Gallery from './pages/GalleryPage'
import EditorPage from './pages/EditorPage'
import LogoTestPage from './pages/LogoTestPage'

function App() {
  return (
    <div className="relative min-h-screen bg-background text-foreground w-full overflow-x-clip">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/new" element={<EditorPage />} />
        <Route path="/shader/:slug" element={<EditorPage />} />
        <Route path="/logo" element={<LogoTestPage />} />
      </Routes>
    </div>
  )
}

export default App
