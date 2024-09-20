import * as THREE from 'three';

export class Edge {
  startPoint: number;
  endPoint: number;

  constructor(startPoint: number, endPoint: number) {
    this.startPoint = startPoint;
    this.endPoint = endPoint;
  }

  compare(otherEdge: Edge): boolean {
    if (this.startPoint === otherEdge.startPoint && this.endPoint === otherEdge.endPoint) {
      return true;
    }
    if (this.startPoint === otherEdge.endPoint && this.endPoint === otherEdge.startPoint) {
      return true;
    }
    return false;
  }
}

export class Point {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export class MedialAxis {
  edges: Edge[];
  points: Point[];
  needToReverse: boolean;

  constructor() {
    this.edges = [];
    this.points = [];
    this.needToReverse = false;
  }

  addPoints(points: number[][]) {
    points.forEach((point) => {
      this.points.push(new Point(point[0], point[1], point[2]));
    });
  }

  addEdge(edge: Edge) {
    if (!this.hasSimilarEdge(edge)) {
      this.edges.push(edge);
    }
  }

  hasSimilarEdge(newEdge: Edge): boolean {
    for (const existingEdge of this.edges) {
      if (existingEdge.compare(newEdge)) {
        return true;
      } else {
        if (existingEdge == newEdge) {
          return true;
        }
      }
    }
    return false;
  }

  findStartEdge(): Edge | null {
    for (const edge of this.edges) {
      if (this.isPointShared(edge.startPoint, edge) || this.isPointShared(edge.endPoint, edge)) {
        return edge;
      }
    }
    return null;
  }

  isPointShared(point: number, edge: Edge): boolean {
    for (const otherEdge of this.edges) {
      if (otherEdge !== edge && (otherEdge.startPoint === point || otherEdge.endPoint === point)) {
        return true;
      }
    }
    return false;
  }

  orderedEdges(startEdge?: Edge): Edge[] {
    if (!startEdge) {
      startEdge = this.edges[0];
    }
    const ordered: Edge[] = [startEdge];
    let currentEdge: Edge | null = startEdge;
    const processedEdges = new Set<Edge>();
    this.needToReverse = false;
    processedEdges.add(currentEdge);

    while (ordered.length < this.edges.length) {
      let seedPoint = currentEdge.endPoint;
      if (this.needToReverse) {
        seedPoint = currentEdge.startPoint;
      }
      this.needToReverse = false;
      const nextEdge = this.findConnectedEdge(seedPoint, processedEdges);
      if (nextEdge) {
        if (!this.needToReverse) {
          ordered.push(nextEdge);
        } else {
          ordered.push(new Edge(nextEdge.endPoint, nextEdge.startPoint));
        }
        currentEdge = nextEdge;
      } else {
        break;
      }
    }

    return ordered;
  }

  findConnectedEdge(point: number, processedEdges: Set<Edge>): Edge | null {
    for (const edge of this.edges) {
      if (!processedEdges.has(edge)) {
        if (edge.startPoint === point) {
          processedEdges.add(edge);
          return edge;
        }
        if (edge.endPoint === point) {
          processedEdges.add(edge);
          this.needToReverse = true;
          return edge;
        }
      }
    }
    return null;
  }
}

export class BoundaryPointsEvaluator {
  private boundaryEdges: number[][] | null = null;
  private boundaryPoints: { x: number; y: number }[] = [];
  private geometry: THREE.BufferGeometry;
  constructor(inGeometry: THREE.BufferGeometry) {
    this.geometry = inGeometry;
    this.evaluateBoundaryPoints(inGeometry);
  }

  private evaluateBoundaryPoints(inGeometry: THREE.BufferGeometry) {
    if (!inGeometry.index) return;
    const indices: number[] = Array.from(inGeometry.index.array as Float64Array);
    const uvEdgeCount: { [key: string]: number } = {};

    // Count the occurrences of UV edges
    for (let i = 0; i < indices.length; i += 3) {
      const uvIndex1 = indices[i] * 2;
      const uvIndex2 = indices[i + 1] * 2;
      const uvIndex3 = indices[i + 2] * 2;

      this.incrementUVEdgeCount(uvIndex1, uvIndex2, uvEdgeCount);
      this.incrementUVEdgeCount(uvIndex2, uvIndex3, uvEdgeCount);
      this.incrementUVEdgeCount(uvIndex3, uvIndex1, uvEdgeCount);
    }

    const localBoundaryEdges: number[][] = [];

    // Collect boundary UV points
    for (const edge in uvEdgeCount) {
      if (uvEdgeCount[edge] === 1) {
        const [uvIndex1, uvIndex2] = edge.split('_').map(Number);
        localBoundaryEdges.push([uvIndex1, uvIndex2]);
      }
    }
    this.boundaryEdges = localBoundaryEdges;
  }

  private incrementUVEdgeCount(
    uv1: number,
    uv2: number,
    uvEdgeCount: { [key: string]: number },
  ): void {
    const key = uv1 < uv2 ? `${uv1}_${uv2}` : `${uv2}_${uv1}`;
    uvEdgeCount[key] = (uvEdgeCount[key] || 0) + 1;
  }

  private calculateBoundaryPoints(isOrdered: boolean) {
    const boundaryEdges = this.boundaryEdges;
    const uvs = this.geometry.attributes.uv.array;
    if (!boundaryEdges) return;
    if (!isOrdered) {
      this.boundaryPoints = [];
      for (let index = 0; index < boundaryEdges.length; index++) {
        this.boundaryPoints.push({
          x: uvs[boundaryEdges[index][0]],
          y: uvs[boundaryEdges[index][1]],
        });
      }
    } else {
      const medialAxis = new MedialAxis();
      for (let index = 0; index < boundaryEdges.length; index++) {
        medialAxis.addEdge(new Edge(boundaryEdges[index][0], boundaryEdges[index][1]));
      }

      const findStartEdge = medialAxis.findStartEdge();
      if (!findStartEdge) return;
      const orderedEdges = medialAxis.orderedEdges(findStartEdge);
      const polygonPoint = new Set();
      orderedEdges.forEach((edge) => {
        polygonPoint.add(edge.startPoint);
      });
      polygonPoint.forEach((point) => {
        this.boundaryPoints.push({
          x: uvs[point as number],
          y: uvs[(point as number) + 1],
        });
      });
    }
  }

  public getBoundaryEdges(): number[][] | null {
    return this.boundaryEdges;
  }

  public getBoundaryPoints(isOrdered: boolean): { x: number; y: number }[] {
    this.calculateBoundaryPoints(isOrdered);
    return this.boundaryPoints;
  }
}

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

  static getUVBoundaryForGeometry = (geometry: THREE.BufferGeometry) => {
    const boundaryPointsEvaluator = new BoundaryPointsEvaluator(geometry);
    return boundaryPointsEvaluator.getBoundaryPoints(true);
  };
}
