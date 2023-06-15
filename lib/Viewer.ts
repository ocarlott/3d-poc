import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ControlName, TextureOption } from "./type";
import { Boundary } from "./Boundary";
import * as TWEEN from "@tweenjs/tween.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

const changeableRegex = /changeable_group_\d{1,2}/;
export class Viewer3D {
  private _rFID = -1;
  private _camera: THREE.PerspectiveCamera;
  private _scene: THREE.Scene = new THREE.Scene();
  private _light = new THREE.DirectionalLight("white", 0.3);
  private _lightBack = new THREE.DirectionalLight("white", 0.3);
  private _ambientLight = new THREE.AmbientLight("white", 0.6);
  private _model?: THREE.Object3D;
  private _modelGroup = new THREE.Group();
  private _techPackGroup: THREE.Mesh[] = [];
  private _renderer?: THREE.WebGLRenderer;
  private _controls: OrbitControls;
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
  private _isInDeveloperMode = false;
  private _shouldRotate = false;
  private _resizeObserver: ResizeObserver;
  private _modelCenter = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this._camera = new THREE.PerspectiveCamera(
      70,
      this._canvasWidth / this._canvasHeight,
      0.1,
      50
    );
    this._resizeObserver = new ResizeObserver(this._onCanvasSizeUpdated);
    this._resizeObserver.observe(canvas);
    const controls = new OrbitControls(this._camera, canvas);
    this._controls = controls;
    // this._controls.addEventListener('')
    this._renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    // this.renderer.setSize(sizes.width, sizes.height);
    // this.scene.add(new THREE.AxesHelper(10));
    this._light.position.set(0, 15, 15);
    this._lightBack.position.set(0, 15, -15);
    // const helper = new THREE.DirectionalLightHelper(this.light, 20, "green");
    // const backHelper = new THREE.DirectionalLightHelper(lightBack, 20, "green");
    this._scene.background = new THREE.Color("#eee");
    this._scene.add(this._ambientLight);
    this._scene.add(this._light, this._lightBack);
    // this.scene.add(helper, backHelper);
    this._camera.position.z = 3;
    this._camera.lookAt(new THREE.Vector3(0, 0, 0));
    // this._camera.quaternion._onChangeCallback = () => {
    //   console.log({
    //     cameraQuaternion: this._camera.quaternion,
    //   });
    // };
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
      this._controls.enableRotate = true;
    }
  };

  private _disableControls = () => {
    if (this._controls) {
      this._controls.enableRotate = false;
    }
  };

  private _fitCameraToObject = (obj: THREE.Object3D) => {
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(obj);
    let size = boundingBox.getSize(new THREE.Vector3());
    boundingBox.setFromObject(obj);
    const center = boundingBox.getCenter(new THREE.Vector3());
    this._modelCenter = center;
    const largerDim = Math.max(size.x, size.y) / 2;
    const safeDistance = largerDim * 1.2;
    const zNeeded = safeDistance / Math.tan(this._camera.fov / 2);
    this._camera.position.set(center.x, center.y, zNeeded);
    this._camera.lookAt(center);
    this._camera.updateProjectionMatrix();
    if (this._controls) {
      this._controls.target = center;
      this._controls.maxDistance = largerDim * 2;
      this._controls.saveState();
    }
  };

  private _generateViewerCopy = () => {
    const renderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
      antialias: true,
    });
    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color("#eee");
    newScene.add(this._ambientLight.clone());
    newScene.add(this._light.clone(), this._lightBack.clone());
    const newGroup = this._modelGroup.clone();
    newScene.add(newGroup);
    renderer.setSize(this._canvasWidth, this._canvasHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    return {
      renderer,
      scene: newScene,
      modelGroup: newGroup,
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
    this._rFID = requestAnimationFrame(this.show);
    if (this._shouldRotate) {
      this._modelGroup.rotation.y += 0.01;
    }
    TWEEN.update();
    this._renderer?.render(this._scene, this._camera);
    this._controls?.update();
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
    this._techPackGroup = [];
    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          const obj = gltf.scene;
          const boundingBox = new THREE.Box3();
          boundingBox.setFromObject(obj);
          let size = boundingBox.getSize(new THREE.Vector3());
          obj.traverse((child) => {
            const castedChild = child as THREE.Mesh;
            if (castedChild.name.includes("flat")) {
              castedChild.visible = false;
              this._techPackGroup.push(castedChild);
            }
          });
          obj.traverse((child) => {
            const castedChild = child as THREE.Mesh;
            if (!castedChild.name.includes("flat")) {
              const boundaryIndex = child.name
                .toLocaleLowerCase()
                .search("boundary");
              if (castedChild.isMesh && boundaryIndex !== -1) {
                (castedChild.material as THREE.MeshStandardMaterial).setValues({
                  color: "#ffffff",
                  transparent: true,
                  opacity: 0,
                });
                // const material = new ProjectedMaterial({
                //   camera: this.camera,
                //   texture,
                //   textureScale: 0.8,
                //   cover: true,
                // })
                // const mesh = new THREE.Mesh((child as THREE.Mesh).geometry, material);
                const techPackBoundary: THREE.Mesh | null =
                  this._techPackGroup.find(
                    (group) => group.name === castedChild.name + "_flat"
                  ) ?? null;
                if (techPackBoundary) {
                  const bd = new Boundary(castedChild, techPackBoundary);
                  this._modelGroup.add(bd.group);
                  this._boundaryList.push(bd);
                } else {
                  console.error("Invalid 3D model");
                }
              } else {
                const result = castedChild.name.match(changeableRegex);
                if (result != null) {
                  const [groupName] = result;
                  const startIndex = result.index || 0;
                  let name = castedChild.name
                    .slice(startIndex)
                    .replace(`${groupName}_`, "")
                    .replace("_", " ");
                  name = name[0].toLocaleUpperCase() + name.slice(1);
                  (
                    castedChild.material as THREE.MeshStandardMaterial
                  ).color.set("white");
                  if (this._layerMap.get(groupName)) {
                    console.log(
                      "Object is not valid. Trying our best to render it"
                    );
                  } else {
                    this._layerMap.set(castedChild.name, {
                      displayName: name,
                      mesh: castedChild,
                    });
                  }
                }
              }
            }
          });
          this._model = obj;
          this._model.name = ControlName.Model;
          this._fitCameraToObject(obj);
          this._modelGroup.add(obj);
          this._scene.add(this._modelGroup);
          // this.toggleDeveloperMode();
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
    this._controls.enableZoom = this._isInDeveloperMode;
    this._controls.enablePan = this._isInDeveloperMode;
    this._controls.minPolarAngle = this._isInDeveloperMode ? 0 : Math.PI / 2;
    this._controls.maxPolarAngle = this._isInDeveloperMode
      ? Math.PI
      : Math.PI / 2;
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
          false
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
      (boundary) =>
        this._boundaryList.findIndex((b) => b.name === boundary) !== -1
    );
    return allLayersFound && allBoundariesFound;
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
      const cameraPosition = boundaryPosition
        .clone()
        .add(
          boundaryNormal
            .clone()
            .multiplyScalar(this._controls.maxDistance * 0.65)
        );
      new TWEEN.Tween(this._camera.position)
        .to(cameraPosition)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          this._camera.lookAt(boundaryPosition);
        })
        .start();
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
      artworkUrl: string;
      xRatio?: number;
      yRatio?: number;
      rotation?: number;
      sizeRatio?: number;
    },
    withAnimation = true
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
    if (withAnimation) {
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
    this._animateSelectBoundary(boundary);
    currentBoundary?.resetBoundary();
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

  exportData = () => {};

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

  takeScreenShot = () => {
    const { renderer, scene } = this._generateViewerCopy();
    renderer.render(scene, this._camera.clone());
    const strMime = "image/jpeg";
    return renderer.domElement.toDataURL(strMime);
  };

  takeScreenShotAt = (angleY: number) => {
    const camera = this._camera.clone();
    const { renderer, scene, modelGroup } = this._generateViewerCopy();
    modelGroup.rotation.y = angleY;
    camera.position.set(
      this._modelCenter.x,
      this._modelCenter.y,
      this._controls.maxDistance
    );
    camera.lookAt(this._modelCenter);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const strMime = "image/jpeg";
    return renderer.domElement.toDataURL(strMime);
  };

  takeScreenShotAuto = () => {
    const camera = this._camera.clone();
    const { renderer, scene, modelGroup } = this._generateViewerCopy();
    modelGroup.rotation.y = 0;
    camera.position.set(
      this._modelCenter.x,
      this._modelCenter.y,
      this._controls.maxDistance
    );
    camera.lookAt(this._modelCenter);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const images: string[] = [];
    const strMime = "image/jpeg";
    for (var i = 0; i < 4; i++) {
      modelGroup.rotation.y = (Math.PI / 2) * i;
      renderer.render(scene, camera);
      const imgData = renderer.domElement.toDataURL(strMime);
      images.push(imgData);
    }
    return images;
  };

  changeArtworkTexture = (
    boundary: string,
    color: string,
    textureOption: TextureOption | null
  ) => {};
}
