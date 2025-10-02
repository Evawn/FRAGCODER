import { createShader, VERTEX_SHADER_SOURCE, prepareShaderCode, PreprocessorCompilationError, type TabShaderData, type PassErrorInfo, type MultipassCompilationError } from './GLSLCompiler';

const SHADER_UNIFORMS = {
  iResolution: 'iResolution',
  iTime: 'iTime',
  iTimeDelta: 'iTimeDelta',
  iFrameRate: 'iFrameRate',
  iFrame: 'iFrame',
  iDate: 'iDate',
  BufferA: 'BufferA',
  BufferB: 'BufferB',
  BufferC: 'BufferC',
  BufferD: 'BufferD',
  u_time: 'u_time',
  u_resolution: 'u_resolution'
} as const;

interface RenderPass {
  name: string;
  program: WebGLProgram;
  framebuffer: WebGLFramebuffer | null;  // null for Image pass (renders to screen)
  texture: WebGLTexture | null;          // Output texture (null for Image)
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private passes: Map<string, RenderPass> = new Map();
  private passOrder: string[] = ['Buffer A', 'Buffer B', 'Buffer C', 'Buffer D', 'Image'];
  private animationFrameId: number | null = null;
  private startTime: number = Date.now();
  private pausedTime: number = 0;
  private pauseStartTime: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameRate: number = 60;
  private frameRateHistory: number[] = [];
  
  constructor() {
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

    return true;
  }

  /**
   * Compile and link shader programs for multipass rendering
   * Compiles all passes and collects errors from all failed passes
   * Throws a MultipassCompilationError if any pass fails
   */
  compileShader(tabs: TabShaderData[]): void {
    if (!this.gl) {
      throw new Error('WebGL context not initialized');
    }

    // Clean up previous passes
    this.cleanupPasses();

    const gl = this.gl;

    // Find Common tab code (or empty string if not present)
    const commonTab = tabs.find(tab => tab.name === 'Common');
    const commonCode = commonTab ? commonTab.code : '';

    // Validate that Image tab exists
    const imageTab = tabs.find(tab => tab.name === 'Image');
    if (!imageTab) {
      throw new Error('Image tab is required but not found in shader tabs');
    }

    // Track successful and failed compilations
    const successfulPasses = new Map<string, RenderPass>();
    const failedPasses: PassErrorInfo[] = [];

    // Count Common code lines once for error reporting
    const commonLineCount = commonCode.trim() ? commonCode.trim().split('\n').length + 1 : 0;

    // Compile each pass in order, collecting errors
    for (const passName of this.passOrder) {
      // Skip Common tab (it's prepended to other passes)
      if (passName === 'Common') continue;

      // Check if this tab exists
      const tab = tabs.find(t => t.name === passName);
      if (!tab) {
        // This pass is disabled, skip it
        continue;
      }

      try {
        // Prepare shader code with Common prepended
        const { code: preparedCode, userCodeStartLine, lineMapping } = prepareShaderCode(commonCode, tab.code, passName);

        // Create program for this pass
        const program = this.createProgram(preparedCode);

        // Create framebuffer and texture for buffer passes (not Image)
        let framebuffer: WebGLFramebuffer | null = null;
        let texture: WebGLTexture | null = null;

        if (passName !== 'Image') {
          const fb = this.createFramebuffer();
          framebuffer = fb.framebuffer;
          texture = fb.texture;
        }

        // Store successful pass
        successfulPasses.set(passName, {
          name: passName,
          program,
          framebuffer,
          texture
        });

      } catch (error) {
        // If this is a preprocessor error, throw it immediately with proper pass info
        // This allows the error handler to properly attribute it to the correct tab
        if (error instanceof PreprocessorCompilationError) {
          throw error;
        }

        // Store error information for this pass
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Try to get line mapping info for error reporting
        let userCodeStartLine = 0;
        let lineMapping: Map<number, number> | undefined;

        try {
          const prepResult = prepareShaderCode(commonCode, tab.code, passName);
          userCodeStartLine = prepResult.userCodeStartLine;
          lineMapping = prepResult.lineMapping;
        } catch {
          // If preprocessing fails again, we'll use the error from the first attempt
        }

        failedPasses.push({
          passName,
          errorMessage,
          userCodeStartLine,
          commonLineCount,
          lineMapping
        });

        // Continue to next pass instead of throwing immediately
      }
    }

    // If any passes failed, cleanup and throw aggregated error
    if (failedPasses.length > 0) {
      // Clean up any successful passes since we can't render with partial success
      for (const pass of successfulPasses.values()) {
        if (pass.framebuffer) gl.deleteFramebuffer(pass.framebuffer);
        if (pass.texture) gl.deleteTexture(pass.texture);
        if (pass.program) {
          const shaders = gl.getAttachedShaders(pass.program);
          if (shaders) {
            shaders.forEach(shader => {
              gl.detachShader(pass.program, shader);
              gl.deleteShader(shader);
            });
          }
          gl.deleteProgram(pass.program);
        }
      }

      // Create and throw multipass compilation error
      const errorMessage = `Shader compilation failed in ${failedPasses.length} pass${failedPasses.length > 1 ? 'es' : ''}`;
      const multipassError = new Error(errorMessage) as MultipassCompilationError;
      multipassError.passErrors = failedPasses;
      throw multipassError;
    }

    // All passes succeeded - store them in this.passes
    for (const [passName, pass] of successfulPasses.entries()) {
      this.passes.set(passName, pass);
    }

    // Set up geometry (full screen quad) - shared across all passes
    // We'll use the Image program to set this up, then it applies to all
    const imagePass = this.passes.get('Image');
    if (imagePass) {
      gl.useProgram(imagePass.program);
      const positionAttributeLocation = gl.getAttribLocation(imagePass.program, 'a_position');
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
    }

    // Reset animation start time when shader changes (preserve pause state)
    this.resetAnimationTime();
  }

