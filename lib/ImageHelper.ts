import getColors from "image-pal";
import { Utils } from "./Utils";

export class ImageHelper {
  static reduceImageColor = async (url: string, limit: number = 4) => {
    return new Promise<{
      computed: string;
      colors: string[];
      colorList: number[][];
    }>(async (resolve) => {
      const { imageData, width, height } =
        await ImageHelper.getImageDataForImage(url);
      const data = imageData.data;
      const newData = new Uint8ClampedArray(data.length);
      const totalPixels = width * height;
      for (let i = 0; i < totalPixels; i++) {
        if (data[i * 4 + 3] < 20) {
          data[i * 4 + 3] = 0;
        }
      }
      const colors = getColors(imageData.data, {
        hasAlpha: true,
        minDensity: 0.05,
        maxColors: limit,
        mean: false,
      }).map((color) => color.rgb.map((value) => Math.floor(value)));
      const labList = colors.map((color) => Utils.rgb2lab(color));
      const listCount = colors.map(() => 0);
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
      const minorLabColors = labList.filter((_, index) => {
        const percentage = listCount[index] / totalPixels;
        return percentage < 0.05;
      });
      const majorLabColors = labList.filter((_, index) => {
        const percentage = listCount[index] / totalPixels;
        return percentage >= 0.05;
      });
      const majorColors = colors.filter((_, index) => {
        const percentage = listCount[index] / totalPixels;
        return percentage >= 0.05;
      });
      const replacementMajorColorIndexes = minorLabColors.map((_, index) => {
        const percentage = listCount[index] / totalPixels;
        return percentage < 0.05;
      });
      const newDataUrl = await ImageHelper.getDataURLForImageData(
        newData,
        width,
        height
      );
      return resolve({
        computed: newDataUrl,
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

  static toHex = (color: number[]) => {
    return `${color[0].toString(16).padStart(2, "0")}${color[1]
      .toString(16)
      .padStart(2, "0")}${color[2].toString(16).padStart(2, "0")}`;
  };

  static keepOnlyColor = async (imageData: ImageData, color: number[]) => {
    const { data, width, height } = imageData;
    const totalPixels = width * height;
    const newData = new Uint8ClampedArray(data.length);
    for (let i = 0; i < totalPixels; i++) {
      if (
        data[i * 4] === color[0] &&
        data[i * 4 + 1] === color[1] &&
        data[i * 4 + 2] === color[2]
      ) {
        newData[i * 4] = color[0];
        newData[i * 4 + 1] = color[1];
        newData[i * 4 + 2] = color[2];
        newData[i * 4 + 3] = 255;
      } else {
        newData[i * 4 + 3] = 0;
      }
    }
    const dataUri = await ImageHelper.getDataURLForImageData(
      newData,
      width,
      height
    );
    return dataUri;
  };
}
