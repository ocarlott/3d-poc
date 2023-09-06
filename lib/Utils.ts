const changeableRegex = /changeable_group_\d{1,2}/;
const boundaryTest = /\w*_?boundary_[a-zA-Z]+/;
const boundaryTPTest = /\w*_?boundary_[a-zA-Z]+_flat/;
const changeableGroupTest = /\w*_?changeable_group_\d{1,2}_[a-zA-Z]+/;
const changeableGroupTPTest = /\w*_?changeable_group_\d{1,2}_[a-zA-Z]+_flat/;

export class Utils {
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
          Utils.deltaE(newColor, labColorNeedle)
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

  static capitalize = (text: string) => {
    return text[0].toLocaleUpperCase() + text.slice(1);
  };

  static getDisplayNameIfChangeableGroup = (name: string) => {
    const test = changeableGroupTest.test(name);
    if (!test) {
      return null;
    }
    const result = name.match(changeableRegex);
    if (result === null) {
      return null;
    }
    const [groupName] = result;
    const startIndex = result.index || 0;
    let res = name
      .slice(startIndex)
      .replace(`${groupName}_`, "")
      .replace("_", " ");
    return {
      displayName: Utils.capitalize(res),
      groupName,
    };
  };

  static isTechPackChangeableGroupNameValid = (name: string) => {
    const test = changeableGroupTPTest.test(name);
    return !!test;
  };

  static isTechPackBoundaryNameValid = (name: string) => {
    const test = boundaryTPTest.test(name);
    return !!test;
  };

  static getDisplayNameIfBoundary = (name: string) => {
    const test = boundaryTest.test(name);
    if (!test) {
      return null;
    }
    const res = name.split("boundary");
    if (res.length === 1) {
      return null;
    }
    let newName = res[res.length - 1];
    if (newName.startsWith("_") && newName.length > 1) {
      newName = newName.substring(1);
    }
    return Utils.capitalize(newName.split("_").join(" "));
  };

  static getShuffledColors = () => {
    const array = [
      "#5B9A8B",
      "#512B81",
      "#E48586",
      "#FFE17B",
      "#7A316F",
      "#6C3428",
      "#3F2E3E",
      "#D8B4F8",
      "#7091F5",
      "#40F8FF",
      "#C8E4B2",
      "#FFCCCC",
      "#F31559",
    ];
    let currentIndex = array.length,
      randomIndex;
    while (currentIndex > 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array;
  };
}
