declare module "*.png" {
  const value: any;
  export = value;
}

declare module "skmeans" {
  export type CentroidValues = "kmrand" | "kmpp" | null;

  export interface Data {
    it: number;
    k: number;
    centroids: number[][];
    idxs: number[];
    test: (x: number, point?: (x1: number, x2: number) => number) => void;
  }

  export default function skmeans(
    data: number[] | number[][],
    k: number,
    centroids?: CentroidValues,
    iterations?: number | null,
    distance?: (x: number[], y: number[]) => number
  ): Data;
}

declare module "image-pal" {
  export type Color = {
    rgb: number[];
    alpha: number;
    hex: number;
  };

  export default function getColors(
    imageData: Uint8ClampedArray,
    options: {
      hasAlpha: boolean;
      maxColors: number;
      mean: boolean;
    }
  ): Color[];
}
