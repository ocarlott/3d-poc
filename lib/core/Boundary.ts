import * as THREE from 'three';
import { ControlName, TextureOption } from '../type';
import * as fabric from 'fabric';
import _ from 'underscore';
import hull from 'hull.js';
import { ImageHelper } from './ImageHelper';
import { Utils } from '../Utils';
import crystalAlpha from '../assets/crystal_alpha.webp';
import crystalNormal from '../assets/crystal_normal.webp';
import glitterRoughness from '../assets/glitter_roughness.webp';
import { Utils3D } from '../Utils3D';

const InternalCanvasSize = 1200;
const CanvasSize = 300;

export class Boundary {
  readonly group = new THREE.Group();
  private _boundaryRatio: number;
  readonly center: THREE.Vector3;
  private _canvas: THREE.Mesh;
  private _techPackCanvas: THREE.Mesh;
  private _canvasMaterial: THREE.MeshPhysicalMaterial;
  private _canvasList: THREE.Mesh[] = [];
  private _techPackCanvasList: THREE.Mesh[] = [];
  private _useWidthToScale = false;
  readonly normal = new THREE.Vector3(0, 0, 0);
  readonly name: string;
  private _internalWorkingCanvas2D: fabric.Canvas;
  private _workingCanvas2D: fabric.Canvas;
  private _internalImage?: fabric.Image;
  private _workingCanvasSize = CanvasSize;
  private _canvasRatio = InternalCanvasSize / CanvasSize;
  private _isReadyForScreenshot = false;
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
  private _canvasWidth = InternalCanvasSize;
  private _canvasHeight = InternalCanvasSize;
  private _workingColors: number[][] = [];
  private _textureApplication: {
    color: string;
    textureOption: TextureOption;
  }[] = [];
  private _artworkUrl = '';
  private _normalPositionHelper: THREE.ArrowHelper;
  private _normalUVHelper: THREE.ArrowHelper;
  private _normalUV: THREE.Vector3;
  private _shouldShowOriginalArtwork = false;
  static textureLoader = new THREE.TextureLoader();
  static crystalNormalTexture = Boundary.textureLoader.load(crystalNormal);
  static crystalAlphaTexture = Boundary.textureLoader.load(crystalAlpha);
  static glitterRoughnessTexture = Boundary.textureLoader.load(glitterRoughness);

