import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from '../app.module';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import { CmsService } from '../cms/cms.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import {
  BannerPosition,
  BannerType,
  PageStatus,
} from '../common/enums/cms.enum';
import {
  BikeType,
  ProductStatus,
  ProductType,
} from '../common/enums/catalog.enum';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { ProductVariantDto } from '../products/dto/product-variant.dto';
import { ProductsService } from '../products/products.service';
import { ProductQuestionsService } from '../product-questions/product-questions.service';
import { SizeGuidesService } from '../size-guide/size-guides.service';
import { UsersService } from '../users/users.service';
import { CreateVoucherDto } from '../vouchers/dto/create-voucher.dto';
import { VouchersService } from '../vouchers/vouchers.service';
import { VoucherDiscountType } from '../common/enums/commerce.enum';
import { importSubmissionCatalog, prepareSubmissionCatalog } from './submission-catalog';

interface SeedAccount {
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  permissions?: Permission[];
  password: string;
}

type SeedProductDefinition = Omit<CreateProductDto, 'category' | 'brand'> & {
  categorySlug: string;
  brandSlug: string;
};

interface BikeSeedInput {
  name: string;
  sku: string;
  categorySlug: string;
  brandSlug: string;
  originalPrice: number;
  salePrice: number;
  bikeType: BikeType;
  frameMaterial: string;
  wheelSize: string;
  weight: string;
  colors: Array<{ name: string; hex: string; adjustment?: number }>;
  sizes: string[];
  featured?: boolean;
}

interface AccessorySeedInput {
  name: string;
  sku: string;
  categorySlug: string;
  brandSlug: string;
  originalPrice: number;
  salePrice: number;
  colors: Array<{ name: string; hex: string; adjustment?: number }>;
  sizes: string[];
  featured?: boolean;
}

const bicycleImageUrlFor = (categorySlug: string): string => {
  if (categorySlug === 'mountain-bike') {
    return '/images/products/mountain-bike-demo.png';
  }

  if (categorySlug === 'road-bike' || categorySlug === 'fixed-gear-bikes') {
    return '/images/products/road-bike-demo.png';
  }

  return '/images/products/city-bike-demo.png';
};

const apparelCategorySlugs = new Set([
  'cycling-apparel',
  'caps',
  'arm-sleeves',
  'cycling-pants',
  'cycling-socks',
]);
const riderGearCategorySlugs = new Set([
  'bags',
  'gloves',
  'cycling-shoes',
  'cycling-glasses',
  'helmets',
]);
const bikeAccessoryCategorySlugs = new Set([
  'racks-fenders',
  'kickstands',
  'lights',
  'bells-horns',
  'handlebar-tape-grips',
  'bottles',
  'child-seats',
  'locks',
  'pumps-accessories',
  'frame-seat-bags',
]);

const accessoryImageUrlFor = (categorySlug: string): string => {
  if (apparelCategorySlugs.has(categorySlug)) {
    return '/images/products/cycling-apparel-kit.png';
  }

  if (riderGearCategorySlugs.has(categorySlug)) {
    return '/images/products/rider-gear-kit.png';
  }

  if (bikeAccessoryCategorySlugs.has(categorySlug)) {
    return '/images/products/bike-accessories-kit.png';
  }

  return '/images/products/bike-parts-kit.png';
};

const imagesFor = (name: string, imageUrl: string) => [
  { url: imageUrl, alt: `${name} - main image`, sortOrder: 0 },
  { url: imageUrl, alt: `${name} - detail image`, sortOrder: 1 },
];

const variantsFor = (
  baseSku: string,
  colors: Array<{ name: string; hex: string; adjustment?: number }>,
  sizes: string[],
): ProductVariantDto[] =>
  colors.flatMap((color, colorIndex) =>
    sizes.map((size, sizeIndex) => ({
      color: color.name,
      colorHex: color.hex,
      size,
      sku: `${baseSku}-${color.name.replace(/\s+/g, '-').toUpperCase()}-${size
        .replace(/\s+/g, '-')
        .toUpperCase()}`,
      stock: 4 + ((colorIndex + sizeIndex) % 8),
      priceAdjustment: color.adjustment ?? 0,
    })),
  );

const createBikeSeed = (input: BikeSeedInput): SeedProductDefinition => ({
  name: input.name,
  sku: input.sku,
  shortDescription: `${input.name} là lựa chọn thể thao cân bằng cho những hành trình mỗi ngày.`,
  description: `${input.name} sử dụng khung ${input.frameMaterial}, bánh ${input.wheelSize} và cấu hình bền bỉ để mang lại trải nghiệm đạp xe tự tin, thoải mái.`,
  categorySlug: input.categorySlug,
  brandSlug: input.brandSlug,
  productType: ProductType.BICYCLE,
  originalPrice: input.originalPrice,
  salePrice: input.salePrice,
  images: imagesFor(input.name, bicycleImageUrlFor(input.categorySlug)),
  thumbnail: bicycleImageUrlFor(input.categorySlug),
  featured: input.featured ?? false,
  status: ProductStatus.ACTIVE,
  bikeType: input.bikeType,
  frameMaterial: input.frameMaterial,
  wheelSize: input.wheelSize,
  weight: input.weight,
  specifications: [
    { group: 'Khung', label: 'Material', value: input.frameMaterial },
    { group: 'Bánh xe', label: 'Wheel size', value: input.wheelSize },
  ],
  variants: variantsFor(input.sku, input.colors, input.sizes),
});

const createAccessorySeed = (input: AccessorySeedInput): SeedProductDefinition => {
  const imageUrl = accessoryImageUrlFor(input.categorySlug);

  return {
    name: input.name,
    sku: input.sku,
    shortDescription: `${input.name} là phụ kiện tiện dụng cho người đạp xe mỗi ngày.`,
    description: `${input.name} được chọn để tăng sự tiện nghi và an toàn trên mọi hành trình, với thiết kế bền bỉ và dễ sử dụng.`,
    categorySlug: input.categorySlug,
    brandSlug: input.brandSlug,
    productType: ProductType.ACCESSORY,
    originalPrice: input.originalPrice,
    salePrice: input.salePrice,
    images: imagesFor(input.name, imageUrl),
    thumbnail: imageUrl,
    featured: input.featured ?? false,
    status: ProductStatus.ACTIVE,
    specifications: [
      { group: 'Chất liệu', label: 'Material', value: 'Premium cycling material' },
      { group: 'Bảo hành', label: 'Warranty', value: '12 months' },
    ],
    variants: variantsFor(input.sku, input.colors, input.sizes),
  };
};

