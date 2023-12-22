import * as THREE from 'three';
import { ControlName, TextureOption } from '../type';
import * as fabric from 'fabric';
import _ from 'underscore';
import { ImageHelper } from './ImageHelper';
import { Utils } from '../Utils';
import crystalAlpha from '../assets/crystal_alpha.webp';
import crystalNormal from '../assets/crystal_normal.webp';
import glitterRoughness from '../assets/glitter_roughness.webp';
import { Utils3D } from '../Utils3D';

export class Boundary {
  readonly group = new THREE.Group();
  private _boundaryRatio: number;
  readonly center: THREE.Vector3;
  private _canvas: THREE.Mesh;
  private _canvasMaterial: THREE.MeshPhysicalMaterial;
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
  private _workingColors: number[][] = [];
  private _textureApplication: {
    color: string;
    textureOption: TextureOption;
  }[] = [];
  private _artworkUrl = '';
  private _normalPositionHelper: THREE.ArrowHelper;
  private _normalUVHelper: THREE.ArrowHelper;
  private _normalUV: THREE.Vector3;
  static textureLoader = new THREE.TextureLoader();
  static crystalNormalTexture = Boundary.textureLoader.load(crystalNormal);
  static crystalAlphaTexture = Boundary.textureLoader.load(crystalAlpha);
  static glitterRoughnessTexture = Boundary.textureLoader.load(glitterRoughness);

  constructor(canvas: THREE.Mesh, techPackCanvas: THREE.Mesh) {
    this._canvas = canvas;
    this._canvasMaterial = this._canvas.material as THREE.MeshPhysicalMaterial;
    this._canvasMaterial.setValues({
      map: null,
      transparent: true,
      color: 'white',
      side: THREE.DoubleSide,
      toneMapped: false,
      blending: THREE.CustomBlending,
      opacity: 0,
    });
    this.name = this._initializeCanvas(canvas);
    this._initializeGroup();

    const { boundingRatio, biggerSide } = this._calculateBoundary(canvas, techPackCanvas);
    this._boundaryRatio = boundingRatio;

    this.center = this._calculateCenter(canvas);
    const positionPoints = this._calculatePositionPoints(canvas);
    const uvPoints = this._calculateUVPoints(canvas);
    this.normal = this._calculateNormal(positionPoints);
    this._normalPositionHelper = this._calculateNormalPositionHelper(biggerSide);
    this._normalUV = this._calculateNormalUV(uvPoints);
    this._normalUVHelper = this._calculateNormalUVHelper(this._normalUV, biggerSide);
    this._addHelpersToGroup();
  }

  private _initializeCanvas(canvas: THREE.Mesh) {
    // canvas.material = this._canvasMaterial;
    canvas.visible = false;
    canvas.geometry.computeVertexNormals();
    return canvas.name;
  }

  private _initializeGroup() {
    this.group.name = ControlName.BoundaryGroup;
  }

  private _calculateBoundary(canvas: THREE.Mesh, techPackCanvas: THREE.Mesh) {
    const boundingBox = new THREE.Box3().setFromObject(canvas);
    const techPackBoundingBox = new THREE.Box3().setFromObject(techPackCanvas);
    const size = boundingBox.getSize(new THREE.Vector3());
    const techPackSize = techPackBoundingBox.getSize(new THREE.Vector3());
    const estimateWHRatio = size.x / size.y;
    const smallerSide = Math.min(techPackSize.x, techPackSize.z);
    const biggerSide = Math.max(techPackSize.x, techPackSize.z);
    const width = estimateWHRatio > 1 ? biggerSide : smallerSide;
    const height = estimateWHRatio > 1 ? smallerSide : biggerSide;
    return { boundingRatio: width / height, biggerSide, smallerSide };
  }

  private _calculateCenter(canvas: THREE.Mesh) {
    const { max, min } = new THREE.Box3().setFromObject(canvas);
    return canvas.worldToLocal(min.clone().add(max).multiplyScalar(0.5));
  }

