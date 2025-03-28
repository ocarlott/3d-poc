import { Button, Image, ImageList, SideBar } from '../../AppStyles';
import { useRef, useState } from 'react';
import { RSidebarViewModel } from './RSidebarViewModel';

export function RSidebarView(props: ReturnType<typeof RSidebarViewModel>) {
  const [sensitivity, setSensitivity] = useState(5);
  const imageUploaderRef = useRef<HTMLInputElement>(null);

  return (
    <SideBar>
      <input
        type="range"
        min="1"
        max="120"
        step="1"
        value={props.fps}
        onChange={(e) => {
          props.setFps(parseInt(e.target.value));
        }}
      />
      <Button onClick={props.toggleAutoRotate}>Toggle Rotate</Button>
      <Button onClick={props.toggleDeveloperMode}>Toggle Dev Mode</Button>
      <Button onClick={props.addArtwork}>Add Artwork</Button>
      <Button onClick={props.getModelDimensions}>Print Dimensions</Button>
      <Button onClick={props.changeTexture}>Change Texture</Button>
      <Button onClick={props.removeArtwork}>Remove Artwork</Button>
      <Button onClick={props.takeSnapshot}>Take Snapshot</Button>
      <Button onClick={props.takeSnapshot45()}>Take Snapshot At 45</Button>
      <Button onClick={props.takeSnapshotsAuto()}>Take Snapshot Auto</Button>
      <Button onClick={props.createTechpack()}>Create Tech Pack</Button>
      <Button onClick={props.uploadModel()}>Upload Model</Button>
      <Button onClick={props.uploadEnv()}>Upload Env</Button>
      <Button onClick={props.validateModel()}>Validate Model</Button>
      <Button onClick={props.randomizeLayerColors()}>Randomize Layer Colors</Button>
      <Button onClick={props.resetAllColorsToDefault()}>Reset All Colors To Default</Button>
      <Button onClick={props.resetAllBoundaries()}>Reset All Boundaries</Button>
      <Button onClick={props.resetModel()}>Reset Model</Button>
      <Button onClick={() => imageUploaderRef.current?.click()}>Upload Image</Button>
      <Button onClick={props.nextBoundary()}>Next Boundary</Button>
      <div>Active Boundary: {props.boundaryActive?.name ?? 'None'}</div>
      <input
        type="text"
        value={sensitivity}
        onChange={async (e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value)) {
            setSensitivity(value);
            await props.imageEditor.updateSensitivity(value, [[255, 255, 255]]);
          }
        }}
      />

      {props.boundaryActive ? (
        <div
          style={{ backgroundColor: 'white' }}
          ref={(ref) => {
            const element = props.boundaryActive?.imageEditor;
            if (ref && element) {
              ref.appendChild(element);
            }
          }}
        />
      ) : null}

      <input
        type="file"
        ref={imageUploaderRef}
        onChange={(e) => {
          if (e.target?.files && e.target.files[0]) {
            props.imageEditor.edit(URL.createObjectURL(e.target.files[0]));
          }
        }}
        style={{
          width: 0.1,
          height: 0.1,
        }}
      />

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
