import * as THREE from 'three';
import { ControlName } from '../type';
import { Boundary } from '../core/Boundary';
import { Utils } from '../Utils';

export class GroupManager {
  private _modelGroup!: THREE.Group;
  constructor(modelGroup?: THREE.Group) {
    this._modelGroup = modelGroup || new THREE.Group();
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

  load(obj: THREE.Group) {
    this._modelGroup.add(obj); //. used to be added at the end

    const techPackList: THREE.Mesh[] = [];
    const workingAssetsList: (THREE.Mesh | THREE.Group)[] = [];

    obj.traverse((child) => {
      const castedChild = child as THREE.Mesh;
      if (GroupManager.isTechPack(castedChild)) {
        techPackList.push(castedChild);

        if (GroupManager.isNotBoundary(castedChild)) {
          castedChild.material = new THREE.MeshBasicMaterial();
        }
      } else {
        // isNotTechPack

        if (GroupManager.isShadow(castedChild)) {
          castedChild.name = ControlName.ShadowPlane;
        } else if (GroupManager.isNotBoundary(castedChild)) {
          const displayNameForChangableGroup = Utils.getDisplayNameIfChangeableGroup(
            castedChild.name
          );
          if (displayNameForChangableGroup) {
            workingAssetsList.push(castedChild);
          }
        }
      }
    });

    this.techPackGroup!.add(...techPackList);
    this.workingAssetGroup!.add(...workingAssetsList);
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

  loadBoundaries(boundaries: Boundary[]) {
    for (let bd of boundaries) {
      this.modelGroup.add(bd.group);
      this.workingAssetGroup!.add(bd.group);
    }
  }

  clone() {
    return new GroupManager(this._modelGroup.clone());
  }

  setDeveloperMode(isInDeveloperMode: boolean) {
    this.techPackGroup && (this.techPackGroup.visible = isInDeveloperMode);
  }

  resetAllToWhite() {
    this._modelGroup.traverse((child) => {
      const castedChild = child as THREE.Mesh;
      const castedChildMaterial = castedChild.material as THREE.MeshStandardMaterial;
      if (castedChild.isMesh && !!castedChildMaterial) {
        castedChildMaterial.setValues({
          color: 'white',
          // wireframe: true,
        });
      }
    });
  }

  animateUpdate() {
    this._modelGroup.rotation.y += 0.01;
  }

  findByName(name: string) {
    return this._modelGroup.getObjectByName(name) as THREE.Mesh | undefined;
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

  static formTechpackName(name: string) {
    return name + '_flat';
  }

  static isBoundary(obj: THREE.Mesh | THREE.Object3D) {
    return obj.name.toLowerCase().includes('boundary');
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