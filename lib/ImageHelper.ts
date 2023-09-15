import getColors from "image-pal";
import { Utils } from "./Utils";
import ImageJS from "image-js";
// import {} from 'image-filter-color';

export class ImageHelper {
  static reduceImageColor = async (params: {
    url: string;
    limit?: number;
    minDensity?: number;
  }) => {
    let { url, limit = 4, minDensity = 0.05 } = params;
    let img = await ImageJS.load(url);
    img = img.resize({
      width: 300,
    });
    return new Promise<{
      computed: string;
      colors: string[];
      colorList: number[][];
      percentages: number[];
    }>(async (resolve) => {
      if (minDensity >= 1 || minDensity < 0) {
        console.error(
          "Invalid minDensity. It should be in the range of [0, 1). Using default value."
        );
        minDensity = 0.05;
      }
      const { imageData, width, height } =
        await ImageHelper.getImageDataForImage(img.toDataURL());
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
      for (let i = 0; i < totalPixels; i++) {
        if (data[i * 4 + 3] > 0) {
          const color = Utils.rgb2lab([
            data[i * 4],
            data[i * 4 + 1],
            data[i * 4 + 2],
          ]);
          const index = Utils.findClosetIndexColorFromLabColorList(
            labList,
            color
          );
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
      const percentages = listCount.map((ls) => ls / totalPixels);
      const majorLabColors = labList.filter((_, index) => {
        const percentage = listCount[index] / totalPixels;
        return percentage >= minDensity;
      });
      const majorColors = colors.filter((_, index) => {
        return percentages[index] >= minDensity;
      });
      listCount = majorColors.map(() => 0);
      for (let i = 0; i < totalPixels; i++) {
        if (newData[i * 4 + 3] > 0) {
          const color = Utils.rgb2lab([
            newData[i * 4],
            newData[i * 4 + 1],
            newData[i * 4 + 2],
          ]);
          const index = Utils.findClosetIndexColorFromLabColorList(
            majorLabColors,
            color
          );
          listCount[index] += 1;
          newData[i * 4] = majorColors[index][0];
          newData[i * 4 + 1] = majorColors[index][1];
          newData[i * 4 + 2] = majorColors[index][2];
        }
      }
      const newDataUrl = await ImageHelper.getDataURLForImageData(
        newData,
        width,
        height
      );
      return resolve({
        computed: newDataUrl,
        percentages: listCount.map((i) => i / totalPixels),
        colors: majorColors.map(
          (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`
        ),
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
    yResult: number = 0
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
          img.width,
          img.height
        );
        return resolve({
          imageData: imgData,
          width: img.width,
          height: img.height,
        });
      };
      img.crossOrigin = "anonymous";
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
    const imgData = imageCxt.getImageData(
      Math.round((width - finalWidth) / 2),
      Math.round((height - finalHeight) / 2),
      finalWidth,
      finalHeight
    );
    return ImageHelper.getDataURLForImageData(
      imgData.data,
      finalWidth,
      finalHeight
    );
  };

  static generateImageParts = async (uri: string, colors: number[][]) => {
    const { width, height, imageData } = await ImageHelper.getImageDataForImage(
      uri
    );
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
        const labColor = Utils.rgb2lab([
          data[i * 4],
          data[i * 4 + 1],
          data[i * 4 + 2],
        ]);
        const index = Utils.findClosetIndexColorFromLabColorList(
          labList,
          labColor
        );
        imageParts[index][i * 4] = colors[index][0];
        imageParts[index][i * 4 + 1] = colors[index][1];
        imageParts[index][i * 4 + 2] = colors[index][2];
        imageParts[index][i * 4 + 3] = 255;
      }
    }
    const imagePartUrls = await Promise.all(
      imageParts.map((part) =>
        ImageHelper.getDataURLForImageData(part, width, height)
      )
    );
    return imagePartUrls;
  };
}
