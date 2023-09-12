import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ControlName, TextureOption } from "./type";
import { Boundary } from "./Boundary";
import * as TWEEN from "@tweenjs/tween.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import CameraControls from "camera-controls";
import { ImageHelper } from "./ImageHelper";
import { Utils } from "./Utils";

CameraControls.install({ THREE: THREE });
const strMime = "image/png";
export class Viewer3D {
  private _rFID = -1;
  private _camera: THREE.PerspectiveCamera;
  private _scene: THREE.Scene = new THREE.Scene();
  private _light = new THREE.DirectionalLight("white", 0.3);
  private _lightBack = new THREE.DirectionalLight("white", 0.3);
  private _ambientLight = new THREE.AmbientLight("white", 0.6);
  private _model?: THREE.Object3D;
  private _modelGroup = new THREE.Group();
  private _techPackGroup = new THREE.Group();
  private _workingAssetGroup = new THREE.Group();
  private _renderer?: THREE.WebGLRenderer;
  private _controls: CameraControls;
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
  private _crystalizeStyleList = [
    TextureOption.ScreenPrint,
    TextureOption.Metallic,
    TextureOption.Crystals,
  ];
  private _canvasWidth = 100;
  private _canvasHeight = 100;
  private _onArtworkChanged?: (params: {
    forBoundary: string;
    xRatio: number;
    yRatio: number;
    whRatio: number;
    sizeRatio: number;
    rotation: number;
  }) => void;
  private _isInDeveloperMode = true;
  private _shouldRotate = false;
  private _resizeObserver: ResizeObserver;
  private _modelCenter = new THREE.Vector3();
  private _modelRatio = 1;
  private _clock = new THREE.Clock();
  private _axesHelper = new THREE.AxesHelper(30);

  constructor(canvas: HTMLCanvasElement) {
    this._camera = new THREE.PerspectiveCamera(
      70,
      this._canvasWidth / this._canvasHeight,
      0.1,
      50
    );
    this._resizeObserver = new ResizeObserver(this._onCanvasSizeUpdated);
    this._resizeObserver.observe(canvas);
    this._controls = new CameraControls(this._camera, canvas);
    this._renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this._light.position.set(0, 15, 15);
    this._lightBack.position.set(0, 15, -15);
    this._scene.background = new THREE.Color("#eee");
    this._scene.add(this._ambientLight);
    this._scene.add(this._light, this._lightBack);
    this._scene.add(this._axesHelper);
    this._controls.minPolarAngle = Math.PI / 2;
    this._controls.maxPolarAngle = Math.PI / 2;
    this.show();
  }

