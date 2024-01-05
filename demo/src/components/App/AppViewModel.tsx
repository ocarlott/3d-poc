import { Viewer3D } from 'microstore-3d';
import { defaultModelConfig } from '../../config';
import { AppModel } from './AppModel';

export function AppViewModel() {
  const model = AppModel();

  const loadViewer = async (canvasElement: HTMLCanvasElement) => {
    if (model.hasViewerLoaded()) {
      console.warn('Already loaded once');
      return false;
    }

    const viewer = new Viewer3D(canvasElement);
    model.setViewer(viewer);
    await viewer.loadModel('./tshirt.glb', () => {});
    viewer.configureModel(defaultModelConfig);
    return viewer;
  };

  return {
    loadViewer,
    canvasRef: model.canvasRef,
    workingModel: model.workingModel,
    validationResults: model.validationResults,
    setValidationResult: model.setValidationResult,
    viewer: model.viewer,
    setWorkingModel: model.setWorkingModel,
  };
}
