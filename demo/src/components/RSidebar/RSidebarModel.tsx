import { useRef, useState } from 'react';
import { Boundary } from 'microstore-3d/lib/core/Boundary';

export function RSidebarModel() {
  const canvas2DContainerRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [boundaryActive, setBoundaryActive] = useState<boolean>(false);
  return {
    canvas2DContainerRef,
    fileRef,
    images,
    boundaryActive,
    setBoundaryActive,
    setImages,
  };
}
