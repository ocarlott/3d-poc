import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

export class SceneBuilder {
  static createCamera(aspectRatio = 1): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(70, aspectRatio, 0.1, 80);
  }

  static createScene() {
    const scene = new THREE.Scene();
    const rgbeLoader = new RGBELoader();
    const texture = rgbeLoader.load('./env.hdr');
    texture.offset.y = Math.PI / 2;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = new THREE.Color('#f1e9e9');
    return scene;
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
