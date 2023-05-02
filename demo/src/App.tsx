import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, Container, SideBar } from './AppStyles';
import { Viewer3D } from 'microstore-3d';

function App() {
  const canvasRef = useRef(null);
  const [viewer, setViewer] = useState<Viewer3D | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const viewer = new Viewer3D(canvasRef.current);
      setViewer(viewer);
      viewer.loadModel('https://microstore.vercel.app/assets/hoodie.glb', () => {})
    }
  }, [setViewer]);

  return (
    <Container>
      <Canvas ref={canvasRef} />
      <SideBar>

      </SideBar>
    </Container>
  )
}

export default App
