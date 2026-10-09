export type NormalizedBox = [number, number, number, number];

export type BenchmarkItem = {
  id: string;
  box: NormalizedBox;
  productId?: string;
  brand?: string;
  variant?: string;
  packageType?: string;
  size?: string;
  skuVerified?: boolean;
  sizeVerified?: boolean;
  ignore?: boolean;
  note?: string;
};

export type BenchmarkScene = {
  id: string;
  title: string;
  image: string;
  width: number;
  height: number;
  conditions: string;
  viewpoint: string;
  items: BenchmarkItem[];
};

/**
 * Seed benchmark v1. Boxes are normalized [left, top, right, bottom].
 * Product IDs reflect the demo image's catalog mapping; the verification flags
 * prevent assumed sizes from being presented as independently confirmed facts.
 */
export const BENCHMARK_SCENES: BenchmarkScene[] = [
  {
    id: 'glass-bottle',
    title: 'Coca-Cola glass bottle',
    image: '/samples/coke-glass-bottle.webp',
    width: 320,
    height: 320,
    conditions: 'Bright, even studio light; plain white background',
    viewpoint: 'Upright front view; single package',
    items: [{
      id: 'coke-glass-1',
      box: [0.369, 0.025, 0.656, 0.978],
      productId: 'coke-glass',
      brand: 'Coca-Cola',
      variant: 'Original Taste',
      packageType: 'Glass bottle',
      size: 'Glass',
      skuVerified: false,
      sizeVerified: false,
      note: 'Catalog sample mapping; capacity is not legible in the image.',
    }],
  },
  {
    id: 'cola-can',
    title: 'Coca-Cola can',
    image: '/samples/coke-can.jpg',
    width: 494,
    height: 612,
    conditions: 'Bright, even studio light; plain white background',
    viewpoint: 'Upright front/three-quarter view; single package',
    items: [{
      id: 'coke-can-1',
      box: [0.239, 0.147, 0.759, 0.886],
      productId: 'coke-can-330',
      brand: 'Coca-Cola',
      variant: 'Original Taste',
      packageType: 'Can',
      size: '330 ml',
      skuVerified: false,
      sizeVerified: false,
      note: 'Catalog sample mapping; numeric size is not legible in the image.',
    }],
  },
  {
    id: 'assorted-cans',
    title: 'Assorted beverage cans',
    image: '/samples/assorted-cans.jpg',
    width: 1920,
    height: 1120,
    conditions: 'Bright, even studio light; plain white background',
    viewpoint: 'Eight packages in a front-facing row',
    items: [
      { id: 'assorted-7up', box: [0.042, 0.355, 0.146, 0.715], ignore: true, note: 'Outside the current catalog.' },
      { id: 'assorted-unlisted-1', box: [0.158, 0.355, 0.267, 0.715], ignore: true, note: 'Brand/SKU not reliably identifiable from the supplied sample.' },
      { id: 'assorted-max', box: [0.276, 0.355, 0.389, 0.715], ignore: true, note: 'Outside the current catalog.' },
      {
        id: 'assorted-pepsi-1',
        box: [0.397, 0.355, 0.497, 0.715],
        productId: 'pepsi-can-330',
        brand: 'Pepsi',
        variant: 'Original',
        packageType: 'Can',
        size: '330 ml',
        skuVerified: false,
        sizeVerified: false,
        note: 'Brand and can are visible; exact size is not legible.',
      },
      {
        id: 'assorted-sprite',
        box: [0.518, 0.355, 0.611, 0.715],
        productId: 'sprite-can-330',
        brand: 'Sprite',
        variant: 'Lemon-Lime',
        packageType: 'Can',
        size: '330 ml',
        skuVerified: false,
        sizeVerified: false,
        note: 'Brand and can are visible; exact size is not legible.',
      },
      {
        id: 'assorted-pepsi-2',
        box: [0.633, 0.355, 0.729, 0.715],
        productId: 'pepsi-can-330',
        brand: 'Pepsi',
        variant: 'Original',
        packageType: 'Can',
        size: '330 ml',
        skuVerified: false,
        sizeVerified: false,
        note: 'Brand and can are visible; exact size is not legible.',
      },
      {
        id: 'assorted-fanta',
        box: [0.751, 0.355, 0.845, 0.715],
        productId: 'fanta-can-330',
        brand: 'Fanta',
        variant: 'Orange',
        packageType: 'Can',
        size: '330 ml',
        skuVerified: false,
        sizeVerified: false,
        note: 'Brand and can are visible; exact size is not legible.',
      },
      {
        id: 'assorted-coke',
        box: [0.858, 0.355, 0.957, 0.715],
        productId: 'coke-can-330',
        brand: 'Coca-Cola',
        variant: 'Original Taste',
        packageType: 'Can',
        size: '330 ml',
        skuVerified: false,
        sizeVerified: false,
        note: 'Brand and can are visible; exact size is not legible.',
      },
    ],
  },
  {
    id: 'soda-bottles',
    title: 'Sprite, Coca-Cola, and Fanta bottles',
    image: '/samples/soda-bottles.jpeg',
    width: 473,
    height: 422,
    conditions: 'Bright, even studio light; plain white background',
    viewpoint: 'Three upright front views in one row',
    items: [
      { id: 'bottle-sprite', box: [0.076, 0.095, 0.325, 0.975], ignore: true, brand: 'Sprite', note: 'Large-format size is not confirmed and is outside the exact-size catalog.' },
      { id: 'bottle-coke', box: [0.367, 0.09, 0.635, 0.978], ignore: true, brand: 'Coca-Cola', note: 'Large-format size is not confirmed and is outside the exact-size catalog.' },
      { id: 'bottle-fanta', box: [0.692, 0.09, 0.928, 0.978], ignore: true, brand: 'Fanta', note: 'Large-format size is not confirmed and is outside the exact-size catalog.' },
    ],
  },
  {
    id: 'coke-pet-15l',
    title: 'Coca-Cola 1.5 L PET bottle',
    image: '/samples/coke-pet-15l.jpeg',
    width: 1650,
    height: 1650,
    conditions: 'Bright, even studio light; plain white background',
    viewpoint: 'Upright front view; single package',
    items: [{
      id: 'coke-pet-15l-1',
      box: [0.351, 0.021, 0.643, 0.973],
      productId: 'coke-pet-15l',
      brand: 'Coca-Cola',
      variant: 'Original Taste',
      packageType: 'PET bottle',
      size: '1.5 L',
      skuVerified: true,
      sizeVerified: true,
      note: 'Product identity and 1.5 L marking are visible on the package.',
    }],
  },
  {
    id: 'pepsi-can',
    title: 'Pepsi can',
    image: '/samples/pepsi-can.jpg',
    width: 700,
    height: 700,
    conditions: 'Bright, even studio light; plain white background',
    viewpoint: 'Upright front/three-quarter view; single package',
    items: [{
      id: 'pepsi-can-1',
      box: [0.359, 0.147, 0.639, 0.706],
      productId: 'pepsi-can-330',
      brand: 'Pepsi',
      variant: 'Original',
      packageType: 'Can',
      size: '330 ml',
      skuVerified: false,
      sizeVerified: false,
      note: 'Brand and can are visible; exact size is not legible in the image.',
    }],
  },
];