  constructor(canvas: THREE.Mesh, techPackCanvas: THREE.Mesh) {
    this._canvas = canvas;
    this._techPackCanvas = techPackCanvas;
    this._canvasMaterial = this._canvas.material as THREE.MeshPhysicalMaterial;
    this._canvasMaterial.setValues({
      map: null,
      transparent: true,
      side: THREE.FrontSide,
      toneMapped: false,
      blending: THREE.CustomBlending,
      opacity: 0,
    });
    (techPackCanvas.material as THREE.MeshPhysicalMaterial).setValues({
      map: null,
      transparent: true,
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
    // this._addHelpersToGroup();

    const canvasElement = window.document.createElement('canvas');
    canvasElement.width = InternalCanvasSize;
    canvasElement.height = InternalCanvasSize;
    this._internalWorkingCanvas2D = new fabric.Canvas(canvasElement);
    const workingCanvasElement = window.document.createElement('canvas');
    workingCanvasElement.width = CanvasSize;
    workingCanvasElement.height = CanvasSize;
    this._workingCanvas2D = new fabric.Canvas(workingCanvasElement);
    this._configure2DCanvas();
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

  private _getClipPathSize(canvasWidth: number, canvasHeight: number) {
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

  private _generateClipPath(canvasWidth: number, canvasHeight: number, polygonPoints: number[][]) {
    return new fabric.Polygon(
      polygonPoints.map((p) => ({
        x: p[0] * canvasWidth,
        y: p[1] * canvasHeight,
      })),
      {},
    );
  }

  get id() {
    return this._canvas.id;
  }

  get canvasList() {
    return this._canvasList;
  }

  get imageEditor() {
    return this._workingCanvas2D.elements.container;
  }

  get internalImageEditor() {
    return this._internalWorkingCanvas2D.elements.container;
  }

  private _configure2DCanvas = () => {
    const uvs = Utils3D.getUVBoundaryForGeometry(this._canvas.geometry);
    this._internalWorkingCanvas2D.clipPath = this._generateClipPath(
      this._canvasWidth,
      this._canvasHeight,
      uvs,
    );
    this._internalWorkingCanvas2D.backgroundColor = 'rgba(0, 0, 0, 0.1)';

    this._workingCanvas2D.on('after:render', this._renderCanvasOnBoundary);
    this._workingCanvas2D.clipPath = this._generateClipPath(
      this._workingCanvasSize,
      this._workingCanvasSize,
      uvs,
    );
    this._workingCanvas2D.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    this._workingCanvas2D.add(
      new fabric.FabricText('Loading image', {
        left: (this._workingCanvas2D.clipPath?.left ?? 0) + 10,
        top: (this._workingCanvas2D.clipPath?.top ?? 0) + 10,
        fontSize: 10,
        fontFamily: 'Montserrat',
        fill: '#4c2e83',
        fontWeight: '400',
      }),
    );
  };

  organizeGroup = () => {
    this.group.add(this._canvas);
  };

  addArtwork = async (options: {
    artworkUrl: string;
    xRatio: number;
    yRatio: number;
    rotation: number;
    sizeRatio: number;
    sizeRatioLimit: number;
    shouldShowOriginalArtwork?: boolean;
    onArtworkChanged?: (params: {
      forBoundary: string;
      xRatio: number;
      yRatio: number;
      whRatio: number;
      sizeRatio: number;
      rotation: number;
    }) => void;
    sensitivity?: number;
    disableEditing?: boolean;
  }): Promise<void> => {
    const {
      artworkUrl,
      xRatio,
      yRatio,
      rotation,
      sizeRatio,
      onArtworkChanged,
      disableEditing = true,
      shouldShowOriginalArtwork = false,
      sensitivity,
      sizeRatioLimit,
    } = options;
    this._isReadyForScreenshot = false;
    await this.resetBoundary();
    this._onArtworkChanged = onArtworkChanged;
    let computedArtworkUrl = artworkUrl;
    this._shouldShowOriginalArtwork = shouldShowOriginalArtwork;
    if (!shouldShowOriginalArtwork) {
      const { computed, colorList } = await this._reduceImageColor(artworkUrl, sensitivity);
      computedArtworkUrl = computed;
      this._canvasList = this._createCanvasList(colorList);
      this._techPackCanvasList = this._createTechPackCanvasList(this._canvasList);
      this._workingColors = colorList;
    } else {
      this._canvasList = this._createCanvasList([1]);
      this._techPackCanvasList = this._createTechPackCanvasList(this._canvasList);
    }
    this.group.add(...this._canvasList);

    this._artworkUrl = computedArtworkUrl;
    const { clipPathHeight, clipPathWidth, widthPadding, heightPadding } = this._getClipPathSize(
      this._workingCanvasSize,
      this._workingCanvasSize,
    );
    const img = await this._createFabricImage(computedArtworkUrl);
    this._setScaleDirection({
      img,
      clipPathWidth,
      clipPathHeight,
    });
    const internalImage = await img.clone();
    this._scaleImage(
      img,
      clipPathWidth,
      clipPathHeight,
      sizeRatio < sizeRatioLimit ? sizeRatio : sizeRatioLimit,
    );
    this._scaleImage(
      internalImage,
      clipPathWidth * this._canvasRatio,
      clipPathHeight * this._canvasRatio,
      sizeRatio < sizeRatioLimit ? sizeRatio : sizeRatioLimit,
    );
    this._attachEvents({
      img,
      clipPathWidth,
      clipPathHeight,
      sizeRatioLimit,
    });
    this._setPositionImage({
      img,
      clipPathWidth,
      clipPathHeight,
      xRatio,
      yRatio,
      widthPadding,
      heightPadding,
    });
    this._setPositionImage({
      img: internalImage,
      clipPathWidth: clipPathWidth * this._canvasRatio,
      clipPathHeight: clipPathHeight * this._canvasRatio,
      xRatio,
      yRatio,
      widthPadding: widthPadding * this._canvasRatio,
      heightPadding: heightPadding * this._canvasRatio,
    });
    this._configureImage(img, rotation, disableEditing);
    this._configureImage(internalImage, rotation, true);

    this._workingCanvas2D.remove(...this._workingCanvas2D.getObjects());
    this._internalWorkingCanvas2D.remove(...this._internalWorkingCanvas2D.getObjects());
    this._workingCanvas2D.add(img);
    this._internalWorkingCanvas2D.add(internalImage);
    this._internalImage = internalImage;

    if (!disableEditing) {
      this._workingCanvas2D.setActiveObject(img);
    }
    await this._renderCanvasOnBoundary();
  };

  private _reduceImageColor = async (artworkUrl: string, sensitivity: number = 5) => {
    const { computed, colorList } = await ImageHelper.reduceImageColor({
      url: artworkUrl,
      minDensity: sensitivity / 100,
    });
    return { computed, colorList };
  };

  private _clearCanvasList = () => {
    this._canvasList.forEach((c) => {
      c.removeFromParent();
      Utils3D.disposeHierarchy(c);
    });
    this._techPackCanvasList.forEach((c) => {
      c.removeFromParent();
    });
    this._canvasList = [];
    this._techPackCanvasList = [];
  };

  private _createCanvasList = (colorList: any[]) => {
    return colorList.map((_, i) => {
      const canvas = this._canvas.clone();
      canvas.name = `boundary_copy_${this.name}_${i}`;
      canvas.userData.boundaryName = this.name;
      canvas.material = this._canvasMaterial.clone();
      canvas.visible = true;
      return canvas;
    });
  };

  private _createTechPackCanvasList = (canvasList: THREE.Mesh[]) => {
    return canvasList.map((canvasItem) => {
      const canvas = this._techPackCanvas.clone();
      canvas.name = canvasItem.name + '-techpack';
      canvas.material = canvasItem.material;
      canvas.visible = true;
      return canvas;
    });
  };

  private _getTechPackCanvas = (canvasName: string) => {
    return this._techPackCanvasList.find((c) => c.name === canvasName + '-techpack');
  };

  private _createFabricImage = async (artworkUrl: string) => {
    const img = await fabric.Image.fromURL(artworkUrl, {
      crossOrigin: 'anonymous',
    });
    img.originX = 'center';
    img.originY = 'center';
    img.centeredScaling = true;
    img.lockScalingFlip = true;
    return img;
  };

  private _attachEvents = (params: {
    img: fabric.Image;
    clipPathWidth: number;
    clipPathHeight: number;
    sizeRatioLimit: number;
  }) => {
    const { img, clipPathWidth, clipPathHeight, sizeRatioLimit } = params;
    const sizeForScale = this._useWidthToScale ? clipPathWidth : clipPathHeight;
    const maxSizeX = sizeForScale * sizeRatioLimit;
    const maxSizeY = sizeForScale * sizeRatioLimit;
    const maxScaleX = maxSizeX / img.width;
    const maxScaleY = maxSizeY / img.height;

    img.on('scaling', () => {
      // Handle scaling
      const self = img as any;
      if (self.scaleX < 0.02 || self.scaleY < 0.02) {
        self.scaleX = self.lastGoodScaleX ?? 0.02;
        self.scaleY = self.lastGoodScaleY ?? 0.02;
        self.left = self.lastGoodLeft ?? self.left;
        self.top = self.lastGoodTop ?? self.top;
        return;
      }
      if (self.scaleX >= maxScaleX || self.scaleY >= maxScaleY) {
        self.left = self.lastGoodLeft ?? self.left;
        self.top = self.lastGoodTop ?? self.top;
        self.scaleX = self.lastGoodScaleX ?? maxScaleX;
        self.scaleY = self.lastGoodScaleY ?? maxScaleY;
        return;
      }
      self.lastGoodTop = self.top;
      self.lastGoodLeft = self.left;
      self.lastGoodScaleX = self.scaleX;
      self.lastGoodScaleY = self.scaleY;
      this._isReadyForScreenshot = false;
    });

    img.on('modified', () => {
      // Handle rotated
      this._rotation = img.angle;
      if (this._internalImage) {
        this._internalImage.angle = img.angle;
      }

      // Handle moved
      const { clipPathWidth, clipPathHeight, widthPadding, heightPadding } = this._getClipPathSize(
        this._workingCanvasSize,
        this._workingCanvasSize,
      );
      this._xRatio = (img.left - widthPadding) / clipPathWidth;
      this._yRatio = (img.top - heightPadding) / clipPathHeight;
      if (this._internalImage) {
        this._internalImage.left = img.left * this._canvasRatio;
        this._internalImage.top = img.top * this._canvasRatio;
      }

      // Handle resized
      this._sizeRatio = this._useWidthToScale
        ? (img.scaleX * img.width) / clipPathWidth
        : (img.scaleY * img.height) / clipPathHeight;
      if (this._internalImage) {
        this._internalImage.scaleX = img.scaleX * this._canvasRatio;
        this._internalImage.scaleY = img.scaleY * this._canvasRatio;
      }

      this._updateListener();
      this._isReadyForScreenshot = false;
    });
  };

  private _setScaleDirection = (params: {
    img: fabric.Image;
    clipPathWidth: number;
    clipPathHeight: number;
  }) => {
    const { img, clipPathWidth, clipPathHeight } = params;
    const { width = 1, height = 1 } = img;
    this._useWidthToScale = width / clipPathWidth > height / clipPathHeight;
  };

  private _scaleImage = (
    img: fabric.Image,
    clipPathWidth: number,
    clipPathHeight: number,
    sizeRatio: number,
  ) => {
    if (this._useWidthToScale) {
      img.scaleToWidth(clipPathWidth * sizeRatio);
    } else {
      img.scaleToHeight(clipPathHeight * sizeRatio);
    }
  };

  private _setPositionImage = (params: {
    img: fabric.Image;
    clipPathWidth: number;
    xRatio: number;
    clipPathHeight: number;
    yRatio: number;
    widthPadding: number;
    heightPadding: number;
  }) => {
    const { img, clipPathWidth, xRatio, clipPathHeight, yRatio, widthPadding, heightPadding } =
      params;
    img.setPositionByOrigin(
      new fabric.Point(
        clipPathWidth * xRatio + widthPadding,
        clipPathHeight * yRatio + heightPadding,
      ),
      'center',
      'center',
    );
  };

  private _configureImage = (img: fabric.Image, angle: number, disableEditing: boolean) => {
    img.setControlsVisibility({ mb: false, mt: false, ml: false, mr: false });
    img.set({ angle: angle, selectable: !disableEditing });
  };

  private _updateListener = _.throttle(() => {
    this._onArtworkChanged?.({
      forBoundary: this.name,
      xRatio: this._xRatio,
      yRatio: this._yRatio,
      sizeRatio: this._sizeRatio,
      whRatio: this._boundaryRatio,
      rotation: this._rotation,
    });
  }, 300);

  private _renderCanvasOnBoundary = _.throttle(async () => {
    if (this._artworkUrl) {
      const copy = await this._internalWorkingCanvas2D.clone(['elements']);
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
    if (this._artworkUrl) {
      this._canvasMaterial.opacity = 0;
      const copy = await this._internalWorkingCanvas2D.clone(['elements']);
      copy.backgroundColor = 'rgba(0, 0, 0, 0)';
      const original = copy.toCanvasElement();
      if (this._shouldShowOriginalArtwork) {
        const texture = new THREE.CanvasTexture(original);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
        texture.colorSpace = THREE.SRGBColorSpace;
        const canvas = this._canvasList[0];
        canvas.material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 1,
          depthTest: true,
          depthWrite: false,
          side: THREE.FrontSide,
          toneMapped: false,
        });
        const techpackCanvas = this._getTechPackCanvas(canvas.name);
        if (techpackCanvas) {
          techpackCanvas.material = canvas.material;
        }
      } else {
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
    }
    this._isReadyForScreenshot = true;
  }, 2000);

  prepareForTechpack = async () => {
    if (this._artworkUrl) {
      await this._returnWhenReady();
      const copy = await this._internalWorkingCanvas2D.clone(['elements']);
      copy.backgroundColor = 'rgba(0, 0, 0, 0)';
      const original = copy.toCanvasElement();
      const texture = new THREE.CanvasTexture(original);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
      texture.colorSpace = THREE.SRGBColorSpace;
      (this._techPackCanvas.material as THREE.MeshPhysicalMaterial).setValues({
        map: texture,
      });
    }
  };

  prepareForScreenshot = async () => {
    if (this._artworkUrl) {
      await this._returnWhenReady();
    }
  };

  private _returnWhenReady = async () => {
    return new Promise((res) => {
      const check = () => {
        if (this._isReadyForScreenshot) {
          return res(true);
        }
        setTimeout(check, 100);
      };

      check();
    });
  };

  getImageParts = async () => {
    if (this._artworkUrl) {
      const imagePartUrls = await ImageHelper.generateImageParts(
        this._artworkUrl,
        this._workingColors,
      );
      return imagePartUrls.map((uri, index) => {
        const textureApplication = this._textureApplication.find((v) =>
          Utils.testHexMatch(v.color, Utils.rgb2hex(this._workingColors[index])),
        );
        return {
          uri,
          textureOption: textureApplication?.textureOption ?? TextureOption.Matte,
          color: Utils.rgb2hex(this._workingColors[index]),
        };
      });
    }
    return [];
  };

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
        this._applyDefaultMatteMaterial(geo, textures[index]);
      } else {
        used.add(entryIndex);
        const entry = this._textureApplication[entryIndex];
        switch (entry.textureOption) {
          case TextureOption.Metallic:
            this._applyMetallicMaterial(geo, colors[index], textures[index]);
            break;
          case TextureOption.Matte:
            this._applyDefaultMatteMaterial(geo, textures[index]);
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
      depthTest: true,
      depthWrite: false,
    });
    geo.material = material;
    geo.userData.texture = TextureOption.Glitter;
    const techpackCanvas = this._getTechPackCanvas(geo.name);
    if (techpackCanvas) {
      techpackCanvas.material = geo.material;
    }
  }

  private _applyMetallicMaterial(geo: THREE.Mesh, color: string, texture: THREE.Texture): void {
    const material = this._canvasMaterial.clone();
    material.setValues({
      color: `#${color}`,
      metalness: 0.7,
      roughness: 0.35,
      opacity: 1,
      map: texture,
    });
    geo.material = material;
    geo.userData.texture = TextureOption.Metallic;
    const techpackCanvas = this._getTechPackCanvas(geo.name);
    if (techpackCanvas) {
      techpackCanvas.material = geo.material;
    }
  }

  private _applyDefaultMatteMaterial(geo: THREE.Mesh, texture: THREE.Texture): void {
    const material = new THREE.MeshBasicMaterial({
      opacity: 1,
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    geo.material = material;
    geo.userData.texture = TextureOption.Matte;
    const techpackCanvas = this._getTechPackCanvas(geo.name);
    if (techpackCanvas) {
      techpackCanvas.material = geo.material;
    }
  }

  private async _applyCrystalsMaterial(
    geo: THREE.Mesh,
    color: string,
    texture: THREE.Texture,
  ): Promise<void> {
    const normalMap = Boundary.crystalNormalTexture.clone();
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
    const alphaMap = Boundary.crystalAlphaTexture.clone();
    alphaMap.wrapS = THREE.RepeatWrapping;
    alphaMap.wrapT = THREE.RepeatWrapping;
    alphaMap.repeat.set(Math.sign(this._normalUV.x), -Math.sign(this._normalUV.y));
    const material = this._canvasMaterial.clone();
    material.setValues({
      opacity: 1,
      color: `#${color}`,
      metalness: 0.7,
      roughness: 0.35,
      map: texture,
      normalMap,
      alphaMap,
      transparent: true,
    });
    geo.material = material;
    geo.userData.texture = TextureOption.Crystals;
    const techpackCanvas = this._getTechPackCanvas(geo.name);
    if (techpackCanvas) {
      techpackCanvas.material = geo.material;
    }
  }

  resetBoundary = async () => {
    this.resetTextureApplication();
    this._artworkUrl = '';
    Utils3D.disposeMaps(this._canvasMaterial);
    this._canvasMaterial.setValues({
      map: null,
      normalMap: null,
      alphaMap: null,
    });
    this._clearCanvasList();
  };

  disposeCanvas2D = async () => {
    this._internalWorkingCanvas2D.clear();
  };

  hasArtwork = () => {
    return !!this._artworkUrl;
  };

  get artworkURL() {
    return this._artworkUrl;
  }

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
    this._techPackCanvasList.forEach((v) => (v.visible = value));
    // this._normalUVHelper.visible = value;
  };

  applyTextureApplication = async (textureApplication: {
    color: string;
    textureOption: TextureOption;
  }) => {
    this._isReadyForScreenshot = false;
    const index = this._textureApplication.findIndex((v) =>
      Utils.testHexMatch(textureApplication.color, v.color),
    );
    if (index === -1) {
      this._textureApplication = this._textureApplication.concat(textureApplication);
    } else {
      this._textureApplication.splice(index, 1, textureApplication);
    }
    await this._renderCanvasOnBoundary();
  };

  resetTextureApplication = async () => {
    this._isReadyForScreenshot = false;
    this._textureApplication = [];
    await this._renderCanvasOnBoundary();
  };

  get isReadyForScreenshot() {
    return this._isReadyForScreenshot;
  }
}
