import type { ApiMeta } from './api';

export enum ProductType {
  BICYCLE = 'BICYCLE',
  ACCESSORY = 'ACCESSORY',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
}

export enum BikeType {
  MOUNTAIN = 'MOUNTAIN',
  ROAD = 'ROAD',
  CITY = 'CITY',
  HYBRID = 'HYBRID',
  BMX = 'BMX',
  FOLDING = 'FOLDING',
  ELECTRIC = 'ELECTRIC',
  OTHER = 'OTHER',
}

export enum ProductSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  BEST_SELLING = 'best_selling',
  RATING_DESC = 'rating_desc',
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentCategory?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  url: string;
  alt?: string;
  sortOrder: number;
}

export interface ProductSpecification {
  label: string;
  value: string;
  group?: string;
}

export interface ProductVariant {
  id: string;
  color: string;
  colorHex?: string;
  size: string;
  sku: string;
  stock: number;
  priceAdjustment: number;
  price: number;
  imageUrl?: string;
}

export interface ProductReference {
  id: string;
  name?: string;
  slug?: string;
  logoUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  category: ProductReference;
  brand: ProductReference;
  productType: ProductType;
  originalPrice: number;
  salePrice: number;
  images: ProductImage[];
  thumbnail: string;
  status: ProductStatus;
  catalogOnly?: boolean;
  featured: boolean;
  bikeType?: BikeType;
  frameMaterial?: string;
  wheelSize?: string;
  weight?: string;
  specifications: ProductSpecification[];
  variants: ProductVariant[];
  availableStock: number;
  averageRating: number;
  reviewCount: number;
  soldCount: number;
  isOnSale: boolean;
  discountPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  bikeType?: BikeType;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  inStock?: boolean;
  featured?: boolean;
  sort?: ProductSort;
}

export interface AdminProductListQuery extends ProductListQuery {
  status?: ProductStatus;
}

export interface ProductListResult {
  items: Product[];
  meta: ApiMeta;
}

export interface ProductFacetValue {
  value: string;
  count: number;
  colorHex?: string;
}

export interface ProductNameSuggestion {
  id: string;
  name: string;
  slug: string;
  sku: string;
  thumbnail: string;
  salePrice: number;
}

export interface ProductFacets {
  priceRange?: {
    min: number;
    max: number;
  };
  colors: ProductFacetValue[];
  sizes: ProductFacetValue[];
  suggestions: ProductNameSuggestion[];
}

export interface ProductImagePayload {
  url: string;
  alt?: string;
  sortOrder?: number;
}

export interface ProductSpecificationPayload {
  label: string;
  value: string;
  group?: string;
}

export interface ProductVariantPayload {
  color: string;
  colorHex?: string;
  size: string;
  sku: string;
  stock: number;
  priceAdjustment?: number;
  imageUrl?: string;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  sku: string;
  shortDescription: string;
  description: string;
  category: string;
  brand: string;
  productType: ProductType;
  originalPrice: number;
  salePrice: number;
  images: ProductImagePayload[];
  thumbnail: string;
  status?: ProductStatus;
  catalogOnly?: boolean;
  featured?: boolean;
  bikeType?: BikeType;
  frameMaterial?: string;
  wheelSize?: string;
  weight?: string;
  specifications?: ProductSpecificationPayload[];
  variants: ProductVariantPayload[];
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  parentCategory?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface BrandPayload {
  name: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export const bikeTypeLabels: Record<BikeType, string> = {
  [BikeType.MOUNTAIN]: 'Xe địa hình',
  [BikeType.ROAD]: 'Xe đua',
  [BikeType.CITY]: 'Xe thành phố',
  [BikeType.HYBRID]: 'Xe hybrid',
  [BikeType.BMX]: 'Xe BMX',
  [BikeType.FOLDING]: 'Xe gấp',
  [BikeType.ELECTRIC]: 'Xe điện',
  [BikeType.OTHER]: 'Khác',
};

export const productStatusLabels: Record<ProductStatus, string> = {
  [ProductStatus.ACTIVE]: 'Đang bán',
  [ProductStatus.INACTIVE]: 'Tạm ẩn',
  [ProductStatus.DISCONTINUED]: 'Ngừng kinh doanh',
};
