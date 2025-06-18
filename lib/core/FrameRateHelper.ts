/**
 * Monitors frame rate and calculates average FPS over time using a running average
 */
export class FrameRateMonitor {
  private _frameDurations: number[] = [];
  private _frameDurationsIndex = 0;
  private _frameDurationsCount = 0;
  private _maxStoredValues = 1000;
  private _averageFps = 60;
  private _frameCount = 0;
  private _onFpsUpdate?: (fps: number) => void;
  private _lastFrameTime = 0; // Time of the last frame
  private _renderTime = 0; // Time to render a single frame
  private _smoothingFactor = 0.05; // Controls how quickly the average adapts
  private _lastUpdateTime = 0;
  private _updateInterval: number; // How often to call the update callback

  /**
   * Creates a new FrameRateMonitor
   * @param updateInterval How often to call the update callback (default: 1000ms)
   * @param onFpsUpdate Optional callback when FPS is updated
   * @param maxStoredValues Maximum number of frame durations to store (default: 1000)
   * @param smoothingFactor How quickly the average adapts (0.01-0.1 is typical)
   */
  constructor(
    updateInterval: number = 1000,
    onFpsUpdate?: (fps: number) => void,
    maxStoredValues: number = 1000,
    smoothingFactor: number = 0.05,
  ) {
    this._updateInterval = updateInterval;
    this._onFpsUpdate = onFpsUpdate;
    this._maxStoredValues = maxStoredValues;
    this._smoothingFactor = smoothingFactor;

    // Pre-allocate array with fixed size
    this._frameDurations = new Array(maxStoredValues).fill(0);
  }

  setOnFpsUpdate(onFpsUpdate: (fps: number) => void): void {
    this._onFpsUpdate = onFpsUpdate;
  }

  clearOnFpsUpdate(): void {
    this._onFpsUpdate = undefined;
  }

  /**
   * Records a frame being rendered and updates FPS tracking
   * @returns The current average FPS
   */
  recordFrame(): number {
    const currentTime = performance.now();
    this._frameCount++;

    // Calculate time between frames
    if (this._lastFrameTime > 0) {
      const frameDuration = currentTime - this._lastFrameTime;

      // Store frame duration in circular buffer
      if (frameDuration > 0 && frameDuration < 1000) {
        this._frameDurations[this._frameDurationsIndex] = frameDuration;
        this._frameDurationsIndex = (this._frameDurationsIndex + 1) % this._maxStoredValues;
        if (this._frameDurationsCount < this._maxStoredValues) {
          this._frameDurationsCount++;
        }

        // Calculate FPS from frame duration
        const currentFps = 1000 / frameDuration;

        // Cap FPS at a reasonable maximum (e.g., 120)
        const cappedFps = Math.min(currentFps, 120);

        // Update running average using exponential moving average
        if (this._averageFps === 0) {
          // First frame, just use the current value
          this._averageFps = cappedFps;
        } else {
          // Update running average
          this._averageFps =
            this._averageFps * (1 - this._smoothingFactor) + cappedFps * this._smoothingFactor;
        }

        // Call update callback periodically
        if (this._onFpsUpdate && currentTime - this._lastUpdateTime > this._updateInterval) {
          this._onFpsUpdate(this._averageFps);
          this._lastUpdateTime = currentTime;
        }
      }
    }

    // Update last frame time
    this._lastFrameTime = currentTime;

    return this._averageFps;
  }

  /**
   * Marks the start of a frame rendering cycle (for measuring render time)
   */
  tickStart(): void {
    this._renderTime = performance.now();
  }

  /**
   * Marks the end of a frame rendering cycle (for measuring render time)
   * @returns The time it took to render the frame in milliseconds
   */
  tickEnd(): number {
    const renderDuration = performance.now() - this._renderTime;
    return renderDuration;
  }

  /**
   * Gets the current average FPS
   */
  get averageFps(): number {
    return this._averageFps;
  }

  /**
   * Gets the current frame count
   */
  get frameCount(): number {
    return this._frameCount;
  }

  /**
   * Gets all stored frame durations
   */
  get frameDurations(): number[] {
    if (this._frameDurationsCount === this._maxStoredValues) {
      // If buffer is full, need to reorder to get chronological order
      const firstPart = this._frameDurations.slice(this._frameDurationsIndex);
      const secondPart = this._frameDurations.slice(0, this._frameDurationsIndex);
      return [...firstPart, ...secondPart];
    } else {
      // If buffer isn't full, just return the filled portion
      return this._frameDurations.slice(0, this._frameDurationsCount);
    }
  }

  /**
   * Gets the average frame duration in milliseconds
   */
  get averageFrameDuration(): number {
    return this._averageFps > 0 ? 1000 / this._averageFps : 0;
  }

  /**
   * Resets the FPS tracking
   */
  reset(): void {
    this._frameDurations.fill(0);
    this._frameDurationsIndex = 0;
    this._frameDurationsCount = 0;
    this._frameCount = 0;
    this._averageFps = 0;
    this._lastFrameTime = 0;
    this._lastUpdateTime = 0;
  }
}

/**
 * Controls frame rate by limiting when frames are rendered
 */
export class FrameRateController {
  private _targetFps: number;
  private _frameInterval: number;
  private _lastFrameTime = 0;
  private _frameCount = 0;
  private _enabled: boolean = true;

  /**
   * Creates a new FrameRateController
   * @param targetFps Target frames per second (default: 60)
   */
  constructor(targetFps: number = 60, enabled: boolean = true) {
    this._targetFps = targetFps;
    this._frameInterval = 1000 / targetFps;
    this._enabled = enabled;
  }

  /**
   * Checks if it's time to render a new frame based on target FPS
   * @returns True if it's time to render a new frame
   */
  shouldRenderFrame(): boolean {
    if (!this._enabled) {
      return true; // Always render if disabled
    }

    const currentTime = performance.now();
    const elapsed = currentTime - this._lastFrameTime;

    if (elapsed >= this._frameInterval) {
      // Adjust time by advancing exactly one frame interval
      // This ensures consistent timing even if multiple frames were missed
      this._lastFrameTime += this._frameInterval;

      // If we're significantly behind (more than one frame), catch up to avoid spiral of death
      if (currentTime - this._lastFrameTime > this._frameInterval) {
        this._lastFrameTime = currentTime;
      }

      this._frameCount++;
      return true;
    }

    return false;
  }

  /**
   * Gets the current frame count
   */
  get frameCount(): number {
    return this._frameCount;
  }

  /**
   * Gets the current target FPS
   */
  get targetFps(): number {
    return this._targetFps;
  }

  /**
   * Sets a new target FPS
   * @param fps New target FPS
   */
  setTargetFps(fps: number): void {
    this._targetFps = fps;
    this._frameInterval = 1000 / fps;
  }

  /**
   * Enables or disables frame rate limiting
   * @param enabled Whether frame rate limiting is enabled
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * Resets the frame counter and timing
   */
  reset(): void {
    this._lastFrameTime = 0;
    this._frameCount = 0;
  }
}
