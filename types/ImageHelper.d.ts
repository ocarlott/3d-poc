export declare class ImageHelper {
    static lab2rgb: (lab: number[]) => number[];
    static rgb2lab: (rgb: number[]) => number[];
    static deltaE: (labA: number[], labB: number[]) => number;
    static findClosetIndexColorFromLabColorList: (labList: number[][], labColorNeedle: number[]) => number;
    static reduceImageColor: (url: string, limit?: number) => Promise<{
        computed: string;
        colors: string[];
    }>;
    static generateAlphaMap: (uri: string) => Promise<{
        width: number;
        height: number;
        uri: string;
    }>;
    static getDataURLForImageData: (data: Uint8ClampedArray, width: number, height: number) => Promise<string>;
    static getImageDataForImage: (uri: string, xResult?: number, yResult?: number, wResult?: number, hResult?: number) => Promise<{
        imageData: ImageData;
        width: number;
        height: number;
    }>;
    static generateCanvas: (width: number, height: number) => Promise<{
        imageCanvas: HTMLCanvasElement;
        imageCxt: CanvasRenderingContext2D;
    }>;
    static cropImageToRatio: (uri: string, whRatio: number) => Promise<string>;
}
