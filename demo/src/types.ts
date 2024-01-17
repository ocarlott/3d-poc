export type ValidationResults = {
  boundaries: string[];
  techPacks: string[];
  layers: string[];
  screenshots: string[];
  techpackImages: {
    name: string;
    image: string;
  }[];
  materialMatches: {
    boundaryName: string;
    result: boolean;
  }[];
  materialErrors: string[][];
};
