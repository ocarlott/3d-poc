import { TextureOption } from 'microstore-3d/lib/type';

//
const jacketConfig = {
  app: {
    glb: './tshirt.glb',
    boundary: 'FlouncySkirt_boundary_front',
    panel: 'LongSleeveVneck_changeable_group_1_front',
  },
  configure: {
    colorMap: [
      {
        layerName: 'LongSleeveVneck_changeable_group_1_front',
        color: '#4444ff',
      },
      {
        layerName: 'Jacket_changeable_group_2_back',
        color: '#7D7D7D',
      },
      {
        layerName: 'Jacket_changeable_group_4_sleeves',
        color: '#7D7D7D',
      },
      {
        layerName: 'Jacket_changeable_group_3_collar',
        color: '#7D7D7D',
      },
    ],
    artworkMap: [
      {
        boundaryName: 'LongSleeveVneck_boundary_front',
        artworkUrl: './test.jpeg',
        xRatio: 0.5,
        textureApplication: [
          {
            color: '3585c9',
            textureOption: TextureOption.Crystals,
          },
        ],
      },
    ],
  },
};

const towelConfig = {
  app: {
    glb: './towel.glb',
    boundary: 'Towel_boundary_front',
  },
  configure: {
    colorMap: [],
    artworkMap: [
      {
        boundaryName: 'Towel_boundary_front',
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
  },
};

export const defaultModelConfig = jacketConfig;
