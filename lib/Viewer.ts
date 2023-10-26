import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ControlName, TextureOption } from './type';
import { Boundary } from './core/Boundary';
import * as TWEEN from '@tweenjs/tween.js';
import CameraControls from 'camera-controls';
import { ImageHelper } from './core/ImageHelper';
import { Utils } from './Utils';
import { LightManager } from './managers/LightManager';
import { SceneBuilder } from './managers/SceneBuilder';
import { SizeUpdateParams, UIManager } from './managers/UIManager';
import { CameraControlsManager } from './managers/CameraControlsManager';
import { GroupManager } from './managers/GroupManager';

const strMime = 'image/png';
export class Viewer3D {
  private _rFID = -1;
  private _camera: THREE.PerspectiveCamera;
  private _scene: THREE.Scene = new THREE.Scene();
  private _renderer: THREE.WebGLRenderer;
  private _lightManager: LightManager;
  private _cameraControlsManager: CameraControlsManager;
  private _uiManager: UIManager;
  private _groupManager: GroupManager;
  private _model?: THREE.Object3D;
  private _boundaryList: Boundary[] = [];
  private _layerMap: Map<
    string,
    {
      displayName: string;
      mesh: THREE.Mesh;
    }
  > = new Map();
  private _loader = new GLTFLoader();
  private _selectedBoundary: Boundary | null = null;
  private _onArtworkChanged?: (params: {
    forBoundary: string;
    xRatio: number;
    yRatio: number;
    whRatio: number;
    sizeRatio: number;
    rotation: number;
  }) => void;
  private _isInDeveloperMode = false;
  private _shouldRotate = false;
  private _modelRatio = 1;
  private _clock = new THREE.Clock();
  private _axesHelper = new THREE.AxesHelper(1);
  private _extraLayers = new Set<string>();

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

    this._scene.background = new THREE.Color('#f1e9e9');
    this._scene.add(this._lightManager.getLightGroup());
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

  private _getSizeAndCenter = (obj: THREE.Object3D) => {
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(obj);
    let size = boundingBox.getSize(new THREE.Vector3());
    boundingBox.setFromObject(obj);
    const center = boundingBox.getCenter(new THREE.Vector3());
    return {
      size,
      center,
    };
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

  private _generateViewerCopy = () => {
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
    newScene.background = new THREE.Color('#f1e9e9');
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

  private _animateSelectBoundary = (boundary: string) => {
    const selectingBoundary = this._boundaryList.find((bd) => bd.name === boundary) ?? null;
    if (selectingBoundary?.name !== this._selectedBoundary?.name && selectingBoundary !== null) {
      this._selectedBoundary = selectingBoundary;
      const boundaryPosition = this._selectedBoundary.center;
      const boundaryNormal = this._selectedBoundary.normal;
      // this._controls.setLookAt
      // const cameraPosition = boundaryPosition
      //   .clone()
      //   .add(
      //     boundaryNormal
      //       .clone()
      //       .multiplyScalar(this._controls.maxDistance * 0.65)
      //   );
      // new TWEEN.Tween(this._camera.position)
      //   .to(cameraPosition)
      //   .easing(TWEEN.Easing.Quadratic.InOut)
      //   .onUpdate(() => {
      //     this._camera.lookAt(boundaryPosition);
      //   })
      //   .start();
    }
    return selectingBoundary;
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
    const { renderer, scene, workingAssetGroup } = this._generateViewerCopy();

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
        modelRatio
      );
      images.push(imgData);
    }
    return images;
  };

  show = () => {
    const delta = this._clock.getDelta();
    this._cameraControlsManager.update(delta);
    if (this._shouldRotate) {
      this._groupManager.animateUpdate();
    }

    this._renderer.render(this._scene, this._camera);
    this._rFID = requestAnimationFrame(this.show);
  };

  hide = () => {
    cancelAnimationFrame(this._rFID);
    this._rFID = -1;
  };

