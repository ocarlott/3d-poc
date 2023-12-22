import { TextureOption } from 'microstore-3d/lib/type';

export const defaultModelConfig = {
  colorMap: [
    {
      layerName: 'ContourFitJacket_changeable_group_1_front',
      color: '#ffffff',
    },
    {
      layerName: 'ContourFitJacket_changeable_group_2_back',
      color: '#7D7D7D',
    },
    {
      layerName: 'ContourFitJacket_changeable_group_4_sleeves',
      color: '#7D7D7D',
    },
    {
      layerName: 'ContourFitJacket_changeable_group_3_collar',
      color: '#7D7D7D',
    },
  ],
  artworkMap: [
    {
      boundaryName: 'LongSleeveVneck_boundary_front',
      artworkUrl: './logo.png',
      xRatio: 0.5,
      textureApplication: [
        {
          color: '3585c9',
          textureOption: TextureOption.Crystals,
        },
      ],
    },
  ],
};
