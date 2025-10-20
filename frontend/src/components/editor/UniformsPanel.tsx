/** Collapsible panel displaying available GLSL shader uniforms with syntax highlighting. */
import { useState } from 'react';
import { Button } from '../ui/button';
import { ChevronDown } from 'lucide-react';

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

// Simple syntax highlighting for uniform declarations
function highlightLine(line: string) {
  // Split by '//' to separate code and comment
  const commentIndex = line.indexOf('//');

  if (commentIndex === -1) {
    // No comment, just parse the code
    return parseCode(line);
  }

  const code = line.slice(0, commentIndex);
  const comment = line.slice(commentIndex);

  return (
    <>
      {parseCode(code)}
      <span className="text-foreground-muted">{comment}</span>
    </>
  );
}

function parseCode(code: string) {
  const tokens = code.split(/\s+/).filter(t => t.length > 0);

  if (tokens.length === 0) {
    return code;
  }

  // Rule: 1st token = uniform (keyword), 2nd = type, 3rd = variable name
  const parts = [];
  let lastIndex = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const idx = code.indexOf(token, lastIndex);

    // Add whitespace before token
    if (idx > lastIndex) {
      parts.push(<span key={`ws-${i}`}>{code.slice(lastIndex, idx)}</span>);
    }

    // Add colored token
    let className = '';
    if (i === 0) className = 'text-accent-highlighted'; // uniform keyword
    else if (i === 1) className = 'text-info'; // type
    else if (i === 2) className = 'text-foreground'; // variable name

    parts.push(<span key={i} className={className}>{token}</span>);
    lastIndex = idx + token.length;
  }

  // Add any remaining characters (like semicolon)
  if (lastIndex < code.length) {
    parts.push(<span key="end" className="text-foreground-muted">{code.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

export function UniformsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse uniform header into highlighted lines
  const lines = uniformHeader.split('\n');

  return (
    <div className="bg-background-editor border-b border-background p-0 gap-0">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full  rounded-none h-6 px-3 py-0 text-small font-light text-foreground-muted bg-transparent hover:text-foreground-highlighted  hover:bg-background-editor focus:outline-none justify-start shadow-none"
        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
      >
        <ChevronDown
          className={`w-3 h-3 mr-2 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
        />
        <span className='text-small'>Uniform Inputs</span>
      </Button>

      <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
        <pre className="text-small font-light font-mono bg-transparent px-[37px] overflow-x-auto leading-snug">
          {lines.map((line, lineIndex) => (
            <div key={lineIndex}>
              {highlightLine(line)}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