const productDefinitions: SeedProductDefinition[] = [
  createBikeSeed({
    name: 'Trek Marlin 8 Gen 3', sku: 'TREK-MARLIN-8-G3', categorySlug: 'mountain-bike', brandSlug: 'trek', originalPrice: 28500000, salePrice: 25900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'Alpha Silver Aluminum', wheelSize: '29 inch', weight: '13.4 kg', featured: true,
    colors: [{ name: 'Black', hex: '#151515' }, { name: 'Red', hex: '#C62828', adjustment: 300000 }], sizes: ['S', 'M', 'L'],
  }),
  createBikeSeed({
    name: 'Giant Talon 1 29', sku: 'GIANT-TALON-1-29', categorySlug: 'mountain-bike', brandSlug: 'giant', originalPrice: 23500000, salePrice: 21500000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'ALUXX-Grade Aluminum', wheelSize: '29 inch', weight: '13.8 kg',
    colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Black', hex: '#191919' }], sizes: ['S', 'M', 'L'],
  }),
  createBikeSeed({
    name: 'Specialized Rockhopper Comp', sku: 'SPECIALIZED-ROCKHOPPER-COMP', categorySlug: 'mountain-bike', brandSlug: 'specialized', originalPrice: 24500000, salePrice: 22900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'Premium A1 Aluminum', wheelSize: '27.5 inch', weight: '13.6 kg', featured: true,
    colors: [{ name: 'Satin Black', hex: '#151515' }, { name: 'Green', hex: '#2E7D32' }], sizes: ['S', 'M', 'L'],
  }),
  createBikeSeed({
    name: 'Cannondale Trail 5', sku: 'CANNONDALE-TRAIL-5', categorySlug: 'mountain-bike', brandSlug: 'cannondale', originalPrice: 21900000, salePrice: 19900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'SmartForm C3 Alloy', wheelSize: '29 inch', weight: '14.1 kg',
    colors: [{ name: 'Orange', hex: '#EF6C00' }, { name: 'Grey', hex: '#616161' }], sizes: ['M', 'L', 'XL'],
  }),
  createBikeSeed({
    name: 'Trek Domane AL 2 Gen 4', sku: 'TREK-DOMANE-AL2-G4', categorySlug: 'road-bike', brandSlug: 'trek', originalPrice: 32900000, salePrice: 29900000, bikeType: BikeType.ROAD, frameMaterial: '100 Series Alpha Aluminum', wheelSize: '700C', weight: '10.8 kg', featured: true,
    colors: [{ name: 'White', hex: '#F5F5F5' }, { name: 'Blue', hex: '#0D47A1' }], sizes: ['49', '52', '54', '56'],
  }),
  createBikeSeed({
    name: 'Giant Contend AR 3', sku: 'GIANT-CONTEND-AR-3', categorySlug: 'road-bike', brandSlug: 'giant', originalPrice: 30500000, salePrice: 28500000, bikeType: BikeType.ROAD, frameMaterial: 'ALUXX-Grade Aluminum', wheelSize: '700C', weight: '10.3 kg',
    colors: [{ name: 'Black', hex: '#202020' }, { name: 'Rose', hex: '#AD1457' }], sizes: ['S', 'M', 'ML', 'L'],
  }),
  createBikeSeed({
    name: 'Specialized Allez', sku: 'SPECIALIZED-ALLEZ', categorySlug: 'road-bike', brandSlug: 'specialized', originalPrice: 34500000, salePrice: 31900000, bikeType: BikeType.ROAD, frameMaterial: 'E5 Premium Aluminum', wheelSize: '700C', weight: '9.8 kg',
    colors: [{ name: 'Red', hex: '#C62828' }, { name: 'Black', hex: '#111111' }], sizes: ['49', '52', '54', '56'],
  }),
  createBikeSeed({
    name: 'Trek FX 2 Disc', sku: 'TREK-FX-2-DISC', categorySlug: 'city-bike', brandSlug: 'trek', originalPrice: 19500000, salePrice: 17900000, bikeType: BikeType.CITY, frameMaterial: 'Alpha Gold Aluminum', wheelSize: '700C', weight: '11.8 kg', featured: true,
    colors: [{ name: 'Grey', hex: '#757575' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['S', 'M', 'L'],
  }),
  createBikeSeed({
    name: 'Giant Escape 3', sku: 'GIANT-ESCAPE-3', categorySlug: 'city-bike', brandSlug: 'giant', originalPrice: 12900000, salePrice: 11900000, bikeType: BikeType.CITY, frameMaterial: 'ALUXX-Grade Aluminum', wheelSize: '700C', weight: '12.1 kg',
    colors: [{ name: 'Silver', hex: '#B0BEC5' }, { name: 'Navy', hex: '#1A237E' }], sizes: ['S', 'M', 'L'],
  }),
  createBikeSeed({
    name: 'Cannondale Treadwell 2', sku: 'CANNONDALE-TREADWELL-2', categorySlug: 'city-bike', brandSlug: 'cannondale', originalPrice: 16800000, salePrice: 15500000, bikeType: BikeType.CITY, frameMaterial: 'SmartForm C3 Alloy', wheelSize: '650B', weight: '12.7 kg',
    colors: [{ name: 'Yellow', hex: '#F9A825' }, { name: 'Teal', hex: '#00695C' }], sizes: ['S', 'M', 'L'],
  }),
  createAccessorySeed({
    name: 'Giro Register MIPS Helmet', sku: 'GIRO-REGISTER-MIPS', categorySlug: 'helmets', brandSlug: 'giro', originalPrice: 1900000, salePrice: 1690000, featured: true,
    colors: [{ name: 'Matte Black', hex: '#171717' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['M', 'L'],
  }),
  createAccessorySeed({
    name: 'RockBros Airflow Helmet', sku: 'ROCKBROS-AIRFLOW-HELMET', categorySlug: 'helmets', brandSlug: 'rockbros', originalPrice: 850000, salePrice: 690000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['M', 'L'],
  }),
  createAccessorySeed({
    name: 'Shimano Explorer Gloves', sku: 'SHIMANO-EXPLORER-GLOVES', categorySlug: 'gloves', brandSlug: 'shimano', originalPrice: 650000, salePrice: 550000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Grey', hex: '#757575' }], sizes: ['M', 'L', 'XL'],
  }),
  createAccessorySeed({
    name: 'Giant Recon HL 350 Light', sku: 'GIANT-RECON-HL-350', categorySlug: 'lights', brandSlug: 'giant', originalPrice: 980000, salePrice: 820000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'RockBros Thermal Bottle 650ml', sku: 'ROCKBROS-THERMAL-BOTTLE-650', categorySlug: 'bottles', brandSlug: 'rockbros', originalPrice: 390000, salePrice: 320000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Red', hex: '#C62828' }], sizes: ['650ml'],
  }),
  createAccessorySeed({
    name: 'RockBros Steel Cable Lock', sku: 'ROCKBROS-STEEL-CABLE-LOCK', categorySlug: 'locks', brandSlug: 'rockbros', originalPrice: 450000, salePrice: 390000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['120cm'],
  }),
  createAccessorySeed({
    name: 'Shimano PD-M520 Pedals', sku: 'SHIMANO-PD-M520', categorySlug: 'components', brandSlug: 'shimano', originalPrice: 1250000, salePrice: 1090000, featured: true,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Giant Race Day Jersey', sku: 'GIANT-RACE-DAY-JERSEY', categorySlug: 'cycling-apparel', brandSlug: 'giant', originalPrice: 890000, salePrice: 749000, featured: true,
    colors: [{ name: 'Navy', hex: '#1A237E' }, { name: 'Red', hex: '#C62828' }], sizes: ['S', 'M', 'L', 'XL'],
  }),
  createAccessorySeed({
    name: 'Liv Vivid Cycling Jersey', sku: 'LIV-VIVID-JERSEY', categorySlug: 'cycling-apparel', brandSlug: 'liv', originalPrice: 990000, salePrice: 849000,
    colors: [{ name: 'Purple', hex: '#7B1FA2' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['S', 'M', 'L'],
  }),
  createAccessorySeed({
    name: 'Misaki Commuter Backpack 18L', sku: 'MISAKI-COMMUTER-BACKPACK', categorySlug: 'bags', brandSlug: 'misaki', originalPrice: 790000, salePrice: 650000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Grey', hex: '#616161' }], sizes: ['18L'],
  }),
  createAccessorySeed({
    name: 'Giro Riddance Cycling Shoes', sku: 'GIRO-RIDDANCE-SHOES', categorySlug: 'cycling-shoes', brandSlug: 'giro', originalPrice: 2450000, salePrice: 2190000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Olive', hex: '#556B2F' }], sizes: ['40', '41', '42', '43'],
  }),
  createAccessorySeed({
    name: 'Giro Tempo Sport Glasses', sku: 'GIRO-TEMPO-GLASSES', categorySlug: 'cycling-glasses', brandSlug: 'giro', originalPrice: 1190000, salePrice: 990000,
    colors: [{ name: 'Smoke', hex: '#424242' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Giant RideCap', sku: 'GIANT-RIDECAP', categorySlug: 'caps', brandSlug: 'giant', originalPrice: 420000, salePrice: 349000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'RockBros UV Arm Sleeves', sku: 'ROCKBROS-UV-SLEEVES', categorySlug: 'arm-sleeves', brandSlug: 'rockbros', originalPrice: 290000, salePrice: 230000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['M', 'L'],
  }),
  createAccessorySeed({
    name: 'Liv Essential Cycling Shorts', sku: 'LIV-ESSENTIAL-SHORTS', categorySlug: 'cycling-pants', brandSlug: 'liv', originalPrice: 1090000, salePrice: 920000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'],
  }),
  createAccessorySeed({
    name: 'Shimano Performance Socks', sku: 'SHIMANO-PERFORMANCE-SOCKS', categorySlug: 'cycling-socks', brandSlug: 'shimano', originalPrice: 250000, salePrice: 199000,
    colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Black', hex: '#111111' }], sizes: ['M', 'L'],
  }),
  createAccessorySeed({
    name: 'Momentum Urban Commuter Helmet', sku: 'MOMENTUM-URBAN-HELMET', categorySlug: 'helmets', brandSlug: 'momentum', originalPrice: 1350000, salePrice: 1150000,
    colors: [{ name: 'Slate', hex: '#455A64' }, { name: 'Sand', hex: '#D7CCC8' }], sizes: ['M', 'L'],
  }),
  createAccessorySeed({
    name: 'Giant Rack-It Metro Rear Rack', sku: 'GIANT-RACKIT-METRO-RACK', categorySlug: 'racks-fenders', brandSlug: 'giant', originalPrice: 890000, salePrice: 750000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Giant SpeedShield Fender Set', sku: 'GIANT-SPEEDSHIELD-FENDER', categorySlug: 'racks-fenders', brandSlug: 'giant', originalPrice: 690000, salePrice: 580000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['700C'],
  }),
  createAccessorySeed({
    name: 'Giant Adjustable Kickstand', sku: 'GIANT-ADJUSTABLE-KICKSTAND', categorySlug: 'kickstands', brandSlug: 'giant', originalPrice: 390000, salePrice: 320000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['24-29 inch'],
  }),
  createAccessorySeed({
    name: 'Trinx Trail Light Set', sku: 'TRINX-TRAIL-LIGHT-SET', categorySlug: 'lights', brandSlug: 'trinx', originalPrice: 790000, salePrice: 650000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Giant Mini Bell', sku: 'GIANT-MINI-BELL', categorySlug: 'bells-horns', brandSlug: 'giant', originalPrice: 180000, salePrice: 149000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Silver', hex: '#B0BEC5' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Shimano Pro Sport Control Tape', sku: 'SHIMANO-PRO-CONTROL-TAPE', categorySlug: 'handlebar-tape-grips', brandSlug: 'shimano', originalPrice: 620000, salePrice: 530000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Red', hex: '#C62828' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Giant Airway Bottle Cage', sku: 'GIANT-AIRWAY-CAGE', categorySlug: 'bottles', brandSlug: 'giant', originalPrice: 260000, salePrice: 210000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Giant Child Seat', sku: 'GIANT-CHILD-SEAT', categorySlug: 'child-seats', brandSlug: 'giant', originalPrice: 1850000, salePrice: 1590000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Grey', hex: '#757575' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Raptor Shield U-Lock', sku: 'RAPTOR-SHIELD-U-LOCK', categorySlug: 'locks', brandSlug: 'raptor', originalPrice: 690000, salePrice: 560000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['180mm'],
  }),
  createAccessorySeed({
    name: 'Giant Control Tower Pump', sku: 'GIANT-CONTROL-TOWER-PUMP', categorySlug: 'pumps-accessories', brandSlug: 'giant', originalPrice: 750000, salePrice: 630000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Active Saddle Bag', sku: 'ACTIVE-SADDLE-BAG', categorySlug: 'frame-seat-bags', brandSlug: 'active', originalPrice: 420000, salePrice: 349000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Red', hex: '#C62828' }], sizes: ['Small', 'Medium'],
  }),
  createAccessorySeed({
    name: 'Java Alloy Flat Pedals', sku: 'JAVA-ALLOY-FLAT-PEDAL', categorySlug: 'components', brandSlug: 'java', originalPrice: 850000, salePrice: 720000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Giant GX03 Wheelset', sku: 'GIANT-GX03-WHEELSET', categorySlug: 'wheels-rims', brandSlug: 'giant', originalPrice: 4350000, salePrice: 3790000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['700C'],
  }),
  createAccessorySeed({
    name: 'Shimano Deore Headset', sku: 'SHIMANO-DEORE-HEADSET', categorySlug: 'headsets', brandSlug: 'shimano', originalPrice: 980000, salePrice: 830000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['1-1/8 inch'],
  }),
  createAccessorySeed({
    name: 'Shimano Deore RD-M6100', sku: 'SHIMANO-DEORE-RD-M6100', categorySlug: 'derailleurs', brandSlug: 'shimano', originalPrice: 1650000, salePrice: 1420000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['12 Speed'],
  }),
  createAccessorySeed({
    name: 'Finish Line Bike Care Kit', sku: 'FINISH-LINE-BIKE-CARE-KIT', categorySlug: 'maintenance-products', brandSlug: 'finish-line', originalPrice: 620000, salePrice: 520000,
    colors: [{ name: 'Standard', hex: '#F5F5F5' }], sizes: ['3 pieces'],
  }),
  createAccessorySeed({
    name: 'Shimano B05S Brake Pads', sku: 'SHIMANO-B05S-PADS', categorySlug: 'brake-pads', brandSlug: 'shimano', originalPrice: 390000, salePrice: 320000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'],
  }),
  createAccessorySeed({
    name: 'Giant Contact Bar and Stem', sku: 'GIANT-CONTACT-BAR-STEM', categorySlug: 'handlebars-stems', brandSlug: 'giant', originalPrice: 1890000, salePrice: 1590000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['420mm'],
  }),
  createAccessorySeed({
    name: 'Shimano HG54 Chain', sku: 'SHIMANO-HG54-CHAIN', categorySlug: 'chains', brandSlug: 'shimano', originalPrice: 550000, salePrice: 460000,
    colors: [{ name: 'Silver', hex: '#B0BEC5' }], sizes: ['10 Speed'],
  }),
  createAccessorySeed({
    name: 'Maxxis Ikon Tire', sku: 'MAXXIS-IKON-TIRE', categorySlug: 'tires-tubes', brandSlug: 'maxxis', originalPrice: 1190000, salePrice: 990000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['29 x 2.20'],
  }),
  createAccessorySeed({
    name: 'Giant 700C Inner Tube', sku: 'GIANT-700C-INNER-TUBE', categorySlug: 'tires-tubes', brandSlug: 'giant', originalPrice: 180000, salePrice: 145000,
    colors: [{ name: 'Black', hex: '#111111' }], sizes: ['700 x 28-32C'],
  }),
  createAccessorySeed({
    name: 'Giant TransTextura Jersey', sku: 'GIANT-TRANSTEXTURA-JERSEY', categorySlug: 'cycling-apparel', brandSlug: 'giant', originalPrice: 1090000, salePrice: 930000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['S', 'M', 'L', 'XL'],
  }),
  createAccessorySeed({
    name: 'Liv Breeze Long Sleeve Jersey', sku: 'LIV-BREEZE-LS-JERSEY', categorySlug: 'cycling-apparel', brandSlug: 'liv', originalPrice: 1190000, salePrice: 990000,
    colors: [{ name: 'Lilac', hex: '#9575CD' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['S', 'M', 'L'],
  }),
  createAccessorySeed({
    name: 'Raptor Mesh Ride Jersey', sku: 'RAPTOR-MESH-RIDE-JERSEY', categorySlug: 'cycling-apparel', brandSlug: 'raptor', originalPrice: 690000, salePrice: 550000,
    colors: [{ name: 'Red', hex: '#C62828' }, { name: 'Charcoal', hex: '#37474F' }], sizes: ['M', 'L', 'XL'],
  }),
  createAccessorySeed({
    name: 'Momentum Everyday Ride Tee', sku: 'MOMENTUM-EVERYDAY-RIDE-TEE', categorySlug: 'cycling-apparel', brandSlug: 'momentum', originalPrice: 490000, salePrice: 399000,
    colors: [{ name: 'Slate', hex: '#455A64' }, { name: 'Sand', hex: '#D7CCC8' }], sizes: ['S', 'M', 'L', 'XL'],
  }),
  createAccessorySeed({
    name: 'Trinx Aero Wind Vest', sku: 'TRINX-AERO-WIND-VEST', categorySlug: 'cycling-apparel', brandSlug: 'trinx', originalPrice: 790000, salePrice: 650000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Yellow', hex: '#F9A825' }], sizes: ['M', 'L', 'XL'],
  }),
  createAccessorySeed({
    name: 'Misaki Urban Cycling Polo', sku: 'MISAKI-URBAN-CYCLING-POLO', categorySlug: 'cycling-apparel', brandSlug: 'misaki', originalPrice: 720000, salePrice: 599000,
    colors: [{ name: 'Navy', hex: '#1A237E' }, { name: 'Grey', hex: '#757575' }], sizes: ['S', 'M', 'L'],
  }),
  createAccessorySeed({
    name: 'Active Performance Windbreaker', sku: 'ACTIVE-PERFORMANCE-WINDBREAKER', categorySlug: 'cycling-apparel', brandSlug: 'active', originalPrice: 1250000, salePrice: 1050000,
    colors: [{ name: 'Black', hex: '#111111' }, { name: 'Olive', hex: '#556B2F' }], sizes: ['M', 'L', 'XL'],
  }),
  createAccessorySeed({
    name: 'Giant Thermal Base Layer', sku: 'GIANT-THERMAL-BASE-LAYER', categorySlug: 'cycling-apparel', brandSlug: 'giant', originalPrice: 650000, salePrice: 520000,
    colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L', 'XL'],
  }),
];

const additionalBikeSeedInputs: BikeSeedInput[] = [
  { name: 'Giant Talon 2 29', sku: 'GIANT-TALON-2-29', categorySlug: 'mountain-bike', brandSlug: 'giant', originalPrice: 17900000, salePrice: 15900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'ALUXX Aluminum', wheelSize: '29 inch', weight: '14.2 kg', featured: true, colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Charcoal', hex: '#37474F' }], sizes: ['S', 'M', 'L'] },
  { name: 'Trek Marlin 7 Gen 3', sku: 'TREK-MARLIN-7-G3', categorySlug: 'mountain-bike', brandSlug: 'trek', originalPrice: 23500000, salePrice: 20900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'Alpha Silver Aluminum', wheelSize: '29 inch', weight: '13.9 kg', colors: [{ name: 'Black', hex: '#111111' }, { name: 'Yellow', hex: '#F9A825' }], sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Raptor M100 3B', sku: 'RAPTOR-M100-3B', categorySlug: 'mountain-bike', brandSlug: 'raptor', originalPrice: 7490000, salePrice: 6590000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'Alloy 6061', wheelSize: '27.5 inch', weight: '14.6 kg', colors: [{ name: 'Orange', hex: '#EF6C00' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'] },
  { name: 'Java J-Air Fuoco', sku: 'JAVA-J-AIR-FUOCO', categorySlug: 'mountain-bike', brandSlug: 'java', originalPrice: 11900000, salePrice: 9900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'Java Aluminum', wheelSize: '27.5 inch', weight: '14.1 kg', colors: [{ name: 'Red', hex: '#C62828' }, { name: 'Grey', hex: '#616161' }], sizes: ['S', 'M', 'L'] },
  { name: 'Trinx X1 Elite', sku: 'TRINX-X1-ELITE', categorySlug: 'mountain-bike', brandSlug: 'trinx', originalPrice: 14900000, salePrice: 12900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'TRINX Alloy', wheelSize: '29 inch', weight: '13.9 kg', colors: [{ name: 'Teal', hex: '#00695C' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'] },
  { name: 'Giant Fathom 2', sku: 'GIANT-FATHOM-2', categorySlug: 'mountain-bike', brandSlug: 'giant', originalPrice: 36900000, salePrice: 33900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'ALUXX SL Aluminum', wheelSize: '29 inch', weight: '13.4 kg', colors: [{ name: 'Navy', hex: '#1A237E' }, { name: 'Green', hex: '#2E7D32' }], sizes: ['S', 'M', 'L'] },
  { name: 'Cannondale Trail SE 3', sku: 'CANNONDALE-TRAIL-SE-3', categorySlug: 'mountain-bike', brandSlug: 'cannondale', originalPrice: 28900000, salePrice: 25900000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'SmartForm C2 Alloy', wheelSize: '29 inch', weight: '14.0 kg', colors: [{ name: 'Purple', hex: '#6A1B9A' }, { name: 'Slate', hex: '#455A64' }], sizes: ['M', 'L', 'XL'] },
  { name: 'Specialized Chisel HT', sku: 'SPECIALIZED-CHISEL-HT', categorySlug: 'mountain-bike', brandSlug: 'specialized', originalPrice: 41500000, salePrice: 38900000, bikeType: BikeType.MOUNTAIN, frameMaterial: "D'Aluisio Smartweld Alloy", wheelSize: '29 inch', weight: '12.8 kg', colors: [{ name: 'Sand', hex: '#D7CCC8' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'] },
  { name: 'Giant Contend AR 1', sku: 'GIANT-CONTEND-AR-1', categorySlug: 'road-bike', brandSlug: 'giant', originalPrice: 41900000, salePrice: 38900000, bikeType: BikeType.ROAD, frameMaterial: 'ALUXX SL Aluminum', wheelSize: '700C', weight: '9.6 kg', featured: true, colors: [{ name: 'Blue', hex: '#0D47A1' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'ML', 'L'] },
  { name: 'Trek Emonda ALR 5', sku: 'TREK-EMONDA-ALR-5', categorySlug: 'road-bike', brandSlug: 'trek', originalPrice: 55900000, salePrice: 51900000, bikeType: BikeType.ROAD, frameMaterial: '300 Series Alpha Aluminum', wheelSize: '700C', weight: '8.9 kg', colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Red', hex: '#C62828' }], sizes: ['50', '52', '54', '56', '58'] },
  { name: 'Java Siluro 6', sku: 'JAVA-SILURO-6', categorySlug: 'road-bike', brandSlug: 'java', originalPrice: 22900000, salePrice: 19900000, bikeType: BikeType.ROAD, frameMaterial: 'Java Carbon', wheelSize: '700C', weight: '9.4 kg', colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'] },
  { name: 'Raptor Taka 2', sku: 'RAPTOR-TAKA-2', categorySlug: 'road-bike', brandSlug: 'raptor', originalPrice: 15900000, salePrice: 13900000, bikeType: BikeType.ROAD, frameMaterial: 'Alloy 6061', wheelSize: '700C', weight: '10.1 kg', colors: [{ name: 'Red', hex: '#C62828' }, { name: 'Silver', hex: '#B0BEC5' }], sizes: ['S', 'M', 'L'] },
  { name: 'Trinx Tempo 1.0', sku: 'TRINX-TEMPO-1', categorySlug: 'road-bike', brandSlug: 'trinx', originalPrice: 13900000, salePrice: 11900000, bikeType: BikeType.ROAD, frameMaterial: 'TRINX Alloy', wheelSize: '700C', weight: '10.4 kg', colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'] },
  { name: 'Cannondale CAAD Optimo 2', sku: 'CANNONDALE-CAAD-OPTIMO-2', categorySlug: 'road-bike', brandSlug: 'cannondale', originalPrice: 43500000, salePrice: 39900000, bikeType: BikeType.ROAD, frameMaterial: 'SmartForm C2 Alloy', wheelSize: '700C', weight: '9.2 kg', colors: [{ name: 'Grey', hex: '#616161' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['51', '54', '56', '58'] },
  { name: 'Specialized Roubaix Sport', sku: 'SPECIALIZED-ROUBAIX-SPORT', categorySlug: 'road-bike', brandSlug: 'specialized', originalPrice: 79900000, salePrice: 73900000, bikeType: BikeType.ROAD, frameMaterial: 'FACT 10R Carbon', wheelSize: '700C', weight: '8.7 kg', colors: [{ name: 'Carbon', hex: '#222222' }, { name: 'Satin Blue', hex: '#1565C0' }], sizes: ['49', '52', '54', '56'] },
  { name: 'Momentum iNeed Latte 26', sku: 'MOMENTUM-INEED-LATTE-26', categorySlug: 'city-bike', brandSlug: 'momentum', originalPrice: 10900000, salePrice: 9490000, bikeType: BikeType.CITY, frameMaterial: 'ALUXX Aluminum', wheelSize: '26 inch', weight: '14.4 kg', featured: true, colors: [{ name: 'Mint', hex: '#80CBC4' }, { name: 'Cream', hex: '#FFF8E1' }], sizes: ['S', 'M'] },
  { name: 'Giant FastRoad AR 2', sku: 'GIANT-FASTROAD-AR-2', categorySlug: 'city-bike', brandSlug: 'giant', originalPrice: 24900000, salePrice: 22500000, bikeType: BikeType.HYBRID, frameMaterial: 'ALUXX SL Aluminum', wheelSize: '700C', weight: '11.2 kg', colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Grey', hex: '#757575' }], sizes: ['S', 'M', 'L'] },
  { name: 'Liv Alight 3 Disc', sku: 'LIV-ALIGHT-3-DISC', categorySlug: 'city-bike', brandSlug: 'liv', originalPrice: 13500000, salePrice: 11900000, bikeType: BikeType.CITY, frameMaterial: 'ALUXX Aluminum', wheelSize: '700C', weight: '12.6 kg', colors: [{ name: 'Lilac', hex: '#9575CD' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['XS', 'S', 'M'] },
  { name: 'Raptor City 2', sku: 'RAPTOR-CITY-2', categorySlug: 'city-bike', brandSlug: 'raptor', originalPrice: 7990000, salePrice: 6890000, bikeType: BikeType.CITY, frameMaterial: 'Alloy 6061', wheelSize: '700C', weight: '13.7 kg', colors: [{ name: 'Green', hex: '#2E7D32' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'] },
  { name: 'Java Siluro City', sku: 'JAVA-SILURO-CITY', categorySlug: 'city-bike', brandSlug: 'java', originalPrice: 15900000, salePrice: 13900000, bikeType: BikeType.HYBRID, frameMaterial: 'Java Aluminum', wheelSize: '700C', weight: '11.6 kg', colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Navy', hex: '#1A237E' }], sizes: ['S', 'M', 'L'] },
  { name: 'Giant Expressway 1', sku: 'GIANT-EXPRESSWAY-1', categorySlug: 'folding-bikes', brandSlug: 'giant', originalPrice: 14900000, salePrice: 12900000, bikeType: BikeType.FOLDING, frameMaterial: 'ALUXX Aluminum', wheelSize: '20 inch', weight: '12.2 kg', colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Black', hex: '#111111' }], sizes: ['One size'] },
  { name: 'Java Zelo 20', sku: 'JAVA-ZELO-20', categorySlug: 'folding-bikes', brandSlug: 'java', originalPrice: 9990000, salePrice: 8790000, bikeType: BikeType.FOLDING, frameMaterial: 'Java Aluminum', wheelSize: '20 inch', weight: '12.5 kg', colors: [{ name: 'Yellow', hex: '#F9A825' }, { name: 'Grey', hex: '#757575' }], sizes: ['One size'] },
  { name: 'Trinx Dolphin 2.0', sku: 'TRINX-DOLPHIN-2', categorySlug: 'folding-bikes', brandSlug: 'trinx', originalPrice: 8490000, salePrice: 7290000, bikeType: BikeType.FOLDING, frameMaterial: 'TRINX Alloy', wheelSize: '20 inch', weight: '12.9 kg', colors: [{ name: 'Red', hex: '#C62828' }, { name: 'Black', hex: '#111111' }], sizes: ['One size'] },
  { name: 'Momentum Fold 20', sku: 'MOMENTUM-FOLD-20', categorySlug: 'folding-bikes', brandSlug: 'momentum', originalPrice: 10900000, salePrice: 9490000, bikeType: BikeType.FOLDING, frameMaterial: 'ALUXX Aluminum', wheelSize: '20 inch', weight: '12.3 kg', colors: [{ name: 'Mint', hex: '#80CBC4' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['One size'] },
  { name: 'Liv Flourish 3', sku: 'LIV-FLOURISH-3', categorySlug: 'womens-bikes', brandSlug: 'liv', originalPrice: 12900000, salePrice: 10900000, bikeType: BikeType.CITY, frameMaterial: 'ALUXX Aluminum', wheelSize: '700C', weight: '13.8 kg', colors: [{ name: 'Rose', hex: '#F8BBD0' }, { name: 'Sky', hex: '#81D4FA' }], sizes: ['XS', 'S', 'M'] },
  { name: 'Liv Alight DD Disc', sku: 'LIV-ALIGHT-DD-DISC', categorySlug: 'womens-bikes', brandSlug: 'liv', originalPrice: 19900000, salePrice: 17900000, bikeType: BikeType.CITY, frameMaterial: 'ALUXX Aluminum', wheelSize: '700C', weight: '12.4 kg', colors: [{ name: 'Lilac', hex: '#9575CD' }, { name: 'Pearl', hex: '#FAFAFA' }], sizes: ['XS', 'S', 'M'] },
  { name: 'Momentum Vida 26', sku: 'MOMENTUM-VIDA-26', categorySlug: 'womens-bikes', brandSlug: 'momentum', originalPrice: 8990000, salePrice: 7590000, bikeType: BikeType.CITY, frameMaterial: 'ALUXX Aluminum', wheelSize: '26 inch', weight: '14.0 kg', colors: [{ name: 'Pink', hex: '#F48FB1' }, { name: 'Mint', hex: '#80CBC4' }], sizes: ['S', 'M'] },
  { name: 'Giant XTC Jr 24', sku: 'GIANT-XTC-JR-24', categorySlug: 'kids-bikes', brandSlug: 'giant', originalPrice: 7590000, salePrice: 6490000, bikeType: BikeType.MOUNTAIN, frameMaterial: 'ALUXX Aluminum', wheelSize: '24 inch', weight: '11.9 kg', colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Orange', hex: '#EF6C00' }], sizes: ['24 inch'] },
  { name: 'Raptor Simba 20', sku: 'RAPTOR-SIMBA-20', categorySlug: 'kids-bikes', brandSlug: 'raptor', originalPrice: 4790000, salePrice: 3990000, bikeType: BikeType.OTHER, frameMaterial: 'Alloy 6061', wheelSize: '20 inch', weight: '11.5 kg', colors: [{ name: 'Red', hex: '#C62828' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['20 inch'] },
  { name: 'Trinx Junior 16', sku: 'TRINX-JUNIOR-16', categorySlug: 'kids-bikes', brandSlug: 'trinx', originalPrice: 3290000, salePrice: 2790000, bikeType: BikeType.OTHER, frameMaterial: 'TRINX Alloy', wheelSize: '16 inch', weight: '10.1 kg', colors: [{ name: 'Yellow', hex: '#F9A825' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['16 inch'] },
  { name: 'Java Kiddo 18', sku: 'JAVA-KIDDO-18', categorySlug: 'kids-bikes', brandSlug: 'java', originalPrice: 3790000, salePrice: 3190000, bikeType: BikeType.OTHER, frameMaterial: 'Java Aluminum', wheelSize: '18 inch', weight: '10.9 kg', colors: [{ name: 'Purple', hex: '#7B1FA2' }, { name: 'Green', hex: '#2E7D32' }], sizes: ['18 inch'] },
  { name: 'Momentum Youth 20', sku: 'MOMENTUM-YOUTH-20', categorySlug: 'kids-bikes', brandSlug: 'momentum', originalPrice: 4890000, salePrice: 4190000, bikeType: BikeType.OTHER, frameMaterial: 'ALUXX Aluminum', wheelSize: '20 inch', weight: '11.3 kg', colors: [{ name: 'Mint', hex: '#80CBC4' }, { name: 'Coral', hex: '#FF8A80' }], sizes: ['20 inch'] },
  { name: 'Java Veloce Fixed', sku: 'JAVA-VELOCE-FIXED', categorySlug: 'fixed-gear-bikes', brandSlug: 'java', originalPrice: 10500000, salePrice: 8900000, bikeType: BikeType.OTHER, frameMaterial: 'Java Aluminum', wheelSize: '700C', weight: '10.0 kg', colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'] },
  { name: 'Trinx Tempo Fixed', sku: 'TRINX-TEMPO-FIXED', categorySlug: 'fixed-gear-bikes', brandSlug: 'trinx', originalPrice: 8990000, salePrice: 7690000, bikeType: BikeType.OTHER, frameMaterial: 'TRINX Alloy', wheelSize: '700C', weight: '10.4 kg', colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Silver', hex: '#B0BEC5' }], sizes: ['S', 'M', 'L'] },
  { name: 'Raptor Fixie Urban', sku: 'RAPTOR-FIXIE-URBAN', categorySlug: 'fixed-gear-bikes', brandSlug: 'raptor', originalPrice: 7490000, salePrice: 6390000, bikeType: BikeType.OTHER, frameMaterial: 'Alloy 6061', wheelSize: '700C', weight: '10.7 kg', colors: [{ name: 'Black', hex: '#111111' }, { name: 'Red', hex: '#C62828' }], sizes: ['S', 'M', 'L'] },
  { name: 'Giant TCR Advanced Frameset', sku: 'GIANT-TCR-ADV-FRAMESET', categorySlug: 'framesets', brandSlug: 'giant', originalPrice: 42900000, salePrice: 38900000, bikeType: BikeType.ROAD, frameMaterial: 'Advanced Composite', wheelSize: '700C', weight: '1.1 kg', colors: [{ name: 'Carbon', hex: '#222222' }], sizes: ['S', 'M', 'ML', 'L'] },
  { name: 'Trek Emonda ALR Frameset', sku: 'TREK-EMONDA-ALR-FRAMESET', categorySlug: 'framesets', brandSlug: 'trek', originalPrice: 24900000, salePrice: 22900000, bikeType: BikeType.ROAD, frameMaterial: '300 Series Alpha Aluminum', wheelSize: '700C', weight: '1.5 kg', colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Red', hex: '#C62828' }], sizes: ['50', '52', '54', '56'] },
  { name: 'Java Siluro Carbon Frameset', sku: 'JAVA-SILURO-CARBON-FRAMESET', categorySlug: 'framesets', brandSlug: 'java', originalPrice: 17900000, salePrice: 15500000, bikeType: BikeType.ROAD, frameMaterial: 'T800 Carbon', wheelSize: '700C', weight: '1.2 kg', colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L'] },
];

const additionalAccessorySeedInputs: AccessorySeedInput[] = [
  { name: 'Giro Caden II Urban Helmet', sku: 'GIRO-CADEN-II-HELMET', categorySlug: 'helmets', brandSlug: 'giro', originalPrice: 2200000, salePrice: 1950000, colors: [{ name: 'Matte Blue', hex: '#1565C0' }, { name: 'Matte Black', hex: '#111111' }], sizes: ['M', 'L'] },
  { name: 'RockBros Gel Ride Gloves', sku: 'ROCKBROS-GEL-RIDE-GLOVES', categorySlug: 'gloves', brandSlug: 'rockbros', originalPrice: 420000, salePrice: 349000, colors: [{ name: 'Black', hex: '#111111' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Shimano RC3 Road Shoes', sku: 'SHIMANO-RC3-ROAD-SHOES', categorySlug: 'cycling-shoes', brandSlug: 'shimano', originalPrice: 3200000, salePrice: 2890000, colors: [{ name: 'Black', hex: '#111111' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['40', '41', '42', '43', '44'] },
  { name: 'Giant Relay Cycling Glasses', sku: 'GIANT-RELAY-GLASSES', categorySlug: 'cycling-glasses', brandSlug: 'giant', originalPrice: 850000, salePrice: 720000, colors: [{ name: 'Smoke', hex: '#424242' }, { name: 'Clear', hex: '#ECEFF1' }], sizes: ['Standard'] },
  { name: 'Giant Urban Rolltop Bag', sku: 'GIANT-URBAN-ROLLTOP-BAG', categorySlug: 'bags', brandSlug: 'giant', originalPrice: 1150000, salePrice: 990000, colors: [{ name: 'Navy', hex: '#1A237E' }, { name: 'Grey', hex: '#616161' }], sizes: ['20L'] },
  { name: 'Liv Breeze Ride Cap', sku: 'LIV-BREEZE-RIDE-CAP', categorySlug: 'caps', brandSlug: 'liv', originalPrice: 390000, salePrice: 320000, colors: [{ name: 'Lilac', hex: '#9575CD' }, { name: 'White', hex: '#FAFAFA' }], sizes: ['Standard'] },
  { name: 'RockBros Cool Arm Sleeves', sku: 'ROCKBROS-COOL-ARM-SLEEVES', categorySlug: 'arm-sleeves', brandSlug: 'rockbros', originalPrice: 310000, salePrice: 255000, colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Black', hex: '#111111' }], sizes: ['M', 'L'] },
  { name: 'Giant Core Cycling Shorts', sku: 'GIANT-CORE-CYCLING-SHORTS', categorySlug: 'cycling-pants', brandSlug: 'giant', originalPrice: 990000, salePrice: 820000, colors: [{ name: 'Black', hex: '#111111' }], sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Trinx Ride Performance Socks', sku: 'TRINX-RIDE-SOCKS', categorySlug: 'cycling-socks', brandSlug: 'trinx', originalPrice: 190000, salePrice: 155000, colors: [{ name: 'White', hex: '#FAFAFA' }, { name: 'Blue', hex: '#1565C0' }], sizes: ['M', 'L'] },
  { name: 'Raptor USB Trail Light', sku: 'RAPTOR-USB-TRAIL-LIGHT', categorySlug: 'lights', brandSlug: 'raptor', originalPrice: 690000, salePrice: 560000, colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'] },
  { name: 'Giant Loop Mini Bell', sku: 'GIANT-LOOP-MINI-BELL', categorySlug: 'bells-horns', brandSlug: 'giant', originalPrice: 210000, salePrice: 170000, colors: [{ name: 'Silver', hex: '#B0BEC5' }, { name: 'Black', hex: '#111111' }], sizes: ['Standard'] },
  { name: 'RockBros Alloy Bottle Cage', sku: 'ROCKBROS-ALLOY-BOTTLE-CAGE', categorySlug: 'bottles', brandSlug: 'rockbros', originalPrice: 280000, salePrice: 225000, colors: [{ name: 'Blue', hex: '#1565C0' }, { name: 'Black', hex: '#111111' }], sizes: ['Standard'] },
  { name: 'Giant Urban U Lock', sku: 'GIANT-URBAN-U-LOCK', categorySlug: 'locks', brandSlug: 'giant', originalPrice: 850000, salePrice: 720000, colors: [{ name: 'Black', hex: '#111111' }], sizes: ['230mm'] },
  { name: 'Giant Control Mini Pump', sku: 'GIANT-CONTROL-MINI-PUMP', categorySlug: 'pumps-accessories', brandSlug: 'giant', originalPrice: 550000, salePrice: 460000, colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'] },
  { name: 'Shimano B05S Brake Pad Set', sku: 'SHIMANO-B05S-BRAKE-PAD', categorySlug: 'brake-pads', brandSlug: 'shimano', originalPrice: 420000, salePrice: 350000, colors: [{ name: 'Black', hex: '#111111' }], sizes: ['Standard'] },
  { name: 'Shimano Deore 12 Speed Chain', sku: 'SHIMANO-DEORE-12S-CHAIN', categorySlug: 'chains', brandSlug: 'shimano', originalPrice: 890000, salePrice: 755000, colors: [{ name: 'Silver', hex: '#B0BEC5' }], sizes: ['12 Speed'] },
  { name: 'Maxxis Detonator Tire', sku: 'MAXXIS-DETONATOR-TIRE', categorySlug: 'tires-tubes', brandSlug: 'maxxis', originalPrice: 850000, salePrice: 720000, colors: [{ name: 'Black', hex: '#111111' }], sizes: ['700 x 28C'] },
  { name: 'Finish Line Dry Lube', sku: 'FINISH-LINE-DRY-LUBE', categorySlug: 'maintenance-products', brandSlug: 'finish-line', originalPrice: 260000, salePrice: 215000, colors: [{ name: 'Clear', hex: '#ECEFF1' }], sizes: ['120ml'] },
  { name: 'Giant Contact Comfort Grips', sku: 'GIANT-CONTACT-COMFORT-GRIPS', categorySlug: 'handlebar-tape-grips', brandSlug: 'giant', originalPrice: 390000, salePrice: 320000, colors: [{ name: 'Black', hex: '#111111' }, { name: 'Brown', hex: '#795548' }], sizes: ['Standard'] },
  { name: 'Giant Kids Rear Rack', sku: 'GIANT-KIDS-REAR-RACK', categorySlug: 'racks-fenders', brandSlug: 'giant', originalPrice: 620000, salePrice: 520000, colors: [{ name: 'Black', hex: '#111111' }], sizes: ['20-24 inch'] },
];

const allProductDefinitions: SeedProductDefinition[] = [
  ...productDefinitions,
  ...additionalBikeSeedInputs.map(createBikeSeed),
  ...additionalAccessorySeedInputs.map(createAccessorySeed),
];

async function seedDemoCatalog(
  app: INestApplicationContext,
  userIdByEmail: ReadonlyMap<string, string>,
): Promise<void> {
  const categoriesService = app.get(CategoriesService);
  const brandsService = app.get(BrandsService);
  const productsService = app.get(ProductsService);
  const productQuestionsService = app.get(ProductQuestionsService);

  const bicycles = await categoriesService.upsertForSeed({
    name: 'Xe đạp',
    slug: 'bicycles',
    description: 'Danh mục các dòng xe đạp.',
    sortOrder: 1,
  });
  const riderAccessories = await categoriesService.upsertForSeed({
    name: 'Phụ kiện cho người đạp',
    slug: 'accessories',
    imageUrl: '/images/products/rider-gear-kit.png',
    description: 'Trang phục và phụ kiện dành cho người đạp xe.',
    sortOrder: 2,
  });
  const bikeAccessories = await categoriesService.upsertForSeed({
    name: 'Phụ kiện cho xe',
    slug: 'bike-accessories',
    imageUrl: '/images/products/bike-accessories-kit.png',
    description: 'Phụ kiện lắp thêm cho xe đạp.',
    sortOrder: 3,
  });
  const bikeParts = await categoriesService.upsertForSeed({
    name: 'Phụ tùng',
    slug: 'bike-parts',
    imageUrl: '/images/products/bike-parts-kit.png',
    description: 'Linh kiện và phụ tùng thay thế cho xe đạp.',
    sortOrder: 4,
  });

  const categoryDefinitions = [
    { name: 'Xe đạp thể thao đường phố', slug: 'city-bike', parentCategory: bicycles._id.toString(), sortOrder: 1 },
    { name: 'Xe đạp địa hình', slug: 'mountain-bike', parentCategory: bicycles._id.toString(), sortOrder: 2 },
    { name: 'Xe đạp đua', slug: 'road-bike', parentCategory: bicycles._id.toString(), sortOrder: 3 },
    { name: 'Xe đạp gấp', slug: 'folding-bikes', parentCategory: bicycles._id.toString(), sortOrder: 4 },
    { name: 'Xe đạp nữ', slug: 'womens-bikes', parentCategory: bicycles._id.toString(), sortOrder: 5 },
    { name: 'Xe đạp trẻ em', slug: 'kids-bikes', parentCategory: bicycles._id.toString(), sortOrder: 6 },
    { name: 'Khung sườn', slug: 'framesets', parentCategory: bicycles._id.toString(), sortOrder: 7 },
    { name: 'Xe đạp fixed gear', slug: 'fixed-gear-bikes', parentCategory: bicycles._id.toString(), sortOrder: 8 },

    { name: 'Áo', slug: 'cycling-apparel', parentCategory: riderAccessories._id.toString(), sortOrder: 1 },
    { name: 'Balo - túi', slug: 'bags', parentCategory: riderAccessories._id.toString(), sortOrder: 2 },
    { name: 'Găng tay', slug: 'gloves', parentCategory: riderAccessories._id.toString(), sortOrder: 3 },
    { name: 'Giày', slug: 'cycling-shoes', parentCategory: riderAccessories._id.toString(), sortOrder: 4 },
    { name: 'Mắt kính', slug: 'cycling-glasses', parentCategory: riderAccessories._id.toString(), sortOrder: 5 },
    { name: 'Nón bảo hiểm', slug: 'helmets', parentCategory: riderAccessories._id.toString(), sortOrder: 6 },
    { name: 'Nón lưỡi trai', slug: 'caps', parentCategory: riderAccessories._id.toString(), sortOrder: 7 },
    { name: 'Ống tay', slug: 'arm-sleeves', parentCategory: riderAccessories._id.toString(), sortOrder: 8 },
    { name: 'Quần', slug: 'cycling-pants', parentCategory: riderAccessories._id.toString(), sortOrder: 9 },
    { name: 'Vớ', slug: 'cycling-socks', parentCategory: riderAccessories._id.toString(), sortOrder: 10 },

    { name: 'Baga - chắn bùn', slug: 'racks-fenders', parentCategory: bikeAccessories._id.toString(), sortOrder: 1 },
    { name: 'Chân chống', slug: 'kickstands', parentCategory: bikeAccessories._id.toString(), sortOrder: 2 },
    { name: 'Đèn', slug: 'lights', parentCategory: bikeAccessories._id.toString(), sortOrder: 3 },
    { name: 'Chuông - còi', slug: 'bells-horns', parentCategory: bikeAccessories._id.toString(), sortOrder: 4 },
    { name: 'Dây quấn - tay nắm', slug: 'handlebar-tape-grips', parentCategory: bikeAccessories._id.toString(), sortOrder: 5 },
    { name: 'Gọng nước - bình nước', slug: 'bottles', parentCategory: bikeAccessories._id.toString(), sortOrder: 6 },
    { name: 'Ghế trẻ em', slug: 'child-seats', parentCategory: bikeAccessories._id.toString(), sortOrder: 7 },
    { name: 'Khóa', slug: 'locks', parentCategory: bikeAccessories._id.toString(), sortOrder: 8 },
    { name: 'Ống bơm - phụ kiện bơm', slug: 'pumps-accessories', parentCategory: bikeAccessories._id.toString(), sortOrder: 9 },
    { name: 'Túi sườn - túi yên', slug: 'frame-seat-bags', parentCategory: bikeAccessories._id.toString(), sortOrder: 10 },

    { name: 'Bàn đạp', slug: 'components', parentCategory: bikeParts._id.toString(), sortOrder: 1 },
    { name: 'Bánh - niềng xe', slug: 'wheels-rims', parentCategory: bikeParts._id.toString(), sortOrder: 2 },
    { name: 'Chén cổ', slug: 'headsets', parentCategory: bikeParts._id.toString(), sortOrder: 3 },
    { name: 'Củ đề', slug: 'derailleurs', parentCategory: bikeParts._id.toString(), sortOrder: 4 },
    { name: 'Sản phẩm bảo dưỡng', slug: 'maintenance-products', parentCategory: bikeParts._id.toString(), sortOrder: 5 },
    { name: 'Gôm thắng', slug: 'brake-pads', parentCategory: bikeParts._id.toString(), sortOrder: 6 },
    { name: 'Ghi đông - pô tăng', slug: 'handlebars-stems', parentCategory: bikeParts._id.toString(), sortOrder: 7 },
    { name: 'Sên', slug: 'chains', parentCategory: bikeParts._id.toString(), sortOrder: 8 },
    { name: 'Vỏ - ruột xe', slug: 'tires-tubes', parentCategory: bikeParts._id.toString(), sortOrder: 9 },
  ];
  const categoryImageBySlug: Record<string, string> = {
    'city-bike': '/images/products/city-bike-demo.png',
    'mountain-bike': '/images/products/mountain-bike-demo.png',
    'road-bike': '/images/products/road-bike-demo.png',
    'folding-bikes': '/images/products/city-bike-demo.png',
    'womens-bikes': '/images/products/city-bike-demo.png',
    'kids-bikes': '/images/products/city-bike-demo.png',
    framesets: '/images/products/road-bike-demo.png',
    'fixed-gear-bikes': '/images/products/road-bike-demo.png',
    'cycling-apparel': '/images/products/cycling-apparel-kit.png',
    bags: '/images/products/rider-gear-kit.png',
    gloves: '/images/products/rider-gear-kit.png',
    'cycling-shoes': '/images/products/rider-gear-kit.png',
    'cycling-glasses': '/images/products/rider-gear-kit.png',
    helmets: '/images/products/rider-gear-kit.png',
    caps: '/images/products/cycling-apparel-kit.png',
    'arm-sleeves': '/images/products/cycling-apparel-kit.png',
    'cycling-pants': '/images/products/cycling-apparel-kit.png',
    'cycling-socks': '/images/products/cycling-apparel-kit.png',
    'racks-fenders': '/images/products/bike-accessories-kit.png',
    kickstands: '/images/products/bike-accessories-kit.png',
    lights: '/images/products/bike-accessories-kit.png',
    'bells-horns': '/images/products/bike-accessories-kit.png',
    'handlebar-tape-grips': '/images/products/bike-accessories-kit.png',
    bottles: '/images/products/bike-accessories-kit.png',
    'child-seats': '/images/products/bike-accessories-kit.png',
    locks: '/images/products/bike-accessories-kit.png',
    'pumps-accessories': '/images/products/bike-accessories-kit.png',
    'frame-seat-bags': '/images/products/bike-accessories-kit.png',
    components: '/images/products/bike-parts-kit.png',
    'wheels-rims': '/images/products/bike-parts-kit.png',
    headsets: '/images/products/bike-parts-kit.png',
    derailleurs: '/images/products/bike-parts-kit.png',
    'maintenance-products': '/images/products/bike-parts-kit.png',
    'brake-pads': '/images/products/bike-parts-kit.png',
    'handlebars-stems': '/images/products/bike-parts-kit.png',
    chains: '/images/products/bike-parts-kit.png',
    'tires-tubes': '/images/products/bike-parts-kit.png',
  };

  const categoryBySlug = new Map<string, string>([
    ['bicycles', bicycles._id.toString()],
    ['accessories', riderAccessories._id.toString()],
    ['bike-accessories', bikeAccessories._id.toString()],
    ['bike-parts', bikeParts._id.toString()],
  ]);

  for (const categoryDefinition of categoryDefinitions) {
    const category = await categoriesService.upsertForSeed({
      ...categoryDefinition,
      imageUrl: categoryImageBySlug[categoryDefinition.slug],
    });
    categoryBySlug.set(category.slug, category._id.toString());
    console.log(`Seeded category: ${category.name}`);
  }

  const brandDefinitions = [
    { name: 'Giant', slug: 'giant', website: 'https://www.giant-bicycles.com', sortOrder: 1 },
    { name: 'Liv', slug: 'liv', website: 'https://www.liv-cycling.com', sortOrder: 2 },
    { name: 'Momentum', slug: 'momentum', website: 'https://www.momentum-biking.com', sortOrder: 3 },
    { name: 'Raptor', slug: 'raptor', sortOrder: 4 },
    { name: 'Java', slug: 'java', sortOrder: 5 },
    { name: 'Misaki', slug: 'misaki', sortOrder: 6 },
    { name: 'Shimano', slug: 'shimano', website: 'https://bike.shimano.com', sortOrder: 7 },
    { name: 'Trinx', slug: 'trinx', website: 'https://www.trinx.com', sortOrder: 8 },
    { name: 'Active', slug: 'active', sortOrder: 9 },
    { name: 'Trek', slug: 'trek', website: 'https://www.trekbikes.com', sortOrder: 10 },
    { name: 'Cannondale', slug: 'cannondale', website: 'https://www.cannondale.com', sortOrder: 20 },
    { name: 'Specialized', slug: 'specialized', website: 'https://www.specialized.com', sortOrder: 21 },
    { name: 'Giro', slug: 'giro', website: 'https://www.giro.com', sortOrder: 22 },
    { name: 'RockBros', slug: 'rockbros', website: 'https://www.rockbrosbike.com', sortOrder: 23 },
    { name: 'Finish Line', slug: 'finish-line', website: 'https://www.finishlineusa.com', sortOrder: 24 },
    { name: 'Maxxis', slug: 'maxxis', website: 'https://www.maxxis.com', sortOrder: 25 },
  ];
  const brandBySlug = new Map<string, string>();

  for (const brandDefinition of brandDefinitions) {
    const brand = await brandsService.upsertForSeed(brandDefinition);
    brandBySlug.set(brand.slug, brand._id.toString());
    console.log(`Seeded brand: ${brand.name}`);
  }

  const productIdBySku = new Map<string, string>();

  for (const definition of allProductDefinitions) {
    const { categorySlug, brandSlug, ...productInput } = definition;
    const category = categoryBySlug.get(categorySlug);
    const brand = brandBySlug.get(brandSlug);

    if (!category || !brand) {
      throw new Error(`Missing seed reference for ${definition.sku}.`);
    }

    const product = await productsService.upsertForSeed({
      ...productInput,
      category,
      brand,
    });
    productIdBySku.set(product.sku, product.id);
    console.log(`Seeded product: ${product.name}`);
  }

  const adminUserId = userIdByEmail.get('admin@example.com');
  if (!adminUserId) {
    throw new Error('Missing seeded administrator id.');
  }

  const productQuestionDefinitions = [
    {
      userEmail: 'customer1@example.com',
      productSku: 'TREK-MARLIN-8-G3',
      question:
        'Xe nay co phu hop de di lam hang ngay va thinh thoang di duong dia hinh nhe khong?',
      answer:
        'Phu hop. Marlin 8 co tu the lai linh hoat cho di lai hang ngay va bo truyen dong ben bi cho cac cung duong dia hinh nhe. Ban nen doi chieu them size theo chieu cao truoc khi dat hang.',
    },
    {
      userEmail: 'customer2@example.com',
      productSku: 'GIANT-TALON-1-29',
      question: 'Chieu cao 1m72 thi nen chon size nao cho mau xe nay?',
      answer:
        'Voi chieu cao 1m72, size M thuong se can bang. Ban co the dung cong cu Huong dan chon size hoac dat lich bike fitting de duoc can chinh ky hon.',
    },
    {
      userEmail: 'customer3@example.com',
      productSku: 'TREK-DOMANE-AL2-G4',
      question: 'Xe co san nhung mau nao va co the lap them pedan khong?',
      answer:
        'Mau sac va ton kho hien thi theo tung bien the ngay tren trang san pham. Cua hang co the tu van va lap them pedan phu hop truoc khi giao xe neu ban co nhu cau.',
    },
  ];

  for (const definition of productQuestionDefinitions) {
    const userId = userIdByEmail.get(definition.userEmail);
    const productId = productIdBySku.get(definition.productSku);

    if (!userId || !productId) {
      throw new Error(
        `Missing seed reference for product question ${definition.productSku}.`,
      );
    }

    const productQuestion = await productQuestionsService.upsertForSeed({
      userId,
      productId,
      question: definition.question,
      answer: definition.answer,
      answeredById: adminUserId,
    });
    console.log(`Seeded product question: ${productQuestion.id}`);
  }
}

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const submittedCatalog = process.argv.includes('--current-catalog')
      ? await prepareSubmissionCatalog(connection)
      : null;
    const configService = app.get(ConfigService);
    const usersService = app.get(UsersService);
    const vouchersService = app.get(VouchersService);
    const cmsService = app.get(CmsService);
    const chatbotService = app.get(ChatbotService);
    const sizeGuidesService = app.get(SizeGuidesService);
    const allPermissions = Object.values(Permission);
    const bcryptSaltRounds = configService.getOrThrow<number>(
      'security.bcryptSaltRounds',
    );

    const accounts: SeedAccount[] = [
      {
        fullName: 'System Administrator',
        username: 'admin',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        permissions: allPermissions,
        password: configService.getOrThrow<string>('SEED_ADMIN_PASSWORD'),
      },
      {
        fullName: 'Store Staff',
        username: 'staff',
        email: 'staff@example.com',
        role: UserRole.STAFF,
        permissions: [
          Permission.VIEW_DASHBOARD,
          Permission.MANAGE_PRODUCTS,
          Permission.MANAGE_ORDERS,
          Permission.MANAGE_SERVICE_BOOKINGS,
        ],
        password: configService.getOrThrow<string>('SEED_STAFF_PASSWORD'),
      },
      ...['customer.one', 'customer.two', 'customer.three'].map(
        (username, index): SeedAccount => ({
          fullName: `Demo Customer ${index + 1}`,
          username,
          email: `customer${index + 1}@example.com`,
          role: UserRole.CUSTOMER,
          password: configService.getOrThrow<string>('SEED_CUSTOMER_PASSWORD'),
        }),
      ),
    ];

    const userIdByEmail = new Map<string, string>();

    for (const account of accounts) {
      const passwordHash = await bcrypt.hash(account.password, bcryptSaltRounds);
      const user = await usersService.createIfMissing({
        fullName: account.fullName,
        username: account.username,
        email: account.email,
        passwordHash,
        role: account.role,
        permissions: account.permissions,
      });

      userIdByEmail.set(user.email, user._id.toString());
      console.log(`Seeded ${user.role}: ${user.email}`);
    }

    if (!submittedCatalog) {
      await seedDemoCatalog(app, userIdByEmail);
    }

    const now = new Date();
    const voucherStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const voucherEndDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const voucherDefinitions: CreateVoucherDto[] = [
      {
        code: 'BIKE10',
        name: 'Giảm 10% đơn xe đạp',
        description: 'Giảm tối đa 300.000đ cho đơn từ 2.000.000đ.',
        discountType: VoucherDiscountType.PERCENT,
        discountValue: 10,
        maxDiscount: 300000,
        minOrderValue: 2000000,
        startDate: voucherStartDate,
        endDate: voucherEndDate,
        usageLimit: 500,
        active: true,
      },
      {
        code: 'FREERIDE100K',
        name: 'Giảm 100.000đ',
        description: 'Áp dụng cho đơn từ 1.000.000đ.',
        discountType: VoucherDiscountType.FIXED,
        discountValue: 100000,
        minOrderValue: 1000000,
        startDate: voucherStartDate,
        endDate: voucherEndDate,
        usageLimit: 300,
        active: true,
      },
    ];

    for (const voucherDefinition of voucherDefinitions) {
      const voucher = await vouchersService.upsertForSeed(voucherDefinition);
      console.log(`Seeded voucher: ${voucher.code}`);
    }

    const bannerDefinitions = [
      {
        title: 'Chinh phục mọi cung đường',
        subtitle: 'Khám phá xe đạp địa hình bền bỉ, sẵn sàng cho hành trình cuối tuần.',
        imageUrl: '/images/hero-cycling-collection.png',
        link: '/products?category=mountain-bike',
        buttonLabel: 'Khám phá MTB',
        type: BannerType.SLIDER,
        position: BannerPosition.HOME_HERO,
        sortOrder: 1,
        active: true,
      },
      {
        title: 'Tốc độ cho ngày mới',
        subtitle: 'Xe đua nhẹ, linh hoạt và nhiều lựa chọn size phù hợp với bạn.',
        imageUrl: '/images/hero-cycling-collection.png',
        link: '/products?category=road-bike',
        buttonLabel: 'Xem xe đua',
        type: BannerType.SLIDER,
        position: BannerPosition.HOME_HERO,
        sortOrder: 2,
        active: true,
      },
      {
        title: 'Phụ kiện an toàn cho mỗi chuyến đi',
        subtitle: 'Mũ bảo hiểm, đèn xe và găng tay sẵn sàng đồng hành.',
        imageUrl: '/images/products/rider-gear-kit.png',
        link: '/products?category=accessories',
        buttonLabel: 'Mua phụ kiện',
        type: BannerType.BANNER,
        position: BannerPosition.HOME_MIDDLE,
        sortOrder: 1,
        active: true,
      },
      {
        title: 'Ưu đãi xe thành phố',
        subtitle: 'Tận hưởng hành trình đi làm và dạo phố với mức giá hấp dẫn.',
        imageUrl: '/images/products/city-bike-demo.png',
        link: '/products?category=city-bike&onSale=true',
        buttonLabel: 'Xem ưu đãi',
        type: BannerType.BANNER,
        position: BannerPosition.HOME_MIDDLE,
        sortOrder: 2,
        active: true,
      },
    ];

    for (const bannerDefinition of bannerDefinitions) {
      const banner = await cmsService.upsertBannerForSeed(bannerDefinition);
      console.log(`Seeded CMS banner: ${banner.title}`);
    }

    const staticPageDefinitions = [
      {
        title: 'Chính sách bảo hành',
        slug: 'warranty-policy',
        excerpt: 'Cam kết bảo hành minh bạch cho xe đạp và phụ kiện tại XeDap22h.',
        content: `XeDap22h bảo hành sản phẩm theo chính sách của hãng và quy định ghi trên hóa đơn mua hàng.

Xe đạp được hỗ trợ kiểm tra kỹ thuật ban đầu, tư vấn bảo dưỡng định kỳ và tiếp nhận bảo hành khi phát sinh lỗi do nhà sản xuất.

Vui lòng giữ hóa đơn, phiếu bảo hành và liên hệ cửa hàng trước khi mang sản phẩm đến để được hướng dẫn nhanh nhất.`,
        status: PageStatus.PUBLISHED,
        seoTitle: 'Chính sách bảo hành | XeDap22h',
        seoDescription: 'Thông tin bảo hành xe đạp và phụ kiện tại XeDap22h.',
      },
      {
        title: 'Chính sách đổi trả',
        slug: 'return-policy',
        excerpt: 'Hướng dẫn đổi trả sản phẩm minh bạch và thuận tiện.',
        content: `XeDap22h hỗ trợ đổi trả khi sản phẩm bị lỗi do nhà sản xuất hoặc giao không đúng thông tin đơn hàng.

Khách hàng vui lòng thông báo trong thời gian phù hợp kể từ lúc nhận hàng, giữ nguyên tình trạng sản phẩm, phụ kiện và chứng từ đi kèm.

Với sản phẩm đã sử dụng hoặc hư hỏng do người dùng, cửa hàng sẽ kiểm tra thực tế và tư vấn phương án hỗ trợ phù hợp.`,
        status: PageStatus.PUBLISHED,
        seoTitle: 'Chính sách đổi trả | XeDap22h',
        seoDescription: 'Quy định đổi trả xe đạp và phụ kiện tại XeDap22h.',
      },
      {
        title: 'Giới thiệu XeDap22h',
        slug: 'about-us',
        excerpt: 'XeDap22h đồng hành cùng cộng đồng đạp xe với sản phẩm đáng tin cậy.',
        content: `XeDap22h là cửa hàng chuyên xe đạp địa hình, xe đua, xe thành phố và phụ kiện cho mọi hành trình.

Chúng tôi lựa chọn sản phẩm có thông tin rõ ràng, quản lý tồn kho theo từng màu và kích cỡ, đồng thời tư vấn để khách hàng chọn được chiếc xe phù hợp.

Mục tiêu của XeDap22h là giúp mỗi chuyến đi an toàn, thoải mái và nhiều cảm hứng hơn.`,
        status: PageStatus.PUBLISHED,
        seoTitle: 'Giới thiệu | XeDap22h',
        seoDescription: 'Tìm hiểu về XeDap22h và định hướng phục vụ khách hàng.',
      },
      {
        title: 'Liên hệ',
        slug: 'contact',
        excerpt: 'Liên hệ XeDap22h để được tư vấn sản phẩm, bảo hành và đơn hàng.',
        content: `Bạn cần tư vấn chọn xe, kiểm tra đơn hàng hoặc hỗ trợ bảo hành? XeDap22h luôn sẵn sàng lắng nghe.

Email: support@example.com
Hotline: 1900 0000
Thời gian hỗ trợ: 08:30 - 20:30 mỗi ngày

Bạn cũng có thể gửi yêu cầu qua tài khoản mua hàng, đội ngũ cửa hàng sẽ phản hồi sớm nhất có thể.`,
        status: PageStatus.PUBLISHED,
        seoTitle: 'Liên hệ | XeDap22h',
        seoDescription: 'Thông tin liên hệ và hỗ trợ khách hàng của XeDap22h.',
      },
    ];

    for (const staticPageDefinition of staticPageDefinitions) {
      const page = await cmsService.upsertStaticPageForSeed(staticPageDefinition);
      console.log(`Seeded static page: ${page.slug}`);
    }

    const sizeGuideDefinitions = [
      { bikeType: BikeType.MOUNTAIN, minHeightCm: 150, maxHeightCm: 164, recommendedSize: 'XS', frameSizeLabel: '13–14 inch', description: 'Khung nhỏ, linh hoạt cho người mới bắt đầu đi MTB.', sortOrder: 1, active: true },
      { bikeType: BikeType.MOUNTAIN, minHeightCm: 165, maxHeightCm: 172, recommendedSize: 'S', frameSizeLabel: '15–16 inch', description: 'Phù hợp tư thế điều khiển linh hoạt trên địa hình.', sortOrder: 2, active: true },
      { bikeType: BikeType.MOUNTAIN, minHeightCm: 173, maxHeightCm: 180, recommendedSize: 'M', frameSizeLabel: '17–18 inch', description: 'Lựa chọn cân bằng cho các cung đường địa hình phổ biến.', sortOrder: 3, active: true },
      { bikeType: BikeType.MOUNTAIN, minHeightCm: 181, maxHeightCm: 188, recommendedSize: 'L', frameSizeLabel: '19–20 inch', description: 'Không gian buồng lái rộng rãi hơn cho người cao.', sortOrder: 4, active: true },
      { bikeType: BikeType.MOUNTAIN, minHeightCm: 189, maxHeightCm: 198, recommendedSize: 'XL', frameSizeLabel: '21–22 inch', description: 'Khung lớn cho tư thế đạp ổn định và thoải mái.', sortOrder: 5, active: true },
      { bikeType: BikeType.ROAD, minHeightCm: 150, maxHeightCm: 164, recommendedSize: 'XS', frameSizeLabel: '47–49 cm', description: 'Khung road nhỏ giúp giữ tư thế khí động học vừa phải.', sortOrder: 1, active: true },
      { bikeType: BikeType.ROAD, minHeightCm: 165, maxHeightCm: 172, recommendedSize: 'S', frameSizeLabel: '50–52 cm', description: 'Phù hợp đi tập luyện, đi làm hoặc các chuyến road ngắn.', sortOrder: 2, active: true },
      { bikeType: BikeType.ROAD, minHeightCm: 173, maxHeightCm: 180, recommendedSize: 'M', frameSizeLabel: '53–55 cm', description: 'Cân bằng giữa tầm với và hiệu quả đạp xe đường trường.', sortOrder: 3, active: true },
      { bikeType: BikeType.ROAD, minHeightCm: 181, maxHeightCm: 188, recommendedSize: 'L', frameSizeLabel: '56–58 cm', description: 'Phù hợp người cao cần reach và stack rộng hơn.', sortOrder: 4, active: true },
      { bikeType: BikeType.ROAD, minHeightCm: 189, maxHeightCm: 198, recommendedSize: 'XL', frameSizeLabel: '59–61 cm', description: 'Khung road lớn cho người có sải chân và chiều cao vượt trội.', sortOrder: 5, active: true },
      { bikeType: BikeType.CITY, minHeightCm: 150, maxHeightCm: 164, recommendedSize: 'S', frameSizeLabel: '15–16 inch', description: 'Tư thế ngồi thoải mái cho nhu cầu đi lại hằng ngày.', sortOrder: 1, active: true },
      { bikeType: BikeType.CITY, minHeightCm: 165, maxHeightCm: 172, recommendedSize: 'S/M', frameSizeLabel: '16–17 inch', description: 'Phù hợp đa số người dùng xe thành phố.', sortOrder: 2, active: true },
      { bikeType: BikeType.CITY, minHeightCm: 173, maxHeightCm: 180, recommendedSize: 'M', frameSizeLabel: '17–18 inch', description: 'Lựa chọn cân bằng cho hành trình đi làm và đi dạo.', sortOrder: 3, active: true },
      { bikeType: BikeType.CITY, minHeightCm: 181, maxHeightCm: 188, recommendedSize: 'L', frameSizeLabel: '19–20 inch', description: 'Khung lớn hơn để có tư thế thư giãn và ổn định.', sortOrder: 4, active: true },
      { bikeType: BikeType.CITY, minHeightCm: 189, maxHeightCm: 198, recommendedSize: 'XL', frameSizeLabel: '21–22 inch', description: 'Không gian ngồi rộng rãi cho người cao.', sortOrder: 5, active: true },
    ];

    for (const sizeGuideDefinition of sizeGuideDefinitions) {
      const sizeGuide = await sizeGuidesService.upsertForSeed(sizeGuideDefinition);
      console.log(
        `Seeded size guide: ${sizeGuide.bikeType} ${sizeGuide.minHeightCm}-${sizeGuide.maxHeightCm}cm`,
      );
    }

    const faqDefinitions = [
      {
        question: 'Shop bảo hành bao lâu?',
        answer:
          'Thời hạn bảo hành phụ thuộc vào từng thương hiệu và dòng sản phẩm. Thông tin chi tiết được hiển thị trong thông số sản phẩm; cửa hàng sẽ hỗ trợ kiểm tra chính sách chính xác trước khi mua.',
        keywords: ['bảo hành', 'bao hanh', 'warranty', 'bảo hành bao lâu'],
        priority: 100,
        active: true,
      },
      {
        question: 'Chính sách đổi trả như thế nào?',
        answer:
          'Bạn có thể liên hệ XeDap22h để được hỗ trợ đổi trả theo tình trạng sản phẩm và chính sách hiện hành. Vui lòng giữ hóa đơn, phụ kiện đi kèm và liên hệ sớm nhất có thể.',
        keywords: ['đổi trả', 'doi tra', 'return', 'trả hàng', 'hoàn hàng'],
        priority: 95,
        active: true,
      },
      {
        question: 'Phí giao hàng là bao nhiêu?',
        answer:
          'Phí vận chuyển được tính tại bước checkout dựa trên phương thức giao hàng và địa chỉ nhận hàng. Bạn luôn xem được tổng tiền trước khi xác nhận đơn.',
        keywords: ['phí ship', 'phí giao hàng', 'shipping fee', 'ship bao nhiêu', 'vận chuyển'],
        priority: 90,
        active: true,
      },
      {
        question: 'Đơn hàng giao trong bao lâu?',
        answer:
          'Thời gian giao hàng phụ thuộc khu vực nhận và phương thức vận chuyển. Sau khi đơn được xác nhận, bạn có thể theo dõi trạng thái đơn hàng trong tài khoản.',
        keywords: ['giao hàng', 'thời gian giao', 'bao lâu nhận hàng', 'delivery time', 'khi nào nhận'],
        priority: 85,
        active: true,
      },
      {
        question: 'Cửa hàng ở đâu?',
        answer:
          'Bạn có thể xem thông tin liên hệ và địa chỉ hỗ trợ tại trang Liên hệ. Nếu muốn đến xem xe, hãy liên hệ trước để cửa hàng chuẩn bị mẫu phù hợp.',
        keywords: ['địa chỉ', 'cửa hàng ở đâu', 'shop ở đâu', 'store address', 'liên hệ'],
        priority: 80,
        active: true,
      },
      {
        question: 'Có những phương thức thanh toán nào?',
        answer:
          'XeDap22h hiện hỗ trợ thanh toán khi nhận hàng (COD) và phương thức thanh toán trực tuyến theo cấu hình tại checkout.',
        keywords: ['thanh toán', 'payment', 'cod', 'trả tiền', 'chuyển khoản'],
        priority: 75,
        active: true,
      },
      {
        question: 'Tôi có thể hủy đơn hàng không?',
        answer:
          'Bạn có thể tự hủy đơn khi đơn vẫn ở trạng thái PENDING trong trang chi tiết đơn hàng. Khi đơn đã được xác nhận, vui lòng liên hệ cửa hàng để được hỗ trợ.',
        keywords: ['hủy đơn', 'huy don', 'cancel order', 'hủy hàng', 'không lấy nữa'],
        priority: 70,
        active: true,
      },
    ];

    for (const faqDefinition of faqDefinitions) {
      const faq = await chatbotService.upsertForSeed(faqDefinition);
      console.log(`Seeded FAQ: ${faq.question}`);
    }
    if (submittedCatalog) {
      await importSubmissionCatalog(connection, submittedCatalog);
    }
  } finally {
    await app.close();
  }
}

void seed();