  private _onCanvasSizeUpdated = (entries: ResizeObserverEntry[]) => {
    const canvas = entries[0];
    const { width, height } = canvas.contentRect;
    this._canvasWidth = width;
    this._canvasHeight = height;
    this._camera.aspect = this._canvasWidth / this._canvasHeight;
    this._camera.updateProjectionMatrix();

    this._renderer?.setSize(this._canvasWidth, this._canvasHeight);
    this._renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private _enableControls = () => {
    if (this._controls) {
      // this._controls.lockPointer = true;
    }
  };

  private _disableControls = () => {
    if (this._controls) {
      // this._controls.enableRotate = false;
    }
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

  private _fitCameraToObject = (
    obj: THREE.Object3D,
    controls?: CameraControls
  ) => {
    if (controls) {
      controls.rotatePolarTo(Math.PI * 0.5, false);
      this._paddingInCssPixel(controls, obj, {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      });
    }
  };

  private _paddingInCssPixel = (
    controls: CameraControls,
    obj: THREE.Object3D,
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    },
    rotation?: {
      azimuthAngle?: number;
      polarAngle?: number;
    }
  ) => {
    const { top, right, bottom, left } = padding;
    const fov = this._camera.fov * THREE.MathUtils.DEG2RAD;
    const rendererHeight =
      this._renderer?.getSize(new THREE.Vector2()).height ?? 0;

    const boundingBox = new THREE.Box3().setFromObject(obj);
    const size = boundingBox.getSize(new THREE.Vector3());
    const boundingWidth = size.x;
    const boundingHeight = size.y;
    const boundingDepth = size.z;

    var distanceToFit = controls.getDistanceToFitBox(
      boundingWidth,
      boundingHeight,
      boundingDepth
    );
    var paddingTop = 0;
    var paddingBottom = 0;
    var paddingLeft = 0;
    var paddingRight = 0;

    for (var i = 0; i < 10; i++) {
      const depthAt = distanceToFit - boundingDepth * 0.5;
      const cssPixelToUnit =
        (2 * Math.tan(fov * 0.5) * Math.abs(depthAt)) / rendererHeight;
      paddingTop = top * cssPixelToUnit;
      paddingBottom = bottom * cssPixelToUnit;
      paddingLeft = left * cssPixelToUnit;
      paddingRight = right * cssPixelToUnit;

      distanceToFit = controls.getDistanceToFitBox(
        boundingWidth + paddingLeft + paddingRight,
        boundingHeight + paddingTop + paddingBottom,
        boundingDepth
      );
    }

    controls.fitToBox(obj, false, {
      paddingLeft: paddingLeft,
      paddingRight: paddingRight,
      paddingBottom: paddingBottom,
      paddingTop: paddingTop,
    });

    if (rotation) {
      controls.rotateTo(rotation.azimuthAngle || 0, rotation.polarAngle || 0);
    }
  };

  private _generateViewerCopy = () => {
    const renderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
      antialias: true,
      alpha: true,
    });
    renderer.setClearColor(0x000000, 0);
    const newScene = new THREE.Scene();
    // newScene.background = new THREE.Color("#eee");
    newScene.add(this._ambientLight.clone());
    newScene.add(this._light.clone(), this._lightBack.clone());
    const newGroup = this._modelGroup.clone();
    const techPackGroup = newGroup.getObjectByName(ControlName.TechPackGroup);
    const workingAssetGroup = newGroup.getObjectByName(
      ControlName.WorkingAssetGroup
    ) as THREE.Object3D;
    newScene.add(newGroup);
    renderer.setSize(this._canvasWidth, this._canvasHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    return {
      renderer,
      scene: newScene,
      modelGroup: newGroup,
      workingAssetGroup,
      techPackGroup,
    };
  };

  // private _saveFile = function (imgDataUrl: string, filename: string) {
  //   var link = document.createElement("a");
  //   document.body.appendChild(link);
  //   link.download = filename;
  //   link.href = imgDataUrl;
  //   link.click();
  //   document.body.removeChild(link);
  // };

  show = () => {
    const delta = this._clock.getDelta();
    this._controls.update(delta);
    this._rFID = requestAnimationFrame(this.show);
    if (this._shouldRotate) {
      this._modelGroup.rotation.y += 0.01;
    }
    TWEEN.update();
    this._renderer?.render(this._scene, this._camera);
  };

  hide = () => {
    cancelAnimationFrame(this._rFID);
    this._rFID = -1;
  };

