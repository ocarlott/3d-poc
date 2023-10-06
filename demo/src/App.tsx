import { useLayoutEffect, useRef, useState } from 'react'
import { Button,  Canvas, Container, Error, Image, ImageContainer, ImageList, Info, SideBar, Success, Warning } from './AppStyles';
import { TextureOption, Viewer3D } from 'microstore-3d';
import { Boundary } from 'microstore-3d/lib/Boundary';
import Modal from 'react-modal';
import { Utils } from 'microstore-3d/lib/Utils';
import html2canvas from 'html2canvas';

function App() {
  const canvasRef = useRef(null);
  const canvas2DContainerRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [workingModel, setWorkingModel] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer3D | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentBoundary, setCurrentBoundary] = useState<Boundary | null>(null);
  const [validationResults, setValidationResult] = useState<{
      boundaries: string[];
      techPacks: string[];
      layers: string[];
      screenshots: string[];
      techpackImages: string[];
      materialMatches: {
        boundaryName: string,
        result: boolean
      }[];
      materialErrors: string[][];
  } | null>(null);
  const validationRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (canvasRef.current) {
      const viewer = new Viewer3D(canvasRef.current);
      (async () => {
        setViewer(viewer);
        await viewer.loadModel('./tshirt.glb', () => {});
        viewer.configureModel({
          colorMap: [{
            layerName: 'ContourFitJacket_changeable_group_1_front',
            color: '#000000'
          }, {
            layerName: 'ContourFitJacket_changeable_group_2_back',
            color: '#000000'
          }, {
            layerName: 'ContourFitJacket_changeable_group_4_sleeves',
            color: '#000000' 
          }, {
            layerName: 'ContourFitJacket_changeable_group_3_collar',
            color: '#903737'
          }],
          artworkMap: [
            {
            boundaryName: 'ContourFitJacket_boundary_back',
            artworkUrl: './logo.png',
            xRatio: 0.5,
            // textureApplication: [{
            //   color: '377abf',
            //   textureOption: TextureOption.Matte
            // }]
          }
        ]
        })
      })();
    }
  }, [setViewer]);

  const computeBoundaryResult = (name: string) => {
    const res = Utils.getDisplayNameIfBoundary(name);
    if (!res) {
      return <Error>{`${name} -> Error. Check naming convention`}</Error>;
    }
    return <Success>{`${name} -> '${res}' in system`}</Success>;
  }

  const computeLayerResult = (name: string) => {
    const res = Utils.getDisplayNameIfChangeableGroup(name);
    if (!res) {
      return <Error>{`${name} -> Error. Check naming convention`}</Error>;
    }
    return <Success>{`${name} -> '${res.displayName}' in system`}</Success>;
  }

  return (
    <Container>
      <Modal ariaHideApp={false} style={{
        content: {
          background: '#242424'
        }
      }} isOpen={!!validationResults} onRequestClose={() => {
        setValidationResult(null);
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            display: 'inline-block',
            fontSize: '2rem'
          }}>
            Validation Result
          </span>
          <button style={{
            background: '#394867'
          }} onClick={async () => {
            if (validationRef.current && viewer && workingModel) {
              const canvas = await html2canvas(validationRef.current, {
                backgroundColor: '#242424'
              });
              const imgDataUrl = canvas.toDataURL();
              var link = document.createElement("a");
              document.body.appendChild(link);
              link.download = `${workingModel}-validation-result.jpg`;
              link.href = imgDataUrl;
              link.click();
              document.body.removeChild(link);
            }
          }} >Download</button>
        </div>
        <div ref={validationRef}>
          {!validationResults ? null : <>
            <h4>Boundaries</h4>
            <Info>
              {`Please follow convention of '..boundary_<display_name>' make sure what being shown in the system makes sense (e.g. Front, Back, Left Sleeve, etc..).`}
            </Info>
            {validationResults.boundaries.length === 0 ? <Warning>Could not find any boundary! Please make sure that the model doesn't have any</Warning> : null}
            <ol>
              {validationResults.boundaries.map((item, index) => <li key={item + index}>{computeBoundaryResult(item)}</li>)}
            </ol>
            <h4>Changeable Group (Layers)</h4>
            <Info>{`Please follow convention of '..changeable_group_<number>_<display_name>' such as 'CropT_changeable_group_1_left_sleeve'`}</Info>
            {validationResults.layers.length === 0 ? <Warning>Could not find any changeable group! Please make sure that the model doesn't have any</Warning> : null}
            <ol>
              {validationResults.layers.map((item, index) => <li key={item + index}>{computeLayerResult(item)}</li>)}
            </ol>
            <h4>Tech Packs (Flat layers)</h4>
            <ol>
              {validationResults.layers.map((item, index) => <li key={item + index}>{validationResults.techPacks.includes(`${item}_flat`) ? <Success>{item} has a matching flat version {item}_flat</Success> : <Error>Could not find flat version of {item}</Error>}</li>)}
              {validationResults.boundaries.map((item, index) => <li key={item + index}>{validationResults.techPacks.includes(`${item}_flat`) ? <Success>{item} has a matching flat version {item}_flat</Success> : <Error>Could not find flat version of {item}</Error>}</li>)}
              {validationResults.materialMatches.map((item) => <li key={item.boundaryName}>{item.result ? <Success>{item.boundaryName} is using the same material as {item.boundaryName}_flat</Success> : <Error>{item.boundaryName} is not using the same material as {item.boundaryName}_flat</Error>}</li>)}
            </ol>
            {validationResults.materialErrors.length === 0 ? null : <>
              <h4>Relationship Errors</h4>
              <ol>
                {validationResults.materialErrors.map((meshes, index) => <li key={'meshes' + index}><Error>These are sharing the same material: {meshes.join(', ')}</Error></li>)}
              </ol>
            </>}
            <h4>Screenshots</h4>
            <Info>
              Please make sure all layers have colors other than light gray
            </Info>
            <ImageContainer>
              {validationResults.screenshots.map(((item, index) => <Image src={item} key={'screenshot' + index} />))}
            </ImageContainer>
            <h4>Tech Pack Images</h4>
            <Info>
              Please make sure logos are on tech pack images that have boundaries and all images are clear and not cut off.
            </Info>
            <ImageContainer>
              {validationResults.techpackImages.map(((item, index) => <Image src={item} key={'techpack' + index} />))}
            </ImageContainer>
          </>}
        </div>
      </Modal>
      <Canvas ref={canvasRef} />
      <SideBar>
        <Button onClick={viewer?.toggleAutoRotate}>
          Toggle Rotate
        </Button>
        <Button onClick={viewer?.toggleDeveloperMode}>
          Toggle Dev Mode
        </Button>
        <Button onClick={async () => {
          const boundary = await viewer?.changeArtwork({
            boundary: 'ContourFitJacket_boundary_front',
            canvas: canvas2DContainerRef.current ?? undefined,
            artworkUrl: './logo.png',
            sizeRatio: 0.5,
            xRatio: 0.5,
            yRatio: 0.5
          }, false) ?? null;
          setCurrentBoundary(boundary);
        }}>
          Add Artwork
        </Button>
        <Button onClick={() => {
          viewer?.removeArtwork('CropT_boundary_front');
          setCurrentBoundary(null);
        }}>
          Remove Artwork
        </Button>
        <Button onClick={async () => {
          if (viewer) {
            const image = await viewer.takeScreenShot();
            setImages(images.concat(image));
          }
        }}>
          Take Snapshot
        </Button>
        <Button onClick={async () => {
          if (viewer) {
            const image = await viewer.takeScreenShotAt(Math.PI / 4);
            setImages(images.concat(image));
          }
        }}>
          Take Snapshot At 45
        </Button>
        <Button onClick={async () => {
          if (viewer) {
            const newImages = await viewer.takeScreenShotAuto();
            setImages(images.concat(newImages));
          }
        }}>
          Take Snapshot Auto
        </Button>
        <Button onClick={async () => {
          if (viewer) {
            const newImages = await viewer.createTechPack();
            setImages(images.concat(newImages));
          }
        }}>
          Create Teck Pack
        </Button>
        <Button onClick={() => {
          if (viewer && fileRef.current) {
            fileRef.current.click();
          }
        }}>
          Upload Model
        </Button>
        <Button onClick={async () => {
          if (viewer && fileRef.current && workingModel) {
            const result = await viewer.validateModel();
            setValidationResult(result);
          } else {
            alert("Please upload your model!")
          }
        }}>
          Validate Model
        </Button>
        <Button onClick={() => {
          if (viewer) {
            viewer.resetModel();
          }
        }}>
          Reset Model
        </Button>
        <canvas ref={canvas2DContainerRef} hidden={!currentBoundary} width={500} height={500} ></canvas>
        <input type="file" ref={fileRef} onChange={async () => {
          if (viewer && fileRef.current) {
            const file = fileRef.current.files?.[0];
            if (file) {
              const res = file.name.split('.')
              setWorkingModel(res[0]);
              const uri = URL.createObjectURL(file);
              await viewer.loadModel(uri, () => {}); 
            }
          }
        }} style={{
          width: 0.1,
          height: 0.1
        }} />
        {/* <Button onClick={() => {
          if (viewer && currentBoundary) {
            setImages(images.concat(currentBoundary.breakdownTextures))
          }
        }}>
          Get Breakdown Images
        </Button> */}
        <ImageList>
          {images.map((image, index) => (<Image key={index + 'i'} src={image} />))}
        </ImageList>
      </SideBar>
    </Container>
  )
}

export default App
