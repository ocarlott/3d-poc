import getColors from 'image-pal';
import { Utils } from '../Utils';
import ImageJS from 'image-js';
import * as fabric from 'fabric';

const strMime = 'image/webp';

export class ImageEditor {
  private _canvasEl: HTMLCanvasElement;
  private _canvasSize = 300;
  private _canvas: fabric.Canvas;
  private _currentHexColorList: string[] = [];

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
    const img = await fabric.Image.fromURL(imageUrl, {
      crossOrigin: 'anonymous',
    });
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

      this._currentHexColorList = colorList.map(Utils.rgb2hex);

      await this._render(computed);
    }
  };

  get currentHexColorList() {
    return this._currentHexColorList;
  }

  get viewer() {
    return this._canvas.elements.container;
  }
}

export class ImageHelper {
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
      const newData = new Uint8ClampedArray(data.length);
      const totalPixels = width * height;
      for (let i = 0; i < totalPixels; i++) {
        if (data[i * 4 + 3] < 10) {
          data[i * 4 + 3] = 0;
        }
      }
      const colors = getColors(data, {
        hasAlpha: true,
        minDensity,
        maxColors: limit,
        mean: false,
      }).map((color) => color.rgb.map((value) => Math.floor(value)));
      const labList = colors.map((color) => Utils.rgb2lab(color));
      let listCount = colors.map(() => 0);
      let totalNontransparentPixels = 0;
      const labColorsToRemove = colorsToRemove.map((color) => Utils.rgb2lab(color));
      for (let i = 0; i < totalPixels; i++) {
        if (data[i * 4 + 3] > 0) {
          totalNontransparentPixels += 1;
          const color = Utils.rgb2lab([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
          const shouldRemove = labColorsToRemove.some((labColor) => {
            return Utils.deltaE(labColor, color) <= 2;
          });
          if (shouldRemove) {
            newData[i * 4] = 0;
            newData[i * 4 + 1] = 0;
            newData[i * 4 + 2] = 0;
            newData[i * 4 + 3] = 0;
            continue;
          }
          const index = Utils.findClosetIndexColorFromLabColorList(labList, color);
          listCount[index] += 1;
          newData[i * 4] = colors[index][0];
          newData[i * 4 + 1] = colors[index][1];
          newData[i * 4 + 2] = colors[index][2];
        } else {
          newData[i * 4] = data[i * 4];
          newData[i * 4 + 1] = data[i * 4 + 1];
          newData[i * 4 + 2] = data[i * 4 + 2];
        }
        newData[i * 4 + 3] = data[i * 4 + 3];
      }
      const percentages = listCount.map((ls) => ls / totalNontransparentPixels);
      const majorLabColors = labList.filter((_, index) => {
        return percentages[index] >= minDensity;
      });
      const majorColors = colors.filter((_, index) => {
        return percentages[index] >= minDensity;
      });
      listCount = majorColors.map(() => 0);
      for (let i = 0; i < totalPixels; i++) {
        if (newData[i * 4 + 3] > 0) {
          const color = Utils.rgb2lab([newData[i * 4], newData[i * 4 + 1], newData[i * 4 + 2]]);
          const index = Utils.findClosetIndexColorFromLabColorList(majorLabColors, color);
          listCount[index] += 1;
          if (majorColors[index]) {
            newData[i * 4] = majorColors[index][0];
            newData[i * 4 + 1] = majorColors[index][1];
            newData[i * 4 + 2] = majorColors[index][2];
          }
        }
      }

      const exportedColors = majorColors.map(
        (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      );

      const newDataUrl = await ImageHelper.getDataURLForImageData(newData, width, height);
      return resolve({
        computed: newDataUrl,
        percentages: listCount.map((i) => i / totalPixels),
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
      const newData = new Uint8ClampedArray(data.length);
      const totalPixels = width * height;
      for (let i = 0; i < totalPixels; i++) {
        if (data[i * 4 + 3] > 1) {
          newData[i * 4] = 255;
          newData[i * 4 + 1] = 255;
          newData[i * 4 + 2] = 255;
        } else {
          newData[i * 4] = 0;
          newData[i * 4 + 1] = 0;
          newData[i * 4 + 2] = 0;
        }
        newData[i * 4 + 3] = 255;
      }
      const dataUri = await ImageHelper.getDataURLForImageData(newData, width, height);
      return resolve({
        uri: dataUri,
        width,
        height,
      });
    });
  };

  static mergeAlphaMap = async (uri1: string, uri2: string) => {
    const [data1, data2] = await Promise.all([
      ImageHelper.getImageDataForImage(uri1),
      ImageHelper.getImageDataForImage(uri2),
    ]);
    if (data1.width !== data2.width || data1.height !== data2.height) {
      throw Error("Dimensions don't match");
    }
    const totalPixels = data1.width * data1.height;
    const imageData1 = data1.imageData.data;
    const imageData2 = data2.imageData.data;
    const finalData = new Uint8ClampedArray(totalPixels * 4);
    for (let i = 0; i < totalPixels; i++) {
      if (imageData1[i * 4] > 200 && imageData2[i * 4] > 200) {
        finalData[i * 4] = 255;
        finalData[i * 4 + 1] = 255;
        finalData[i * 4 + 2] = 255;
      } else {
        finalData[i * 4] = 0;
        finalData[i * 4 + 1] = 0;
        finalData[i * 4 + 2] = 0;
      }
      finalData[i * 4 + 3] = 255;
    }
    return this.getDataURLForImageData(finalData, data1.width, data1.height);
  };

  static getDataURLForImageData = async (
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ) => {
    const imgData = new ImageData(data, width, height);
    const { imageCanvas, imageCxt } = await ImageHelper.generateCanvas(width, height);
    imageCxt.putImageData(imgData, 0, 0);
    const dataUri = imageCanvas.toDataURL(strMime);
    return dataUri;
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
    const { imageCxt } = await ImageHelper.generateCanvas(width, height);
    imageCxt.putImageData(imageData, 0, 0);
    const imgData = imageCxt.getImageData(
      Math.round((width - finalWidth) / 2),
      Math.round((height - finalHeight) / 2),
      finalWidth,
      finalHeight,
    );
    return ImageHelper.getDataURLForImageData(imgData.data, finalWidth, finalHeight);
  };

  static resize = async (uri: string, width?: number, height?: number) => {
    let img = await ImageJS.load(uri);
    img = img.resize({
      width,
      height,
      preserveAspectRatio: true,
    });
    return img.toDataURL(strMime);
  };

  static crop = async (uri: string, width: number, height: number, x?: number, y?: number) => {
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
    const labList = colors.map((color) => Utils.rgb2lab(color));
    const data = imageData.data;
    const totalPixels = width * height;
    const imageParts = colors.map(() => new Uint8ClampedArray(data.length));
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < data.length; j++) {
        imageParts[i][j] = 0;
      }
    }
    for (let i = 0; i < totalPixels; i++) {
      if (data[i * 4 + 3] > 0) {
        const labColor = Utils.rgb2lab([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
        const index = Utils.findClosetIndexColorFromLabColorList(labList, labColor);
        imageParts[index][i * 4] = colors[index][0];
        imageParts[index][i * 4 + 1] = colors[index][1];
        imageParts[index][i * 4 + 2] = colors[index][2];
        imageParts[index][i * 4 + 3] = 255;
      }
    }
    const imagePartUrls = await Promise.all(
      imageParts.map((part) => ImageHelper.getDataURLForImageData(part, width, height)),
    );
    return imagePartUrls;
  };
}
