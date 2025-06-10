import * as THREE from 'three';
import { Utils } from '../Utils';
import { ControlName } from '../type';
import { Viewer3D } from '../Viewer';

export class LayerManager {
  private _layerMap: Map<
    string,
    {
      displayName: string;
      originalName: string;
    }
  >;
  private _extraLayers: Set<string>;
  private _viewer: Viewer3D;

  constructor(_viewer: Viewer3D) {
    this._layerMap = new Map();
    this._extraLayers = new Set<string>();
    this._viewer = _viewer;
  }

  get layerMap() {
    return this._layerMap;
  }

  private _markDirty = () => {
    this._viewer.markDirty();
  };

  changeLayerColor(layerName: string, color: string) {
    const entry = this.findByName(layerName);
    if (entry) {
      (
        this._viewer.groupManager.findByName(entry.originalName)
          ?.material as THREE.MeshStandardMaterial
      ).setValues({
        color: `#${color.replace(/#/g, '')}`,
        opacity: 1,
      });
      this._markDirty();
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

  randomizeLayerColors() {
    const colors = Utils.getShuffledColors();
    const layerList = Array.from(this._layerMap.values());
    layerList.forEach((layer, index) => {
      this.changeLayerColor(layer.originalName, colors[index % colors.length]);
    });
    this._markDirty();
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
          originalName: castedChild.name,
        });
      }
    } else if (castedChild.name !== ControlName.ShadowPlane) {
      this._extraLayers.add(castedChild.name);
    }
  }
}
