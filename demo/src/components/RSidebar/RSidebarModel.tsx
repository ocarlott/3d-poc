import { useRef, useState } from 'react';
import { Boundary } from 'microstore-3d/lib/Boundary';

export function RSidebarModel() {
  const canvas2DContainerRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentBoundary, setCurrentBoundary] = useState<Boundary | null>(null);
  return {
    canvas2DContainerRef,
    fileRef,
    images,
    currentBoundary,
    setCurrentBoundary,
    setImages,
  };
}
