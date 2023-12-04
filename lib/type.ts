export enum ControlName {
  TranslationControl = 'TranslationControl',
  ScaleArrow = 'ScaleArrow',
  Artwork = 'Artwork',
  BoundaryGroup = 'BoundaryGroup',
  Boundary = 'Boundary',
  WorkingAssetGroup = 'WorkingAssetGroup',
  TechPackGroup = 'TechPackGroup',
  ShadowPlane = 'ShadowPlane',
}

export type UploadImageData = {
  original: string;
  computed: string;
  colors: string[];
};

export enum TextureOption {
  Glitter = 'Glitter',
  Metallic = 'Metallic',
  Matte = 'Matte',
  Crystals = 'Crystals',
}
