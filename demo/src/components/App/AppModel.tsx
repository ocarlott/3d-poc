import { useRef, useState } from 'react';
import { Viewer3D } from 'microstore-3d';
import { ValidationResults } from '../../types';

export function AppModel() {
  const canvasRef = useRef(null);
  const [workingModel, setWorkingModel] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer3D | null>(null);
  const [validationResults, setValidationResult] = useState<ValidationResults | null>(null);

  return {
    canvasRef,
    workingModel,
    setWorkingModel,
    viewer,
    setViewer,
    validationResults,
    setValidationResult,
  };
}
