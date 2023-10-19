import { Boundary } from 'microstore-3d/lib/Boundary';
import { Button, Image, ImageList, SideBar } from '../../AppStyles';

export function RSidebarView(props: {
  toggleAutoRotate: () => any;
  toggleDeveloperMode: () => any;
  addArtwork: () => any;
  removeArtwork: () => any;
  takeSnapshot: () => any;
  takeSnapshot45: () => () => any;
  takeSnapshotsAuto: () => () => any;
  createTechpack: () => () => any;
  uploadModel: () => () => any;
  validateModel: () => () => any;
  resetModel: () => () => any;
  onFileChange: () => () => any;
  canvas2DContainerRef: React.RefObject<HTMLCanvasElement>;
  fileRef: React.RefObject<HTMLInputElement>;
  images: string[];
  currentBoundary: Boundary | null;
}) {
  return (
    <SideBar>
      <Button onClick={props.toggleAutoRotate}>Toggle Rotate</Button>
      <Button onClick={props.toggleDeveloperMode}>Toggle Dev Mode</Button>
      <Button onClick={props.addArtwork}>Add Artwork</Button>
      <Button onClick={props.removeArtwork}>Remove Artwork</Button>
      <Button onClick={props.takeSnapshot}>Take Snapshot</Button>
      <Button onClick={props.takeSnapshot45()}>Take Snapshot At 45</Button>
      <Button onClick={props.takeSnapshotsAuto()}>Take Snapshot Auto</Button>
      <Button onClick={props.createTechpack()}>Create Teck Pack</Button>
      <Button onClick={props.uploadModel()}>Upload Model</Button>
      <Button onClick={props.validateModel()}>Validate Model</Button>
      <Button onClick={props.resetModel()}>Reset Model</Button>

      <canvas
        ref={props.canvas2DContainerRef}
        hidden={!props.currentBoundary}
        width={500}
        height={500}
      ></canvas>

      <input
        type="file"
        ref={props.fileRef}
        onChange={props.onFileChange()}
        style={{
          width: 0.1,
          height: 0.1,
        }}
      />

      <ImageList>
        {props.images.map((image, index) => (
          <Image key={index + 'i'} src={image} />
        ))}
      </ImageList>
    </SideBar>
  );
}
