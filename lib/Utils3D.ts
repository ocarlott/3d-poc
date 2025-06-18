import * as THREE from 'three';
import hull from 'hull.js';
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';

export class Utils3D {
  static getSizeAndCenter = (obj: THREE.Object3D) => {
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(obj);
    let size = boundingBox.getSize(new THREE.Vector3());
    const center = boundingBox.getCenter(new THREE.Vector3());
    return {
      size,
      center,
      min: boundingBox.min,
      max: boundingBox.max,
    };
  };

  static disposeNode = (node: THREE.Object3D) => {
    if (node instanceof THREE.Mesh) {
      if (node.geometry) {
        node.geometry.dispose();
      }

      if (node.material) {
        Utils3D.disposeMaps(node.material);
        node.material.dispose();
      }
    }
  };

  static disposeHierarchy = (node: THREE.Object3D) => {
    for (var i = node.children.length - 1; i >= 0; i--) {
      var child = node.children[i];
      Utils3D.disposeMaps(child);
      Utils3D.disposeHierarchy(child);
      Utils3D.disposeNode(child);
    }
  };

  static disposeMaps = (node: any) => {
    if (node?.map) {
      node.map.dispose();
    }
    if (node?.lightMap) {
      node.lightMap.dispose();
    }
    if (node?.bumpMap) {
      node.bumpMap.dispose();
    }
    if (node?.normalMap) {
      node.normalMap.dispose();
    }
    if (node?.specularMap) {
      node.specularMap.dispose();
    }
    if (node?.envMap) {
      node.envMap.dispose();
    }
    if (node?.alphaMap) {
      node.alphaMap.dispose();
    }
    if (node?.aoMap) {
      node.aoMap.dispose();
    }
    if (node?.displacementMap) {
      node.displacementMap.dispose();
    }
    if (node?.emissiveMap) {
      node.emissiveMap.dispose();
    }
    if (node?.gradientMap) {
      node.gradientMap.dispose();
    }
    if (node?.metalnessMap) {
      node.metalnessMap.dispose();
    }
    if (node?.roughnessMap) {
      node.roughnessMap.dispose();
    }
    if (node?.displacementMap) {
      node.displacementMap.dispose();
    }
  };

  static getUVBoundaryForGeometry = (geometry: THREE.BufferGeometry) => {
    const uvArray = geometry.attributes.uv.array;
    const uvs: number[][] = [];
    for (let i = 0; i < uvArray.length; i += 2) {
      uvs.push([uvArray[i] * 1000, uvArray[i + 1] * 1000]);
    }
    const hullPoints = hull(uvs, 120) as number[][];
    return hullPoints.map((point) => [point[0] / 1000, point[1] / 1000]);
  };
}
