function ShaderEditor() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Shader Editor</h1>
        <p className="text-lg text-gray-600 mb-4">
          This is where the shader editor and viewer will be implemented.
        </p>
        <div className="bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto">
          <p className="text-gray-300">
            Future features:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-4 text-left">
            <li>GLSL code editor with syntax highlighting</li>
            <li>Live WebGL preview</li>
            <li>Error display and debugging</li>
            <li>Save and share functionality</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ShaderEditor