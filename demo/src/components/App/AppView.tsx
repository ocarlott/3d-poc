import React from 'react';
import { Canvas, Container, CanvasContainer } from '../../AppStyles';
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
      <div
        ref={(ref) => {
          if (ref && props.viewer?.statsView) {
            ref.appendChild(props.viewer.statsView);
          }
        }}
      />
      <RModal
        workingModel={props.workingModel}
        validationResults={props.validationResults}
        setValidationResult={props.setValidationResult}
        viewer={props.viewer}
      />
      <CanvasContainer>
        <Canvas ref={props.canvasRef} />
      </CanvasContainer>
      <RSidebar
        workingModel={props.workingModel}
        setWorkingModel={props.setWorkingModel}
        setValidationResult={props.setValidationResult}
        viewer={props.viewer}
      />
    </Container>
  );
}
