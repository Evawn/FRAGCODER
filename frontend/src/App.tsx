/** Root application component with route definitions for home, gallery, and editor pages. */
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Gallery from './pages/GalleryPage'
import EditorPage from './pages/EditorPage'
import PromptEngineeringPage from './pages/PromptEngineeringPage'

function App() {
  return (
    <div className="relative min-h-screen bg-background text-foreground w-full overflow-x-clip">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/new" element={<EditorPage />} />
        <Route path="/shader/:slug" element={<EditorPage />} />
        {/* Debug routes - remove when no longer needed */}
        <Route path="/debug/prompt-engineering" element={<PromptEngineeringPage />} />
        <Route path="/debug/prompt-engineering/golden-dataset" element={<PromptEngineeringPage />} />
        <Route path="/debug/prompt-engineering/:suiteId" element={<PromptEngineeringPage />} />
        <Route path="/debug/prompt-engineering/:suiteId/:promptId" element={<PromptEngineeringPage />} />
      </Routes>
    </div>
  )
}

export default App
