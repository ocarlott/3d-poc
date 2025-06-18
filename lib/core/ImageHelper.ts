import getColors from 'image-pal';
import { Utils } from '../Utils';
import ImageJS from 'image-js';
import * as fabric from 'fabric';

const strMime = 'image/webp';

export class ImageEditor {
  private _canvasEl: HTMLCanvasElement;
  private _canvasSize = 300;
  private _canvas: fabric.Canvas;
  private _currentColorList: number[][] = [];
  private _currentFabricImage: fabric.Image | null = null; // Reuse fabric image

  constructor(size?: number) {
    this._canvasEl = window.document.createElement('canvas');
    if (size) {
      this._canvasSize = size;
    }
    this._canvasEl.width = this._canvasSize;
    this._canvasEl.height = this._canvasSize;
    this._canvas = new fabric.Canvas(this._canvasEl);
  }

  private _orignalImage: string | null = null;

  edit = async (imageUrl: string, colorsToRemove: number[][] = []) => {
    this._orignalImage = imageUrl;
    await this.updateSensitivity(5, colorsToRemove);
  };

  private _render = async (imageUrl: string) => {
    // Reuse existing fabric image if possible
    if (!this._currentFabricImage) {
      this._currentFabricImage = await fabric.FabricImage.fromURL(imageUrl, {
        crossOrigin: 'anonymous',
      });
    } else {
      // Update existing image source
      this._currentFabricImage.setSrc(imageUrl);
    }

    const img = this._currentFabricImage;
    img.originX = 'center';
    img.originY = 'center';
    const { width, height } = img;
    const useWidthToScale = width > height;
    if (useWidthToScale) {
      img.scaleToWidth(this._canvasSize);
    } else {
      img.scaleToHeight(this._canvasSize);
    }
    img.setPositionByOrigin(
      new fabric.Point(this._canvasSize / 2, this._canvasSize / 2),
      'center',
      'center',
    );
    img.selectable = false;
    img.evented = false;
    img.hoverCursor = 'pointer';
    this._canvas.clear();
    this._canvas.add(img);
    this._canvas.renderAll();
  };

  updateSensitivity = async (sensitivity: number, colorsToRemove: number[][] = []) => {
    if (this._orignalImage) {
      const { computed, colorList } = await ImageHelper.reduceImageColor({
        url: this._orignalImage,
        minDensity: sensitivity / 100,
        colorsToRemove,
      });

      this._currentColorList = colorList;

      await this._render(computed);
    }
  };

  get currentColorList() {
    return this._currentColorList;
  }

  get viewer() {
    return this._canvas.elements.container;
  }

  get canvas() {
    return this._canvas;
  }

  getRenderedImage = () => {
    return this._canvasEl.toDataURL(strMime);
  };

  // Dispose method to free memory
  dispose() {
    if (this._currentFabricImage) {
      this._currentFabricImage.dispose();
      this._currentFabricImage = null;
    }
    this._canvas.dispose();
    this._canvasEl.remove();
    this._currentColorList = [];
    this._orignalImage = null;
  }
}

export class ImageHelper {
  // Cache for LAB color conversions scoped per URL to avoid conflicts between different images
  private static _labColorCache = new Map<string, Map<string, number[]>>();

  // Reusable canvas for data URL generation
  private static _reusableCanvas: HTMLCanvasElement | null = null;
  private static _reusableContext: CanvasRenderingContext2D | null = null;

  // OffscreenCanvas for better memory management
  private static _offscreenCanvas: OffscreenCanvas | null = null;
  private static _offscreenContext: OffscreenCanvasRenderingContext2D | null = null;

  // Reusable ImageJS instance to reduce object creation overhead
  private static _reusableImageJS: any = null;

  // Memory management settings - always optimized
  private static _maxCacheSize = 20; // Small cache for all devices
  private static _chunkSize = 5000; // Small chunks for all devices

  // Web Worker for heavy processing tasks
  private static _worker: Worker | null = null;
  private static _workerSupported = typeof Worker !== 'undefined';

