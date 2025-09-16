import { createShader, VERTEX_SHADER_SOURCE } from './GLSLCompiler';

interface MousePosition {
  x: number;
  y: number;
}

export class WebGLRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private animationFrameId: number | null = null;
  private startTime: number = Date.now();
  private pausedTime: number = 0;
  private pauseStartTime: number | null = null;
  private mousePosition: MousePosition = { x: 0, y: 0 };
  private canvas: HTMLCanvasElement | null = null;
  
  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * Initialize WebGL context with a canvas
   */
  initialize(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL is not supported');
      return false;
    }
    
    this.gl = gl as WebGLRenderingContext;
    this.updateViewport();
    
    // Add mouse move listener
    window.addEventListener('mousemove', this.handleMouseMove);
    
    return true;
  }

  /**
   * Compile and link shader program
   */
  compileShader(fragmentShaderSource: string): void {
    if (!this.gl) {
      throw new Error('WebGL context not initialized');
    }

    // Clean up previous program
    this.cleanupProgram();

    const gl = this.gl;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    if (!vertexShader) {
      throw new Error('Failed to create vertex shader');
    }

    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!fragmentShader) {
      gl.deleteShader(vertexShader);
      throw new Error('Fragment shader compilation failed');
    }

    // Create and link program
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error('Failed to create shader program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program) || 'Unknown linking error';
      
      // Clean up
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      
      throw new Error(error);
    }

    // Set up the program
    this.program = program;
    gl.useProgram(program);

    // Set up geometry (full screen quad)
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    );

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Reset animation start time when shader changes (preserve pause state)
    this.resetAnimationTime();
  }

  /**
   * Start the render loop
   */
  start(): void {
    if (!this.program || !this.gl || this.animationFrameId !== null) {
      return;
    }
    
    // If we were paused, calculate how long we were paused
    if (this.pauseStartTime !== null) {
      this.pausedTime += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
    }
    
    this.render();
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      
      // Record when we started pausing
      this.pauseStartTime = Date.now();
    }
  }

  /**
   * Reset the time uniform (for manual reset button)
   */
  resetTime(): void {
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.pauseStartTime = null;
  }

  /**
   * Reset animation time only (for shader compilation)
   */
  resetAnimationTime(): void {
    const now = Date.now();
    this.startTime = now;
    
    if (this.pauseStartTime !== null) {
      // If currently paused, reset pause start time to now to prevent negative time
      this.pauseStartTime = now;
    }
    
    // Reset accumulated pause time since we're starting fresh
    this.pausedTime = 0;
  }

  /**
   * Update viewport dimensions
   */
  updateViewport(): void {
    if (!this.gl || !this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // If not currently animating (paused), render a single frame to preserve the image
    if (this.animationFrameId === null && this.program) {
      this.renderSingleFrame();
    }
  }

  /**
   * Render a single frame without starting the animation loop
   */
  renderSingleFrame(): void {
    if (!this.gl || !this.program || !this.canvas) return;

    const gl = this.gl;
    // When paused, use the time that was frozen at pause
    // When not paused, use current time (though this method is mainly for paused state)
    const currentTime = this.pauseStartTime !== null 
      ? (this.pauseStartTime - this.startTime - this.pausedTime) / 1000.0
      : (Date.now() - this.startTime - this.pausedTime) / 1000.0;

    // Set uniforms
    const uniforms = {
      u_time: gl.getUniformLocation(this.program, 'u_time'),
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_mouse: gl.getUniformLocation(this.program, 'u_mouse'),
      iTime: gl.getUniformLocation(this.program, 'iTime'),
      iResolution: gl.getUniformLocation(this.program, 'iResolution'),
      iMouse: gl.getUniformLocation(this.program, 'iMouse')
    };

    // Set time uniforms
    if (uniforms.u_time) gl.uniform1f(uniforms.u_time, currentTime);
    if (uniforms.iTime) gl.uniform1f(uniforms.iTime, currentTime);

    // Set resolution uniforms
    if (uniforms.u_resolution) {
      gl.uniform2f(uniforms.u_resolution, this.canvas.width, this.canvas.height);
    }
    if (uniforms.iResolution) {
      gl.uniform2f(uniforms.iResolution, this.canvas.width, this.canvas.height);
    }

    // Set mouse uniforms
    if (uniforms.u_mouse) {
      gl.uniform2f(uniforms.u_mouse, this.mousePosition.x, this.mousePosition.y);
    }
    if (uniforms.iMouse) {
      gl.uniform4f(uniforms.iMouse, this.mousePosition.x, this.mousePosition.y, 0, 0);
    }

    // Clear and draw
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.cleanupProgram();
    
    if (this.gl) {
      // Additional cleanup if needed
      this.gl = null;
    }
    
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas = null;
  }

  /**
   * Check if renderer is ready to render
   */
  isReady(): boolean {
    return !!(this.gl && this.program);
  }

  /**
   * Get current shader time
   */
  getCurrentTime(): number {
    return (Date.now() - this.startTime - this.pausedTime) / 1000.0;
  }


  private cleanupProgram(): void {
    if (!this.gl || !this.program) return;

    const gl = this.gl;
    gl.useProgram(null);

    // Delete shaders
    const shaders = gl.getAttachedShaders(this.program);
    if (shaders) {
      shaders.forEach(shader => {
        gl.detachShader(this.program!, shader);
        gl.deleteShader(shader);
      });
    }

    gl.deleteProgram(this.program);
    this.program = null;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: e.clientX - rect.left,
      y: rect.height - (e.clientY - rect.top) // Flip Y coordinate
    };
  }

  private render(): void {
    if (!this.gl || !this.program || !this.canvas) return;

    const gl = this.gl;
    const currentTime = (Date.now() - this.startTime - this.pausedTime) / 1000.0;

    // Set uniforms
    const uniforms = {
      u_time: gl.getUniformLocation(this.program, 'u_time'),
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_mouse: gl.getUniformLocation(this.program, 'u_mouse'),
      iTime: gl.getUniformLocation(this.program, 'iTime'),
      iResolution: gl.getUniformLocation(this.program, 'iResolution'),
      iMouse: gl.getUniformLocation(this.program, 'iMouse')
    };

    // Set time uniforms
    if (uniforms.u_time) gl.uniform1f(uniforms.u_time, currentTime);
    if (uniforms.iTime) gl.uniform1f(uniforms.iTime, currentTime);

    // Set resolution uniforms
    if (uniforms.u_resolution) {
      gl.uniform2f(uniforms.u_resolution, this.canvas.width, this.canvas.height);
    }
    if (uniforms.iResolution) {
      gl.uniform2f(uniforms.iResolution, this.canvas.width, this.canvas.height);
    }

    // Set mouse uniforms
    if (uniforms.u_mouse) {
      gl.uniform2f(uniforms.u_mouse, this.mousePosition.x, this.mousePosition.y);
    }
    if (uniforms.iMouse) {
      gl.uniform4f(uniforms.iMouse, this.mousePosition.x, this.mousePosition.y, 0, 0);
    }

    // Clear and draw
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.animationFrameId = requestAnimationFrame(this.render);
  }
}