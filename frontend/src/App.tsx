import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import Gallery from './pages/Gallery'
import ShaderEditor from './pages/ShaderEditor'
import Auth from './pages/Auth'

function App() {
  return (
    <div className="relative min-h-screen bg-gray-900 text-white w-full">
      <Navigation />
      <div className="pt-16">
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/editor" element={<ShaderEditor />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
