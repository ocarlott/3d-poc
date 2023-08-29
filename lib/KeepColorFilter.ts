import * as fabric from "fabric";

type TNonFunctionPropertyNames<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
export type TClassProperties<T> = Pick<T, TNonFunctionPropertyNames<T>>;

export type TWebGLUniformLocationMap = Record<
  string,
  WebGLUniformLocation | null
>;

export type T2DPipelineState = {
  sourceWidth: number;
  sourceHeight: number;
  filterBackend: any;
  canvasEl: HTMLCanvasElement;
  imageData: ImageData;
  originalEl: CanvasImageSource;
  originalImageData?: ImageData;
  ctx: CanvasRenderingContext2D;
  helpLayer?: HTMLCanvasElement;
};

export const defaultValues: Partial<TClassProperties<KeepColor>> = {
  color: "rgb(255, 255, 255)",
  mainParameter: "color",
};

/**
 * KeepColor filter class
 * @example
 * const filter = new MyFilter({
 *   add here an example of how to use your filter
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class KeepColor extends fabric.filters.BaseFilter {
  declare color: string;

  static defaults = defaultValues;

  static type = "KeepColor";

  setOptions({ color, ...options }: Record<string, any>) {
    if (color) {
      // safeguard against mutation
      this.color = color;
    }
    Object.assign(this, options);
  }

  getFragmentSource() {
    return `
        precision highp float;
        uniform sampler2D uTexture;
        uniform vec4 color;
        uniform vec4 replacement;
        varying vec2 vTexCoord;
        void main() {
          vec4 cColor = texture2D(uTexture, vTexCoord);
          vec3 delta = abs(cColor.rgb - color.rgb);
          gl_FragColor = length(delta) > 0.01 ? replacement.rgba : cColor;
        }
      `;
  }
  /**
   * Apply the MyFilter operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered.
   */
  applyTo2d(options: T2DPipelineState) {
    const source = new fabric.Color(this.color).getSource();
    const data = options.imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (
        source[0] !== data[i] ||
        source[1] !== data[i + 1] ||
        source[2] !== data[i + 2]
      ) {
        data[i + 3] = 0;
      }
    }
  }

  /**
   * Return WebGL uniform locations for this filter's shader.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context used to compile this filter's shader.
   * @param {WebGLShaderProgram} program This filter's compiled shader program.
   */
  getUniformLocations(
    gl: WebGLRenderingContext,
    program: WebGLProgram
  ): TWebGLUniformLocationMap {
    return {
      uColor: gl.getUniformLocation(program, "color"),
      uReplacement: gl.getUniformLocation(program, "replacement"),
    };
  }

  /**
   * Send data from this filter to its shader program's uniforms.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context used to compile this filter's shader.
   * @param {Object} uniformLocations A map of string uniform names to WebGLUniformLocation objects
   */
  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: TWebGLUniformLocationMap
  ) {
    var source = new fabric.Color(this.color).getSource();
    source[0] /= 255;
    source[1] /= 255;
    source[2] /= 255;
    gl.uniform4fv(uniformLocations.uColor, source);
    gl.uniform4fv(uniformLocations.uReplacement, [0, 0, 0, 0]);
  }
}

fabric.classRegistry.setClass(KeepColor);
