import { useLayoutEffect } from 'react';
import { AppViewModel } from './AppViewModel';
import { AppView } from './AppView';

function App() {
  const viewModel = AppViewModel();

  // FIXME: This affects UI so leaving it in view controller. Should this be in AppViewModel instead?
  useLayoutEffect(() => {
    if (viewModel.canvasRef.current) {
      viewModel.loadViewer(viewModel.canvasRef.current);
    }
  }, []);

  return (
    <AppView
      canvasRef={viewModel.canvasRef}
      setWorkingModel={viewModel.setWorkingModel}
      setValidationResult={viewModel.setValidationResult}
      viewer={viewModel.viewer}
      workingModel={viewModel.workingModel}
      validationResults={viewModel.validationResults}
    ></AppView>
  );
}

export default App;
