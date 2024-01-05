import { useRef, useState } from 'react';
import { Viewer3D } from 'microstore-3d';
import { ValidationResults } from '../../types';

export function AppModel() {
  const canvasRef = useRef(null);
  const viewerLoadedRef = useRef(false);
  const [workingModel, setWorkingModel] = useState<string | null>(null);
  const [viewer, _setViewer] = useState<Viewer3D | null>(null);
  const [validationResults, setValidationResult] = useState<ValidationResults | null>(null);
  const setViewer = (viewer: Viewer3D) => {
    _setViewer(viewer);
    viewerLoadedRef.current = true;
  };

  const hasViewerLoaded = () => viewerLoadedRef.current;

  return {
    canvasRef,
    workingModel,
    setWorkingModel,
    hasViewerLoaded,
    viewer,
    setViewer,
    validationResults,
    setValidationResult,
  };
}
