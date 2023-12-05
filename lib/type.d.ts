declare module '*.png' {
  const value: any;
  export = value;
}

declare module '*.jpg' {
  const value: any;
  export = value;
}

declare module '*.webp' {
  const value: any;
  export = value;
}

declare module '*.exr' {
  const value: any;
  export = value;
}

declare module '*.hdr' {
  const value: any;
  export = value;
}

declare module 'skmeans' {
  export type CentroidValues = 'kmrand' | 'kmpp' | null;

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
    distance?: (x: number[], y: number[]) => number,
  ): Data;
}

declare module 'image-pal' {
  export type Color = {
    rgb: number[];
    alpha: number;
    hex: number;
  };

  export default function getColors(
    imageData: Uint8ClampedArray,
    options: {
      hasAlpha: boolean;
      minDensity?: number;
      maxColors?: number;
      mean?: boolean;
    },
  ): Color[];
}

namespace fabric {
  namespace fabric {
    namespace Image {
      namespace filters {
        export interface KeepColor {
          new (options?: { color: string }): any;
          /**
           * Returns filter instance from an object representation
           * @param object Object to create an instance from
           */
          fromObject(object: any): any;
        }
      }
    }
  }
}
