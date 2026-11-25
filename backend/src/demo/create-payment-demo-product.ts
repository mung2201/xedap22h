import 'reflect-metadata';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import mongoose, { ClientSession, Connection, Types } from 'mongoose';
import { Brand, BrandSchema } from '../brands/schemas/brand.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { ProductStatus, ProductType } from '../common/enums/catalog.enum';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  PAYMENT_DEMO_PRICE,
  PAYMENT_DEMO_PRODUCT_SKU,
  PAYMENT_DEMO_PRODUCT_SLUG,
  PAYMENT_DEMO_VARIANT_SKU,
} from './payment-demo.constants';

const MARKER = '[DEMO1000]';
const BRAND_SLUG = 'xedap22h-demo';
const CATEGORY_SLUG = 'san-pham-demo';
const IMAGE = '/images/products/payment-demo.svg';
class DemoSetupError extends Error {}
type StoredProduct = Omit<Product, 'brand' | 'category'> & {
  _id: Types.ObjectId; brand: unknown; category: unknown;
};

export async function ensurePaymentDemoProduct(
  connection: Connection,
  options: { apply: boolean },
) {
  const db = connection.db;
  if (!db) throw new DemoSetupError('MongoDB chưa kết nối.');
  if ((process.env.NODE_ENV ?? 'development') !== 'development' ||
    !['localhost', '127.0.0.1'].includes(connection.host)) {
    throw new DemoSetupError('Chỉ tạo sản phẩm demo trong môi trường development và MongoDB local.');
  }
  // Cloned schemas validate real documents without creating collections/indexes.
  const productSchema = ProductSchema.clone().set('autoIndex', false).set('autoCreate', false);
  const brandSchema = BrandSchema.clone().set('autoIndex', false).set('autoCreate', false);
  const categorySchema = CategorySchema.clone().set('autoIndex', false).set('autoCreate', false);
  const ProductModel = connection.models.PaymentDemoProduct ?? connection.model('PaymentDemoProduct', productSchema);
  const BrandModel = connection.models.PaymentDemoBrand ?? connection.model('PaymentDemoBrand', brandSchema);
  const CategoryModel = connection.models.PaymentDemoCategory ?? connection.model('PaymentDemoCategory', categorySchema);

  const prepare = async (session?: ClientSession) => {
    const brands = await db.collection<Brand & { _id: Types.ObjectId }>('brands').find({
      $or: [{ slug: BRAND_SLUG }, { name: 'XeDap22h Demo' }],
    }, { session }).toArray();
    const categories = await db.collection<Category & { _id: Types.ObjectId }>('categories').find({
      $or: [{ slug: CATEGORY_SLUG }, { name: 'Sản phẩm demo' }],
    }, { session }).toArray();
    if (brands.length > 1 || categories.length > 1) {
      throw new DemoSetupError('Tên hoặc đường dẫn danh mục/thương hiệu demo đang bị trùng. Không ghi đè.');
    }
    const now = new Date();
    const brand = brands[0] ?? {
      _id: new Types.ObjectId(), name: 'XeDap22h Demo', slug: BRAND_SLUG,
      description: `${MARKER} Thương hiệu riêng cho sản phẩm thử thanh toán.`,
      isActive: true, sortOrder: 9999, createdAt: now, updatedAt: now,
    };
    const category = categories[0] ?? {
      _id: new Types.ObjectId(), name: 'Sản phẩm demo', slug: CATEGORY_SLUG,
      description: `${MARKER} Chỉ dùng thử thanh toán, không giao hàng thực tế.`,
      parentCategory: null, isActive: true, sortOrder: 9999, createdAt: now, updatedAt: now,
    };
    if (brand.slug !== BRAND_SLUG || brand.name !== 'XeDap22h Demo' ||
      !brand.description?.startsWith(MARKER) || brand.isActive !== true ||
      category.slug !== CATEGORY_SLUG || category.name !== 'Sản phẩm demo' ||
      !category.description?.startsWith(MARKER) || category.isActive !== true ||
      category.parentCategory != null) {
      throw new DemoSetupError('Danh mục/thương hiệu đã có không thuộc cấu hình demo. Không thay đổi dữ liệu.');
    }
    const skus = [PAYMENT_DEMO_PRODUCT_SKU, PAYMENT_DEMO_VARIANT_SKU];
    const existing = await db.collection<StoredProduct>('products').find({ $or: [
      { slug: PAYMENT_DEMO_PRODUCT_SLUG }, { sku: { $in: skus } },
      { 'variants.sku': { $in: skus } },
    ] }, { session }).toArray();
    if (existing.length > 1) throw new DemoSetupError('SKU hoặc đường dẫn demo bị trùng với sản phẩm khác.');
    const current = existing[0];
    if (current) {
      const variant = current.variants?.[0];
      if (!brands[0] || !categories[0] || current.name !== 'Sản phẩm demo 1k' ||
        current.sku !== PAYMENT_DEMO_PRODUCT_SKU || current.slug !== PAYMENT_DEMO_PRODUCT_SLUG ||
        !current.description?.startsWith(MARKER) || current.status !== ProductStatus.ACTIVE ||
        current.catalogOnly !== false || current.productType !== ProductType.ACCESSORY ||
        current.originalPrice !== PAYMENT_DEMO_PRICE || current.salePrice !== PAYMENT_DEMO_PRICE ||
        current.brand !== brand._id.toString() || current.category !== category._id.toString() ||
        current.variants?.length !== 1 || variant?.sku !== PAYMENT_DEMO_VARIANT_SKU ||
        variant.priceAdjustment !== 0 || variant.color !== 'Demo' || variant.size !== 'Tiêu chuẩn' ||
        !Number.isInteger(variant.stock) || variant.stock < 0) {
        throw new DemoSetupError('Sản phẩm có SKU demo đã tồn tại với cấu hình khác. Không ghi đè hoặc đặt lại tồn kho.');
      }
      return { brand, category, product: current, reused: true, newBrand: false, newCategory: false };
    }
    const product = {
      _id: new Types.ObjectId(), name: 'Sản phẩm demo 1k',
      sku: PAYMENT_DEMO_PRODUCT_SKU, slug: PAYMENT_DEMO_PRODUCT_SLUG,
      shortDescription: 'Sản phẩm thử thanh toán 1.000đ và thông báo đơn hàng; không giao hàng thực tế.',
      description: `${MARKER} Chỉ dùng kiểm tra thanh toán QR và thông báo đơn hàng, không phải hàng hóa giao thực tế. ` +
        'Giỏ chỉ có sản phẩm demo được tự động miễn phí vận chuyển. ' +
        'Để tổng thanh toán đúng 1.000đ, thêm một sản phẩm và không dùng mã giảm giá.',
      // Keep string references consistent with the current ProductsService/import.
      category: category._id.toString(), brand: brand._id.toString(),
      productType: ProductType.ACCESSORY, originalPrice: PAYMENT_DEMO_PRICE, salePrice: PAYMENT_DEMO_PRICE,
      thumbnail: IMAGE, images: [{ url: IMAGE, alt: 'Sản phẩm demo 1k', sortOrder: 0 }],
      status: ProductStatus.ACTIVE, catalogOnly: false, featured: false, specifications: [],
      variants: [{ _id: new Types.ObjectId(), sku: PAYMENT_DEMO_VARIANT_SKU,
        color: 'Demo', size: 'Tiêu chuẩn', stock: 10, priceAdjustment: 0, imageUrl: IMAGE }],
      averageRating: 0, reviewCount: 0, soldCount: 0, createdAt: now, updatedAt: now,
    };
    // Validate every new record before the first write, then preserve raw string references.
    if (!brands[0]) await new BrandModel(brand).validate();
    if (!categories[0]) await new CategoryModel(category).validate();
    await new ProductModel(product).validate();
    return { brand, category, product, reused: false, newBrand: !brands[0], newCategory: !categories[0] };
  };

  if (options.apply) {
    const hello = await db.admin().command({ hello: 1 });
    if (typeof hello.setName !== 'string') throw new DemoSetupError('MongoDB cần chạy replica set để tạo demo bằng transaction.');
    // Rely on existing shop indexes; never create/drop indexes in this helper.
    for (const [collection, fields] of [
      ['products', ['sku', 'slug', 'variants.sku']], ['brands', ['slug']], ['categories', ['slug']],
    ] as const) {
      const indexes = await db.collection(collection).indexes();
      if (!fields.every((field) => indexes.some((index) => index.unique &&
        Object.keys(index.key).length === 1 && index.key[field] === 1))) {
        throw new DemoSetupError('Thiếu chỉ mục duy nhất của cửa hàng; hãy khởi động backend trước khi tạo demo.');
      }
    }
  }
  const run = async (session?: ClientSession) => {
    const plan = await prepare(session);
    if (options.apply && !plan.reused) {
      if (plan.newBrand) await db.collection('brands').insertOne(plan.brand, { session });
      if (plan.newCategory) await db.collection('categories').insertOne(plan.category, { session });
      await db.collection('products').insertOne(plan.product, { session });
    }
    return {
      result: plan.reused ? 'reused' : options.apply ? 'created' : 'would-create',
      productId: plan.product._id.toString(), slug: plan.product.slug,
      price: plan.product.salePrice, stock: plan.product.variants[0].stock,
    };
  };
  return options.apply ? connection.transaction((session) => run(session)) : run();
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false } } });
  process.loadEnvFile(resolve(process.cwd(), '.env'));
  const uri = process.env.MONGODB_URI;
  let local = false;
  try {
    const parsed = new URL(uri ?? '');
    local = parsed.protocol === 'mongodb:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch { /* Refuse malformed or remote connection strings below. */ }
  if (!uri || !local || (process.env.NODE_ENV ?? 'development') !== 'development') {
    throw new DemoSetupError('Chỉ dùng với NODE_ENV=development và MongoDB local trong backend/.env.');
  }
  const connection = await mongoose.createConnection(uri, {
    autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000,
  }).asPromise();
  try {
    console.log(JSON.stringify(await ensurePaymentDemoProduct(connection, { apply: values.apply }), null, 2));
  } finally {
    await connection.close();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof DemoSetupError ? error.message : 'Không thể tạo sản phẩm demo. Kiểm tra MongoDB local và cấu hình backend.');
    process.exitCode = 1;
  });
}
