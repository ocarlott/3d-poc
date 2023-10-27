import * as THREE from 'three';

export class SceneBuilder {
  static createCamera(aspectRatio = 1): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80);
  }

  static createScene() {
    return new THREE.Scene();
  }

  static createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
  }
}
