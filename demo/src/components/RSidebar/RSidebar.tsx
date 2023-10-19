import { Viewer3D } from 'microstore-3d';
import { ValidationResults } from '../../types';
import { RSidebarViewModel } from './RSidebarViewModel';
import { RSidebarView } from './RSidebarView';

type RSidebarProps = {
  viewer: Viewer3D | null;
  workingModel: string | null;
  setWorkingModel: (model: string | null) => void;
  setValidationResult: (result: ValidationResults | null) => void;
};

export function RSidebar(props: RSidebarProps) {
  const viewModel = RSidebarViewModel({
    viewer: props.viewer,
    workingModel: props.workingModel,
    setWorkingModel: props.setWorkingModel,
    setValidationResult: props.setValidationResult,
  });

  return <RSidebarView {...viewModel}></RSidebarView>;
}
