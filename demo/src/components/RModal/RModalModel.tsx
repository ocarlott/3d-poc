import { useRef } from 'react';

export function RModalModel() {
  const validationRef = useRef(null);
  return {
    validationRef,
  };
}
