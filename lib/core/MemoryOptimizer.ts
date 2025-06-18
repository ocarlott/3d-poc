import { ImageHelper } from './ImageHelper';

export class MemoryOptimizer {
  private static _isLowMemoryMode = false;
  private static _memoryThreshold = 80; // 80% memory usage threshold
  private static _cleanupInterval: number | null = null;

  // Initialize memory optimization
  static initialize() {
    // Check if device has low memory
    this._detectLowMemoryDevice();

    // Set up periodic memory monitoring
    this._startMemoryMonitoring();

    // Initialize ImageHelper with low memory optimizations if needed
    if (this._isLowMemoryMode) {
      ImageHelper.optimizeForLowMemory();
    }
  }

  // Detect low memory devices
  private static _detectLowMemoryDevice() {
    if (typeof navigator !== 'undefined') {
      // Check device memory if available
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory && deviceMemory < 4) {
        this._isLowMemoryMode = true;
        console.log('Low memory device detected, enabling memory optimizations');
      }

      // Check hardware concurrency
      const hardwareConcurrency = navigator.hardwareConcurrency;
      if (hardwareConcurrency && hardwareConcurrency < 4) {
        this._isLowMemoryMode = true;
        console.log('Low CPU cores detected, enabling memory optimizations');
      }
    }
  }

  // Start periodic memory monitoring
  private static _startMemoryMonitoring() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }

    this._cleanupInterval = window.setInterval(() => {
      this._checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  // Check current memory usage and optimize if needed
  private static _checkMemoryUsage() {
    const memory = ImageHelper.getMemoryUsage();
    if (memory && memory.usagePercent > this._memoryThreshold) {
      console.warn(`High memory usage detected: ${memory.usagePercent.toFixed(1)}%`);
      this.forceCleanup();
    }
  }

  // Force memory cleanup
  static forceCleanup() {
    console.log('Performing memory cleanup...');

    // Clear ImageHelper caches
    ImageHelper.clearCaches();

    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }

    // Clear any stored data URLs
    this._clearDataURLs();
  }

  // Clear data URLs from memory
  private static _clearDataURLs() {
    // Find and clear any large data URLs in the DOM
    const images = document.querySelectorAll('img[src^="data:"]');
    images.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.length > 100000) {
        // Large data URLs
        img.removeAttribute('src');
      }
    });
  }

  // Optimize for specific operations
  static optimizeForImageProcessing() {
    if (this._isLowMemoryMode) {
      // Use smaller chunk sizes and cache limits
      ImageHelper.optimizeForLowMemory();
    }
  }

  // Optimize for 3D rendering
  static optimizeFor3DRendering() {
    // Reduce texture quality for low memory devices
    if (this._isLowMemoryMode) {
      // This could be extended to adjust Three.js settings
      console.log('3D rendering optimized for low memory');
    }
  }

  // Get current memory status
  static getMemoryStatus() {
    const memory = ImageHelper.getMemoryUsage();
    return {
      isLowMemoryMode: this._isLowMemoryMode,
      currentUsage: memory,
      threshold: this._memoryThreshold,
    };
  }

  // Cleanup on application shutdown
  static dispose() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }

    // Final cleanup
    this.forceCleanup();
  }

  // Batch processing with memory management
  static async processWithMemoryManagement<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    batchSize: number = 2,
  ): Promise<any[]> {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch
      const batchResults = await Promise.all(batch.map((item) => processor(item)));

      results.push(...batchResults);

      // Memory cleanup between batches
      this.forceCleanup();

      // Small delay to allow garbage collection
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  // Memory-efficient image processing
  static async processImagesEfficiently(images: Array<{ url: string; params: any }>) {
    return this.processWithMemoryManagement(
      images,
      async (img) => {
        return ImageHelper.reduceImageColorOptimized(img.params);
      },
      1, // Process one at a time for very low memory devices
    );
  }
}
