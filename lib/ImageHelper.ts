import getColors from "image-pal";

export class ImageHelper {
  static lab2rgb = (lab: number[]) => {
    var y = (lab[0] + 16) / 116,
      x = lab[1] / 500 + y,
      z = y - lab[2] / 200,
      r,
      g,
      b;

    x = 0.95047 * (x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787);
    y = 1.0 * (y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787);
    z = 1.08883 * (z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787);

    r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    b = x * 0.0557 + y * -0.204 + z * 1.057;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

    return [
      Math.max(0, Math.min(1, r)) * 255,
      Math.max(0, Math.min(1, g)) * 255,
      Math.max(0, Math.min(1, b)) * 255,
    ];
  };

  static rgb2lab = (rgb: number[]) => {
    var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255,
      x,
      y,
      z;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };

  static deltaE = (labA: number[], labB: number[]) => {
    var deltaL = labA[0] - labB[0];
    var deltaA = labA[1] - labB[1];
    var deltaB = labA[2] - labB[2];
    var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    var deltaC = c1 - c2;
    var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    var sc = 1.0 + 0.045 * c1;
    var sh = 1.0 + 0.015 * c1;
    var deltaLKlsl = deltaL / 1.0;
    var deltaCkcsc = deltaC / sc;
    var deltaHkhsh = deltaH / sh;
    var i =
      deltaLKlsl * deltaLKlsl +
      deltaCkcsc * deltaCkcsc +
      deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
  };

  static findClosetIndexColorFromLabColorList = (
    labList: number[][],
    labColorNeedle: number[]
  ) => {
    const { index } = labList.reduce(
      (acc, newColor, currentIndex) => {
        const currentDistance = Math.abs(
          ImageHelper.deltaE(newColor, labColorNeedle)
        );
        if (currentDistance < acc.distance) {
          acc.distance = currentDistance;
          acc.index = currentIndex;
        }
        return acc;
      },
      { distance: Number.POSITIVE_INFINITY, index: 0 }
    );
    return index;
  };

  static reduceImageColor = async (url: string, limit: number = 4) => {
    return new Promise<{
      computed: string;
      colors: string[];
    }>(async (resolve) => {
      const { imageData, width, height } =
        await ImageHelper.getImageDataForImage(url);
      const colors = getColors(imageData.data, {
        hasAlpha: true,
        maxColors: limit,
        mean: false,
      }).map((color) => color.rgb.map((value) => Math.floor(value)));
      const labList = colors.map((color) => ImageHelper.rgb2lab(color));
      const data = imageData.data;
      const newData = new Uint8ClampedArray(data.length);
      const totalPixels = width * height;
      for (let i = 0; i < totalPixels; i++) {
        const color = ImageHelper.rgb2lab([
          data[i * 4],
          data[i * 4 + 1],
          data[i * 4 + 2],
        ]);
        const index = ImageHelper.findClosetIndexColorFromLabColorList(
          labList,
          color
        );
        newData[i * 4] = colors[index][0];
        newData[i * 4 + 1] = colors[index][1];
        newData[i * 4 + 2] = colors[index][2];
        newData[i * 4 + 3] = data[i * 4 + 3];
      }
      const newDataUrl = await ImageHelper.getDataURLForImageData(
        newData,
        width,
        height
      );
      return resolve({
        computed: newDataUrl,
        colors: colors.map(
          (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`
        ),
      });
    });
  };

  static generateAlphaMap = async (uri: string) => {
    return new Promise<{
      width: number;
      height: number;
      uri: string;
    }>(async (resolve) => {
      const { imageData, width, height } =
        await ImageHelper.getImageDataForImage(uri);
      const data = imageData.data;
      const newData = new Uint8ClampedArray(data.length);
      const totalPixels = width * height;
      for (let i = 0; i < totalPixels; i++) {
        if (data[i * 4 + 3] > 10) {
          newData[i * 4] = 255;
          newData[i * 4 + 1] = 255;
          newData[i * 4 + 2] = 255;
          newData[i * 4 + 3] = 255;
        }
      }
      const dataUri = await ImageHelper.getDataURLForImageData(
        newData,
        width,
        height
      );
      return resolve({
        uri: dataUri,
        width,
        height,
      });
    });
  };

  static getDataURLForImageData = async (
    data: Uint8ClampedArray,
    width: number,
    height: number
  ) => {
    const imgData = new ImageData(data, width, height);
    const { imageCanvas, imageCxt } = await ImageHelper.generateCanvas(
      width,
      height
    );
    imageCxt.putImageData(imgData, 0, 0);
    const dataUri = imageCanvas.toDataURL();
    return dataUri;
  };

  static getImageDataForImage = async (
    uri: string,
    xResult: number = 0,
    yResult: number = 0,
    wResult?: number,
    hResult?: number
  ) => {
    return new Promise<{
      imageData: ImageData;
      width: number;
      height: number;
    }>((resolve) => {
      const img = new Image();
      img.onload = async () => {
        const { imageCxt } = await ImageHelper.generateCanvas(
          img.width,
          img.height
        );
        imageCxt.drawImage(img, 0, 0);
        const imgData = imageCxt.getImageData(
          xResult,
          yResult,
          wResult || img.width,
          hResult || img.height
        );
        return resolve({
          imageData: imgData,
          width: xResult || img.width,
          height: hResult || img.height,
        });
      };
      img.src = uri;
    });
  };

  static generateCanvas = async (width: number, height: number) => {
    const imageCanvas = window.document.createElement("canvas");
    const imageCxt = imageCanvas.getContext("2d");
    if (imageCxt) {
      imageCanvas.width = width;
      imageCanvas.height = height;
      return Promise.resolve({
        imageCanvas,
        imageCxt,
      });
    }
    return Promise.reject(null);
  };

  static cropImageToRatio = async (uri: string, whRatio: number) => {
    const { width, height, imageData } = await ImageHelper.getImageDataForImage(
      uri
    );
    const shouldCropWidth = width / height > whRatio;
    let finalWidth = width;
    let finalHeight = height;
    if (shouldCropWidth) {
      finalWidth = height * whRatio;
    } else {
      finalHeight = width / whRatio;
    }
    const { imageCxt } = await ImageHelper.generateCanvas(width, height);
    imageCxt.putImageData(imageData, 0, 0);
    const imgData = imageCxt.getImageData(0, 0, finalWidth, finalHeight);
    const { imageCanvas, imageCxt: newImageContext } =
      await ImageHelper.generateCanvas(finalWidth, finalHeight);
    newImageContext.putImageData(imgData, 0, 0);
    return imageCanvas.toDataURL();
  };
}
