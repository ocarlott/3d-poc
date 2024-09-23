import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextureOption } from './type';
import CameraControls from 'camera-controls';
import { ImageHelper } from './core/ImageHelper';
import { PointToInchesRatio, Utils } from './Utils';
import { LightManager } from './managers/LightManager';
import { SceneBuilder } from './managers/SceneBuilder';
import { SizeUpdateParams, UIManager } from './managers/UIManager';
import { CameraControlsManager } from './managers/CameraControlsManager';
import { GroupManager } from './managers/GroupManager';
import { BoundaryManager } from './managers/BoundaryManager';
import { LayerManager } from './managers/LayerManager';
import { Utils3D } from './Utils3D';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

const strMime = 'image/webp';
export class Viewer3D {
  private _rFID = -1;
  private _camera: THREE.PerspectiveCamera;
  private _scene: THREE.Scene = new THREE.Scene();
  private _renderer: THREE.WebGLRenderer;
  private _lightManager: LightManager;
  private _cameraControlsManager: CameraControlsManager;
  private _uiManager: UIManager;
  private _groupManager: GroupManager;
  private _boundaryManager: BoundaryManager;
  private _layerManager: LayerManager;
  private _model?: THREE.Object3D;

  private _loader = new GLTFLoader();
  private _isInDeveloperMode = false;
  private _shouldRotate = false;
  private _modelRatio = 1;
  private _clock = new THREE.Clock();
  private _axesHelper = new THREE.AxesHelper(1);
  private _stationaryScreenshotCameras: THREE.PerspectiveCamera[] = [];
  private _stationaryScreenshotCameraManagers: CameraControlsManager[] = [];
  private _rotatableScreenshotCamera: THREE.PerspectiveCamera;
  private _rotatableScreenshotCameraManager: CameraControlsManager;
  private _techpackCamera: THREE.PerspectiveCamera;
  private _techpackCameraManager: CameraControlsManager;
  private _canvas: HTMLCanvasElement;
  private _opacityForUncoloredLayer = 1;

  constructor(
    canvas: HTMLCanvasElement,
    options?: {
      opacityForUncoloredLayer?: number;
    },
  ) {
    this._opacityForUncoloredLayer = options?.opacityForUncoloredLayer ?? 1;
    this._uiManager = new UIManager(canvas, this._onCanvasSizeUpdated);
    this._canvas = canvas;
    this._scene = SceneBuilder.createScene();

    this._camera = SceneBuilder.createCamera(this._uiManager.aspectRatio);
    this._stationaryScreenshotCameras = SceneBuilder.createStationaryScreenshotCameras(
      this._uiManager.aspectRatio,
    );
    this._rotatableScreenshotCamera = SceneBuilder.createRotatableScreenshotCamera(
      this._uiManager.aspectRatio,
    );
    this._techpackCamera = SceneBuilder.createRotatableScreenshotCamera(
      this._uiManager.aspectRatio,
    );

    this._renderer = SceneBuilder.createRenderer(this._scene, {
      withDrawingBuffer: false,
      canvas,
    });

    this._lightManager = new LightManager();

    this._cameraControlsManager = new CameraControlsManager(canvas, this._camera, {
      lockPolarAngle: true,
    });
    this._stationaryScreenshotCameraManagers = this._stationaryScreenshotCameras.map(
      (camera) => new CameraControlsManager(canvas, camera),
    );
    this._rotatableScreenshotCameraManager = new CameraControlsManager(
      canvas,
      this._rotatableScreenshotCamera,
    );
    this._techpackCameraManager = new CameraControlsManager(canvas, this._techpackCamera);

    this._groupManager = new GroupManager();
    this._boundaryManager = new BoundaryManager();
    this._layerManager = new LayerManager();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderConfig({ type: 'js' });
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    this._loader.setDRACOLoader(dracoLoader);

    this._scene.add(this._lightManager.getLightGroup(), this._lightManager.getLightGroupHelper());
    this.show();
  }

