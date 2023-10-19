import { Viewer3D } from '../../../../lib';
import html2canvas from 'html2canvas';
import { ValidationResults } from '../../types';
import { RModalModel } from './RModalModel';

export function RModalViewModel(props: {
  viewer: Viewer3D | null;
  workingModel: string | null;
  setValidationResult: (result: ValidationResults | null) => void;
  validationResults: ValidationResults | null;
}) {
  const model = RModalModel();

  const isOpen = !!props.validationResults;

  async function handleDownload() {
    if (model.validationRef.current && props.viewer && props.workingModel) {
      const canvas = await html2canvas(model.validationRef.current, {
        backgroundColor: '#242424',
      });

      const imgDataUrl = canvas.toDataURL();

      var link = document.createElement('a');
      document.body.appendChild(link);
      link.download = `${props.workingModel}-validation-result.jpg`;
      link.href = imgDataUrl;
      link.click();

      document.body.removeChild(link);
    }
  }

  const onRequestClose = () => {
    props.setValidationResult(null);
  };

  return {
    validationRef: model.validationRef,
    handleDownload,
    onRequestClose,
    isOpen,
  };
}
