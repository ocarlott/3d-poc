import * as THREE from 'three';

export class LightManager {
  private _lightAmbient: THREE.AmbientLight;
  private _lightGroup = new THREE.Group();

  constructor() {
    this._lightAmbient = new THREE.AmbientLight('#FFFFFF', 0.8);

    this._lightGroup.add(this._lightAmbient);

    this._positionLights();
  }

  private _positionLights(): void {}

  getLightGroup() {
    return this._lightGroup;
  }
}
