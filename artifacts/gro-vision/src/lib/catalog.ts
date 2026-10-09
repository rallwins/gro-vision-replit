export type CatalogProduct = {
  id: string;
  brand: string;
  name: string;
  variant: string;
  packageType: string;
  size: string;
  modelLabel: string;
  sampleImage?: string;
};

export type BoundingBox = { xmin: number; ymin: number; xmax: number; ymax: number };

export type ProductDetection = {
  id: string;
  productId: string;
  label: string;
  score: number;
  box: BoundingBox;
  alternatives?: string[];
  uncertainSize?: boolean;
  uncertainIdentity?: boolean;
};

export type ModelProgress = { status: string; progress?: number };

const make = (
  id: string,
  brand: string,
  name: string,
  variant: string,
  packageType: string,
  size: string,
  modelLabel: string,
  sampleImage?: string,
): CatalogProduct => ({ id, brand, name, variant, packageType, size, modelLabel, sampleImage });

export const CATALOG: CatalogProduct[] = [
  make('coke-glass', 'Coca-Cola', 'Original Taste', 'Original Taste', 'Glass bottle', 'Glass', 'Coca-Cola Original Taste glass bottle', '/samples/coke-glass-bottle.webp'),
  make('coke-can-330', 'Coca-Cola', 'Original Taste', 'Original Taste', 'Can', '330 ml', 'Coca-Cola Original Taste 330 ml can', '/samples/coke-can.jpg'),
  make('coke-pet-500', 'Coca-Cola', 'Original Taste', 'Original Taste', 'PET bottle', '500 ml', 'Coca-Cola Original Taste 500 ml PET bottle'),
  make('coke-pet-1l', 'Coca-Cola', 'Original Taste', 'Original Taste', 'PET bottle', '1 L', 'Coca-Cola Original Taste 1 L PET bottle'),
  make('coke-pet-15l', 'Coca-Cola', 'Original Taste', 'Original Taste', 'PET bottle', '1.5 L', 'Coca-Cola Original Taste 1.5 L PET bottle', '/samples/coke-pet-15l.jpeg'),
  make('coke-zero-can-330', 'Coca-Cola', 'Zero Sugar', 'Zero Sugar', 'Can', '330 ml', 'Coca-Cola Zero Sugar 330 ml can'),
  make('coke-zero-pet-500', 'Coca-Cola', 'Zero Sugar', 'Zero Sugar', 'PET bottle', '500 ml', 'Coca-Cola Zero Sugar 500 ml PET bottle'),
  make('pepsi-can-330', 'Pepsi', 'Original', 'Original', 'Can', '330 ml', 'Pepsi Original 330 ml can', '/samples/pepsi-can.jpg'),
  make('pepsi-pet-500', 'Pepsi', 'Original', 'Original', 'PET bottle', '500 ml', 'Pepsi Original 500 ml PET bottle'),
  make('pepsi-zero-pet-500', 'Pepsi', 'Zero Sugar', 'Zero Sugar', 'PET bottle', '500 ml', 'Pepsi Zero Sugar 500 ml PET bottle'),
  make('sprite-can-330', 'Sprite', 'Lemon-Lime', 'Lemon-Lime', 'Can', '330 ml', 'Sprite 330 ml can'),
  make('sprite-pet-500', 'Sprite', 'Lemon-Lime', 'Lemon-Lime', 'PET bottle', '500 ml', 'Sprite 500 ml PET bottle'),
  make('fanta-can-330', 'Fanta', 'Orange', 'Orange', 'Can', '330 ml', 'Fanta Orange 330 ml can'),
  make('fanta-pet-500', 'Fanta', 'Orange', 'Orange', 'PET bottle', '500 ml', 'Fanta Orange 500 ml PET bottle'),
  make('colgate-maxfresh-100', 'Colgate', 'MaxFresh', 'MaxFresh', 'Tube', '100 g', 'Colgate MaxFresh 100 g toothpaste tube'),
  make('colgate-maxfresh-150', 'Colgate', 'MaxFresh', 'MaxFresh', 'Tube', '150 g', 'Colgate MaxFresh 150 g toothpaste tube'),
  make('colgate-total-75', 'Colgate', 'Total', 'Total', 'Tube', '75 g', 'Colgate Total 75 g toothpaste tube'),
  make('lays-classic-52', "Lay's", 'Classic', 'Classic', 'Bag', '52 g', "Lay's Classic 52 g potato chips bag"),
  make('maggi-masala-70', 'Maggi', 'Masala', 'Masala', 'Packet', '70 g', 'Maggi Masala 70 g noodle packet'),
];

export const productById = (id: string) => CATALOG.find((product) => product.id === id);
export const productByLabel = (label: string) => CATALOG.find((product) => product.modelLabel === label);
