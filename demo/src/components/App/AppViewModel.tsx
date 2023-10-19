import { Viewer3D } from 'microstore-3d';
import { deafultModelConfig } from '../../config';
import { AppModel } from './AppModel';

export function AppViewModel() {
  const model = AppModel();

  const loadViewer = async (canvasElement: HTMLCanvasElement) => {
    const viewer = new Viewer3D(canvasElement);
    model.setViewer(viewer);
    await viewer.loadModel('./tshirt.glb', () => {});
    viewer.configureModel(deafultModelConfig);
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
