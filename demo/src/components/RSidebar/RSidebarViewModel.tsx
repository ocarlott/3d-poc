import { Viewer3D } from 'microstore-3d';
import { ValidationResults } from '../../types';
import { RSidebarModel } from './RSidebarModel';

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

  const addArtwork = async () => {
    const boundary =
      (await viewer?.changeArtwork(
        {
          boundary: 'ContourFitJacket_boundary_front',
          canvas: model.canvas2DContainerRef.current ?? undefined,
          artworkUrl: './logo.png',
          sizeRatio: 0.5,
          xRatio: 0.5,
          yRatio: 0.5,
        },
        false
      )) ?? null;
    model.setCurrentBoundary(boundary);
  };

  const toggleAutoRotate = () => viewer?.toggleAutoRotate();

  const toggleDeveloperMode = () => viewer?.toggleDeveloperMode();

  const removeArtwork = () => {
    viewer?.removeArtwork('CropT_boundary_front');
    model.setCurrentBoundary(null);
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
        const newImages = await viewer.createTechPack();
        model.setImages(model.images.concat(newImages));
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
    canvas2DContainerRef: model.canvas2DContainerRef,
    currentBoundary: model.currentBoundary,
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
  };
}