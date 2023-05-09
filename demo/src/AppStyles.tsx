import styled from '@emotion/styled';

export const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
`;

export const Canvas = styled.canvas`
  width: 80%;
  height: 100%;
`;

export const SideBar = styled.div`
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20%;
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
`;