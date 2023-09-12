import * as THREE from "three";
import { ControlName, TextureOption } from "./type";
import * as fabric from "fabric";
import _ from "underscore";
import { ImageHelper } from "./ImageHelper";
import { KeepColor } from "./KeepColorFilter";
import { Utils } from "./Utils";
// import { Texture, Sprite } from "pixi.js";
// import { MultiColorReplaceFilter } from "@pixi/filter-multi-color-replace";

export class Boundary {
  readonly group = new THREE.Group();
  private _boundaryRatio: number;
  readonly center: THREE.Vector3;
  private _canvas: THREE.Mesh;
  private _canvasMaterial: THREE.MeshStandardMaterial;
  private _canvasList: THREE.Mesh[] = [];
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
  // private _shouldReduceArtworkColor = true;
  private _workingColors: number[][] = [];
  // private _colorFilters: any[] = [];
  private _textureApplication: {
    color: string;
    textureOption: TextureOption;
  }[] = [];
  private _normalPositionHelper: THREE.ArrowHelper;
  private _normalUVHelper: THREE.ArrowHelper;
  private _normalUV: THREE.Vector3;
  public breakdownTextures: string[] = [];

  constructor(canvas: THREE.Mesh, techPackCanvas: THREE.Mesh) {
    this._canvas = canvas;
    this._canvasMaterial = canvas.material as THREE.MeshStandardMaterial;
    this.name = canvas.name;
    canvas.geometry.computeVertexNormals();
    this.group.name = ControlName.BoundaryGroup;
    const boundingBox = new THREE.Box3().setFromObject(canvas);
    const techPackBoundingBox = new THREE.Box3().setFromObject(techPackCanvas);
    this._canvasMaterial.side = THREE.DoubleSide;
    this._canvasMaterial.transparent = true;
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
    const uvArray = (canvas.geometry.attributes["uv"] as THREE.BufferAttribute)
      .array;
    const positionPoints: THREE.Vector3[] = [];
    for (let i = 0; i < positionArray.length; i += 3) {
      positionPoints.push(
        new THREE.Vector3(
          positionArray[i],
          positionArray[i + 1],
          positionArray[i + 2]
        )
      );
    }
    const uvPoints: THREE.Vector3[] = [];
    for (let i = 0; i < uvArray.length; i += 3) {
      uvPoints.push(
        new THREE.Vector3(uvArray[i], uvArray[i + 1], uvArray[i + 2])
      );
    }
    const boundingSphere = new THREE.Sphere().setFromPoints(positionPoints);
    const boundingUVSphere = new THREE.Sphere().setFromPoints(uvPoints);
    this.normal = boundingSphere.center.normalize();
    this._normalPositionHelper = new THREE.ArrowHelper(
      this.normal,
      new THREE.Vector3(0, 0, 0),
      15
    );
    this._normalUV = boundingUVSphere.center.normalize();
    this._normalUVHelper = new THREE.ArrowHelper(
      this._normalUV,
      new THREE.Vector3(0, 0, 0),
      15,
      "purple"
    );
    this._normalPositionHelper.visible = false;
    this._normalUVHelper.visible = false;
    this.group.add(this._normalPositionHelper, this._normalUVHelper);
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
    this._workingCanvas2D.backgroundColor = "rgba(0, 0, 0, 0.3)";
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
    textureApplication?: { color: string; textureOption: TextureOption }[];
    onArtworkChanged?: (params: {
      forBoundary: string;
      xRatio: number;
      yRatio: number;
      whRatio: number;
      sizeRatio: number;
      rotation: number;
    }) => void;
    disableEditting?: boolean;
  }): Promise<void> => {
    const {
      artworkUrl,
      xRatio,
      yRatio,
      rotation,
      sizeRatio,
      workingCanvas,
      onArtworkChanged,
      textureApplication,
      disableEditting = true,
    } = options;
    this.resetBoundary();
    this._textureApplication = (textureApplication || []).map((app) => ({
      ...app,
      color: app.color.toUpperCase(),
    }));
    this._onArtworkChanged = onArtworkChanged;
    const { computed: computedArtworkUrl, colorList } =
      await ImageHelper.reduceImageColor({
        url: artworkUrl,
      });
    this._canvasList.forEach((c) => {
      c.removeFromParent();
    });
    this._canvasList = colorList.map(() => {
      const canvas = this._canvas.clone();
      canvas.material = this._canvasMaterial.clone();
      return canvas;
    });
    this.group.add(...this._canvasList);
    this._workingColors = colorList;
    this._configure2DCanvas(workingCanvas);
    const { canvasHeight, canvasWidth, clipPathHeight, clipPathWidth } =
      this._getClipPathSize();
    const img = await fabric.Image.fromURL(computedArtworkUrl, {
      crossOrigin: "anonymous",
    });
    const { width = 1, height = 1 } = img;
    this._useWidthToScale = width / clipPathWidth > height / clipPathHeight;
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
      selectable: !disableEditting,
    });
    this._workingCanvas2D?.add(img);
    if (!disableEditting) {
      this._workingCanvas2D?.setActiveObject(img);
    }
    this._canvasMaterial.setValues({
      opacity: 1,
    });
    await this._renderCanvasOnBoundary();
    // if (disableEditting) {
    //   this.finalizeCanvasOnBoundary();
    // }
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

  private _onArtworkResize = _.throttle((e: fabric.TEvent<MouseEvent>) => {
    const { clipPathWidth, clipPathHeight } = this._getClipPathSize();
    this._sizeRatio =
      (this._useWidthToScale
        ? (((e as any).target?.scaleX ?? 1) * ((e as any).target?.width ?? 1)) /
          clipPathWidth
        : (((e as any).target?.scaleY ?? 1) *
            ((e as any).target?.height ?? 1)) /
          clipPathHeight) / window.devicePixelRatio;
    this._updateListener();
  }, 300);

  private _onArtworkRotate = _.throttle((e: fabric.TEvent<MouseEvent>) => {
    this._rotation = (e as any).target.angle ?? 0;
    this._updateListener();
  }, 300);

  private _onArtworkMove = (event: fabric.TEvent<MouseEvent>) => {
    const { clipPathWidth, clipPathHeight, widthPadding, heightPadding } =
      this._getClipPathSize();
    this._xRatio =
      (((event as any).target?.left ?? 0) - widthPadding) / clipPathWidth;
    this._yRatio =
      (((event as any).target?.top ?? 0) - heightPadding) / clipPathHeight;
    this._updateListener();
  };

  private _renderCanvasOnBoundary = _.throttle(async () => {
    if (this._workingCanvas2D) {
      const copy = await this._workingCanvas2D.clone(["elements"]);
      copy.backgroundColor = "rgba(0, 0, 0, 0)";
      const original = copy.toCanvasElement();
      const texture = new THREE.CanvasTexture(original);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(
        Math.sign(this._normalUV.x),
        -Math.sign(this._normalUV.y)
      );
      this._canvasMaterial.map = texture;
    }
  }, 20);

  finalizeCanvasOnBoundary = async () => {
    if (this._workingCanvas2D) {
      const copy = await this._workingCanvas2D.clone(["elements"]);
      const original = copy.toCanvasElement();
      const uri = original.toDataURL();
      const { imageData } = await ImageHelper.getImageDataForImage(uri);
      const textureUris = await Promise.all(
        this._workingColors.map((c) => ImageHelper.keepOnlyColor(imageData, c))
      );
      const colors = this._workingColors.map(Utils.rgb2hex);
      this.breakdownTextures = textureUris;
      const textures = textureUris.map((uri) => {
        const texture = new THREE.TextureLoader().load(uri);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(Math.sign(this.normal.z) || 1, -1);
        return texture;
      });
      // console.log({
      //   colorList: colors,
      //   textureUris,
      // });
      this._canvasList.forEach((geo, index) => {
        if (index % 2 == 0) {
          geo.material = new THREE.MeshPhongMaterial();
          (geo.material as THREE.MeshPhongMaterial).setValues({
            shininess: 1,
            color: "white",
            map: textures[index],
            opacity: 1,
            reflectivity: 1,
            transparent: true,
          });
        } else {
          const material = geo.material as THREE.MeshStandardMaterial;
          material.map = textures[index];
          material.setValues({
            // color: "pink",
            opacity: 1,
          });
        }
        // console.log(material.id);
      });
      this._canvas.visible = false;
    }
  };

  resetBoundary = () => {
    this._workingCanvas2D?.clear();
    this._workingCanvas2D?.dispose();
    this._workingCanvas2D = undefined;
    this._canvasMaterial.setValues({
      map: null,
      opacity: 0,
    });
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

  setDeveloperMode = (value: boolean) => {
    this._normalPositionHelper.visible = value;
    this._normalUVHelper.visible = value;
  };
}
