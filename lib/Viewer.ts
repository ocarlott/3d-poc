import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextureOption } from './type';
import CameraControls from 'camera-controls';
import { ImageHelper } from './core/ImageHelper';
import { Utils } from './Utils';
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

  constructor(canvas: HTMLCanvasElement) {
    this._uiManager = new UIManager(canvas, this._onCanvasSizeUpdated);

    this._scene = SceneBuilder.createScene();
    this._camera = SceneBuilder.createCamera(this._uiManager.aspectRatio);
    this._renderer = SceneBuilder.createRenderer(canvas);
    this._lightManager = new LightManager();

    this._cameraControlsManager = new CameraControlsManager(canvas, this._camera, {
      lockPolarAngle: true,
    });

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

    this._renderer.setSize(canvasWidth, canvasHeight);
    this._renderer.setPixelRatio(pixelRatio);
  };

  private static getRendererHeight(renderer: THREE.WebGLRenderer) {
    return renderer?.getSize(new THREE.Vector2()).height ?? 0;
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
  };

  private _generateViewerCopy = ({
    sceneBackground = new THREE.Color('#f5f5f5'),
  }: { sceneBackground?: THREE.Color | null } = {}) => {
    const renderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
      antialias: true,
      alpha: true,
    });
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const newScene = new THREE.Scene();
    newScene.background = sceneBackground || null;
    newScene.add(this._lightManager.getLightGroup().clone());

    const newGroupManager = this._groupManager.clone();

    newScene.add(newGroupManager.modelGroup);

    renderer.setSize(this._uiManager.canvasWidth, this._uiManager.canvasHeight);
    renderer.setPixelRatio(this._uiManager.pixelRatio);
    return {
      renderer,
      scene: newScene,
      modelGroup: newGroupManager.modelGroup,
      workingAssetGroup: newGroupManager.workingAssetGroup,
      techPackGroup: newGroupManager.techPackGroup,
      shadowPlane: newGroupManager.shadowPlane,
    };
  };

  private _takeScreenShot = async (params: {
    modelRatio: number;
    rotations: {
      azimuthAngle?: number;
      polarAngle?: number;
    }[];
  }) => {
    const { rotations, modelRatio } = params;

    const camera = this._camera.clone();
    const { renderer, scene, workingAssetGroup } = this._generateViewerCopy({
      sceneBackground: null,
    });

    const controlsManager = new CameraControlsManager(renderer.domElement, camera);
    controlsManager.paddingInCssPixelAndMoveControl({
      rendererHeight: Viewer3D.getRendererHeight(renderer),
      obj: workingAssetGroup,
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
    });

    const images: string[] = [];
    for (let rotation of rotations) {
      controlsManager.rotateTo(rotation);
      controlsManager.update(this._clock);
      renderer.render(scene, camera);
      const imgData = await ImageHelper.cropImageToRatio(
        renderer.domElement.toDataURL(strMime),
        modelRatio,
      );
      images.push(imgData);
    }
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
          this._layerManager.loadLayer(castedChild);
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
  ) => {
    controlsManager.fitToBounds({
      obj: target,
      padding: {
        bottom: 0.5,
        left: 0.5,
        right: 0.5,
        top: 0.5,
      },
      transition: false,
    });
    const { size } = Utils3D.getSizeAndCenter(target);
    const ratio = Math.abs(size.x / size.z);
    controlsManager.update(this._clock);
    renderer.render(scene, camera);
    const img = await ImageHelper.cropImageToRatio(renderer.domElement.toDataURL(strMime), ratio);

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
    this._groupManager.resetAllColorsToDefault();
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
          const { size } = Utils3D.getSizeAndCenter(this._groupManager.workingAssetGroup!);

          this._cameraControlsManager.setDistanceLimitsFromSize(size);

          this._axesHelper = new THREE.AxesHelper(Math.max(size.x, size.y, size.z) / 2 + 2);
          this._axesHelper.visible = false;
          this._scene.add(this._axesHelper);

          this._modelRatio = Math.abs(size.x / size.y);
          this._model = obj;

          this._scene.add(this._groupManager.modelGroup);
          onProgress(100);
          resolve();
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
      shouldShowOriginalArtwork?: boolean;
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
          shouldShowOriginalArtwork,
        }) => {
          await this.changeArtwork(
            {
              artworkUrl,
              boundary: boundaryName,
              xRatio,
              yRatio,
              rotation,
              sizeRatio,
              shouldShowOriginalArtwork,
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
    const screenshots = await this.takeScreenShotAuto();
    const techpackImages = await this.createTechPack();
    this._boundaryManager.removeAllBoundaryArtworks();
    this._groupManager.resetAllColorsToDefault();
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
      shouldShowOriginalArtwork?: boolean;
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

  takeScreenShot = async () => {
    const { azimuthAngle, polarAngle } = this._cameraControlsManager.controls;
    const [image] = await this._takeScreenShot({
      modelRatio: this._modelRatio,
      rotations: [
        {
          azimuthAngle,
          polarAngle,
        },
      ],
    });
    return image;
  };

  takeScreenShotAt = async (azimuthAngle: number) => {
    const [image] = await this._takeScreenShot({
      modelRatio: this._modelRatio,
      rotations: [
        {
          azimuthAngle,
        },
      ],
    });
    return image;
  };

  takeScreenShotAuto = async (count = 4) => {
    const rotations = Utils.getEqualAngleRotations(count).map((azimuthAngle) => ({
      azimuthAngle,
    }));

    return await this._takeScreenShot({
      modelRatio: this._modelRatio,
      rotations: rotations,
    });
  };

  createTechPack = async () => {
    const camera = this._camera.clone();

    await this._boundaryManager.prepareForTechpack();

    const { renderer, scene, techPackGroup, workingAssetGroup, shadowPlane, modelGroup } =
      this._generateViewerCopy({ sceneBackground: new THREE.Color('rgba(0, 0, 0, 0)') });
    // scene.background = new THREE.Color('rgba(0, 0, 0, 0)');
    renderer.toneMappingExposure = 5;
    const controlsManager = new CameraControlsManager(renderer.domElement, camera);
    controlsManager.rotateTo({
      azimuthAngle: 0,
      polarAngle: 0,
    });
    controlsManager.paddingInCssPixelAndMoveControl({
      rendererHeight: Viewer3D.getRendererHeight(renderer),
      obj: workingAssetGroup,
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
    });

    const result: { name: string; image: string }[] = [];
    if (techPackGroup && workingAssetGroup) {
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
      workingAssetGroup.visible = false;
      if (shadowPlane) {
        shadowPlane.visible = false;
      }
      modelGroup.traverse((child) => {
        if (this._layerManager.isExtraLayer(child.name)) {
          child.visible = false;
        }
      });

      const img = await this._captureTechPackImage(
        renderer,
        scene,
        camera,
        controlsManager,
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
          renderer,
          scene,
          camera,
          controlsManager,
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
    }
    return result;
  };

  getBoundary = (name: string) => this._boundaryManager.findByName(name);

  prepareFilesToExport = async () => {
    const result = await this.createTechPack();
    const screenshots = await this.takeScreenShotAuto(6);
    screenshots.forEach((sc, index) => {
      result.push({
        name: `screenshot_${index + 1}`,
        image: sc,
      });
    });
    const artworks = await Promise.all(
      this._boundaryManager.boundaryList
        .filter((bd) => bd.hasArtwork())
        .map((bd) => {
          return ImageHelper.resize(bd.artworkURL, 400);
        }),
    );
    artworks.forEach((artwork, index) => {
      result.push({
        name: `artwork_${index + 1}`,
        image: artwork,
      });
    });
    return result;
  };
}
