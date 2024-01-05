import Modal from 'react-modal';
import { ValidationResults } from '../../types';
import { Viewer3D } from 'microstore-3d';
import { RModalViewModel } from './RModalViewModel';
import { RModalView } from './RModalView';

Modal.setAppElement('#root'); // Set the root element for the modal

type RModalProps = {
  setValidationResult: (result: ValidationResults | null) => void;
  viewer: Viewer3D | null;
  workingModel: string | null;
  validationResults: ValidationResults | null;
};

export function RModal(props: RModalProps) {
  const viewModel = RModalViewModel({
    viewer: props.viewer,
    workingModel: props.workingModel,
    setValidationResult: props.setValidationResult,
    validationResults: props.validationResults,
  });

  return (
    <RModalView
      validationResults={props.validationResults}
      validationRef={viewModel.validationRef}
      isOpen={viewModel.isOpen}
      onRequestClose={viewModel.onRequestClose}
      handleDownload={viewModel.handleDownload}
    ></RModalView>
  );
}
