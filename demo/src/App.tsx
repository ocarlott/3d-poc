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
            rotation: 90
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
            boundary: 'CropT_boundary_back',
            canvas: canvas2DContainerRef.current ?? undefined,
            artworkUrl: 'https://microstore.vercel.app/assets/logo.png'
          }) ?? null;
          setCurrentBoundary(boundary);
        }}>
          Add Artwork
        </Button>
        <Button onClick={() => {
          if (viewer) {
            const image = viewer.takeScreenShot();
            setImages(images.concat(image));
          }
        }}>
          Take Snapshot
        </Button>
        <Button onClick={() => {
          if (viewer) {
            const image = viewer.takeScreenShotAt(Math.PI / 4);
            setImages(images.concat(image));
          }
        }}>
          Take Snapshot At 45
        </Button>
        <Button onClick={() => {
          if (viewer) {
            const newImages = viewer.takeScreenShotAuto();
            setImages(images.concat(newImages));
          }
        }}>
          Take Snapshot Auto
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
