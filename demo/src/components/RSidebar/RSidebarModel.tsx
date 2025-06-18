import { useRef, useState } from 'react';
import { Boundary } from 'microstore-3d/lib/core/Boundary';
import { ImageEditor } from 'microstore-3d';

export function RSidebarModel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [boundaryActive, setBoundaryActive] = useState<Boundary | null>(null);
  const [imageEditor] = useState<ImageEditor>(new ImageEditor());
  const [uploadingFileType, setUploadingFileType] = useState<'model' | 'env'>('model');
  const [fps, setFps] = useState(60);
  const [currentFps, setCurrentFps] = useState(60);
  const [adaptiveResolution, setAdaptiveResolution] = useState(false);
  return {
    fileRef,
    images,
    boundaryActive,
    setBoundaryActive,
    setImages,
    imageEditor,
    uploadingFileType,
    setUploadingFileType,
    fps,
    currentFps,
    setFps,
    setCurrentFps,
    adaptiveResolution,
    setAdaptiveResolution,
  };
}
