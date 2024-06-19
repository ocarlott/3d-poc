import * as THREE from 'three';

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
      Utils3D.disposeHierarchy(child);
      Utils3D.disposeNode(child);
    }
  };

  static disposeMaps = (node: any) => {
    node?.map?.dispose();
    node?.lightMap?.dispose();
    node?.bumpMap?.dispose();
    node?.normalMap?.dispose();
    node?.specularMap?.dispose();
    node?.envMap?.dispose();
    node?.alphaMap?.dispose();
    node?.aoMap?.dispose();
    node?.displacementMap?.dispose();
    node?.emissiveMap?.dispose();
    node?.gradientMap?.dispose();
    node?.metalnessMap?.dispose();
    node?.roughnessMap?.dispose();
  };
}
