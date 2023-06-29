import * as THREE from "three";
import { ControlName, TextureOption } from "./type";
import { fabric } from "fabric";
import _ from "underscore";

export class Boundary {
  readonly group = new THREE.Group();
  private _boundaryRatio: number;
  readonly center: THREE.Vector3;
  private _canvas: THREE.Mesh;
  private _useWidthToScale = false;
  readonly normal = new THREE.Vector3(0, 0, 0);
  readonly name: string;
  private _workingCanvas2D?: fabric.Canvas;
  private _onArtworkChanged?: (params: {
    forBoundary: string;
    xRatio: number;
    yRatio: number;
    whRatio: number;
    sizeRatio: number;
    rotation: number;
  }) => void;
  private _sizeRatio = 0.5;
  private _xRatio = 0.5;
  private _yRatio = 0.5;
  private _rotation = 0;
  private _canvasWidth = 0;
  private _canvasHeight = 0;

  constructor(canvas: THREE.Mesh, techPackCanvas: THREE.Mesh) {
    this._canvas = canvas;
    this.name = canvas.name;
    canvas.geometry.computeVertexNormals();
    this.group.name = ControlName.BoundaryGroup;
    const boundingBox = new THREE.Box3().setFromObject(canvas);
    const techPackBoundingBox = new THREE.Box3().setFromObject(techPackCanvas);
    (canvas.material as THREE.Material).side = THREE.DoubleSide;
    const size = boundingBox.getSize(new THREE.Vector3());
    const techPackSize = techPackBoundingBox.getSize(new THREE.Vector3());
    const estimateWHRatio = size.x / size.y;
    const smallerSide = Math.min(techPackSize.x, techPackSize.z);
    const biggerSide = Math.max(techPackSize.x, techPackSize.z);
    const width = estimateWHRatio > 1 ? biggerSide : smallerSide;
    const height = estimateWHRatio > 1 ? smallerSide : biggerSide;
    this._boundaryRatio = width / height;
    const { max, min } = boundingBox;
    this.center = canvas.worldToLocal(min.clone().add(max).multiplyScalar(0.5));
    const positionArray = (
      canvas.geometry.attributes["position"] as THREE.BufferAttribute
    ).array;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < positionArray.length; i += 3) {
      points.push(
        new THREE.Vector3(
          positionArray[i],
          positionArray[i + 1],
          positionArray[i + 2]
        )
      );
    }
    const boundingSphere = new THREE.Sphere().setFromPoints(points);
    this.normal = boundingSphere.center.normalize();
  }

  private _getClipPathWidth(canvasWidth: number, canvasHeight: number) {
    return this._boundaryRatio > canvasWidth / canvasHeight
      ? canvasWidth - 20
      : Math.floor((canvasHeight - 20) * this._boundaryRatio);
  }

  private _getClipPathHeight(canvasWidth: number, canvasHeight: number) {
    return this._boundaryRatio > canvasWidth / canvasHeight
      ? Math.floor((canvasWidth - 20) / this._boundaryRatio)
      : canvasHeight - 20;
  }

  private _getClipPathSize() {
    const canvasWidth = this._canvasWidth;
    const canvasHeight = this._canvasHeight;
    const clipPathWidth = this._getClipPathWidth(canvasWidth, canvasHeight);
    const clipPathHeight = this._getClipPathHeight(canvasWidth, canvasHeight);
    return {
      canvasWidth,
      canvasHeight,
      clipPathWidth,
      clipPathHeight,
      widthPadding: (canvasWidth - clipPathWidth) / 2,
      heightPadding: (canvasHeight - clipPathHeight) / 2,
    };
  }

  private _generateClipPath(canvasWidth: number, canvasHeight: number) {
    const clipPathWidth = this._getClipPathWidth(canvasWidth, canvasHeight);
    const clipPathHeight = this._getClipPathHeight(canvasWidth, canvasHeight);
    return new fabric.Rect({
      width: clipPathWidth,
      height: clipPathHeight,
      top: (canvasHeight - clipPathHeight) / 2,
      left: (canvasWidth - clipPathWidth) / 2,
    });
  }

  get id() {
    return this._canvas.id;
  }

  private _configure2DCanvas = (workingCanvas?: HTMLCanvasElement) => {
    const wCanvas = workingCanvas || window.document.createElement("canvas");
    if (!workingCanvas) {
      wCanvas.width = 300;
      wCanvas.height = 300;
    }
    this._canvasWidth = wCanvas.width;
    this._canvasHeight = wCanvas.height;
    this._workingCanvas2D?.removeListeners();
    this._workingCanvas2D = new fabric.Canvas(wCanvas);
    if (workingCanvas) {
      this._workingCanvas2D.on("after:render", this._renderCanvasOnBoundary);
      this._workingCanvas2D.on("object:moving", this._onArtworkMove);
      this._workingCanvas2D.on("object:scaling", this._onArtworkResize);
      this._workingCanvas2D.on("object:rotating", this._onArtworkRotate);
    }
    this._workingCanvas2D.clipPath = this._generateClipPath(
      this._canvasWidth,
      this._canvasHeight
    );
  };

  organizeGroup = () => {
    this.group.add(this._canvas);
  };

  addArtwork = async (options: {
    workingCanvas?: HTMLCanvasElement;
    artworkUrl: string;
    xRatio: number;
    yRatio: number;
    rotation: number;
    sizeRatio: number;
    onArtworkChanged?: (params: {
      forBoundary: string;
      xRatio: number;
      yRatio: number;
      whRatio: number;
      sizeRatio: number;
      rotation: number;
    }) => void;
  }): Promise<void> => {
    const {
      artworkUrl,
      xRatio,
      yRatio,
      rotation,
      sizeRatio,
      workingCanvas,
      onArtworkChanged,
    } = options;
    this.resetBoundary();
    this._onArtworkChanged = onArtworkChanged;
    this._configure2DCanvas(workingCanvas);
    const { canvasHeight, canvasWidth, clipPathHeight, clipPathWidth } =
      this._getClipPathSize();
    return new Promise((resolve) => {
      fabric.Image.fromURL(
        artworkUrl,
        (img) => {
          const { width = 1, height = 1 } = img;
          this._useWidthToScale =
            width / clipPathWidth > height / clipPathHeight;
          this._xRatio = xRatio;
          this._yRatio = yRatio;
          this._sizeRatio = sizeRatio;
          this._rotation = rotation;
          if (this._useWidthToScale) {
            img.scaleToWidth(clipPathWidth * sizeRatio);
          } else {
            img.scaleToHeight(clipPathHeight * sizeRatio);
          }
          img.setPositionByOrigin(
            new fabric.Point(canvasWidth * xRatio, canvasHeight * yRatio),
            "center",
            "center"
          );
          img.setControlsVisibility({
            mb: false,
            mt: false,
            ml: false,
            mr: false,
          });
          img.set({
            angle: rotation,
          });
          this._workingCanvas2D?.add(img);
          this._workingCanvas2D?.setActiveObject(img);
          (this._canvas.material as THREE.MeshStandardMaterial).setValues({
            opacity: 1,
          });
          this._renderCanvasOnBoundary();
          resolve();
        },
        {
          crossOrigin: "Anonymous",
          originX: "center",
          originY: "center",
        }
      );
    });
  };

  private _updateListener = () => {
    this._onArtworkChanged?.({
      forBoundary: this.name,
      xRatio: this._xRatio,
      yRatio: this._yRatio,
      sizeRatio: this._sizeRatio,
      whRatio: this._boundaryRatio,
      rotation: this._rotation,
    });
  };

  private _onArtworkResize = _.throttle((e: fabric.IEvent<MouseEvent>) => {
    const { clipPathWidth, clipPathHeight } = this._getClipPathSize();
    this._sizeRatio =
      (this._useWidthToScale
        ? ((e.target?.scaleX ?? 1) * (e.target?.width ?? 1)) / clipPathWidth
        : ((e.target?.scaleY ?? 1) * (e.target?.height ?? 1)) /
          clipPathHeight) / window.devicePixelRatio;
    this._updateListener();
  }, 300);

  private _onArtworkRotate = _.throttle((e: fabric.IEvent<MouseEvent>) => {
    this._rotation = e.transform?.target?.angle ?? 0;
    this._updateListener();
  }, 300);

  private _onArtworkMove = (e: fabric.IEvent<MouseEvent>) => {
    const { clipPathWidth, clipPathHeight, widthPadding, heightPadding } =
      this._getClipPathSize();
    this._xRatio = ((e.target?.left ?? 0) - widthPadding) / clipPathWidth;
    this._yRatio = ((e.target?.top ?? 0) - heightPadding) / clipPathHeight;
    this._updateListener();
  };

  private _renderCanvasOnBoundary = _.throttle(() => {
    if (this._workingCanvas2D) {
      this._workingCanvas2D.clone((copy: fabric.Canvas) => {
        const original = copy.getElement();
        const texture = new THREE.CanvasTexture(original);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(Math.sign(this.normal.z) || 1, -1);
        (this._canvas.material as THREE.MeshStandardMaterial).map = texture;
      });
    }
  }, 20);

  resetBoundary = () => {
    this._workingCanvas2D?.clear();
    this._workingCanvas2D?.dispose();
    this._workingCanvas2D = undefined;
    (this._canvas.material as THREE.MeshStandardMaterial).map = null;
  };

  hasArtwork = () => {
    return !!this._workingCanvas2D;
  };

  exportArtworkData = () => {
    return {
      boundary: this.name,
      data: this.hasArtwork()
        ? {
            xRatio: this._xRatio,
            yRatio: this._yRatio,
            sizeRatio: this._sizeRatio,
            whRatio: this._boundaryRatio,
            rotation: this._rotation,
          }
        : null,
    };
  };
}
