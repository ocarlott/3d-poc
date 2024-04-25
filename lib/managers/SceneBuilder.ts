import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

export class SceneBuilder {
  static createCamera(aspectRatio = 1): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80);
  }

  static createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f5f5f5');
    return scene;
  }

  static createRenderer(canvas: HTMLCanvasElement, scene: THREE.Scene): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.toneMappingExposure = 0.8;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const hdriLoader = new RGBELoader();
    hdriLoader.load('/env.hdr', (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      texture.dispose();
      pmremGenerator.dispose();
    });
    return renderer;
  }
}