  private _onCanvasSizeUpdated = ({
    pixelRatio,
    aspectRatio,
    canvasWidth,
    canvasHeight,
  }: SizeUpdateParams) => {
    this._camera.aspect = aspectRatio;
    this._camera.updateProjectionMatrix();

    this._stationaryScreenshotCameras.forEach((camera) => {
      camera.aspect = aspectRatio;
      camera.updateProjectionMatrix();
    });

    this._rotatableScreenshotCamera.aspect = aspectRatio;
    this._rotatableScreenshotCamera.updateProjectionMatrix();

    this._techpackCamera.aspect = aspectRatio;
    this._techpackCamera.updateProjectionMatrix();

    this._renderer.setSize(canvasWidth, canvasHeight);
    this._renderer.setPixelRatio(pixelRatio);
  };

  private static getRendererHeight(renderer: THREE.WebGLRenderer) {
    return renderer.getSize(new THREE.Vector2()).height;
  }

  private _fitCameraToObject = (obj: THREE.Object3D, controls?: CameraControls) => {
    this._cameraControlsManager.paddingInCssPixelAndMoveControl({
      rendererHeight: Viewer3D.getRendererHeight(this._renderer),
      obj,
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
      rotationTo: {
        polarAngle: Math.PI * 0.5,
      },
      transition: false,
    });
    this._stationaryScreenshotCameraManagers.forEach((controls, index) => {
      controls.paddingInCssPixelAndMoveControl({
        rendererHeight: Viewer3D.getRendererHeight(this._renderer),
        obj,
        padding: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        },
        rotationTo: {
          polarAngle: Math.PI * 0.5,
          azimuthAngle: Math.PI / 4 + (Math.PI / 2) * index,
        },
        transition: false,
      });
    });
    this._rotatableScreenshotCameraManager.paddingInCssPixelAndMoveControl({
      rendererHeight: Viewer3D.getRendererHeight(this._renderer),
      obj,
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
      rotationTo: {
        polarAngle: Math.PI * 0.5,
      },
      transition: false,
    });
  };

  private _takeScreenShot = (params: {
    modelRatio: number;
    rotation: {
      azimuthAngle?: number;
      polarAngle?: number;
    };
    colorMap?: { layerName: string; color: string }[];
  }) => {
    const { rotation, modelRatio, colorMap } = params;

    const images: string[] = [];
    const renderSize = this._renderer
      .getSize(new THREE.Vector2())
      .multiplyScalar(this._renderer.getPixelRatio());
    const renderRatio = renderSize.width / renderSize.height;
    const shouldUseWidth = renderRatio < modelRatio;
    let finalWidth = Math.floor(shouldUseWidth ? renderSize.width : renderSize.height * modelRatio);
    let finalHeight = Math.floor(
      shouldUseWidth ? renderSize.width / modelRatio : renderSize.height,
    );

    const sourceX = Math.floor((this._canvas.width - finalWidth) / 2);
    const sourceY = Math.floor((this._canvas.height - finalHeight) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const context = canvas.getContext('2d')!;
    this._appyColorTemporarilyForScreenshot(() => {
      this._rotatableScreenshotCameraManager.paddingInCssPixelAndMoveControl({
        rendererHeight: renderSize.height,
        obj: this._groupManager.workingAssetGroup,
        padding: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });
      this._rotatableScreenshotCameraManager.rotateTo(rotation, false);
      this._rotatableScreenshotCameraManager.update(this._clock);

      this._renderer.render(this._scene, this._rotatableScreenshotCamera);
      context.drawImage(
        this._canvas,
        sourceX,
        sourceY,
        finalWidth,
        finalHeight,
        0,
        0,
        finalWidth,
        finalHeight,
      );
      const imgData = canvas.toDataURL(strMime, 1);
      images.push(imgData);
    }, colorMap);
    this._renderer.render(this._scene, this._rotatableScreenshotCamera);

    return images;
  };

  private _parseForLayersAndBoundaries(allModelObjects: THREE.Mesh[]) {
    allModelObjects.forEach((child) => {
      const castedChild = child as THREE.Mesh;
      const castedChildMaterial = castedChild.material as THREE.MeshPhysicalMaterial;
      if (castedChild.isMesh && GroupManager.isBoundary(castedChild)) {
        castedChildMaterial.setValues({
          transparent: true,
          opacity: 0,
          map: null,
        });
      }

      if (GroupManager.isNotTechPack(castedChild)) {
        if (castedChild.isMesh && GroupManager.isBoundary(castedChild)) {
          const techPackBoundary: THREE.Mesh | null =
            this._groupManager.findTechpackEquivalentByName(castedChild.name) ?? null;

          this._boundaryManager.loadBoundary(castedChild, techPackBoundary);
        } else {
          this._layerManager.loadLayer(castedChild, this._opacityForUncoloredLayer);
        }
      }
    });
  }

  private _captureTechPackImage = async (
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    controlsManager: CameraControlsManager,
    target: THREE.Object3D,
    padding: number = 0.5,
  ) => {
    controlsManager.fitToBounds({
      obj: target,
      padding: {
        bottom: padding,
        left: padding,
        right: padding,
        top: padding,
      },
      transition: false,
    });
    const { size } = Utils3D.getSizeAndCenter(target);
    const ratio = Math.abs(size.x / size.z);
    controlsManager.update(this._clock);
    renderer.render(scene, camera);
    const rawImage = renderer.domElement.toDataURL(strMime);
    renderer.render(scene, this._camera);
    const img = await ImageHelper.cropImageToRatio(rawImage, ratio);
    return img;
  };

  show = () => {
    this._cameraControlsManager.update(this._clock);
    this._groupManager.update(this._shouldRotate);

    this._renderer.render(this._scene, this._camera);

    this._rFID = requestAnimationFrame(this.show);
  };

  hide = () => {
    cancelAnimationFrame(this._rFID);
    this._rFID = -1;
  };

  resetModel = () => {
    this.resetAllColorsToDefault();
    this.resetAllBoundaries();
  };

  resetAllColorsToDefault = () => {
    this._groupManager.resetAllColorsToDefault(this._opacityForUncoloredLayer);
  };

  resetAllBoundaries = () => {
    this._boundaryManager.resetAllBoundarys();
  };

  loadModel = (url: string, onProgress: (percent: number) => void): Promise<void> => {
    this._model = undefined;
    this._scene.remove(this._groupManager.modelGroup);
    this._groupManager.reinit({ isInDeveloperMode: this._isInDeveloperMode });
    this._boundaryManager.resetBoundaryList();
    this._layerManager.clearLayerMap();

    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          const obj = gltf.scene;

          const allModelObjects: THREE.Mesh[] = [];
          obj.traverse((child) => allModelObjects.push(child as THREE.Mesh));

          this._groupManager.load(obj, allModelObjects);
          this._parseForLayersAndBoundaries(allModelObjects);
          this._groupManager.setBoundaries(this._boundaryManager.boundaryList);
          this._boundaryManager.organizeGroup();

          this._fitCameraToObject(this._groupManager.workingAssetGroup!);
          const { size, min } = Utils3D.getSizeAndCenter(this._groupManager.workingAssetGroup!);

          this._cameraControlsManager.lockDistanceLimits();
          this._techpackCameraManager.controls.moveTo(0, min.y, 0);
          this._techpackCameraManager.paddingInCssPixelAndMoveControl({
            rendererHeight: Viewer3D.getRendererHeight(this._renderer),
            obj: this._groupManager.techPackGroup,
            padding: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            },
          });

          this._axesHelper = new THREE.AxesHelper(Math.max(size.x, size.y, size.z) / 2 + 2);
          this._axesHelper.visible = false;
          this._scene.add(this._axesHelper);

          this._modelRatio = Math.abs(Math.max(size.x, size.z) / size.y);
          this._model = obj;

          this._scene.add(this._groupManager.modelGroup);
          const { layerNames } = this._groupManager.getChildNamesListSnapshot();
          const firstLayer = this._groupManager.findByName(layerNames[0]);
          if (firstLayer) {
            firstLayer.onAfterRender = () => {
              onProgress(100);
              resolve();
              firstLayer.onAfterRender = () => {};
            };
          } else {
            onProgress(100);
            resolve();
          }
        },
        (event) => {
          onProgress(Math.min((event.loaded / event.total) * 100, 95));
        },
        (error) => {
          console.error(error);
          reject();
        },
      );
    });
  };

  addEventListeners = (options: {
    onArtworkChanged: (params: {
      forBoundary: string;
      xRatio: number;
      yRatio: number;
      whRatio: number;
      sizeRatio: number;
      rotation: number;
    }) => void;
  }) => {
    const { onArtworkChanged } = options;
    this._boundaryManager.updateListeners(onArtworkChanged);
  };

  toggleDeveloperMode = () => {
    this._isInDeveloperMode = !this._isInDeveloperMode;
    this._groupManager.setDeveloperMode(this._isInDeveloperMode);
    this._lightManager.setDeveloperMode(this._isInDeveloperMode);
    this._cameraControlsManager.setDevMode(this._isInDeveloperMode);
    this._boundaryManager.setDeveloperMode(this._isInDeveloperMode);
    this._axesHelper.visible = this._isInDeveloperMode;
  };

  configureModel = async (options: {
    colorMap: { layerName: string; color: string }[];
    artworkMap: {
      boundaryName: string;
      artworkUrl: string;
      textureApplication?: { color: string; textureOption: TextureOption }[];
      xRatio?: number;
      yRatio?: number;
      rotation?: number;
      sizeRatio?: number;
      sizeRatioLimit?: number;
      shouldShowOriginalArtwork?: boolean;
      sensitivity?: number;
    }[];
    disableEditing?: boolean;
  }) => {
    const { colorMap, artworkMap, disableEditing = true } = options;
    colorMap.forEach((colorConfig) => {
      this.changeColor(colorConfig.layerName, colorConfig.color);
    });
    await Promise.all(
      artworkMap.map(
        async ({
          artworkUrl,
          textureApplication = [],
          boundaryName,
          xRatio,
          yRatio,
          rotation,
          sizeRatio,
          sizeRatioLimit,
          shouldShowOriginalArtwork,
          sensitivity,
        }) => {
          await this.changeArtwork(
            {
              artworkUrl,
              boundary: boundaryName,
              xRatio,
              yRatio,
              rotation,
              sizeRatio,
              sizeRatioLimit,
              shouldShowOriginalArtwork,
              sensitivity,
            },
            disableEditing,
          );
          return await Promise.all(
            textureApplication.map(async (app) => {
              return this.changeArtworkTexture(boundaryName, app.color, app.textureOption);
            }),
          );
        },
      ),
    );
  };

  validate = (layers: string[], boundaries: string[]) => {
    const allLayersFound = this._layerManager.validateIfAllExists(layers);
    const allBoundariesFound = this._boundaryManager.validateIfAllExists(boundaries);
    return allLayersFound && allBoundariesFound;
  };

  validateModel = async (artworkUrl = './logo.png') => {
    this._layerManager.validateLayersModel();

    const { boundaryNames, techPackNames, layerNames } =
      this._groupManager.getChildNamesListSnapshot();

    const materialMap = new Map<
      number,
      {
        hasError: boolean;
        meshes: string[];
      }
    >();
    const materialMatches: {
      boundaryName: string;
      result: boolean;
    }[] = [];
    boundaryNames.forEach((bd) => {
      const bdMaterial = this._groupManager.findByName(bd)!.material as THREE.MeshStandardMaterial;
      const techpackName = GroupManager.formTechpackName(bd);
      const techpack = this._groupManager.findByName(techpackName);
      const techpackMaterial = techpack?.material as THREE.MeshStandardMaterial | undefined;

      if (!techpack || !techpackMaterial) {
        materialMatches.push({
          boundaryName: bd,
          result: false,
        });
        materialMap.set(bdMaterial.id, {
          hasError: materialMap.has(bdMaterial.id),
          meshes: [...(materialMap.get(bdMaterial.id)?.meshes ?? []), bd],
        });
      } else {
        materialMatches.push({
          boundaryName: bd,
          result: bdMaterial.id === techpackMaterial.id,
        });
        materialMap.set(bdMaterial.id, {
          hasError: materialMap.has(bdMaterial.id),
          meshes: [...(materialMap.get(bdMaterial.id)?.meshes ?? []), bd, techpackName],
        });
      }
    });

    await this._boundaryManager.testChangeAllBoundaryArtworks(artworkUrl);
    const screenshots = this.takeScreenShotAuto();
    const techpackImages = await this.createTechPack();
    this._boundaryManager.removeAllBoundaryArtworks();
    this._groupManager.resetAllColorsToDefault(this._opacityForUncoloredLayer);
    return {
      boundaries: boundaryNames,
      techPacks: techPackNames,
      layers: layerNames,
      screenshots,
      techpackImages,
      materialMatches,
      materialErrors: Array.from(materialMap.values())
        .filter((item) => item.hasError)
        .map((item) => item.meshes),
    };
  };

  unselectBoundary = () => {
    this._boundaryManager.unselectBoundary();
  };

  changeArtwork = async (
    options: {
      boundary: string;
      artworkUrl: string;
      xRatio?: number;
      yRatio?: number;
      rotation?: number;
      sizeRatio?: number;
      sizeRatioLimit?: number;
      shouldShowOriginalArtwork?: boolean;
      sensitivity?: number;
    },
    disableEditing = true,
  ) => {
    return this._boundaryManager.changeArtwork(options, disableEditing);
  };

  resetArtworkToDefault = (boundary: string) => {
    return this._boundaryManager.resetArtworkToDefault(boundary);
  };

  removeArtwork = (boundary: string) => {
    return this._boundaryManager.removeArtwork(boundary);
  };

  resetArtworkTextureToDefault = (boundary: string) => {
    return this._boundaryManager.resetArtworkTextureToDefault(boundary);
  };

  changeArtworkTexture = (boundary: string, color: string, textureOption: TextureOption) => {
    return this._boundaryManager.changeArtworkTexture(boundary, color, textureOption);
  };

  resetArtworkTexture = (boundary: string) => {
    return this._boundaryManager.resetArtworkTexture(boundary);
  };

  exportData = () => {
    return this._boundaryManager.exportData();
  };

  toggleAutoRotate = () => {
    this._shouldRotate = !this._shouldRotate;
  };

  changeColor = (layerName: string, color: string) => {
    if (this._model) {
      this._layerManager.changeLayerColor(layerName, color);
    }
  };

  takeScreenShot = (colorMap?: { layerName: string; color: string }[]) => {
    const { azimuthAngle, polarAngle } = this._cameraControlsManager.controls;
    const [image] = this._takeScreenShot({
      modelRatio: this._modelRatio,
      rotation: {
        azimuthAngle,
        polarAngle,
      },
      colorMap,
    });
    return image;
  };

  takeScreenShotAt = (azimuthAngle: number, colorMap?: { layerName: string; color: string }[]) => {
    const [image] = this._takeScreenShot({
      modelRatio: this._modelRatio,
      rotation: {
        azimuthAngle,
      },
      colorMap,
    });
    return image;
  };

  takeScreenShotAuto = (count = 4, colorMap?: { layerName: string; color: string }[]) => {
    const images: string[] = [];

    this._appyColorTemporarilyForScreenshot(() => {
      this._stationaryScreenshotCameraManagers.forEach((controls) => {
        controls.paddingInCssPixelAndMoveControl({
          rendererHeight: Viewer3D.getRendererHeight(this._renderer),
          obj: this._groupManager.workingAssetGroup,
          padding: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
        });
        controls.update(this._clock);
      });

      this._stationaryScreenshotCameras.forEach((camera) => {
        this._renderer.render(this._scene, camera);
        const imgData = this._canvas.toDataURL(strMime, 1);
        images.push(imgData);
      });
    }, colorMap);

    return images;
  };

  private _appyColorTemporarilyForScreenshot = (
    cb: () => void,
    colorMap?: { layerName: string; color: string }[],
  ) => {
    const newImage = this._createScreenshotImage();
    this._renderer.domElement.parentElement?.prepend(newImage);
    const originalBackgroundColor = this._scene.background;
    this._scene.background = null;
    if (!colorMap || colorMap.length === 0) {
      cb();
    } else {
      const currentColorMaps = colorMap.map((config) => {
        const result = this._layerManager.findByName(config.layerName);
        if (result) {
          const layer = result.mesh;
          const originalColor = (layer.material as THREE.MeshStandardMaterial).color.getHex();
          (layer.material as THREE.MeshStandardMaterial).color.set(
            `#${config.color.replace(/#/g, '')}`,
          );
          return {
            layer,
            layerName: config.layerName,
            originalColor,
          };
        }
        return null;
      });
      cb();
      currentColorMaps.forEach((config) => {
        if (config) {
          (config.layer.material as THREE.MeshStandardMaterial).color.setHex(config.originalColor);
        }
      });
    }
    this._scene.background = originalBackgroundColor;
    this._renderer.domElement.parentElement?.removeChild(newImage);
  };

  private _createScreenshotImage = () => {
    this._renderer.render(this._scene, this._camera);
    const img = this._renderer.domElement.toDataURL(strMime, 1);
    const newImage = document.createElement('img');
    newImage.style.position = 'absolute';
    newImage.style.top = '0';
    newImage.style.left = '0';
    newImage.style.width = `${this._uiManager.canvasWidth}px`;
    newImage.style.height = `${this._uiManager.canvasHeight}px`;
    newImage.style.zIndex = '1000';
    newImage.src = img;
    return newImage;
  };

  createTechPack = async () => {
    await this._boundaryManager.prepareForTechpack();
    const newImage = this._createScreenshotImage();
    this._renderer.domElement.parentElement?.prepend(newImage);
    const techPackGroup = this._groupManager.techPackGroup;
    const workingAssetGroup = this._groupManager.workingAssetGroup;
    const shadowPlane = this._groupManager.shadowPlane;
    const modelGroup = this._groupManager.modelGroup;

    const result: { name: string; image: string }[] = [];
    if (techPackGroup && workingAssetGroup) {
      const originalBackground = this._scene.background;
      this._scene.background = null;
      techPackGroup.visible = true;

      techPackGroup.children.forEach((child) => {
        if (child.isObject3D) {
          const originalMaterial = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
          if (GroupManager.isBoundary(child)) {
            const boundary = this._boundaryManager.findByTechpackName(child.name);
            (child as THREE.Mesh).material = originalMaterial.clone();
            ((child as THREE.Mesh).material as THREE.MeshPhysicalMaterial).setValues({
              opacity: boundary?.hasArtwork() ? 1 : 0,
            });
          } else {
            originalMaterial.setValues({
              color: 'white',
              opacity: 0.5,
            });
          }
        }
      });

      if (shadowPlane) {
        shadowPlane.visible = false;
      }
      modelGroup.traverse((child) => {
        if (this._layerManager.isExtraLayer(child.name)) {
          child.visible = false;
        }
      });
      workingAssetGroup.visible = false;

      const img = await this._captureTechPackImage(
        this._renderer,
        this._scene,
        this._techpackCamera,
        this._techpackCameraManager,
        techPackGroup,
      );
      result.push({
        name: 'whole',
        image: img,
      });

      const layerList = techPackGroup.children.filter((child) => child.name.includes('changeable'));
      layerList.forEach((child) => (child.visible = false));

      for (let child of layerList) {
        child.visible = true;
        const img = await this._captureTechPackImage(
          this._renderer,
          this._scene,
          this._techpackCamera,
          this._techpackCameraManager,
          child,
        );
        const name = child.name.replace('_flat', '');
        const displayName = Utils.getDisplayNameIfChangeableGroup(name);
        result.push({
          name: displayName?.displayName?.toLowerCase()?.replace(' ', '_') || name,
          image: img,
        });

        child.visible = false;
      }

      layerList.forEach((child) => (child.visible = true));

      techPackGroup.visible = false;
      workingAssetGroup.visible = true;
      if (shadowPlane) {
        shadowPlane.visible = true;
      }
      modelGroup.traverse((child) => {
        if (this._layerManager.isExtraLayer(child.name)) {
          child.visible = true;
        }
      });
      this._scene.background = originalBackground;
      this._renderer.render(this._scene, this._camera);
      this._renderer.domElement.parentElement?.removeChild(newImage);
    }

    return result;
  };

  getBoundary = (name: string) => this._boundaryManager.findByName(name);

  prepareFilesToExport = async () => {
    await this._boundaryManager.prepareForScreenshot();
    const result: { name: string; image: string }[] = [];
    const layerColors = Array.from(this._layerManager.layerMap.keys()).map((layerName) => {
      return {
        layerName,
        color: '#ffffff',
      };
    });
    const screenshots = this.takeScreenShotAuto(6, layerColors);
    screenshots.forEach((sc, index) => {
      result.push({
        name: `screenshot_${index + 1}`,
        image: sc,
      });
    });
    const techpacks = await this.createTechPack();
    result.push(...techpacks);
    const artworks = await Promise.all(
      this._boundaryManager.boundaryList
        .filter((bd) => bd.hasArtwork())
        .map(async (bd) => {
          const image = await ImageHelper.resize(bd.artworkURL, 400);
          return {
            image,
            name: Utils.getDisplayNameIfBoundary(bd.name) ?? 'boundary',
          };
        }),
    );
    artworks.forEach((artwork) => {
      result.push({
        name: `artwork_${artwork.name.toLowerCase()}`,
        image: artwork.image,
      });
    });

    const artworkParts = await Promise.all(
      this._boundaryManager.boundaryList
        .filter((bd) => bd.hasArtwork())
        .map(async (bd) => {
          const parts = await bd.getImageParts();
          return parts.map((part) => {
            return {
              image: part.uri,
              name: `artwork_${
                Utils.getDisplayNameIfBoundary(bd.name) ?? 'boundary'
              }_${part.textureOption.toLowerCase()}_texture_${part.color.toLowerCase()}_color`,
            };
          });
        }),
    );

    artworkParts.forEach((parts) => {
      parts.forEach((part) => {
        result.push(part);
      });
    });

    return result;
  };

  getModelDimensions = () => {
    const boundingBox = this._groupManager.modelBoundingBox;
    return {
      width: (boundingBox.max.x - boundingBox.min.x) / PointToInchesRatio,
      height: (boundingBox.max.y - boundingBox.min.y) / PointToInchesRatio,
      depth: (boundingBox.max.z - boundingBox.min.z) / PointToInchesRatio,
    };
  };

  getAllBoundaries = () => {
    return this._boundaryManager.boundaryList;
  };
}
