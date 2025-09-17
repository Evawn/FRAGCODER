import { createShader, VERTEX_SHADER_SOURCE } from './GLSLCompiler';

const SHADER_UNIFORMS = {
  iResolution: 'iResolution',
  iTime: 'iTime',
  iTimeDelta: 'iTimeDelta',
  iFrameRate: 'iFrameRate',
  iFrame: 'iFrame',
  iDate: 'iDate',
  u_time: 'u_time',
  u_resolution: 'u_resolution',
  u_mouse: 'u_mouse',
  iMouse: 'iMouse'
} as const;

interface MousePosition {
  x: number;
  y: number;
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private animationFrameId: number | null = null;
  private startTime: number = Date.now();
  private pausedTime: number = 0;
  private pauseStartTime: number | null = null;
  private mousePosition: MousePosition = { x: 0, y: 0 };
  private canvas: HTMLCanvasElement | null = null;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameRate: number = 60;
  private frameRateHistory: number[] = [];
  
  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * Initialize WebGL context with a canvas
   */
  initialize(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    
    // Only use WebGL 2.0
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
    
    if (!gl) {
      console.error('WebGL 2.0 is not supported in your browser');
      return false;
    }
    
    this.gl = gl;
    console.log('Using WebGL 2.0');
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
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.frameRate = 60;
    this.frameRateHistory = [];
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
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.frameRate = 60;
    this.frameRateHistory = [];
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

    // For single frame rendering, use a fixed small time delta
    const timeDelta = 1.0 / 60.0; // Assume 60 FPS for consistent behavior

    // Set all uniforms
    this.setUniforms(currentTime, timeDelta);

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
   * Check if using WebGL 2.0 (always true now)
   */
  getIsWebGL2(): boolean {
    return true;
  }

  /**
   * Get current shader time
   */
  getCurrentTime(): number {
    return (Date.now() - this.startTime - this.pausedTime) / 1000.0;
  }

  /**
   * Set all shader uniforms
   */
  private setUniforms(currentTime: number, timeDelta: number): void {
    if (!this.gl || !this.program || !this.canvas) return;

    const gl = this.gl;

    const uniforms = {
      [SHADER_UNIFORMS.iResolution]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.iResolution),
      [SHADER_UNIFORMS.iTime]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.iTime),
      [SHADER_UNIFORMS.iTimeDelta]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.iTimeDelta),
      [SHADER_UNIFORMS.iFrameRate]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.iFrameRate),
      [SHADER_UNIFORMS.iFrame]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.iFrame),
      [SHADER_UNIFORMS.iDate]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.iDate),
      [SHADER_UNIFORMS.u_time]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.u_time),
      [SHADER_UNIFORMS.u_resolution]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.u_resolution),
      [SHADER_UNIFORMS.u_mouse]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.u_mouse),
      [SHADER_UNIFORMS.iMouse]: gl.getUniformLocation(this.program, SHADER_UNIFORMS.iMouse)
    };

    // Calculate frame rate
    this.updateFrameRate(timeDelta);

    // Calculate date components
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-based
    const day = now.getDate();
    const timeInSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds() + (now.getMilliseconds() / 1000);

    // Set Shadertoy-style uniforms
    if (uniforms[SHADER_UNIFORMS.iResolution]) {
      const aspectRatio = this.canvas.width / this.canvas.height;
      gl.uniform3f(uniforms[SHADER_UNIFORMS.iResolution], this.canvas.width, this.canvas.height, aspectRatio);
    }
    if (uniforms[SHADER_UNIFORMS.iTime]) {
      gl.uniform1f(uniforms[SHADER_UNIFORMS.iTime], currentTime);
    }
    if (uniforms[SHADER_UNIFORMS.iTimeDelta]) {
      gl.uniform1f(uniforms[SHADER_UNIFORMS.iTimeDelta], timeDelta);
    }
    if (uniforms[SHADER_UNIFORMS.iFrameRate]) {
      gl.uniform1f(uniforms[SHADER_UNIFORMS.iFrameRate], this.frameRate);
    }
    if (uniforms[SHADER_UNIFORMS.iFrame]) {
      gl.uniform1i(uniforms[SHADER_UNIFORMS.iFrame], this.frameCount);
    }
    if (uniforms[SHADER_UNIFORMS.iDate]) {
      gl.uniform4f(uniforms[SHADER_UNIFORMS.iDate], year, month, day, timeInSeconds);
    }

    // Set legacy uniforms for backward compatibility
    if (uniforms[SHADER_UNIFORMS.u_time]) {
      gl.uniform1f(uniforms[SHADER_UNIFORMS.u_time], currentTime);
    }
    if (uniforms[SHADER_UNIFORMS.u_resolution]) {
      gl.uniform2f(uniforms[SHADER_UNIFORMS.u_resolution], this.canvas.width, this.canvas.height);
    }
    if (uniforms[SHADER_UNIFORMS.u_mouse]) {
      gl.uniform2f(uniforms[SHADER_UNIFORMS.u_mouse], this.mousePosition.x, this.mousePosition.y);
    }
    if (uniforms[SHADER_UNIFORMS.iMouse]) {
      gl.uniform4f(uniforms[SHADER_UNIFORMS.iMouse], this.mousePosition.x, this.mousePosition.y, 0, 0);
    }
  }

  /**
   * Update frame rate using a rolling average
   */
  private updateFrameRate(timeDelta: number): void {
    if (timeDelta > 0) {
      const instantFrameRate = 1.0 / timeDelta;
      
      this.frameRateHistory.push(instantFrameRate);
      
      // Keep only the last 60 frames for rolling average
      if (this.frameRateHistory.length > 60) {
        this.frameRateHistory.shift();
      }
      
      // Calculate average frame rate
      const sum = this.frameRateHistory.reduce((acc, rate) => acc + rate, 0);
      this.frameRate = sum / this.frameRateHistory.length;
    }
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
    
    // Calculate time delta
    const timeDelta = this.lastFrameTime > 0 ? currentTime - this.lastFrameTime : 0;
    this.lastFrameTime = currentTime;
    
    // Increment frame counter
    this.frameCount++;

    // Set all uniforms
    this.setUniforms(currentTime, timeDelta);

    // Clear and draw
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.animationFrameId = requestAnimationFrame(this.render);
  }
}