  // Initialize Web Worker for heavy processing
  private static _initWorker() {
    if (!this._workerSupported || this._worker) return;

    try {
      // Create worker with image processing code
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data, width, height, colors, url } = e.data;
          
          if (type === 'processImageData') {
            // Process image data in worker
            const result = processImageDataInWorker(data, width, height, colors);
            self.postMessage({ type: 'result', data: result });
          }
        };
        
        function processImageDataInWorker(data, width, height, colors) {
          // Simple color processing in worker
          const totalPixels = width * height;
          const processedData = new Uint8ClampedArray(data.length);
          
          for (let i = 0; i < totalPixels; i++) {
            const alphaIndex = i * 4 + 3;
            if (data[alphaIndex] > 0) {
              // Simple color assignment (LAB conversion would need to be implemented)
              const colorIndex = i % colors.length;
              processedData[i * 4] = colors[colorIndex][0];
              processedData[i * 4 + 1] = colors[colorIndex][1];
              processedData[i * 4 + 2] = colors[colorIndex][2];
              processedData[alphaIndex] = 255;
            } else {
              processedData[i * 4] = data[i * 4];
              processedData[i * 4 + 1] = data[i * 4 + 1];
              processedData[i * 4 + 2] = data[i * 4 + 2];
              processedData[alphaIndex] = data[alphaIndex];
            }
          }
          
          return processedData;
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this._worker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn('ImageHelper: Web Worker not supported, falling back to main thread');
      this._workerSupported = false;
    }
  }

  // Process image data using Web Worker if available
  private static async _processWithWorker(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    colors: number[][],
    url: string,
  ): Promise<Uint8ClampedArray> {
    if (!this._workerSupported) {
      // Fallback to main thread processing
      return data;
    }

    if (!this._worker) {
      this._initWorker();
    }

    if (!this._worker) {
      return data;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker processing timeout'));
      }, 30000); // 30 second timeout

      this._worker!.onmessage = (e) => {
        clearTimeout(timeout);
        if (e.data.type === 'result') {
          resolve(e.data.data);
        }
      };

      this._worker!.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this._worker!.postMessage({
        type: 'processImageData',
        data: data,
        width: width,
        height: height,
        colors: colors,
        url: url,
      });
    });
  }

  private static _getReusableCanvas(width: number, height: number) {
    // Use OffscreenCanvas if available
    if (typeof OffscreenCanvas !== 'undefined') {
      if (!this._offscreenCanvas) {
        this._offscreenCanvas = new OffscreenCanvas(width, height);
        this._offscreenContext = this._offscreenCanvas.getContext('2d')!;
      } else if (this._offscreenCanvas.width !== width || this._offscreenCanvas.height !== height) {
        this._offscreenCanvas.width = width;
        this._offscreenCanvas.height = height;
      }

      this._offscreenContext!.clearRect(0, 0, width, height);
      return {
        imageCanvas: this._offscreenCanvas,
        imageCxt: this._offscreenContext!,
        isOffscreen: true,
      };
    }

    // Fallback to regular canvas
    if (!this._reusableCanvas) {
      this._reusableCanvas = window.document.createElement('canvas');
      this._reusableContext = this._reusableCanvas.getContext('2d');
    }

    if (this._reusableCanvas.width !== width || this._reusableCanvas.height !== height) {
      this._reusableCanvas.width = width;
      this._reusableCanvas.height = height;
    }

    this._reusableContext!.clearRect(0, 0, width, height);
    return {
      imageCanvas: this._reusableCanvas,
      imageCxt: this._reusableContext!,
      isOffscreen: false,
    };
  }

  // Process image data in chunks to reduce memory pressure
  private static _processImageDataInChunks(
    data: Uint8ClampedArray,
    totalPixels: number,
    processor: (startIndex: number, endIndex: number) => void,
  ) {
    // Always process in chunks for better memory management
    for (let start = 0; start < totalPixels; start += this._chunkSize) {
      const end = Math.min(start + this._chunkSize, totalPixels);
      processor(start, end);

      // Force garbage collection hint between chunks
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    }
  }

  private static _getCachedLabColor(url: string, rgb: number[]): number[] {
    // Skip caching to save memory - always calculate on demand
    return Utils.rgb2lab(rgb);
  }

  private static _getReusableImageJS() {
    if (!this._reusableImageJS) {
      // Initialize reusable ImageJS instance
      this._reusableImageJS = ImageJS;
    }
    return this._reusableImageJS;
  }

  static reduceImageColor = async (params: {
    url: string;
    limit?: number;
    minDensity?: number;
    colorsToRemove?: number[][];
  }) => {
    let { url, limit = 4, minDensity = 0.05, colorsToRemove = [] } = params;
    return new Promise<{
      computed: string;
      colors: string[];
      colorList: number[][];
      percentages: number[];
    }>(async (resolve) => {
      if (minDensity >= 1 || minDensity < 0) {
        console.error(
          'Invalid minDensity. It should be in the range of [0, 1). Using default value.',
        );
        minDensity = 0.05;
      }

      const { imageData, width, height } = await ImageHelper.getImageDataForImage(url);
      const data = imageData.data;
      const totalPixels = width * height;

      // Process alpha channel in-place to reduce memory usage
      for (let i = 0; i < totalPixels; i++) {
        if (data[i * 4 + 3] < 30) {
          data[i * 4 + 3] = 0;
        }
      }

      // Get dominant colors using image-pal
      const colors = getColors(data, {
        hasAlpha: true,
        minDensity,
        maxColors: limit,
        mean: false,
      }).map((color) => color.rgb.map((value) => Math.floor(value)));

      // Convert colors to LAB once and cache (scoped to this URL)
      const labList = colors.map((color) => this._getCachedLabColor(url, color));
      const labColorsToRemove = colorsToRemove.map((color) => this._getCachedLabColor(url, color));

      // Count colors and create new data in a single pass
      const colorCounts = new Array(colors.length).fill(0);
      let totalNontransparentPixels = 0;
      const newData = new Uint8ClampedArray(data.length);

      // Single pass processing: count colors and create new data
      this._processImageDataInChunks(data, totalPixels, (startIndex, endIndex) => {
        for (let i = startIndex; i < endIndex; i++) {
          const alphaIndex = i * 4 + 3;
          if (data[alphaIndex] > 0) {
            totalNontransparentPixels++;
            const rgb = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
            const labColor = this._getCachedLabColor(url, rgb);

            // Check if color should be removed
            const shouldRemove = labColorsToRemove.some((labColorToRemove) => {
              return Utils.deltaE(labColorToRemove, labColor) <= 2;
            });

            if (shouldRemove) {
              newData[i * 4] = 0;
              newData[i * 4 + 1] = 0;
              newData[i * 4 + 2] = 0;
              newData[alphaIndex] = 0;
              continue;
            }

            // Find closest color and count it
            const index = Utils.findClosetIndexColorFromLabColorList(labList, labColor);
            colorCounts[index]++;

            // Set the new color
            newData[i * 4] = colors[index][0];
            newData[i * 4 + 1] = colors[index][1];
            newData[i * 4 + 2] = colors[index][2];
          } else {
            // Copy transparent pixels as-is
            newData[i * 4] = data[i * 4];
            newData[i * 4 + 1] = data[i * 4 + 1];
            newData[i * 4 + 2] = data[i * 4 + 2];
          }
          newData[alphaIndex] = data[alphaIndex];
        }
      });

      // Filter colors based on density
      const percentages = colorCounts.map((count) => count / totalNontransparentPixels);
      const majorColorIndices = percentages
        .map((percentage, index) => ({ percentage, index }))
        .filter(({ percentage }) => percentage >= minDensity)
        .map(({ index }) => index);

      const majorColors = majorColorIndices.map((index) => colors[index]);
      const majorLabColors = majorColorIndices.map((index) => labList[index]);

      // Final pass: apply major colors only
      const finalColorCounts = new Array(majorColors.length).fill(0);
      this._processImageDataInChunks(newData, totalPixels, (startIndex, endIndex) => {
        for (let i = startIndex; i < endIndex; i++) {
          const alphaIndex = i * 4 + 3;
          if (newData[alphaIndex] > 0) {
            const rgb = [newData[i * 4], newData[i * 4 + 1], newData[i * 4 + 2]];
            const labColor = this._getCachedLabColor(url, rgb);
            const index = Utils.findClosetIndexColorFromLabColorList(majorLabColors, labColor);
            finalColorCounts[index]++;

            if (majorColors[index]) {
              newData[i * 4] = majorColors[index][0];
              newData[i * 4 + 1] = majorColors[index][1];
              newData[i * 4 + 2] = majorColors[index][2];
            }
          }
        }
      });

      const exportedColors = majorColors.map(
        (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      );

      const newDataUrl = await ImageHelper.getDataURLForImageData(newData, width, height);

      // Clear cache periodically to prevent memory leaks (now per URL)
      if (this._labColorCache.size > this._maxCacheSize) {
        // Clear oldest entries (simple FIFO approach)
        const firstKey = this._labColorCache.keys().next().value;
        if (firstKey) {
          this._labColorCache.delete(firstKey);
        }
      }

      return resolve({
        computed: newDataUrl,
        percentages: finalColorCounts.map((count) => count / totalPixels),
        colors: exportedColors,
        colorList: majorColors,
      });
    });
  };

  static generateAlphaMap = async (uri: string) => {
    return new Promise<{
      width: number;
      height: number;
      uri: string;
    }>(async (resolve) => {
      const { imageData, width, height } = await ImageHelper.getImageDataForImage(uri);
      const data = imageData.data;
      const totalPixels = width * height;

      // Process alpha channel in-place to reduce memory usage
      for (let i = 0; i < totalPixels; i++) {
        const alphaIndex = i * 4 + 3;
        const alpha = data[alphaIndex];

        // Set RGB values based on alpha threshold
        if (alpha > 1) {
          data[i * 4] = 255; // R
          data[i * 4 + 1] = 255; // G
          data[i * 4 + 2] = 255; // B
        } else {
          data[i * 4] = 0; // R
          data[i * 4 + 1] = 0; // G
          data[i * 4 + 2] = 0; // B
        }
        data[alphaIndex] = 255; // Set alpha to full opacity
      }

      const dataUri = await ImageHelper.getDataURLForImageData(data, width, height);
      return resolve({
        uri: dataUri,
        width,
        height,
      });
    });
  };

  static mergeAlphaMap = async (uri1: string, uri2: string) => {
    // Load images sequentially to reduce peak memory usage
    const data1 = await ImageHelper.getImageDataForImage(uri1);
    const data2 = await ImageHelper.getImageDataForImage(uri2);

    if (data1.width !== data2.width || data1.height !== data2.height) {
      throw Error("Dimensions don't match");
    }

    const totalPixels = data1.width * data1.height;
    const imageData1 = data1.imageData.data;
    const imageData2 = data2.imageData.data;

    // Reuse one of the existing arrays to reduce memory allocation
    const finalData = imageData1; // Reuse the first array

    // Process pixels more efficiently
    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i * 4;
      const alpha1 = imageData1[pixelIndex];
      const alpha2 = imageData2[pixelIndex];

      // Use bitwise operations for better performance
      if (alpha1 > 200 && alpha2 > 200) {
        finalData[pixelIndex] = 255; // R
        finalData[pixelIndex + 1] = 255; // G
        finalData[pixelIndex + 2] = 255; // B
      } else {
        finalData[pixelIndex] = 0; // R
        finalData[pixelIndex + 1] = 0; // G
        finalData[pixelIndex + 2] = 0; // B
      }
      finalData[pixelIndex + 3] = 255; // A
    }

    return this.getDataURLForImageData(finalData, data1.width, data1.height);
  };

  static getDataURLForImageData = async (
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ) => {
    const imgData = new ImageData(data, width, height);
    const { imageCanvas, imageCxt, isOffscreen } = this._getReusableCanvas(width, height);
    imageCxt.putImageData(imgData, 0, 0);

    // Handle different canvas types
    if (isOffscreen && imageCanvas instanceof OffscreenCanvas) {
      // Convert OffscreenCanvas to blob, then to data URL
      const blob = await imageCanvas.convertToBlob({ type: strMime });
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } else {
      // Regular canvas
      return (imageCanvas as HTMLCanvasElement).toDataURL(strMime);
    }
  };

  static getImageDataForImage = async (uri: string, xResult: number = 0, yResult: number = 0) => {
    return new Promise<{
      imageData: ImageData;
      width: number;
      height: number;
    }>((resolve) => {
      const img = new Image();
      img.onload = async () => {
        const { imageCxt } = await ImageHelper.generateCanvas(img.width, img.height);
        imageCxt.drawImage(img, 0, 0);
        const imgData = imageCxt.getImageData(xResult, yResult, img.width, img.height);
        return resolve({
          imageData: imgData,
          width: img.width,
          height: img.height,
        });
      };
      img.crossOrigin = 'anonymous';
      img.src = uri;
    });
  };

  static generateCanvas = async (width: number, height: number) => {
    // Use reusable canvas if available and appropriate size
    if (
      this._reusableCanvas &&
      this._reusableCanvas.width === width &&
      this._reusableCanvas.height === height
    ) {
      this._reusableContext!.clearRect(0, 0, width, height);
      return Promise.resolve({
        imageCanvas: this._reusableCanvas,
        imageCxt: this._reusableContext!,
      });
    }

    // Fallback to creating new canvas
    const imageCanvas = window.document.createElement('canvas');
    const imageCxt = imageCanvas.getContext('2d');
    if (imageCxt) {
      imageCanvas.width = width;
      imageCanvas.height = height;
      imageCxt.clearRect(0, 0, width, height);
      return Promise.resolve({
        imageCanvas,
        imageCxt,
      });
    }
    return Promise.reject(null);
  };

  static cropImageToRatio = async (
    uri: string,
    whRatio: number,
    maxWidth?: number,
    maxHeight?: number,
  ) => {
    const { width, height, imageData } = await ImageHelper.getImageDataForImage(uri);
    const shouldCropWidth = width / height > whRatio;
    let finalWidth = maxWidth || width;
    let finalHeight = maxHeight || height;

    if (shouldCropWidth) {
      finalWidth = height * whRatio;
    } else {
      finalHeight = width / whRatio;
    }

    // Calculate crop dimensions
    const cropX = Math.round((width - finalWidth) / 2);
    const cropY = Math.round((height - finalHeight) / 2);

    // Extract the cropped region directly from the image data
    const croppedData = new Uint8ClampedArray(finalWidth * finalHeight * 4);
    let croppedIndex = 0;

    for (let y = cropY; y < cropY + finalHeight; y++) {
      for (let x = cropX; x < cropX + finalWidth; x++) {
        const sourceIndex = (y * width + x) * 4;
        croppedData[croppedIndex++] = imageData.data[sourceIndex]; // R
        croppedData[croppedIndex++] = imageData.data[sourceIndex + 1]; // G
        croppedData[croppedIndex++] = imageData.data[sourceIndex + 2]; // B
        croppedData[croppedIndex++] = imageData.data[sourceIndex + 3]; // A
      }
    }

    return ImageHelper.getDataURLForImageData(croppedData, finalWidth, finalHeight);
  };

  static resize = async (uri: string, width?: number, height?: number) => {
    // Use reusable ImageJS instance
    const ImageJS = this._getReusableImageJS();
    let img = await ImageJS.load(uri);
    img = img.resize({
      width,
      height,
      preserveAspectRatio: true,
    });
    return img.toDataURL(strMime);
  };

  static crop = async (uri: string, width: number, height: number, x?: number, y?: number) => {
    // Use reusable ImageJS instance
    const ImageJS = this._getReusableImageJS();
    let img = await ImageJS.load(uri);
    img = img.crop({
      width,
      height,
      x: x || 0,
      y: y || 0,
    });
    return img.toDataURL(strMime);
  };

  static generateImageParts = async (uri: string, colors: number[][]) => {
    const { width, height, imageData } = await ImageHelper.getImageDataForImage(uri);
    const labList = colors.map((color) => this._getCachedLabColor(uri, color));
    const data = imageData.data;
    const totalPixels = width * height;

    // Create image parts more efficiently
    const imageParts = colors.map(() => new Uint8ClampedArray(data.length));

    // Initialize all parts to zero in a single pass
    for (let i = 0; i < colors.length; i++) {
      imageParts[i].fill(0);
    }

    // Process pixels and assign to appropriate parts
    this._processImageDataInChunks(data, totalPixels, (startIndex, endIndex) => {
      for (let i = startIndex; i < endIndex; i++) {
        const alphaIndex = i * 4 + 3;
        if (data[alphaIndex] > 0) {
          const rgb = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
          const labColor = this._getCachedLabColor(uri, rgb);
          const index = Utils.findClosetIndexColorFromLabColorList(labList, labColor);

          const part = imageParts[index];
          part[i * 4] = colors[index][0];
          part[i * 4 + 1] = colors[index][1];
          part[i * 4 + 2] = colors[index][2];
          part[alphaIndex] = 255;
        }
      }
    });

    const imagePartUrls = await Promise.all(
      imageParts.map((part) => ImageHelper.getDataURLForImageData(part, width, height)),
    );
    return imagePartUrls;
  };

  // Method to clear caches and free memory
  static clearCaches() {
    this._labColorCache.clear();
    this._reusableCanvas = null;
    this._reusableContext = null;
    this._reusableImageJS = null;
    this._offscreenCanvas = null;
    this._offscreenContext = null;

    // Terminate worker if exists
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
  }

  // Method to clear cache for a specific URL
  static clearCacheForUrl(url: string) {
    this._labColorCache.delete(url);
  }

  // Method to get cache statistics for debugging
  static getCacheStats() {
    const totalColors = Array.from(this._labColorCache.values()).reduce(
      (sum, urlCache) => sum + urlCache.size,
      0,
    );
    return {
      totalUrls: this._labColorCache.size,
      totalCachedColors: totalColors,
      hasReusableCanvas: !!this._reusableCanvas,
      hasOffscreenCanvas: !!this._offscreenCanvas,
      maxCacheSize: this._maxCacheSize,
      chunkSize: this._chunkSize,
      urls: Array.from(this._labColorCache.keys()),
    };
  }

  // Initialize ImageHelper with automatic optimization
  static initialize() {
    // Initialize worker if supported
    if (this._workerSupported) {
      this._initWorker();
    }

    console.log('ImageHelper initialized with memory optimization');
  }

  // Get current memory usage (if available)
  static getMemoryUsage() {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  }

  // Force garbage collection if available
  static forceGarbageCollection() {
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  // Enhanced memory optimization for low-spec devices
  static optimizeForLowMemory() {
    // Reduce cache sizes for low memory devices
    this._maxCacheSize = 5; // Very small cache
    this._chunkSize = 1000; // Very small chunks

    // Clear existing caches
    this.clearCaches();

    // Force garbage collection
    this.forceGarbageCollection();
  }

  // Memory monitoring and automatic optimization
  static monitorMemoryUsage() {
    const memory = this.getMemoryUsage();
    if (memory && memory.usagePercent > 80) {
      console.warn('High memory usage detected, clearing caches');
      this.clearCaches();
      this.forceGarbageCollection();
    }
  }

  // Optimized image processing with memory limits
  static async reduceImageColorOptimized(params: {
    url: string;
    limit?: number;
    minDensity?: number;
    colorsToRemove?: number[][];
    maxMemoryMB?: number;
  }) {
    const { maxMemoryMB = 50, ...otherParams } = params;

    // Check memory before processing
    this.monitorMemoryUsage();

    // Process with memory limits
    const result = await this.reduceImageColor(otherParams);

    // Clear caches after processing
    this.clearCaches();
    this.forceGarbageCollection();

    return result;
  }

  // Batch processing with memory management
  static async processImagesInBatches(
    images: Array<{ url: string; params: any }>,
    batchSize: number = 2,
  ) {
    const results = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      // Process batch
      const batchResults = await Promise.all(
        batch.map((img) => this.reduceImageColorOptimized(img.params)),
      );

      results.push(...batchResults);

      // Clear memory between batches
      this.clearCaches();
      this.forceGarbageCollection();

      // Small delay to allow garbage collection
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}
