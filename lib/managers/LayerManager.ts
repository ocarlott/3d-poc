import * as THREE from 'three';
import { Utils } from '../Utils';
import { ControlName } from '../type';

export class LayerManager {
  private _layerMap: Map<
    string,
    {
      displayName: string;
      mesh: THREE.Mesh;
    }
  >;
  private _extraLayers: Set<string>;

  constructor() {
    this._layerMap = new Map();
    this._extraLayers = new Set<string>();
  }

  get layerMap() {
    return this._layerMap;
  }

  changeLayerColor(layerName: string, color: string) {
    const entry = this.findByName(layerName);
    if (entry) {
      (entry.mesh.material as THREE.MeshStandardMaterial).setValues({
        color: `#${color.replace(/#/g, '')}`,
        opacity: 1,
      });
    } else {
      console.log('layer not found', layerName);
    }
  }

  findByName(name: string) {
    return this._layerMap.get(name);
  }

  isExtraLayer(name: string) {
    return this._extraLayers.has(name);
  }

  validateIfAllExists(layerNames: string[]) {
    return layerNames.every((layer) => !!this.findByName(layer));
  }

  validateLayersModel() {
    const colors = Utils.getShuffledColors();
    const layerList = Array.from(this._layerMap.values());
    layerList.forEach((layer, index) => {
      this.changeLayerColor(layer.mesh.name, colors[index]);
    });
  }

  clearLayerMap() {
    this._layerMap.clear();
  }

  loadLayer(castedChild: THREE.Mesh, opacityForUncoloredLayer: number) {
    const displayNameForChangableGroup = Utils.getDisplayNameIfChangeableGroup(castedChild.name);
    if (displayNameForChangableGroup) {
      (castedChild.material as THREE.MeshStandardMaterial).setValues({
        opacity: opacityForUncoloredLayer,
        alphaTest: 0.5,
      });
      if (this.findByName(displayNameForChangableGroup.groupName)) {
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
