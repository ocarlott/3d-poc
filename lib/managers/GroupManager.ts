import * as THREE from 'three';
import { ControlName } from '../type';
import { Boundary } from '../core/Boundary';
import { Utils } from '../Utils';

export class GroupManager {
  private _modelGroup!: THREE.Group;
  private _modelBoundingBox: THREE.Box3;
  constructor(modelGroup?: THREE.Group) {
    this._modelGroup = modelGroup || new THREE.Group();
    this._modelBoundingBox = new THREE.Box3();
  }

  private _reset() {
    this._modelGroup.removeFromParent();
    this._modelGroup = new THREE.Group();
  }

  reinit({ isInDeveloperMode }: { isInDeveloperMode: boolean }) {
    this._reset();

    const techPackGroup = new THREE.Group();
    techPackGroup.name = ControlName.TechPackGroup;
    techPackGroup.visible = !!isInDeveloperMode;

    const workingAssetGroup = new THREE.Group();
    workingAssetGroup.name = ControlName.WorkingAssetGroup;

    this.modelGroup.add(techPackGroup);
    this.modelGroup.add(workingAssetGroup);
  }

  load(obj: THREE.Group, allModelObjects: THREE.Mesh[]) {
    this._modelGroup.add(obj); //. used to be added at the end

    allModelObjects.forEach((child) => {
      const castedChild = child as THREE.Mesh;
      if (GroupManager.isTechPack(castedChild)) {
        this.techPackGroup!.add(castedChild);

        if (GroupManager.isNotBoundary(castedChild)) {
          castedChild.material = new THREE.MeshBasicMaterial();
        }
      } else {
        // isNotTechPack
        if (GroupManager.isShadow(castedChild)) {
          castedChild.name = ControlName.ShadowPlane;
        } else if (GroupManager.isNotBoundary(castedChild)) {
          const displayNameForChangableGroup = Utils.getDisplayNameIfChangeableGroup(
            castedChild.name,
          );

          if (displayNameForChangableGroup) {
            this.workingAssetGroup!.add(castedChild);
            if (!castedChild.userData) {
              castedChild.userData = {};
            }
            castedChild.userData['defaultColor'] = (
              castedChild.material as THREE.MeshStandardMaterial
            ).color.getHexString();
          }
        }
      }
    });
    this._modelBoundingBox.setFromObject(this.workingAssetGroup!);
  }

  getChildNamesListSnapshot() {
    const boundaryNames: string[] = [];
    const techPackNames: string[] = [];
    const layerNames: string[] = [];
    this._modelGroup.traverse((child) => {
      if (GroupManager.isTechPack(child)) {
        return techPackNames.push(child.name);
      }

      if (GroupManager.isBoundary(child)) {
        return boundaryNames.push(child.name);
      }

      if (GroupManager.isChangeableLayer(child)) {
        return layerNames.push(child.name);
      }
    });

    return {
      boundaryNames,
      techPackNames,
      layerNames,
    };
  }

  setBoundaries(boundaries: Boundary[]) {
    this.workingAssetGroup!.add(...boundaries.map((b) => b.group));
  }

  clone() {
    return new GroupManager(this._modelGroup.clone());
  }

  setDeveloperMode(isInDeveloperMode: boolean) {
    this.techPackGroup && (this.techPackGroup.visible = isInDeveloperMode);
  }

  resetAllColorsToDefault() {
    this._modelGroup.traverse((child) => {
      const castedChild = child as THREE.Mesh;
      const castedChildMaterial = castedChild.material as THREE.MeshStandardMaterial;
      if (castedChild.isMesh && !!castedChildMaterial) {
        castedChild.userData?.['defaultColor'] &&
          castedChildMaterial.setValues({
            color: new THREE.Color('#' + castedChild.userData['defaultColor']),
            // wireframe: true,
          });
      }
    });
  }

  animateUpdate() {
    this._modelGroup.rotation.y += 0.01;
  }

  update(shouldRotate: boolean) {
    shouldRotate && this.animateUpdate();
  }

  findByName(name: string) {
    return this._modelGroup.getObjectByName(name) as THREE.Mesh | undefined;
  }

  findTechpackEquivalentByName(name: string) {
    return this.findByName(GroupManager.formTechpackName(name));
  }

  get modelGroup() {
    return this._modelGroup;
  }

  get techPackGroup() {
    return this.findByName(ControlName.TechPackGroup);
  }

  get shadowPlane() {
    return this.findByName(ControlName.ShadowPlane);
  }

  get workingAssetGroup() {
    return this.findByName(ControlName.WorkingAssetGroup);
    // FIXME  is this needed?
    // return this._modelGroup.getObjectByName(ControlName.WorkingAssetGroup) as THREE.Object3D;
  }

  get modelBoundingBox() {
    return this._modelBoundingBox;
  }

  static formTechpackName(name: string) {
    return name + '_flat';
  }

  static isBoundary(obj: THREE.Mesh | THREE.Object3D) {
    return obj.name.toLowerCase().includes('boundary') && obj.name !== ControlName.BoundaryGroup;
  }

  static isNotBoundary(obj: THREE.Mesh | THREE.Object3D) {
    return !GroupManager.isBoundary(obj);
  }

  static isChangeableLayer(obj: THREE.Mesh | THREE.Object3D) {
    return obj.name.toLowerCase().includes('changeable');
  }

  static isTechPack(obj: THREE.Mesh | THREE.Object3D) {
    return obj.name.toLowerCase().includes('_flat');
  }

  static isNotTechPack(obj: THREE.Mesh | THREE.Object3D) {
    return !GroupManager.isTechPack(obj);
  }

  static isShadow(obj: THREE.Mesh | THREE.Object3D) {
    return obj.name.toLowerCase().includes('shadow');
  }
}