  private _calculatePositionPoints(canvas: THREE.Mesh): THREE.Vector3[] {
    const positionArray = (canvas.geometry.attributes['position'] as THREE.BufferAttribute).array;
    const positionPoints: THREE.Vector3[] = [];
    for (let i = 0; i < positionArray.length; i += 3) {
      positionPoints.push(
        new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]),
      );
    }
    return positionPoints;
  }

  private _calculateUVPoints(canvas: THREE.Mesh): THREE.Vector3[] {
    const uvArray = (canvas.geometry.attributes['uv'] as THREE.BufferAttribute).array;
    const uvPoints: THREE.Vector3[] = [];
    for (let i = 0; i < uvArray.length; i += 3) {
      uvPoints.push(new THREE.Vector3(uvArray[i], uvArray[i + 1], uvArray[i + 2]));
    }
    return uvPoints;
  }

  private _calculateNormal(positionPoints: THREE.Vector3[]) {
    const boundingSphere = new THREE.Sphere().setFromPoints(positionPoints);
    return boundingSphere.center.normalize();
  }

  private _calculateNormalPositionHelper(biggerSide: number) {
    const normalPositionHelper = new THREE.ArrowHelper(
      this.normal,
      new THREE.Vector3(0, 0, 0),
      biggerSide + 1,
    );
    normalPositionHelper.visible = false;
    return normalPositionHelper;
  }

  private _calculateNormalUV(uvPoints: THREE.Vector3[]) {
    const boundingUVSphere = new THREE.Sphere().setFromPoints(uvPoints);
    return boundingUVSphere.center.normalize();
  }

  private _calculateNormalUVHelper(normalUV: THREE.Vector3, biggerSide: number) {
    const normalUVHelper = new THREE.ArrowHelper(
      normalUV,
      new THREE.Vector3(0, 0, 0),
      biggerSide + 2,
      'purple',
    );
    normalUVHelper.visible = false;
    return normalUVHelper;
  }

  private _addHelpersToGroup() {
    this.group.add(this._normalUVHelper);
    this.group.add(this._normalPositionHelper);
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

  get canvasList() {
    return this._canvasList;
  }

  private _configure2DCanvas = (workingCanvas?: HTMLCanvasElement) => {
    const wCanvas = workingCanvas || window.document.createElement('canvas');
    if (!workingCanvas) {
      wCanvas.width = 300;
      wCanvas.height = 300;
    }
    this._canvasWidth = wCanvas.width;
    this._canvasHeight = wCanvas.height;
    this._workingCanvas2D?.removeListeners();
    this._workingCanvas2D = new fabric.Canvas(wCanvas);
    if (workingCanvas) {
      this._workingCanvas2D.on('after:render', this._renderCanvasOnBoundary);
      this._workingCanvas2D.on('object:moving', this._onArtworkMove);
      this._workingCanvas2D.on('object:scaling', this._onArtworkResize);
      this._workingCanvas2D.on('object:rotating', this._onArtworkRotate);
    }
    this._workingCanvas2D.clipPath = this._generateClipPath(this._canvasWidth, this._canvasHeight);
    this._workingCanvas2D.backgroundColor = 'rgba(0, 0, 0, 0.1)';
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
    disableEditing?: boolean;
  }): Promise<void> => {
    const {
      artworkUrl,
      xRatio,
      yRatio,
      rotation,
      sizeRatio,
      workingCanvas,
      onArtworkChanged,
      disableEditing = true,
    } = options;

    this.resetBoundary();
    this._onArtworkChanged = onArtworkChanged;
    let computedArtworkUrl = artworkUrl;

    if (this._artworkUrl !== artworkUrl) {
      const { computed, colorList } = await this._reduceImageColor(artworkUrl);
      computedArtworkUrl = computed;
      this._clearCanvasList();
      this._canvasList = this._createCanvasList(colorList);
      this.group.add(...this._canvasList);
      this._workingColors = colorList;
    }

    this._artworkUrl = artworkUrl;
    this._configure2DCanvas(workingCanvas);
    const { canvasHeight, canvasWidth, clipPathHeight, clipPathWidth } = this._getClipPathSize();
    const img = await this._createFabricImage(computedArtworkUrl);
    this._scaleImage(img, clipPathWidth, clipPathHeight, sizeRatio);
    this._setPositionImage(img, canvasWidth, xRatio, canvasHeight, yRatio);
    this._configureImage(img, rotation, disableEditing);

    this._workingCanvas2D?.add(img);
    if (!disableEditing) {
      this._workingCanvas2D?.setActiveObject(img);
    }
    await this._renderCanvasOnBoundary();
  };

  private _reduceImageColor = async (artworkUrl: string) => {
    const { computed, colorList } = await ImageHelper.reduceImageColor({
      url: artworkUrl,
      minDensity: 0.1,
    });
    return { computed, colorList };
  };

  private _clearCanvasList = () => {
    this._canvasList.forEach((c) => {
      c.removeFromParent();
      Utils3D.disposeHierarchy(c);
    });
    this._canvasList = [];
  };

  private _createCanvasList = (colorList: any[]) => {
    return colorList.map(() => {
      const canvas = this._canvas.clone();
      canvas.material = this._canvasMaterial.clone();
      canvas.visible = true;
      return canvas;
    });
  };

  private _createFabricImage = async (artworkUrl: string) => {
    const img = await fabric.Image.fromURL(artworkUrl, {
      crossOrigin: 'anonymous',
    });
    return img;
  };

  private _scaleImage = (
    img: fabric.Image,
    clipPathWidth: number,
    clipPathHeight: number,
    sizeRatio: number,
  ) => {
    const { width = 1, height = 1 } = img;
    this._useWidthToScale = width / clipPathWidth > height / clipPathHeight;

    if (this._useWidthToScale) {
      img.scaleToWidth(clipPathWidth * sizeRatio);
    } else {
      img.scaleToHeight(clipPathHeight * sizeRatio);
    }

    img.originX = 'center';
    img.originY = 'center';
  };

  private _setPositionImage = (
    img: fabric.Image,
    canvasWidth: number,
    xRatio: number,
    canvasHeight: number,
    yRatio: number,
  ) => {
    img.setPositionByOrigin(
      new fabric.Point(canvasWidth * xRatio, canvasHeight * yRatio),
      'center',
      'center',
    );
  };

  private _configureImage = (img: fabric.Image, angle: number, disableEditing: boolean) => {
    img.setControlsVisibility({ mb: false, mt: false, ml: false, mr: false });
    img.set({ angle: angle, selectable: !disableEditing });
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
        ? (((e as any).target?.scaleX ?? 1) * ((e as any).target?.width ?? 1)) / clipPathWidth
        : (((e as any).target?.scaleY ?? 1) * ((e as any).target?.height ?? 1)) / clipPathHeight) /
      window.devicePixelRatio;
    this._updateListener();
  }, 300);

  private _onArtworkRotate = _.throttle((e: fabric.TEvent<MouseEvent>) => {
    this._rotation = (e as any).target.angle ?? 0;
    this._updateListener();
  }, 300);

  private _onArtworkMove = (event: fabric.TEvent<MouseEvent>) => {
    const { clipPathWidth, clipPathHeight, widthPadding, heightPadding } = this._getClipPathSize();
    this._xRatio = (((event as any).target?.left ?? 0) - widthPadding) / clipPathWidth;
    this._yRatio = (((event as any).target?.top ?? 0) - heightPadding) / clipPathHeight;
    this._updateListener();
  };

  private _renderCanvasOnBoundary = _.throttle(async () => {
    if (this._workingCanvas2D) {
      const copy = await this._workingCanvas2D.clone(['elements']);
      copy.backgroundColor = 'rgba(0, 0, 0, 0)';
      const original = copy.toCanvasElement();
      const texture = new THREE.CanvasTexture(original);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
      texture.colorSpace = THREE.SRGBColorSpace;
      this._canvasMaterial.setValues({
        map: texture,
      });
      await this._finalizeCanvasOnBoundary();
    }
  }, 20);

  private _finalizeCanvasOnBoundary = _.throttle(async () => {
    if (this._workingCanvas2D) {
      this._canvasMaterial.opacity = 0;
      const copy = await this._workingCanvas2D.clone(['elements']);
      copy.backgroundColor = 'rgba(0, 0, 0, 0)';
      const original = copy.toCanvasElement();
      const url = original.toDataURL();
      const imagePartUrls = await ImageHelper.generateImageParts(url, this._workingColors);
      const textures = imagePartUrls.map((uri) => {
        const texture = this._createTexture(uri);
        return texture;
      });
      const colors = this._workingColors.map((color) => Utils.rgb2hex(color));
      this._canvas.visible = false;
      this._applyTexturesToGeometries(textures, colors, imagePartUrls);
    }
  }, 2000);

  private _createTexture(uri: string): THREE.Texture {
    const texture = new THREE.TextureLoader().load(uri);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
    return texture;
  }

  private _applyTexturesToGeometries(
    textures: THREE.Texture[],
    colors: string[],
    imagePartUrls: string[],
  ): void {
    this._canvasList.forEach(async (geo, index) => {
      const used = new Set<number>();
      const entryIndex = this._textureApplication.findIndex((v) =>
        Utils.testHexMatch(v.color, colors[index]),
      );
      if (entryIndex === -1 && !used.has(entryIndex)) {
        this._applyDefaultMatteMaterial(geo, colors[index], textures[index]);
      } else {
        used.add(entryIndex);
        const entry = this._textureApplication[entryIndex];
        switch (entry.textureOption) {
          case TextureOption.Metallic:
            this._applyMetallicMaterial(geo, colors[index], textures[index]);
            break;
          case TextureOption.Matte:
            this._applyDefaultMatteMaterial(geo, colors[index], textures[index]);
            break;
          case TextureOption.Crystals:
            await this._applyCrystalsMaterial(geo, colors[index], textures[index]);
            break;
          case TextureOption.Glitter:
          default:
            this._applyGlitterMaterial(geo, colors[index], imagePartUrls[index]);
            break;
        }
      }
      (geo.material as THREE.Material).needsUpdate = true;
    });
  }

  private async _applyGlitterMaterial(geo: THREE.Mesh, color: string, imagePartUrl: string) {
    const { uri: alphaUri } = await ImageHelper.generateAlphaMap(imagePartUrl);
    const alphaTexture = Boundary.textureLoader.load(alphaUri);
    alphaTexture.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
    alphaTexture.wrapS = THREE.RepeatWrapping;
    alphaTexture.wrapT = THREE.RepeatWrapping;
    const mapTexture = Boundary.glitterRoughnessTexture.clone();
    mapTexture.wrapS = THREE.RepeatWrapping;
    mapTexture.wrapT = THREE.RepeatWrapping;
    mapTexture.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
    mapTexture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshPhysicalMaterial({
      map: mapTexture,
      roughnessMap: mapTexture,
      color: `#${color}`,
      metalness: 0.8,
      roughness: 0.9,
      alphaMap: alphaTexture,
      opacity: 1,
      transparent: true,
    });
    geo.material = material;
  }

  private _applyMetallicMaterial(geo: THREE.Mesh, color: string, texture: THREE.Texture): void {
    (geo.material as THREE.MeshStandardMaterial).setValues({
      color: `#${color}`,
      metalness: 0.2,
      roughness: 0.3,
      opacity: 1,
      map: texture,
    });
  }

  private _applyDefaultMatteMaterial(geo: THREE.Mesh, color: string, texture: THREE.Texture): void {
    (geo.material as THREE.MeshStandardMaterial).setValues({
      opacity: 1,
      color: `#${color}`,
      map: texture,
    });
  }

  private async _applyCrystalsMaterial(
    geo: THREE.Mesh,
    color: string,
    texture: THREE.Texture,
  ): Promise<void> {
    // const { uri: alphaUri } = await ImageHelper.generateAlphaMap(imagePartUrl);
    // const finalAlphaUri = await ImageHelper.mergeAlphaMap(alphaUri, crystalAlpha);
    // const alphaTexture = Boundary.textureLoader.load(finalAlphaUri);
    // alphaTexture.flipY = false;
    const normalMap = Boundary.crystalNormalTexture.clone();
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
    const alphaMap = Boundary.crystalAlphaTexture.clone();
    alphaMap.wrapS = THREE.RepeatWrapping;
    alphaMap.wrapT = THREE.RepeatWrapping;
    alphaMap.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
    (geo.material as THREE.MeshStandardMaterial).setValues({
      opacity: 1,
      color: `#${color}`,
      map: texture,
      normalMap,
      alphaMap,
      transparent: true,
    });
  }

  resetBoundary = () => {
    this.resetTextureApplication();
    this._workingCanvas2D?.clear();
    this._workingCanvas2D?.dispose();
    this._workingCanvas2D = undefined;
    this._artworkUrl = '';
    Utils3D.disposeMaps(this._canvasMaterial);
    this._canvasMaterial.setValues({
      map: null,
      normalMap: null,
      alphaMap: null,
    });
    this._clearCanvasList();
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
    // this._normalUVHelper.visible = value;
  };

  applyTextureApplication = (textureApplication: {
    color: string;
    textureOption: TextureOption;
  }) => {
    const index = this._textureApplication.findIndex((v) =>
      Utils.testHexMatch(textureApplication.color, v.color),
    );
    if (index === -1) {
      this._textureApplication = this._textureApplication.concat(textureApplication);
    } else {
      this._textureApplication.splice(index, 1, textureApplication);
    }
  };

  resetTextureApplication = () => {
    this._textureApplication = [];
  };
}
