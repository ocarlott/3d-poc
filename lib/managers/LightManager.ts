import * as THREE from 'three';

export class LightManager {
  private _lights: { position: THREE.Vector3; light: THREE.SpotLight }[] = [];
  private _ambientLight = new THREE.AmbientLight('#f1e9e9', 3);
  private _lightGroup = new THREE.Group();
  private _lightGroupHeper = new THREE.Group();
  private _spotLightHelpers: THREE.SpotLightHelper[] = [];
  private _devMode = false;

  constructor() {
    this._lights = [
      {
        position: new THREE.Vector3(0, 30, 40),
        light: new THREE.SpotLight('#FFEFE0', 5, 100, Math.PI / 2, 1, 0),
      },
      {
        position: new THREE.Vector3(0, 30, -40),
        light: new THREE.SpotLight('#FFEFE0', 5, 100, Math.PI / 2, 1, 0),
      },
    ];
    this._lights.forEach((l) => {
      const helper = new THREE.SpotLightHelper(
        l.light,
        new THREE.Color(Math.random(), Math.random(), Math.random()),
      );
      helper.visible = this._devMode;
      this._spotLightHelpers.push(helper);
    });
    this._lightGroup.add(...this._lights.map((l) => l.light), this._ambientLight);
    this._lightGroupHeper.add(...this._spotLightHelpers);

    this._positionLights();
  }

  setDeveloperMode(isInDeveloperMode: boolean) {
    this._devMode = isInDeveloperMode;
    this._spotLightHelpers.forEach((h) => {
      h.visible = this._devMode;
    });
  }

  private _positionLights(): void {
    this._lights.forEach((l) => {
      l.light.position.set(l.position.x, l.position.y, l.position.z);
    });
    this._spotLightHelpers.forEach((h) => {
      h.update();
    });
  }

  getLightGroup() {
    return this._lightGroup;
  }

  getLightGroupHelper() {
    return this._lightGroupHeper;
  }
}
