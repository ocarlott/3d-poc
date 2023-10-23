import * as THREE from 'three';

export class LightManager {
  private _lightKey: THREE.SpotLight;
  private _lightRim: THREE.SpotLight;
  private _lightFill: THREE.SpotLight;
  private _lightRLeft: THREE.SpotLight;
  private _lightRRight: THREE.SpotLight;
  private _ambientLight: THREE.HemisphereLight;
  private _lightGroup = new THREE.Group();

  constructor() {
    this._lightKey = new THREE.SpotLight('#FFFFFF', 3, 75, 1.48, 1, 0);
    this._lightRim = new THREE.SpotLight('#CAEDF2', 1.75, 75, 1.48, 1, 0);
    this._lightFill = new THREE.SpotLight('#F0F8FF', 1.25, 75, 1.48, 1, 0);
    this._lightRLeft = new THREE.SpotLight('#FFEFE0', 0.5, 75, 1.48, 1, 0);
    this._lightRRight = new THREE.SpotLight('#FFEFE0', 0.75, 75, 1.48, 1, 0);
    this._ambientLight = new THREE.HemisphereLight('#C3E7F7', '#E5B8BD', 1);

    this._lightGroup.add(
      this._ambientLight,
      this._lightKey,
      this._lightRLeft,
      this._lightRRight,
      this._lightRim,
      this._lightFill
    );

    this._positionLights();
  }

  private _positionLights(): void {
    this._lightKey.position.set(-17.913, 30.212, 22.077);
    this._lightRLeft.position.set(-20.414, -2.904, -17.304);
    this._lightRRight.position.set(23.964, -2.904, -16.006);
    this._lightRim.position.set(27.919, 33.64, -31.806);
    this._lightFill.position.set(41.535, 18.52, 24.681);
  }

  getLightGroup() {
    return this._lightGroup;
  }
}