  /**
   * Create and link a WebGL program from fragment shader source
   */
  private createProgram(fragmentShaderSource: string): WebGLProgram {
    if (!this.gl) {
      throw new Error('WebGL context not initialized');
    }

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

    // Clean up shaders (they're now part of the program)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }

  /**
   * Create a framebuffer and texture for render-to-texture
   */
  private createFramebuffer(): { framebuffer: WebGLFramebuffer; texture: WebGLTexture } {
    if (!this.gl || !this.canvas) {
      throw new Error('WebGL context or canvas not initialized');
    }

    const gl = this.gl;

    // Create texture
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture');
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.canvas.width,
      this.canvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create framebuffer
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
      gl.deleteTexture(texture);
      throw new Error('Failed to create framebuffer');
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    // Check framebuffer completeness
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
      throw new Error(`Framebuffer incomplete: ${status}`);
    }

    // Unbind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { framebuffer, texture };
  }

  /**
   * Start the render loop
   */
  start(): void {
    if (!this.isReady() || !this.gl || this.animationFrameId !== null) {
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

    const gl = this.gl;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Resize all framebuffer textures to match new canvas size
    for (const pass of this.passes.values()) {
      if (pass.texture && pass.framebuffer) {
        // Recreate texture at new size
        gl.bindTexture(gl.TEXTURE_2D, pass.texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          this.canvas.width,
          this.canvas.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );
      }
    }

    // Unbind texture
    gl.bindTexture(gl.TEXTURE_2D, null);

    // If not currently animating (paused), render a single frame to preserve the image
    if (this.animationFrameId === null && this.isReady()) {
      this.renderSingleFrame();
    }
  }

  /**
   * Render a single frame without starting the animation loop
   */
  renderSingleFrame(): void {
    if (!this.gl || !this.isReady() || !this.canvas) return;

    const gl = this.gl;
    // When paused, use the time that was frozen at pause
    // When not paused, use current time (though this method is mainly for paused state)
    const currentTime = this.pauseStartTime !== null
      ? (this.pauseStartTime - this.startTime - this.pausedTime) / 1000.0
      : (Date.now() - this.startTime - this.pausedTime) / 1000.0;

    // For single frame rendering, use a fixed small time delta
    const timeDelta = 1.0 / 60.0; // Assume 60 FPS for consistent behavior

    // Render all passes in order
    for (const passName of this.passOrder) {
      const pass = this.passes.get(passName);
      if (!pass) continue; // Skip disabled passes

      // Bind framebuffer (null for Image pass = render to screen)
      gl.bindFramebuffer(gl.FRAMEBUFFER, pass.framebuffer);

      // Use this pass's program
      gl.useProgram(pass.program);

      // Set uniforms for this program
      this.setUniforms(pass.program, currentTime, timeDelta);

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Ensure we end up unbound
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.cleanupPasses();

    if (this.gl) {
      // Additional cleanup if needed
      this.gl = null;
    }

    this.canvas = null;
  }

  /**
   * Check if renderer is ready to render
   */
  isReady(): boolean {
    return !!(this.gl && this.passes.has('Image'));
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
  private setUniforms(program: WebGLProgram, currentTime: number, timeDelta: number): void {
    if (!this.gl || !this.canvas) return;

    const gl = this.gl;

    const uniforms = {
      [SHADER_UNIFORMS.iResolution]: gl.getUniformLocation(program, SHADER_UNIFORMS.iResolution),
      [SHADER_UNIFORMS.iTime]: gl.getUniformLocation(program, SHADER_UNIFORMS.iTime),
      [SHADER_UNIFORMS.iTimeDelta]: gl.getUniformLocation(program, SHADER_UNIFORMS.iTimeDelta),
      [SHADER_UNIFORMS.iFrameRate]: gl.getUniformLocation(program, SHADER_UNIFORMS.iFrameRate),
      [SHADER_UNIFORMS.iFrame]: gl.getUniformLocation(program, SHADER_UNIFORMS.iFrame),
      [SHADER_UNIFORMS.iDate]: gl.getUniformLocation(program, SHADER_UNIFORMS.iDate),
      [SHADER_UNIFORMS.u_time]: gl.getUniformLocation(program, SHADER_UNIFORMS.u_time),
      [SHADER_UNIFORMS.u_resolution]: gl.getUniformLocation(program, SHADER_UNIFORMS.u_resolution)
    };

    // Bind buffer textures to their respective uniforms (Buffer A-D → BufferA-D)
    const bufferMappings = [
      { passName: 'Buffer A', uniformName: 'BufferA', textureUnit: 0 },
      { passName: 'Buffer B', uniformName: 'BufferB', textureUnit: 1 },
      { passName: 'Buffer C', uniformName: 'BufferC', textureUnit: 2 },
      { passName: 'Buffer D', uniformName: 'BufferD', textureUnit: 3 }
    ];

    for (const mapping of bufferMappings) {
      const bufferPass = this.passes.get(mapping.passName);

      // Activate texture unit
      gl.activeTexture(gl.TEXTURE0 + mapping.textureUnit);

      if (bufferPass && bufferPass.texture) {
        // Bind buffer's output texture
        gl.bindTexture(gl.TEXTURE_2D, bufferPass.texture);
      } else {
        // Unbind texture (will sample black/zero)
        gl.bindTexture(gl.TEXTURE_2D, null);
      }

      // Set sampler uniform to texture unit index
      const bufferUniform = gl.getUniformLocation(program, mapping.uniformName);
      if (bufferUniform) {
        gl.uniform1i(bufferUniform, mapping.textureUnit);
      }
    }

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


  private cleanupPasses(): void {
    if (!this.gl) return;

    const gl = this.gl;

    // Clean up each pass
    for (const pass of this.passes.values()) {
      // Delete framebuffer if exists
      if (pass.framebuffer) {
        gl.deleteFramebuffer(pass.framebuffer);
      }

      // Delete texture if exists
      if (pass.texture) {
        gl.deleteTexture(pass.texture);
      }

      // Delete program
      gl.useProgram(null);
      const shaders = gl.getAttachedShaders(pass.program);
      if (shaders) {
        shaders.forEach(shader => {
          gl.detachShader(pass.program, shader);
          gl.deleteShader(shader);
        });
      }
      gl.deleteProgram(pass.program);
    }

    // Clear the passes map
    this.passes.clear();
  }

  private render(): void {
    if (!this.gl || !this.isReady() || !this.canvas) return;

    const gl = this.gl;
    const currentTime = (Date.now() - this.startTime - this.pausedTime) / 1000.0;

    // Calculate time delta
    const timeDelta = this.lastFrameTime > 0 ? currentTime - this.lastFrameTime : 0;
    this.lastFrameTime = currentTime;

    // Increment frame counter
    this.frameCount++;

    // Render all passes in order: Buffer A -> B -> C -> D -> Image
    for (const passName of this.passOrder) {
      const pass = this.passes.get(passName);
      if (!pass) continue; // Skip disabled passes

      // Bind framebuffer (null for Image pass = render to screen)
      gl.bindFramebuffer(gl.FRAMEBUFFER, pass.framebuffer);

      // Use this pass's program
      gl.useProgram(pass.program);

      // Set uniforms for this program
      this.setUniforms(pass.program, currentTime, timeDelta);

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Ensure we end up unbound
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.animationFrameId = requestAnimationFrame(this.render);
  }
}