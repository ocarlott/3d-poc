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
      // {
      //   layerName: 'LongSleeveVneck_changeable_group_1_front',
      //   color: '#4444ff',
      // },
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
        artworkUrl: './testing.png',
        xRatio: 0.5,
        yRatio: 0.5,
        sizeRatio: 0.7,
        sizeLimit: 0.4,
        colorLimit: 7,
        sensitivity: 0,
        textureApplication: [
          {
            color: 'f4f1f1',
            textureOption: TextureOption.Matte,
          },
          {
            color: 'c7bf31',
            textureOption: TextureOption.Crystals,
          },
          {
            color: 'f20707',
            textureOption: TextureOption.Metallic,
          },
          {
            color: '594ccd',
            textureOption: TextureOption.Glitter,
          },
          {
            color: '5e5757',
            textureOption: TextureOption.Matte,
          },
          {
            color: '390d0d',
            textureOption: TextureOption.Crystals,
          },
          {
            color: 'ffffff',
            textureOption: TextureOption.Crystals,
          },
          {
            color: '000000',
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
