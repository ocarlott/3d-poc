import { TextureOption, Viewer3D } from 'microstore-3d';
import { ValidationResults } from '../../types';
import { RSidebarModel } from './RSidebarModel';
import { defaultModelConfig } from '../../config';
import { useEffect } from 'react';

type RSidebarViewModelProps = {
  viewer: Viewer3D | null;
  workingModel: string | null;
  setWorkingModel: (model: string | null) => void;
  setValidationResult: (result: ValidationResults | null) => void;
};

export function RSidebarViewModel({
  viewer,
  workingModel,
  setWorkingModel,
  setValidationResult,
}: RSidebarViewModelProps) {
  const model = RSidebarModel();
  let currentTexture: TextureOption | null = null;

  const nextBoundary = () => {
    return () => {
      if (viewer) {
        const boundaries = viewer.getAllBoundaries();
        if (boundaries.length > 0) {
          if (model.boundaryActive) {
            const index = boundaries.indexOf(model.boundaryActive);
            if (index === -1) {
              model.setBoundaryActive(boundaries[0]);
            } else {
              model.setBoundaryActive(boundaries[(index + 1) % boundaries.length]);
            }
          } else {
            model.setBoundaryActive(boundaries[0]);
          }
        }
      }
    };
  };

  const addArtwork = async () => {
    if (model.boundaryActive && viewer) {
      await viewer?.changeArtwork(
        {
          boundary: model.boundaryActive.name,
          artworkUrl: './logo.png',
          sizeRatio: 0.5,
          // sizeRatioLimit: 0.7,
          xRatio: 0.5,
          yRatio: 0.2,
        },
        false,
      );
    }
  };

  const getModelDimensions = () => {
    if (viewer) {
      const { height, width } = viewer.getModelDimensions();
      return { height, width };
    }
    return { height: 0, width: 0 };
  };

  const toggleAutoRotate = () => viewer?.toggleAutoRotate();

  const toggleDeveloperMode = () => viewer?.toggleDeveloperMode();

  const removeArtwork = () => {
    viewer?.removeArtwork(defaultModelConfig.app.boundary);
    model.setBoundaryActive(null);
  };

  function onFileChange() {
    return async () => {
      if (viewer && model.fileRef.current) {
        const file = model.fileRef.current?.files?.[0];

        if (file) {
          if (model.uploadingFileType === 'model') {
            const res = file.name.split('.');
            setWorkingModel(res[0]);
            model.setBoundaryActive(null);
            const uri = URL.createObjectURL(file);
            await viewer.loadModel(uri, () => {});
          } else {
            const uri = URL.createObjectURL(file);
            viewer.loadEnv(uri);
          }
        }
      }
    };
  }

  function resetModel() {
    return () => {
      if (viewer) {
        viewer.resetModel();
      }
    };
  }
  function resetAllColorsToDefault() {
    return () => {
      if (viewer) {
        viewer.resetAllColorsToDefault();
      }
    };
  }
  function resetAllBoundaries() {
    return () => {
      if (viewer) {
        viewer.resetAllBoundaries();
      }
    };
  }

  function changeTexture() {
    let textures = [
      TextureOption.Matte,
      TextureOption.Crystals,
      TextureOption.Metallic,
      TextureOption.Glitter,
    ];

    if (!currentTexture || textures.indexOf(currentTexture) === -1) {
      currentTexture = textures[0];
    } else {
      currentTexture = textures[(textures.indexOf(currentTexture) + 1) % textures.length];
    }

    if (viewer && currentTexture) {
      viewer.changeArtworkTexture(defaultModelConfig.app.boundary, '3585c9', currentTexture);
    }
  }

  function validateModel() {
    return async () => {
      if (viewer && model.fileRef.current && workingModel) {
        const result = await viewer.validateModel();
        setValidationResult(result);
      } else {
        alert('Please upload your model!');
      }
    };
  }

  function uploadModel() {
    return () => {
      if (viewer && model.fileRef.current) {
        model.setUploadingFileType('model');
        model.fileRef.current.click();
      }
    };
  }

  function uploadEnv() {
    return () => {
      if (viewer && model.fileRef.current) {
        model.setUploadingFileType('env');
        model.fileRef.current.click();
      }
    };
  }

  function createTechpack() {
    return async () => {
      if (viewer) {
        const newImages = await viewer.prepareFilesToExport();
        model.setImages(model.images.concat(newImages.map((img) => img.image)));
      }
    };
  }

  const takeSnapshot = async () => {
    if (viewer) {
      const image = viewer.takeScreenShot([
        {
          layerName: defaultModelConfig.app.panel,
          color: 'cccccc',
        },
      ]);
      model.setImages(model.images.concat(image));
    }
  };

  function takeSnapshotsAuto() {
    return async () => {
      if (viewer) {
        const newImages = viewer.takeScreenShotAuto();
        model.setImages(model.images.concat(newImages));
      }
    };
  }

  function takeSnapshot45() {
    return async () => {
      if (viewer) {
        const image = viewer.takeScreenShotAt(Math.PI / 4);
        model.setImages(model.images.concat(image));
      }
    };
  }

  function randomizeLayerColors() {
    return () => {
      if (viewer) {
        viewer.randomizeLayerColors();
      }
    };
  }

  function centerArtworkHorizontally() {
    return () => {
      if (model.boundaryActive) {
        model.boundaryActive.centerArtworkHorizontally();
      }
    };
  }

  function centerArtworkVertically() {
    return () => {
      if (model.boundaryActive) {
        model.boundaryActive.centerArtworkVertically();
      }
    };
  }

  const frameRateController = viewer?.frameRateController;

  const setFps = (fps: number) => {
    model.setFps(fps);
    frameRateController?.setTargetFps(fps);
  };

  useEffect(() => {
    if (frameRateController) {
      model.setFps(frameRateController.targetFps);
    }
  }, []);

  return {
    boundaryActive: model.boundaryActive,
    fileRef: model.fileRef,
    images: model.images,
    imageEditor: model.imageEditor,
    addArtwork,
    removeArtwork,
    toggleAutoRotate,
    toggleDeveloperMode,
    onFileChange,
    resetModel,
    validateModel,
    uploadModel,
    createTechpack,
    takeSnapshotsAuto,
    takeSnapshot45,
    takeSnapshot,
    changeTexture,
    resetAllColorsToDefault,
    resetAllBoundaries,
    getModelDimensions,
    nextBoundary,
    uploadEnv,
    randomizeLayerColors,
    frameRateController,
    setFps,
    fps: model.fps,
    centerArtworkHorizontally,
    centerArtworkVertically,
  };
}
