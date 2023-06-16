export enum ControlName {
  TranslationControl = "TranslationControl",
  ScaleArrow = "ScaleArrow",
  Artwork = "Artwork",
  BoundaryGroup = "BoundaryGroup",
  Boundary = "Boundary",
  Model = "Model",
  WorkingAssetGroup = "WorkingAssetGroup",
  TechPackGroup = "TechPackGroup",
}

export type UploadImageData = {
  original: string;
  computed: string;
  colors: string[];
};

export enum TextureOption {
  ScreenPrint = "Screenprint",
  Metallic = "Metallic",
  Matte = "Matte",
  Crystals = "Crystals",
}
