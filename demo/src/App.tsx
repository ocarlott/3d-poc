import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button,  Canvas, Container, Image, ImageList, SideBar } from './AppStyles';
import { Viewer3D } from 'microstore-3d';

function App() {
  const canvasRef = useRef(null);
  const [viewer, setViewer] = useState<Viewer3D | null>(null);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (canvasRef.current) {
      const viewer = new Viewer3D(canvasRef.current);
      (async () => {
        setViewer(viewer);
        await viewer.loadModel('https://microstore.vercel.app/assets/tshirt.glb', () => {});
        // setTimeout(() => {
        //   viewer.selectBoundary("CropT_boundary_back");
        // }, 3000);
        // console.log(1);
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
        <Button onClick={() => {
          viewer?.selectBoundary('CropT_boundary_back')
        //    setTimeout(() => {
        //   viewer?.selectBoundary("CropT_boundary_front");
        // }, 3000); 
        }}>
          Focus Next
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
            const image = viewer.takeScreenShotAt(Math.PI / 8);
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
        <ImageList>
          {images.map((image, index) => (<Image key={index + 'i'} src={image} />))}
        </ImageList>
      </SideBar>
    </Container>
  )
}

export default App
