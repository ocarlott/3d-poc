import { useRef, useState } from 'react';
import { Boundary } from 'microstore-3d/lib/core/Boundary';

export function RSidebarModel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [boundaryActive, setBoundaryActive] = useState<Boundary | null>(null);
  return {
    fileRef,
    images,
    boundaryActive,
    setBoundaryActive,
    setImages,
  };
}
