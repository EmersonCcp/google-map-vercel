export interface Feature {
    type: string;
    properties: {
      id: number;
      manzana: string;
      lote: string;
      estado: string;
    };
    geometry: {
      type: string;
      coordinates: number[][][][];
    };
  }