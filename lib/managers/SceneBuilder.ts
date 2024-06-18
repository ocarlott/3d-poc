import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

export class SceneBuilder {
  static createCamera(aspectRatio = 1): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80);
  }

  static createTechPackCamera(): THREE.OrthographicCamera {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
  }

  static createStationaryScreenshotCameras(aspectRatio = 1): THREE.PerspectiveCamera[] {
    return [
      new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80),
      new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80),
      new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80),
      new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80),
    ];
  }

  static createRotatableScreenshotCamera(aspectRatio = 1): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80);
  }

  static createScene(backgroundColor = '#f5f5f5') {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    return scene;
  }

  static createRenderer(
    scene: THREE.Scene,
    options: {
      withDrawingBuffer?: boolean;
      canvas?: HTMLCanvasElement;
    },
  ): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: options.withDrawingBuffer,
    });
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
