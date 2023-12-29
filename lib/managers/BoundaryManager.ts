import { Boundary } from '../core/Boundary';
import { TextureOption } from '../type';

export class BoundaryManager {
  private _boundaryList: Boundary[] = [];
  private _selectedBoundary: Boundary | null = null;
  private _onArtworkChanged?: (params: {
    forBoundary: string;
    xRatio: number;
    yRatio: number;
    whRatio: number;
    sizeRatio: number;
    rotation: number;
  }) => void;

  constructor() {
    this._boundaryList = [];
  }

  get boundaryList() {
    return this._boundaryList;
  }

  addBoundary(boundary: Boundary) {
    this._boundaryList.push(boundary);
  }

  resetBoundaryList() {
    this._boundaryList = [];
  }

  resetAllBoundarys() {
    this._boundaryList.forEach((bd) => bd.resetBoundary());
  }

  findByName(name: string) {
    return this._boundaryList.find((b) => b.name === name);
  }

  organizeGroup() {
    this._boundaryList.forEach((child) => {
      child.organizeGroup();
    });
  }

  unselectBoundary() {
    this._selectedBoundary = null;
  }

  setDeveloperMode(isInDeveloperMode: boolean) {
    this._boundaryList.forEach((bd) => bd.setDeveloperMode(isInDeveloperMode));
  }

  loadBoundary(castedChild: THREE.Mesh, techPackBoundary: THREE.Mesh | null) {
    if (!techPackBoundary) {
      console.error(`Could not find techpack version of ${castedChild.name}`);
    } else {
      const bd = new Boundary(castedChild, techPackBoundary);
      this.addBoundary(bd);
    }
  }

  validateIfAllExists(boundaryNames: string[]) {
    return boundaryNames.every((boundary) => !!this.findByName(boundary));
  }

  updateListeners = (
    onArtworkChanged: (params: {
      forBoundary: string;
      xRatio: number;
      yRatio: number;
      whRatio: number;
      sizeRatio: number;
      rotation: number;
    }) => void,
  ) => {
    this._onArtworkChanged = onArtworkChanged;
  };

  animateSelectBoundary = (boundary: string) => {
    const selectingBoundary = this._boundaryList.find((bd) => bd.name === boundary) ?? null;
    if (selectingBoundary?.name !== this._selectedBoundary?.name && selectingBoundary !== null) {
      this._selectedBoundary = selectingBoundary;
      const boundaryPosition = this._selectedBoundary.center;
      const boundaryNormal = this._selectedBoundary.normal;
      // this._controls.setLookAt
      // const cameraPosition = boundaryPosition
      //   .clone()
      //   .add(
      //     boundaryNormal
      //       .clone()
      //       .multiplyScalar(this._controls.maxDistance * 0.65)
      //   );
      // new TWEEN.Tween(this._camera.position)
      //   .to(cameraPosition)
      //   .easing(TWEEN.Easing.Quadratic.InOut)
      //   .onUpdate(() => {
      //     this._camera.lookAt(boundaryPosition);
      //   })
      //   .start();
    }
    return selectingBoundary;
  };

  changeArtwork = async (
    options: {
      boundary: string;
      canvas?: HTMLCanvasElement;
      artworkUrl: string;
      xRatio?: number;
      yRatio?: number;
      rotation?: number;
      sizeRatio?: number;
      shouldShowOriginalArtwork?: boolean;
    },
    disableEditing = true,
  ) => {
    const {
      boundary,
      xRatio = 0.5,
      yRatio = 0.5,
      rotation = 0,
      sizeRatio = 0.5,
      artworkUrl,
      canvas,
      shouldShowOriginalArtwork,
    } = options;

    let boundaryObj = this.findByName(boundary) ?? null;

    await boundaryObj?.addArtwork({
      workingCanvas: canvas,
      artworkUrl,
      xRatio,
      yRatio,
      rotation,
      sizeRatio,
      onArtworkChanged: this._onArtworkChanged,
      disableEditing,
      shouldShowOriginalArtwork,
    });
    return boundaryObj;
  };

  resetArtworkToDefault = (boundary: string) => {
    // TODO: implement..
  };

  removeArtwork = (boundary: string) => {
    const rBoundary = this.findByName(boundary);
    rBoundary?.resetBoundary();
  };

  removeAllBoundaryArtworks = () => {
    this._boundaryList.map((bd) => {
      return this.removeArtwork(bd.name);
    });
  };

  testChangeAllBoundaryArtworks = async (artworkUrl: string) => {
    await Promise.all(
      this._boundaryList.map((bd) => {
        return this.changeArtwork({
          boundary: bd.name,
          artworkUrl,
        });
      }),
    );
  };

  resetArtworkTextureToDefault = (boundary: string) => {
    // TODO: implement..
  };

  changeArtworkTexture = async (boundary: string, color: string, textureOption: TextureOption) => {
    const bd = this._boundaryList.find((b) => b.name === boundary);
    if (bd) {
      await bd.applyTextureApplication({
        color,
        textureOption,
      });
    }
  };

  resetArtworkTexture = (boundary: string) => {
    const bd = this._boundaryList.find((b) => b.name === boundary);
    if (bd) {
      bd.resetTextureApplication();
    }
  };

  exportData = () => {
    return this._boundaryList.map((bd) => bd.exportArtworkData());
  };
}