  loadModel = (
    url: string,
    onProgress: (percent: number) => void
  ): Promise<void> => {
    this._model = undefined;
    this._scene.remove(this._modelGroup);
    this._modelGroup.removeFromParent();
    this._modelGroup = new THREE.Group();
    this._techPackGroup = new THREE.Group();
    this._techPackGroup.name = ControlName.TechPackGroup;
    this._workingAssetGroup = new THREE.Group();
    this._workingAssetGroup.name = ControlName.WorkingAssetGroup;
    this._boundaryList = [];
    this._layerMap.clear();
    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          const obj = gltf.scene;
          const boundingBox = new THREE.Box3();
          boundingBox.setFromObject(obj);
          const techPackList: THREE.Mesh[] = [];
          const workingAssets: (THREE.Mesh | THREE.Group)[] = [];
          this._modelGroup.add(this._techPackGroup);
          this._modelGroup.add(this._workingAssetGroup);
          this._techPackGroup.visible = this._isInDeveloperMode;
          obj.traverse((child) => {
            const castedChild = child as THREE.Mesh;
            if (castedChild.name.includes("_flat")) {
              techPackList.push(castedChild);
            }
          });
          obj.traverse((child) => {
            const castedChild = child as THREE.Mesh;
            const castedChildMaterial =
              castedChild.material as THREE.MeshStandardMaterial;
            if (castedChild.isMesh && !!castedChildMaterial) {
              castedChildMaterial.setValues({
                color: "white",
                // wireframe: true,
              });
            }
            if (!castedChild.name.includes("_flat")) {
              const boundaryIndex = child.name
                .toLocaleLowerCase()
                .search("boundary");
              if (castedChild.isMesh && boundaryIndex !== -1) {
                castedChildMaterial.setValues({
                  transparent: true,
                  opacity: 0,
                });
                const techPackBoundary: THREE.Mesh | null =
                  techPackList.find(
                    (group) => group.name === castedChild.name + "_flat"
                  ) ?? null;
                if (techPackBoundary) {
                  const bd = new Boundary(castedChild, techPackBoundary);
                  this._modelGroup.add(bd.group);
                  this._boundaryList.push(bd);
                  workingAssets.push(bd.group);
                } else {
                  console.error("Invalid 3D model");
                }
              } else {
                const displayNameForChangableGroup =
                  Utils.getDisplayNameIfChangeableGroup(castedChild.name);
                if (displayNameForChangableGroup) {
                  if (
                    this._layerMap.get(displayNameForChangableGroup.groupName)
                  ) {
                    console.log(
                      "Object is not valid. Trying our best to render it"
                    );
                  } else {
                    this._layerMap.set(castedChild.name, {
                      displayName: displayNameForChangableGroup.displayName,
                      mesh: castedChild,
                    });
                  }
                  workingAssets.push(castedChild);
                }
              }
            }
          });
          techPackList.forEach((child) => {
            this._techPackGroup.add(child);
          });
          workingAssets.forEach((child) => {
            this._workingAssetGroup.add(child);
          });
          this._boundaryList.forEach((child) => {
            child.organizeGroup();
          });
          this._fitCameraToObject(this._workingAssetGroup, this._controls);
          const { size, center } = this._getSizeAndCenter(
            this._workingAssetGroup
          );
          this._controls.maxDistance = Math.max(size.x, size.y, size.z) * 1.2;
          this._controls.minDistance = Math.min(size.x, size.y, size.z) * 1.2;
          this._modelCenter = center;
          this._modelRatio = Math.abs(size.x / size.y);
          this._model = obj;
          this._modelGroup.add(obj);
          this._scene.add(this._modelGroup);
          this.toggleDeveloperMode();
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
    this._techPackGroup.visible = this._isInDeveloperMode;
    this._controls.mouseButtons.wheel =
      this._controls.mouseButtons.wheel === CameraControls.ACTION.NONE
        ? CameraControls.ACTION.ZOOM
        : CameraControls.ACTION.NONE;
    this._controls.touches.two =
      this._controls.touches.two === CameraControls.ACTION.TOUCH_ROTATE
        ? CameraControls.ACTION.TOUCH_DOLLY
        : CameraControls.ACTION.TOUCH_ROTATE;
    this._controls.minPolarAngle = this._isInDeveloperMode ? 0 : Math.PI / 2;
    this._controls.maxPolarAngle = this._isInDeveloperMode
      ? Math.PI
      : Math.PI / 2;
    this._boundaryList.forEach((bd) =>
      bd.setDeveloperMode(this._isInDeveloperMode)
    );
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
  }) => {
    const { colorMap, artworkMap } = options;
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
        this.changeArtwork({
          artworkUrl,
          canvas,
          boundary: boundaryName,
          xRatio,
          yRatio,
          rotation,
          sizeRatio,
        });
        textureApplication.forEach((app) => {
          this.changeArtworkTexture(boundaryName, app.color, app.textureOption);
        });
      }
    );
  };

  validate = (layers: string[], boundaries: string[]) => {
    const allLayersFound = layers.every((layer) => !!this._layerMap.get(layer));
    const allBoundariesFound = boundaries.every(
      (boundary) =>
        this._boundaryList.findIndex((b) => b.name === boundary) !== -1
    );
    return allLayersFound && allBoundariesFound;
  };

  validateModel = async () => {
    const colors = Utils.getShuffledColors();
    const boundaries: string[] = [];
    const techPacks: string[] = [];
    const layers: string[] = [];
    this._modelGroup.traverse((child) => {
      if (child.name.includes("flat")) {
        techPacks.push(child.name);
      } else if (child.name.includes("boundary")) {
        boundaries.push(child.name);
      } else if (child.name.includes("changeable")) {
        layers.push(child.name);
      }
    });
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
    boundaries.forEach((bd) => {
      const bdMaterial = (this._modelGroup.getObjectByName(bd) as THREE.Mesh)
        .material as THREE.MeshStandardMaterial;
      if (!techPacks.includes(bd + "_flat")) {
        materialMap.set(bdMaterial.id, {
          hasError: materialMap.has(bdMaterial.id),
          meshes: [...(materialMap.get(bdMaterial.id)?.meshes ?? []), bd],
        });
        materialMatches.push({
          boundaryName: bd,
          result: false,
        });
      } else {
        const techpackMaterial = (
          this._modelGroup.getObjectByName(bd + "_flat") as THREE.Mesh
        ).material as THREE.MeshBasicMaterial;
        materialMatches.push({
          boundaryName: bd,
          result: bdMaterial.id === techpackMaterial.id,
        });
        materialMap.set(bdMaterial.id, {
          hasError: materialMap.has(bdMaterial.id),
          meshes: [
            ...(materialMap.get(bdMaterial.id)?.meshes ?? []),
            bd,
            bd + "_flat",
          ],
        });
      }
    });
    await Promise.all(
      this._boundaryList.map((bd) => {
        return this.changeArtwork({
          boundary: bd.name,
          artworkUrl: "./logo.png",
        });
      })
    );
    const screenshots = await this.takeScreenShotAuto();
    const techpackImages = await this.createTechPack();
    this._boundaryList.map((bd) => {
      return this.removeArtwork(bd.name);
    });
    this._modelGroup.traverse((child) => {
      if (child.isObject3D && (child as THREE.Mesh).isMesh) {
        (
          (child as THREE.Mesh).material as THREE.MeshStandardMaterial
        ).setValues({
          color: "white",
        });
      }
    });
    return {
      boundaries,
      techPacks,
      layers,
      screenshots,
      techpackImages,
      materialMatches,
      materialErrors: Array.from(materialMap.values())
        .filter((item) => item.hasError)
        .map((item) => item.meshes),
    };
  };

  private _animateSelectBoundary = (boundary: string) => {
    const selectingBoundary =
      this._boundaryList.find((bd) => bd.name === boundary) ?? null;
    if (
      selectingBoundary?.name !== this._selectedBoundary?.name &&
      selectingBoundary !== null
    ) {
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

  unselectBoundary = () => {
    this._selectedBoundary = null;
  };

  changeArtwork = async (
    options: {
      boundary: string;
      canvas?: HTMLCanvasElement;
      textureApplication?: { color: string; textureOption: TextureOption }[];
      artworkUrl: string;
      xRatio?: number;
      yRatio?: number;
      rotation?: number;
      sizeRatio?: number;
    },
    disableEditting = true
  ) => {
    const {
      boundary,
      xRatio = 0.5,
      yRatio = 0.5,
      rotation = 0,
      sizeRatio = 0.5,
      artworkUrl,
      canvas,
      textureApplication,
    } = options;
    let boundaryObj: Boundary | null = null;
    if (!disableEditting) {
      boundaryObj = this._animateSelectBoundary(boundary);
    } else {
      boundaryObj =
        this._boundaryList.find((bd) => bd.name === boundary) ?? null;
    }
    await boundaryObj?.addArtwork({
      workingCanvas: canvas,
      artworkUrl,
      xRatio,
      yRatio,
      rotation,
      sizeRatio,
      onArtworkChanged: this._onArtworkChanged,
      textureApplication,
      disableEditting,
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
          `#${color.replace(/#/g, "")}`
        );
      }
    }
  };

  takeScreenShot = async () => {
    const camera = this._camera.clone();
    const { renderer, scene, workingAssetGroup } = this._generateViewerCopy();
    const controls = new CameraControls(camera, renderer.domElement);
    const { azimuthAngle, polarAngle } = this._controls;
    this._paddingInCssPixel(
      controls,
      workingAssetGroup,
      {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
      {
        azimuthAngle,
        polarAngle,
      }
    );
    const delta = this._clock.getDelta();
    controls.update(delta);
    renderer.render(scene, camera);
    return await ImageHelper.cropImageToRatio(
      renderer.domElement.toDataURL(strMime),
      this._modelRatio
    );
  };

  takeScreenShotAt = async (angleY: number) => {
    const camera = this._camera.clone();
    const { renderer, scene, workingAssetGroup } = this._generateViewerCopy();
    const controls = new CameraControls(camera, renderer.domElement);
    this._paddingInCssPixel(controls, workingAssetGroup, {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    });
    controls.rotateAzimuthTo(angleY, false);
    const delta = this._clock.getDelta();
    controls.update(delta);
    renderer.render(scene, camera);
    return await ImageHelper.cropImageToRatio(
      renderer.domElement.toDataURL(strMime),
      this._modelRatio
    );
  };

  takeScreenShotAuto = async () => {
    const camera = this._camera.clone();
    const { renderer, scene, workingAssetGroup } = this._generateViewerCopy();
    const controls = new CameraControls(camera, renderer.domElement);
    this._paddingInCssPixel(controls, workingAssetGroup, {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    });
    const images: string[] = [];
    for (var i = 0; i < 4; i++) {
      controls.rotateAzimuthTo((Math.PI / 2) * i, false);
      const delta = this._clock.getDelta();
      controls.update(delta);
      renderer.render(scene, camera);
      const imgData = await ImageHelper.cropImageToRatio(
        renderer.domElement.toDataURL(strMime),
        this._modelRatio
      );
      images.push(imgData);
    }
    return images;
  };

  createTechPack = async () => {
    const camera = this._camera.clone();
    const { renderer, scene, techPackGroup, workingAssetGroup } =
      this._generateViewerCopy();
    const controls = new CameraControls(camera, renderer.domElement);
    controls.rotateTo(0, 0);
    this._paddingInCssPixel(controls, workingAssetGroup, {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    });
    const result: string[] = [];
    if (techPackGroup && workingAssetGroup) {
      techPackGroup.visible = true;
      workingAssetGroup.visible = false;
      const layerList = techPackGroup.children.filter((child) =>
        child.name.includes("changeable")
      );
      controls.fitToBox(techPackGroup, false, {
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 4,
      });
      const { size } = this._getSizeAndCenter(techPackGroup);
      const ratio = Math.abs(size.x / size.z);
      const delta = this._clock.getDelta();
      controls.update(delta);
      renderer.render(scene, camera);
      const img = await ImageHelper.cropImageToRatio(
        renderer.domElement.toDataURL(strMime),
        ratio
      );
      result.push(img);
      for (let child of layerList) {
        controls.fitToBox(child, false, {
          paddingBottom: 4,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 4,
        });
        layerList.forEach((child) => (child.visible = false));
        child.visible = true;
        const { size } = this._getSizeAndCenter(child);
        const ratio = Math.abs(size.x / size.z);
        const delta = this._clock.getDelta();
        controls.update(delta);
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

  changeArtworkTexture = (
    boundary: string,
    color: string,
    textureOption: TextureOption | null
  ) => {};
}