  loadModel = (url: string, onProgress: (percent: number) => void): Promise<void> => {
    this._model = undefined;
    this._scene.remove(this._groupManager.modelGroup);
    this._groupManager.reinit({ isInDeveloperMode: this._isInDeveloperMode });
    this._boundaryList = [];
    this._layerMap.clear();
    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          const obj = gltf.scene;

          const boundingBox = new THREE.Box3();
          boundingBox.setFromObject(obj);

          const allModelObjects: THREE.Mesh[] = [];
          obj.traverse((child) => allModelObjects.push(child as THREE.Mesh));

          this._groupManager.load(obj, allModelObjects);

          allModelObjects.forEach((child) => {
            const castedChild = child as THREE.Mesh;
            const castedChildMaterial = castedChild.material as THREE.MeshPhysicalMaterial;
            if (GroupManager.isNotTechPack(castedChild)) {
              if (castedChild.isMesh && GroupManager.isBoundary(castedChild)) {
                castedChildMaterial.setValues({
                  transparent: true,
                  opacity: 0,
                });

                const techPackBoundary: THREE.Mesh | null =
                  this._groupManager.findByName(GroupManager.formTechpackName(castedChild.name)) ??
                  null;
                if (!techPackBoundary) {
                  console.error(`Could not find techpack version of ${castedChild.name}`);
                } else {
                  const bd = new Boundary(castedChild, techPackBoundary);
                  this._boundaryList.push(bd);
                }
              } else {
                const displayNameForChangableGroup = Utils.getDisplayNameIfChangeableGroup(
                  castedChild.name
                );
                if (displayNameForChangableGroup) {
                  if (this._layerMap.get(displayNameForChangableGroup.groupName)) {
                    console.log('Object is not valid. Trying our best to render it');
                  } else {
                    this._layerMap.set(castedChild.name, {
                      displayName: displayNameForChangableGroup.displayName,
                      mesh: castedChild,
                    });
                  }
                } else if (castedChild.name !== ControlName.ShadowPlane) {
                  this._extraLayers.add(castedChild.name);
                }
              }
            }
          });

          this._groupManager.setBoundaries(this._boundaryList);
          this._boundaryList.forEach((child) => {
            child.organizeGroup();
          });

          this._fitCameraToObject(this._groupManager.workingAssetGroup!);
          const { size } = this._getSizeAndCenter(this._groupManager.workingAssetGroup!);

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
        }
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
    this._onArtworkChanged = onArtworkChanged;
  };

  toggleDeveloperMode = () => {
    this._isInDeveloperMode = !this._isInDeveloperMode;
    this._groupManager.setDeveloperMode(this._isInDeveloperMode);
    this._cameraControlsManager.setDevMode(this._isInDeveloperMode);
    this._boundaryList.forEach((bd) => bd.setDeveloperMode(this._isInDeveloperMode));
    this._axesHelper.visible = this._isInDeveloperMode;
  };

  configureModel = (options: {
    colorMap: { layerName: string; color: string }[];
    artworkMap: {
      boundaryName: string;
      artworkUrl: string;
      canvas?: HTMLCanvasElement;
      textureApplication?: { color: string; textureOption: TextureOption }[];
      xRatio?: number;
      yRatio?: number;
      rotation?: number;
      sizeRatio?: number;
    }[];
    disableEditing?: boolean;
  }) => {
    const { colorMap, artworkMap, disableEditing = true } = options;
    colorMap.forEach((colorConfig) => {
      this.changeColor(colorConfig.layerName, colorConfig.color);
    });
    artworkMap.forEach(
      ({
        artworkUrl,
        textureApplication = [],
        canvas,
        boundaryName,
        xRatio,
        yRatio,
        rotation,
        sizeRatio,
      }) => {
        this.changeArtwork(
          {
            artworkUrl,
            canvas,
            boundary: boundaryName,
            xRatio,
            yRatio,
            rotation,
            sizeRatio,
          },
          disableEditing
        );
        textureApplication.forEach((app) => {
          this.changeArtworkTexture(boundaryName, app.color, app.textureOption);
        });
      }
    );
  };

  validate = (layers: string[], boundaries: string[]) => {
    const allLayersFound = layers.every((layer) => !!this._layerMap.get(layer));
    const allBoundariesFound = boundaries.every(
      (boundary) => this._boundaryList.findIndex((b) => b.name === boundary) !== -1
    );
    return allLayersFound && allBoundariesFound;
  };

  validateModel = async (artworkUrl = './logo.png') => {
    const colors = Utils.getShuffledColors();

    const { boundaryNames, techPackNames, layerNames } =
      this._groupManager.getChildNamesListSnapshot();
    const layerList = Array.from(this._layerMap.values());
    layerList.forEach((layer, index) => {
      this.changeColor(layer.mesh.name, colors[index]);
    });
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
    await Promise.all(
      this._boundaryList.map((bd) => {
        return this.changeArtwork({
          boundary: bd.name,
          artworkUrl,
        });
      })
    );
    const screenshots = await this.takeScreenShotAuto();
    const techpackImages = await this.createTechPack();
    this._boundaryList.map((bd) => {
      return this.removeArtwork(bd.name);
    });
    this._groupManager.resetAllToWhite();
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
    this._selectedBoundary = null;
  };

  changeArtwork = async (
    options: {
      boundary: string;
      canvas?: HTMLCanvasElement;
      artworkUrl: string;
      xRatio?: number;
      yRatio?: number;
      rotation?: number;
      sizeRatio?: number;
    },
    disableEditing = true
  ) => {
    const {
      boundary,
      xRatio = 0.5,
      yRatio = 0.5,
      rotation = 0,
      sizeRatio = 0.5,
      artworkUrl,
      canvas,
    } = options;
    let boundaryObj: Boundary | null = null;
    if (!disableEditing) {
      boundaryObj = this._animateSelectBoundary(boundary);
    } else {
      boundaryObj = this._boundaryList.find((bd) => bd.name === boundary) ?? null;
    }
    await boundaryObj?.addArtwork({
      workingCanvas: canvas,
      artworkUrl,
      xRatio,
      yRatio,
      rotation,
      sizeRatio,
      onArtworkChanged: this._onArtworkChanged,
      disableEditing,
    });
    return boundaryObj;
  };

  resetArtworkToDefault = (boundary: string) => {
    const currentBoundary = this._selectedBoundary;
    this._animateSelectBoundary(boundary);
    // Do work
    this._selectedBoundary = currentBoundary;
  };

  removeArtwork = (boundary: string) => {
    const currentBoundary = this._selectedBoundary;
    const rBoundary = this._animateSelectBoundary(boundary);
    rBoundary?.resetBoundary();
    this._selectedBoundary = currentBoundary;
  };

  resetArtworkTextureToDefault = (boundary: string) => {
    const currentBoundary = this._selectedBoundary;
    this._animateSelectBoundary(boundary);
    // Do work
    this._selectedBoundary = currentBoundary;
  };

  toggleAutoRotate = () => {
    this._shouldRotate = !this._shouldRotate;
  };

  exportData = () => {
    return this._boundaryList.map((bd) => bd.exportArtworkData());
  };

  changeColor = (layerName: string, color: string) => {
    if (this._model) {
      const entry = this._layerMap.get(layerName);
      if (entry) {
        (entry.mesh.material as THREE.MeshStandardMaterial).color.set(
          `#${color.replace(/#/g, '')}`
        );
      }
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

  takeScreenShotAuto = async () => {
    const rotations = Utils.getEqualAngleRotations(4).map((azimuthAngle) => ({
      azimuthAngle,
    }));

    return await this._takeScreenShot({
      modelRatio: this._modelRatio,
      rotations: rotations,
    });
  };

  createTechPack = async () => {
    const camera = this._camera.clone();
    const { renderer, scene, techPackGroup, workingAssetGroup, shadowPlane, modelGroup } =
      this._generateViewerCopy();
    scene.background = new THREE.Color('rgba(0, 0, 0, 0)');
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

    const result: string[] = [];
    if (techPackGroup && workingAssetGroup) {
      techPackGroup.visible = true;
      techPackGroup.children.forEach((child) => {
        if (child.isObject3D) {
          ((child as THREE.Mesh).material as THREE.MeshPhysicalMaterial).setValues({
            color: 'white',
            opacity: 0.4,
          });
        }
      });
      workingAssetGroup.visible = false;
      if (shadowPlane) {
        shadowPlane.visible = false;
      }
      modelGroup.traverse((child) => {
        if (this._extraLayers.has(child.name)) {
          child.visible = false;
        }
      });
      const layerList = techPackGroup.children.filter((child) => child.name.includes('changeable'));
      controlsManager.fitToBounds({
        obj: techPackGroup,
        padding: {
          bottom: 4,
          left: 4,
          right: 4,
          top: 4,
        },
        transition: false,
      });
      const { size } = this._getSizeAndCenter(techPackGroup);
      const ratio = Math.abs(size.x / size.z);
      controlsManager.update(this._clock);
      renderer.render(scene, camera);
      const img = await ImageHelper.cropImageToRatio(renderer.domElement.toDataURL(strMime), ratio);
      result.push(img);
      for (let child of layerList) {
        controlsManager.fitToBounds({
          obj: child,
          padding: {
            bottom: 4,
            left: 4,
            right: 4,
            top: 4,
          },
          transition: false,
        });
        layerList.forEach((child) => (child.visible = false));
        child.visible = true;
        const { size } = this._getSizeAndCenter(child);
        const ratio = Math.abs(size.x / size.z);
        controlsManager.update(this._clock);
        renderer.render(scene, camera);
        const img = await ImageHelper.cropImageToRatio(
          renderer.domElement.toDataURL(strMime),
          ratio
        );
        result.push(img);
      }
    }
    return result;
  };

  changeArtworkTexture = (boundary: string, color: string, textureOption: TextureOption) => {
    const bd = this._boundaryList.find((b) => b.name === boundary);
    if (bd) {
      bd.applyTextureApplication({
        color,
        textureOption,
      });
    }
  };

  resetArtworkTexture = (boundary: string) => {
    const bd = this._boundaryList.find((b) => b.name === boundary);
    if (bd) {
      bd.resetTextureApplication();
    }
  };

  resetModel = () => {
    this._groupManager.resetAllToWhite();
    this._boundaryList.forEach((bd) => bd.resetBoundary());
  };
}
