import styled from '@emotion/styled';

export const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
`;

export const CanvasContainer = styled.div`
  width: 80%;
  height: 100%;
  position: relative;
`;

export const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

export const SideBar = styled.div`
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20%;
  background-color: #242424;
`;

export const ImageContainer = styled.div`
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  justify-content: space-between;
`;

export const Warning = styled.p`
  color: #ffc436;
  display: inline-block;
`;

export const Error = styled.p`
  color: #fd5c63;
  display: inline-block;
`;

export const Info = styled.p`
  color: #6cb4ee;
  display: inline-block;
`;

export const Success = styled.p`
  color: #4fffb0;
  display: inline-block;
`;

export const Button = styled.div`
  width: 200px;
  height: 50px;
  background-color: #394867;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 50px;
  cursor: pointer;
  margin-bottom: 10px;
`;

export const ImageList = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
`;

export const Image = styled.img`
  width: 45%;
  margin-bottom: 5px;
  object-fit: contain;
`;
