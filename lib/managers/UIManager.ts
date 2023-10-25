import * as THREE from 'three';

export type SizeUpdateParams = {
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
  aspectRatio: number;
};

export class UIManager {
  private _canvasWidth = 100;
  private _canvasHeight = 100;

  private _resizeObserver: ResizeObserver;

  constructor(
    private _canvas: HTMLCanvasElement,
    private _onSizeUpdate: (params: SizeUpdateParams) => any
  ) {
    this._resizeObserver = new ResizeObserver(this._onCanvasSizeUpdated);
    this._resizeObserver.observe(this._canvas);
  }

  private _updateCanvasSize(canvas: ResizeObserverEntry) {
    const { width, height } = canvas.contentRect;
    this._canvasWidth = width;
    this._canvasHeight = height;
    this._onSizeUpdate?.({
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      pixelRatio: this.pixelRatio,
      aspectRatio: this.aspectRatio,
    });
  }

  private _onCanvasSizeUpdated = (entries: ResizeObserverEntry[]) => {
    const canvas = entries[0];
    this._updateCanvasSize(canvas);
    // this._camera.aspect = this._canvasWidth / this._canvasHeight;
    // this._camera.updateProjectionMatrix();

    // this._renderer?.setSize(this._canvasWidth, this._canvasHeight);
    // this._renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  get canvasWidth() {
    return this._canvasWidth;
  }

  get canvasHeight() {
    return this._canvasHeight;
  }

  get aspectRatio() {
    return this._canvasWidth / this._canvasHeight;
  }

  get pixelRatio() {
    return Math.min(window.devicePixelRatio, 2);
  }

  get canvas() {
    return this._canvas;
  }

  //FIXME: when to call this?
  onDestroy() {
    this._resizeObserver.disconnect();
  }
}
