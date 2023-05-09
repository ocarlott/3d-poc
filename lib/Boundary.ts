import * as THREE from "three";
import { ControlName, TextureOption } from "./type";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { ImageHelper } from "./ImageHelper";
import { DecalGeometry as ImageDecal } from "./DecalGeometry";
import placeholder from "./assets/img.png";
import moveIcon from "./assets/move_icon.png";

export class Boundary {
  readonly group = new THREE.Group();
  readonly raycaster = new THREE.Raycaster();
  readonly mouseHelper = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 10),
    new THREE.MeshNormalMaterial()
  );
  static imageIconMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load(placeholder),
    transparent: true,
    polygonOffset: true,
    polygonOffsetUnits: -10,
    polygonOffsetFactor: -1,
  });

  static moveIconMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load(moveIcon),
    transparent: true,
    polygonOffset: true,
    polygonOffsetUnits: -120,
    polygonOffsetFactor: -1,
  });

  static decalMaterial = new THREE.MeshPhongMaterial({
    transparent: true,
    // depthWrite: false,
    polygonOffset: true,
    polygonOffsetUnits: -100,
    polygonOffsetFactor: -1,
  });

  readonly uploadArtworkPlaceholder: THREE.Mesh;
  artwork: THREE.Mesh | null = null;
  artworkSize = new THREE.Vector3(0, 0, 0);
  artworkRatio = 1;
  readonly size: THREE.Vector3;
  center: THREE.Vector3;
  readonly canvas: THREE.Mesh;
  readonly camera: THREE.PerspectiveCamera;
  readonly modelThickness: number;
  translateControl: THREE.Mesh | null = null;
  // TODO: Needs dynamic size
  translateControlSize = new THREE.Vector3(1, 1, 1);
  isEditing = false;
  normal = new THREE.Vector3(0, 0, 0);
  crystalizeStyle = TextureOption.ScreenPrint;
  originalTexture: THREE.Texture | null = null;
  name: string;
  // helper = new THREE.ArrowHelper();

  constructor(
    camera: THREE.PerspectiveCamera,
    canvas: THREE.Mesh,
    modelThickness: number
  ) {
    this.camera = camera;
    this.canvas = canvas;
    this.name = canvas.name;
    this.modelThickness = modelThickness;
    this.canvas.name = ControlName.Boundary;
    canvas.geometry.computeVertexNormals();
    this.group.name = ControlName.BoundaryGroup;
    const boundingBox = new THREE.Box3().setFromObject(canvas);
    // (canvas.material as THREE.Material).side = THREE.DoubleSide;
    (canvas.material as THREE.MeshStandardMaterial).normalMap =
      new THREE.TextureLoader().load(placeholder);
    this.size = boundingBox.getSize(new THREE.Vector3());
    const { max, min } = boundingBox;
    let mid = canvas.worldToLocal(min.clone().add(max).multiplyScalar(0.5));
    // const normals = (
    //   this.canvas.geometry.attributes["normal"] as THREE.BufferAttribute
    // ).array;
    // for (
    //   let index = 0;
    //   index < this.canvas.geometry.attributes["normal"].count / 3;
    //   index++
    // ) {
    //   this.normal.add(
    //     new THREE.Vector3(
    //       normals[index * 3],
    //       normals[index * 3 + 1],
    //       normals[index * 3 + 2]
    //     )
    //   );
    // }
    this.center = mid;
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

    this.uploadArtworkPlaceholder = new THREE.Mesh();

    // this.raycaster.set(mid, this.normal);
    // const objs = this.raycaster.intersectObject(canvas, true);
    // if (objs.length > 0) {
    //   const intersect = objs[0];
    //   this.center = intersect.point;
    //   console.log({
    //     log: "HERE",
    //     center: this.center,
    //   });
    //   if (intersect.face?.normal) {
    //     this.normal = intersect.face?.normal;
    //     this.normal.transformDirection(canvas.matrixWorld);
    //     this.normal.multiplyScalar(10);
    //     this.normal.add(this.center);
    //     this.mouseHelper.position.copy(this.center);
    //     this.mouseHelper.lookAt(this.normal);
    //   }
    //   this.uploadArtworkPlaceholder = new THREE.Mesh(
    //     new DecalGeometry(
    //       canvas,
    //       this.center,
    //       this.mouseHelper.rotation,
    //       new THREE.Vector3(2, 2, 2)
    //     ),
    //     Boundary.imageIconMaterial
    //   );
    //   this.uploadArtworkPlaceholder.visible = false;
    //   this.uploadArtworkPlaceholder.name = ControlName.UploadArtwork;
    //   canvas.visible = false;
    //   this.mouseHelper.visible = false;
    //   this.group.add(this.uploadArtworkPlaceholder, this.mouseHelper);

    //   // this.helper.setDirection(this.normal);
    //   // this.helper.position.copy(this.center);
    //   // this.helper.setColor("green")
    //   // this.helper.setLength(10);
    //   // this.group.add(this.helper)
    // } else {
    //   // TODO: Error
    //   this.uploadArtworkPlaceholder = new THREE.Mesh();
    //   this.center = new THREE.Vector3();
    // }
  }

  get id() {
    return this.canvas.id;
  }

  hasPlaceholderId = (id: number) => {
    return (
      this.uploadArtworkPlaceholder.id === id &&
      this.uploadArtworkPlaceholder.visible
    );
  };

  setShowBoundary = (value: boolean) => {
    this.canvas.visible = value;
  };

  calculateArtworkSize = (imageWidth: number, imageHeight: number) => {
    let width = imageWidth;
    let height = imageHeight;
    const useWidth = width / this.size.x > height / this.size.y;
    if (useWidth) {
      height = ((this.size.x * 0.5) / width) * height;
      width = this.size.x * 0.5;
    } else {
      width = ((this.size.y * 0.5) / height) * width;
      height = this.size.y * 0.5;
    }
    return new THREE.Vector3(width, height, this.modelThickness);
  };

  addArtwork = (texture: THREE.Texture) => {
    this.originalTexture = texture;
    if (texture.image) {
      const material = Boundary.decalMaterial.clone();
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      material.map = texture.clone();
      this.artworkSize = this.calculateArtworkSize(
        texture.image.width,
        texture.image.height
      );
      // this.helper.position.copy(newCenter);
      this.artwork = new THREE.Mesh(
        new ImageDecal(
          this.camera,
          this.canvas,
          this.center,
          this.mouseHelper.rotation,
          this.artworkSize
        ),
        material.clone()
      );
      this.artwork.name = ControlName.Artwork;
      this.artwork.geometry.computeBoundingBox();
      // this.artwork.geometry.setAttribute(
      //   'uv2',
      //   new THREE.BufferAttribute(
      //     this.artwork.geometry.attributes['uv'].array,
      //     2,
      //   ),
      // );
      // const edges = new THREE.EdgesGeometry(this.artwork.geometry);
      // const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: "green" }));
      // this.group.add(line);
      const boundingBox = this.artwork.geometry.boundingBox!;
      const size = boundingBox.getSize(new THREE.Vector3());
      this.group.add(this.artwork);
      this.uploadArtworkPlaceholder.visible = false;
      this.translateControl = new THREE.Mesh(
        new DecalGeometry(
          this.artwork,
          this.center,
          this.mouseHelper.rotation,
          this.translateControlSize
        ),
        Boundary.moveIconMaterial.clone()
      );
      this.translateControl.name = ControlName.TranslationControl;
      this.translateControl.visible = false;
      this.group.add(this.translateControl);
    }
  };

  updateArtworkPosition = (center: THREE.Vector3, orientation: THREE.Euler) => {
    if (this.artwork && this.isEditing && this.translateControl) {
      this.center = center;
      this.mouseHelper.rotation.copy(orientation);
      // this.helper.position.copy(newCenter);
      this.artwork.geometry = new ImageDecal(
        this.camera,
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

  updateArtworkSize = (ratio: number) => {
    if (this.artwork) {
      this.artworkRatio = ratio;
      this.artwork.geometry = new DecalGeometry(
        this.canvas,
        this.center,
        this.mouseHelper.rotation,
        this.artworkSize.clone().multiplyScalar(ratio)
      );
    }
  };

  hide = () => {
    this.uploadArtworkPlaceholder.visible = false;
    (this.canvas.material as THREE.MeshStandardMaterial).setValues({
      opacity: 0.4,
    });
  };

  show = () => {
    this.uploadArtworkPlaceholder.visible = false;
    (this.canvas.material as THREE.MeshStandardMaterial).setValues({
      opacity: 0.4,
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
      this.crystalizeStyle = style;
      let newMaterial = Boundary.decalMaterial.clone();
      switch (style) {
        case TextureOption.ScreenPrint:
          newMaterial.map = this.originalTexture;
          break;
        case TextureOption.Metallic:
          const textureLoader = new THREE.TextureLoader();
          const { uri, width, height } = await ImageHelper.generateAlphaMap(
            this.originalTexture?.image?.src
          );
          const colorMapUri = await ImageHelper.cropImageToRatio(
            "assets/crystal-map.png",
            width / height
          );
          const newColorMap = textureLoader.load(colorMapUri);
          const newAlphaMap = textureLoader.load(uri);
          newMaterial.map = newColorMap;
          newMaterial.alphaMap = newAlphaMap;
          break;
      }
      this.artwork.material = newMaterial;
      this.setBoundaryStateOnEditing();
    }
  };
}
