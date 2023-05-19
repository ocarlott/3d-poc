import * as THREE from "three";
import { ControlName, TextureOption } from "./type";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { ImageHelper } from "./ImageHelper";
import { DecalGeometry as ImageDecal } from "./DecalGeometry";
import { fabric } from "fabric";
import _ from "underscore";

export class Boundary {
  readonly group = new THREE.Group();
  readonly mouseHelper = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 10),
    new THREE.MeshNormalMaterial()
  );
  static textureLoader = new THREE.TextureLoader();

  readonly ratio: number;
  artwork: THREE.Mesh | null = null;
  private _artworkUrl: string | null = null;
  artworkSize = new THREE.Vector3(0, 0, 0);
  artworkRatio = 1;
  readonly size: THREE.Vector3;
  center: THREE.Vector3;
  readonly canvas: THREE.Mesh;
  private _camera: THREE.PerspectiveCamera;
  private _modelThickness: number;
  translateControl: THREE.Mesh | null = null;
  // TODO: Needs dynamic size
  translateControlSize = new THREE.Vector3(1, 1, 1);
  isEditing = false;
  normal = new THREE.Vector3(0, 0, 0);
  crystalizeStyle = TextureOption.ScreenPrint;
  originalTexture: THREE.Texture | null = null;
  name: string;
  workingCanvas2D?: fabric.Canvas;
  // helper = new THREE.ArrowHelper();

  constructor(
    camera: THREE.PerspectiveCamera,
    canvas: THREE.Mesh,
    techPackCanvas: THREE.Mesh,
    modelThickness: number
  ) {
    this._camera = camera;
    this.canvas = canvas;
    this.name = canvas.name;
    this._modelThickness = modelThickness;
    this.canvas.name = ControlName.Boundary;
    canvas.geometry.computeVertexNormals();
    this.group.name = ControlName.BoundaryGroup;
    const boundingBox = new THREE.Box3().setFromObject(canvas);
    const techPackBoundingBox = new THREE.Box3().setFromObject(techPackCanvas);
    (canvas.material as THREE.Material).side = THREE.DoubleSide;
    this.size = boundingBox.getSize(new THREE.Vector3());
    const techPackSize = techPackBoundingBox.getSize(new THREE.Vector3());
    const estimateWHRatio = this.size.x / this.size.y;
    const smallerSide = Math.min(techPackSize.x, techPackSize.z);
    const biggerSide = Math.max(techPackSize.x, techPackSize.z);
    const width = estimateWHRatio > 1 ? biggerSide : smallerSide;
    const height = estimateWHRatio > 1 ? smallerSide : biggerSide;
    this.ratio = width / height;
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
    return this.ratio > canvasWidth / canvasHeight
      ? canvasWidth - 20
      : Math.floor((canvasHeight - 20) * this.ratio);
  }

  private _getClipPathHeight(canvasWidth: number, canvasHeight: number) {
    return this.ratio > canvasWidth / canvasHeight
      ? Math.floor((canvasWidth - 20) / this.ratio)
      : canvasHeight - 20;
  }

  private _getClipPathSize() {
    const canvasWidth = this.workingCanvas2D?.getWidth() ?? 0;
    const canvasHeight = this.workingCanvas2D?.getHeight() ?? 0;
    const clipPathWidth = this._getClipPathWidth(canvasWidth, canvasHeight);
    const clipPathHeight = this._getClipPathHeight(canvasWidth, canvasHeight);
    return {
      canvasWidth,
      canvasHeight,
      clipPathWidth,
      clipPathHeight,
    };
  }

  private _getClipPath(canvasWidth: number, canvasHeight: number) {
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
    return this.canvas.id;
  }

  addArtwork = async (artworkUrl: string, angle = 0): Promise<void> => {
    this._artworkUrl = artworkUrl;
    const canvasWidth = this.workingCanvas2D?.getWidth() ?? 0;
    const canvasHeight = this.workingCanvas2D?.getHeight() ?? 0;
    return new Promise((resolve) => {
      fabric.Image.fromURL(
        artworkUrl,
        (img) => {
          if (this.ratio > 1) {
            img.scaleToWidth(
              this._getClipPathWidth(canvasWidth, canvasHeight) / 2
            );
          } else {
            img.scaleToHeight(
              this._getClipPathHeight(canvasWidth, canvasHeight) / 2
            );
          }
          img.setPositionByOrigin(
            new fabric.Point(canvasWidth / 2, canvasHeight / 2),
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
            angle,
          });
          this.workingCanvas2D?.add(img);
          this.workingCanvas2D?.setActiveObject(img);
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

  updateArtworkPosition = (center: THREE.Vector3, orientation: THREE.Euler) => {
    if (this.artwork && this.isEditing && this.translateControl) {
      this.center = center;
      this.mouseHelper.rotation.copy(orientation);
      // this.helper.position.copy(newCenter);
      this.artwork.geometry = new ImageDecal(
        this._camera,
        this.canvas,
        center,
        orientation,
        this.artworkSize.clone().multiplyScalar(this.artworkRatio)
      );
      // this.group.remove(this.artwork);
      // const material = (this.artwork.material as THREE.MeshPhongMaterial).clone();
      // material.needsUpdate = true;
      // this.artwork = new THREE.Mesh(new DecalGeometry(
      //   this.canvas,
      //   newCenter,
      //   orientation,
      //   this.artworkSize.clone().multiplyScalar(this.artworkRatio),
      // ), material);
      this.group.add(this.artwork);
      this.translateControl.geometry = new DecalGeometry(
        this.artwork,
        center,
        orientation,
        this.translateControlSize
      );
    }
  };

  toggleEditting = (forcedValue?: boolean) => {
    this.isEditing = forcedValue != undefined ? forcedValue : !this.isEditing;
    this.setBoundaryStateOnEditing();
  };

  setBoundaryStateOnEditing = () => {
    if (this.artwork && this.translateControl) {
      this.canvas.visible = this.isEditing;
      this.translateControl.visible = this.isEditing;
      (this.artwork.material as THREE.MeshPhongMaterial).opacity = this
        .isEditing
        ? 0.4
        : 1;
    }
  };

  hasArtwork = (id: number): boolean => {
    return this.artwork?.id === id;
  };

  hide = () => {
    (this.canvas.material as THREE.MeshStandardMaterial).setValues({
      opacity: 0.4,
    });
  };

  private _onArtworkResize = _.throttle((e: fabric.IEvent<MouseEvent>) => {
    console.log({
      resize: e,
    });
  }, 300);

  private _onArtworkRotate = _.throttle((e: fabric.IEvent<MouseEvent>) => {
    console.log({
      rotate: e.transform?.target?.angle,
    });
  }, 300);

  private _onArtworkMove = (e: fabric.IEvent<MouseEvent>) => {
    const { clipPathWidth, clipPathHeight, canvasHeight, canvasWidth } =
      this._getClipPathSize();
    const widthPadding = (canvasWidth - clipPathWidth) / 2;
    const heightPadding = (canvasHeight - clipPathHeight) / 2;
    // console.log({
    //   xRatio: ((e.pointer?.x ?? 0) - widthPadding) / clipPathWidth,
    //   yRatio: ((e.pointer?.y ?? 0) - heightPadding) / clipPathHeight,
    // });
  };

  private _renderCanvasOnBoundary = () => {
    if (this.workingCanvas2D) {
      const original = this.workingCanvas2D.getElement();
      const texture = new THREE.CanvasTexture(original);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(-1, -1);
      (this.canvas.material as THREE.MeshStandardMaterial).map = texture;
    }
  };

  select = (canvas: HTMLCanvasElement) => {
    this.workingCanvas2D = new fabric.Canvas(canvas);
    this.workingCanvas2D.on("after:render", this._renderCanvasOnBoundary);
    this.workingCanvas2D.on("object:moving", this._onArtworkMove);
    this.workingCanvas2D.on("object:scaling", this._onArtworkResize);
    this.workingCanvas2D.on("object:rotating", this._onArtworkRotate);
    this.workingCanvas2D.clipPath = this._getClipPath(
      canvas.width / 2,
      canvas.height / 2
    );
  };

  unselect = () => {
    this.workingCanvas2D?.removeListeners();
    this.workingCanvas2D = undefined;
  };

  show = () => {
    (this.canvas.material as THREE.MeshStandardMaterial).setValues({
      opacity: 1,
    });
  };

  computeArtworkOnBoundary = () => {
    const boundingBox = new THREE.Box3();
    const imageCanvas = window.document.createElement("canvas");
    const imageCxt = imageCanvas.getContext("2d");
    boundingBox.setFromObject(this.canvas);
  };

  applyCrystalization = async (style: TextureOption) => {
    if (this.artwork) {
      // this.crystalizeStyle = style;
      // let newMaterial = Boundary.decalMaterial.clone();
      // switch (style) {
      //   case TextureOption.ScreenPrint:
      //     newMaterial.map = this.originalTexture;
      //     break;
      //   case TextureOption.Metallic:
      //     const textureLoader = new THREE.TextureLoader();
      //     const { uri, width, height } = await ImageHelper.generateAlphaMap(
      //       this.originalTexture?.image?.src
      //     );
      //     const colorMapUri = await ImageHelper.cropImageToRatio(
      //       "assets/crystal-map.png",
      //       width / height
      //     );
      //     const newColorMap = textureLoader.load(colorMapUri);
      //     const newAlphaMap = textureLoader.load(uri);
      //     newMaterial.map = newColorMap;
      //     newMaterial.alphaMap = newAlphaMap;
      //     break;
      // }
      // this.artwork.material = newMaterial;
      this.setBoundaryStateOnEditing();
    }
  };
}
