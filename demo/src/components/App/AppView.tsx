import React from 'react';
import { Canvas, Container } from '../../AppStyles';
import { RModal } from '../RModal/RModal';
import { RSidebar } from '../RSidebar/RSidebar';
import { Viewer3D } from 'microstore-3d';
import { ValidationResults } from '../../types';

export function AppView(props: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  setWorkingModel: (model: string | null) => void;
  setValidationResult: (result: ValidationResults | null) => void;
  viewer: Viewer3D | null;
  workingModel: string | null;
  validationResults: ValidationResults | null;
}) {
  return (
    <Container>
      <RModal
        workingModel={props.workingModel}
        validationResults={props.validationResults}
        setValidationResult={props.setValidationResult}
        viewer={props.viewer}
      />
      <Canvas ref={props.canvasRef} />
      <RSidebar
        workingModel={props.workingModel}
        setWorkingModel={props.setWorkingModel}
        setValidationResult={props.setValidationResult}
        viewer={props.viewer}
      />
    </Container>
  );
}
