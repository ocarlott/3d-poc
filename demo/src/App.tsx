import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button,  Canvas, Container, Image, ImageList, SideBar } from './AppStyles';
import { Viewer3D } from 'microstore-3d';
import { Boundary } from 'microstore-3d/lib/Boundary';

function App() {
  const canvasRef = useRef(null);
  const canvas2DContainerRef = useRef<HTMLCanvasElement>(null);
  const [viewer, setViewer] = useState<Viewer3D | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentBoundary, setCurrentBoundary] = useState<Boundary | null>(null);

  useLayoutEffect(() => {
    if (canvasRef.current) {
      const viewer = new Viewer3D(canvasRef.current);
      (async () => {
        setViewer(viewer);
        await viewer.loadModel('https://microstore.vercel.app/assets/tshirt.glb', () => {});
        viewer.configureModel({
          colorMap: [],
          artworkMap: [{
            boundaryName: 'CropT_boundary_back',
            artworkUrl: 'https://microstore.vercel.app/assets/logo.png',
            xRatio: 0.5,
          }]
        })
      })();

    }
  }, [setViewer]);

  return (
    <Container>
      <Canvas ref={canvasRef} />
      <SideBar>
        <Button onClick={viewer?.toggleAutoRotate}>
          Toggle Rotate
        </Button>
        <Button onClick={async () => {
          const boundary = await viewer?.changeArtwork({
            boundary: 'CropT_boundary_front',
            canvas: canvas2DContainerRef.current ?? undefined,
            artworkUrl: 'https://microstore.vercel.app/assets/logo.png',
            sizeRatio: 0.5,
            xRatio: 0.5,
            yRatio: 0.5
          }) ?? null;
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
          if (viewer) {
            const result = viewer.validateModel();
            console.log(result);
          }
        }}>
          Validate Model
        </Button>
        <canvas ref={canvas2DContainerRef} hidden={!currentBoundary} width={300} height={300} ></canvas>
        <ImageList>
          {images.map((image, index) => (<Image key={index + 'i'} src={image} />))}
        </ImageList>
      </SideBar>
    </Container>
  )
}

export default App
