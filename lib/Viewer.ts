import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ControlName, TextureOption } from "./type";
import { Boundary } from "./Boundary";
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
  private _raycaster = new THREE.Raycaster();
  private _mouseHelper = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 10),
    new THREE.MeshNormalMaterial()
  );
  private _renderer?: THREE.WebGLRenderer;
  private _intersection = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
  };
  private _controls: OrbitControls;
  private _boundaryList: Boundary[] = [];
  private _layerMap: Map<string, THREE.Mesh[]> = new Map();
  private _loader = new GLTFLoader();
  private _selectedBoundary: Boundary | null = null;
  private _isPointerDown = false;
  private _textureLoader = new THREE.TextureLoader();
  private _crystalizeStyleList = [
    TextureOption.ScreenPrint,
    TextureOption.Metallic,
    TextureOption.Crystals,
  ];
  private _decalTexture: THREE.Texture | null = null;
  private _canvasWidth = 100;
  private _canvasHeight = 100;
  private _onBoundarySelectionChanged?: () => void;
  private _onArtworkSelectionChanged?: () => void;
  private _onArtworkMove?: () => void;
  private _isInDeveloperMode = false;
  private _shouldRotate = false;
  private _resizeObserver: ResizeObserver;

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
    this._mouseHelper.visible = false;
    this._scene.add(this._mouseHelper);
    this._camera.position.z = 3;
    this._camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.show();
    canvas.addEventListener("mousedown", this._onMouseDown);
    canvas.addEventListener("mouseup", this._onMouseUp);
    canvas.addEventListener("mouseover", this._onMouseOver);
  }

  private _onCanvasSizeUpdated = (entries: ResizeObserverEntry[]) => {
    const canvas = entries[0];
    const { width, height } = canvas.contentRect;
    console.log({
      width,
      height,
    });
    this._canvasWidth = width;
    this._canvasHeight = height;
    this._camera.aspect = this._canvasWidth / this._canvasHeight;
    this._camera.updateProjectionMatrix();

    this._renderer?.setSize(this._canvasWidth, this._canvasHeight);
    this._renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private _getIntersects = (
    mouseX: number,
    mouseY: number,
    objectToCheck: THREE.Object3D
  ) => {
    this._raycaster.setFromCamera(
      new THREE.Vector2(mouseX, mouseY),
      this._camera
    );
    return this._raycaster.intersectObject(objectToCheck);
  };

  private _getPointerIntersection = (
    screenX: number,
    screenY: number,
    objectToCheck: THREE.Object3D
  ) => {
    const { mouseX, mouseY } = this._getMousePosition(screenX, screenY);
    const intersects = this._getIntersects(mouseX, mouseY, objectToCheck);
    let p: THREE.Vector3 | null = null;
    let n: THREE.Vector3 | null = null;
    if (intersects.length > 0) {
      p = intersects[0].point;
      if (!!intersects[0].face?.normal) {
        n = intersects[0].face?.normal.clone();
        n.transformDirection(objectToCheck.matrixWorld);
        n.multiplyScalar(10);
        n.add(intersects[0].point);
      }
    }
    return {
      point: p,
      normal: n,
    };
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
    var center = boundingBox.getCenter(new THREE.Vector3());
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

  private _getMousePosition = (screenX: number, screenY: number) => {
    const mouseX = (screenX / this._canvasWidth) * 2 - 1;
    const mouseY = -(screenY / this._canvasHeight) * 2 + 1;
    return {
      mouseX,
      mouseY,
    };
  };

  private _onMouseUp = () => {
    this._isPointerDown = false;
    this._enableControls();
  };

  private _onMouseDown = (e: MouseEvent) => {
    const { clientX: screenX, clientY: screenY } = e;
    const { mouseX, mouseY } = this._getMousePosition(screenX, screenY);
    const intersects = this._getIntersects(mouseX, mouseY, this._modelGroup);
    const uploadArtworkControl = this._getControl(
      intersects,
      ControlName.UploadArtwork
    );
    if (uploadArtworkControl) {
      const boundary =
        this._boundaryList.find((boundary) =>
          boundary.hasPlaceholderId(uploadArtworkControl.object.id)
        ) ?? null;
      if (boundary) {
        if (this._decalTexture) {
          boundary.addArtwork(this._decalTexture);
        } else {
          // this.onError("Please select an artwork!");
        }
      }
      return;
    }
    const translationControl = this._getControl(
      intersects,
      ControlName.TranslationControl
    );
    if (translationControl && this._selectedBoundary) {
      // Move artwork
      this._isPointerDown = true;
      this._disableControls();
      return;
    }
    const artworkIntersect = this._getControl(intersects, ControlName.Artwork);
    if (artworkIntersect) {
      // Select artwork
      this._onArtworkClick(artworkIntersect.object.id);
      return;
    }
    this._selectedBoundary?.toggleEditting(false);
    this._selectedBoundary = null;
  };

  private _onMouseOver = (e: MouseEvent) => {
    const { clientX: screenX, clientY: screenY } = e;
    if (this._isPointerDown) {
      if (this._selectedBoundary) {
        const { point, normal } = this._getPointerIntersection(
          screenX,
          screenY,
          this._selectedBoundary.canvas
        );
        if (point) {
          this._mouseHelper.position.copy(point);
          this._intersection.point.copy(point);
          if (normal) {
            this._intersection.normal.copy(normal);
            this._mouseHelper.lookAt(normal);
            this._selectedBoundary.updateArtworkPosition(
              point,
              this._mouseHelper.rotation
            );
          }
        }
      }
    }
  };

  private _onArtworkClick = (artworkId: number) => {
    this._selectedBoundary =
      this._boundaryList.find((boundary) => boundary.hasArtwork(artworkId)) ??
      null;
    if (!this._selectedBoundary?.isEditing) {
      this._selectedBoundary?.toggleEditting();
      // this.selectedBoundary = null;
    }
  };

  private _loadDecalTexture = (url: string) => {
    this._decalTexture = this._textureLoader.load(url);
  };

  private _getControl = (
    intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[],
    control: ControlName
  ) => {
    if (intersects.length > 0) {
      return (
        intersects.find(
          (intersect) =>
            intersect.object.name === control && intersect.object.visible
        ) ?? null
      );
    }
    return null;
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

  private _prepareForScreenshot = (modelGroup: THREE.Group) => {
    modelGroup.traverse((child) => {
      if (
        child.name === ControlName.UploadArtwork ||
        child.name === ControlName.Boundary
      ) {
        child.visible = false;
      }
    });
  };

  show = () => {
    this._rFID = requestAnimationFrame(this.show);
    if (this._shouldRotate) {
      this._modelGroup.rotation.y += 0.01;
    }
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
    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          const obj = gltf.scene;
          const boundingBox = new THREE.Box3();
          boundingBox.setFromObject(obj);
          let size = boundingBox.getSize(new THREE.Vector3());
          obj.traverse((child) => {
            const boundaryIndex = child.name
              .toLocaleLowerCase()
              .search("boundary");
            if ((child as THREE.Mesh).isMesh && boundaryIndex !== -1) {
              child.name = child.name
                .slice(boundaryIndex)
                .replace("boundary_", "");
              (
                (child as THREE.Mesh).material as THREE.MeshStandardMaterial
              ).setValues({
                color: "#ccc",
                transparent: true,
                opacity: 0.4,
              });
              // const material = new ProjectedMaterial({
              //   camera: this.camera,
              //   texture,
              //   textureScale: 0.8,
              //   cover: true,
              // })
              // const mesh = new THREE.Mesh((child as THREE.Mesh).geometry, material);
              const bd = new Boundary(
                this._camera,
                child as THREE.Mesh,
                size.z
              );
              // this.modelGroup.add(mesh);
              this._modelGroup.add(bd.group);
              this._boundaryList.push(bd);
            } else {
              const result = child.name.match(changeableRegex);
              if (result != null) {
                const [groupName] = result;
                const startIndex = result.index || 0;
                child.name = child.name
                  .slice(startIndex)
                  .replace(`${groupName}_`, "")
                  .replace("_", " ");
                child.name =
                  child.name[0].toLocaleUpperCase() + child.name.slice(1);
                (
                  (child as THREE.Mesh).material as THREE.MeshStandardMaterial
                ).color.set("white");
                const group = this._layerMap.get(groupName) || [];
                group.push(child as THREE.Mesh);
                this._layerMap.set(groupName, group);
              }
            }
          });
          this._model = obj;
          this._model.name = ControlName.Model;
          this._fitCameraToObject(obj);
          this._modelGroup.add(obj);
          this._scene.add(this._modelGroup);
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
    onBoundarySelectionChanged: () => void;
    onArtworkSelectionChanged: () => void;
    onArtworkMoved: () => void;
  }) => {
    const {
      onArtworkMoved,
      onArtworkSelectionChanged,
      onBoundarySelectionChanged,
    } = options;
    this._onArtworkMove = onArtworkMoved;
    this._onBoundarySelectionChanged = onBoundarySelectionChanged;
    this._onArtworkSelectionChanged = onArtworkSelectionChanged;
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
      coodinate: { x: number; y: number; z: number };
      rotation: number;
      size: number;
      artworkUrl: string;
      textureApplication: { color: string; textureOption: TextureOption }[];
    }[];
  }) => {};

  validate = (layers: string[], boundaries: string[]) => {};

  selectBoundary = (boundary: string) => {
    this._selectedBoundary =
      this._boundaryList.find((bd) => bd.name === boundary) ?? null;
  };

  unselectBoundary = () => {
    this._selectedBoundary = null;
  };

  changeArtwork = (options: {
    boundary: string;
    coodinate: { x: number; y: number; z: number };
    rotation: number;
    size: number;
    artworkUrl: string;
  }) => {};

  resetArtworkToDefault = (boundary: string) => {
    const currentBoundary = this._selectedBoundary;
    this.selectBoundary(boundary);
    // Do work
    this._selectedBoundary = currentBoundary;
  };

  removeArtwork = (boundary: string) => {
    const currentBoundary = this._selectedBoundary;
    this.selectBoundary(boundary);
    // Do work
    this._selectedBoundary = currentBoundary;
  };

  resetArtworkTextureToDefault = (boundary: string) => {
    const currentBoundary = this._selectedBoundary;
    this.selectBoundary(boundary);
    // Do work
    this._selectedBoundary = currentBoundary;
  };

  resizeArtworkOnBoundary = (boundary: string, size: number) => {
    const currentBoundary = this._selectedBoundary;
    this.selectBoundary(boundary);
    // Do work
    this._selectedBoundary = currentBoundary;
  };

  toggleAutoRotate = () => {
    this._shouldRotate = !this._shouldRotate;
  };

  exportData = () => {};

  changeColor = (layerName: string, color: string) => {
    if (this._model) {
      const entries = new Map<string, THREE.Mesh[]>(
        Array.from(this._layerMap.entries()).filter(([key, value]) => {
          // Return true to keep this entry in the filtered map, or false to remove it.
          return value[0].userData.name == layerName;
        })
      );
      for (let entry of entries) {
        const value = entry[1][0];
        // const value1 = value as THREE.MeshStandardMaterial;
        (value.material as THREE.MeshStandardMaterial).color.set(color);
      }
    }
  };

  takeScreenShot = () => {
    this._selectedBoundary?.toggleEditting(false);
    const { renderer, scene, modelGroup } = this._generateViewerCopy();
    this._prepareForScreenshot(modelGroup);
    renderer.render(scene, this._camera.clone());
    const strMime = "image/jpeg";
    return renderer.domElement.toDataURL(strMime);
  };

  takeSnapshotAt = (angleY: number) => {
    this._selectedBoundary?.toggleEditting(false);
    const { renderer, scene, modelGroup } = this._generateViewerCopy();
    this._prepareForScreenshot(modelGroup);
    modelGroup.rotation.y = angleY;
    renderer.render(scene, this._camera.clone());
    const strMime = "image/jpeg";
    return renderer.domElement.toDataURL(strMime);
  };

  takeScreenShotAuto = () => {
    this._selectedBoundary?.toggleEditting(false);
    const camera = this._camera.clone();
    const { renderer, scene, modelGroup } = this._generateViewerCopy();
    this._prepareForScreenshot(modelGroup);
    // modelGroup.rotation.copy(this.controls.object.rotation);
    // renderer.render(scene, camera);
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
