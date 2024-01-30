import { TextureOption, Viewer3D } from 'microstore-3d';
import { ValidationResults } from '../../types';
import { RSidebarModel } from './RSidebarModel';
import { defaultModelConfig } from '../../config';

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

  const addArtwork = async () => {
    const boundary =
      (await viewer?.changeArtwork(
        {
          boundary: defaultModelConfig.app.boundary,
          artworkUrl: './logo.png',
          sizeRatio: 0.5,
          xRatio: 0.5,
          yRatio: 0.2,
        },
        false,
      )) ?? null;
    model.setBoundaryActive(boundary);
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
          const res = file.name.split('.');
          setWorkingModel(res[0]);
          const uri = URL.createObjectURL(file);
          await viewer.loadModel(uri, () => {});
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
      const image = await viewer.takeScreenShot();
      model.setImages(model.images.concat(image));
    }
  };

  function takeSnapshotsAuto() {
    return async () => {
      if (viewer) {
        const newImages = await viewer.takeScreenShotAuto();
        model.setImages(model.images.concat(newImages));
      }
    };
  }

  function takeSnapshot45() {
    return async () => {
      if (viewer) {
        const image = await viewer.takeScreenShotAt(Math.PI / 4);
        model.setImages(model.images.concat(image));
      }
    };
  }

  return {
    boundaryActive: model.boundaryActive,
    fileRef: model.fileRef,
    images: model.images,
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
  };
}
