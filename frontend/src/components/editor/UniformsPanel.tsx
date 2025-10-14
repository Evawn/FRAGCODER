import { useState } from 'react';
import { Button } from '../ui/button';

// Standard GLSL uniform declarations for shader inputs
const uniformHeader = `// Standard Shader Uniforms
uniform vec3 iResolution;          // viewport resolution (in pixels)
uniform float iTime;               // shader playback time (in seconds)
uniform float iTimeDelta;          // render time (in seconds)
uniform float iFrameRate;          // shader frame rate
uniform int iFrame;                // shader playback frame
uniform vec4 iDate;                // year, month, day, time in seconds
uniform vec4 iMouse;               // mouse pixel coords. xy: current (if MLB down), zw: click
uniform sampler2D BufferA;         // Buffer A texture
uniform sampler2D BufferB;         // Buffer B texture
uniform sampler2D BufferC;         // Buffer C texture
uniform sampler2D BufferD;         // Buffer D texture`;

export function UniformsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-background-editor p-0 gap-0">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full rounded-none h-6 px-3 py-0 text-small font-light text-foreground-muted bg-transparent hover:text-foreground-highlighted  hover:bg-background-highlighted focus:outline-none justify-start"
        style={{ outline: 'none', border: 'none' }}
      >
        <svg
          className={`w-3 h-3 mr-2 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className='text-small'>Uniform Inputs</span>
      </Button>

      <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
        <div className="p-0">
          <pre className="text-small font-light text-foreground-muted font-mono bg-transparent px-14 overflow-x-auto leading-snug">
            {uniformHeader}
          </pre>
        </div>
      </div>
    </div>
  );
}
