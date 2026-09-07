import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createSlug } from '../common/utils/slug.util';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { Product } from '../products/schemas/product.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentCategory?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode extends CategoryResponse {
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async findPublicTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.categoryModel
      .find()
      .sort({ sortOrder: 1, name: 1 })
      .exec();

    const categoriesById = new Map(
      categories.map((category) => [category._id.toString(), category]),
    );

    return this.toTree(
      categories.filter((category) =>
        this.hasOnlyActiveAncestors(category, categoriesById),
      ),
    );
  }

  async findAdminList(): Promise<CategoryResponse[]> {
    const categories = await this.categoryModel
      .find()
      .sort({ sortOrder: 1, name: 1 })
      .exec();

    return categories.map((category) => this.toResponse(category));
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    if (dto.parentCategory) {
      await this.assertValidParent(dto.parentCategory);
    }

    const category = await this.categoryModel.create({
      name: dto.name,
      slug: await this.createUniqueSlug(dto.slug ?? dto.name),
      ...(dto.description ? { description: dto.description } : {}),
      ...(dto.imageUrl ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.parentCategory ? { parentCategory: dto.parentCategory } : {}),
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.toResponse(category);
  }

  async update(
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    assertNoUnexpectedNull(dto, ['description', 'imageUrl', 'parentCategory']);
    const category = await this.findDocumentById(categoryId);
    const patch = dto as UpdateCategoryDto & {
      description?: string | null;
      imageUrl?: string | null;
    };
    if (dto.parentCategory !== undefined) {
      if (dto.parentCategory) {
        await this.assertValidParent(dto.parentCategory, categoryId);
        category.parentCategory = new Types.ObjectId(dto.parentCategory);
      } else {
        category.parentCategory = undefined;
      }
    }

    if (dto.slug) {
      category.slug = await this.createUniqueSlug(dto.slug, categoryId);
    }

    if (dto.name !== undefined) {
      category.name = dto.name;
    }
    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;
    }
    if (dto.sortOrder !== undefined) {
      category.sortOrder = dto.sortOrder;
    }
    if (patch.description !== undefined) {
      category.description = this.toOptionalTrimmed(patch.description ?? undefined);
    }
    if (patch.imageUrl !== undefined) {
      category.imageUrl = this.toOptionalTrimmed(patch.imageUrl ?? undefined);
    }
    await category.save();

    return this.toResponse(category);
  }

  async remove(categoryId: string): Promise<{ id: string }> {
    const category = await this.findDocumentById(categoryId);
    const [hasChildren, hasProducts] = await Promise.all([
      this.categoryModel.exists({ parentCategory: category._id }),
      this.productModel.exists({ category: category._id }),
    ]);

    if (hasChildren) {
      throw new ConflictException(
        'Cannot delete a category that still has child categories.',
      );
    }

    if (hasProducts) {
      throw new ConflictException(
        'Cannot delete a category that is assigned to products. Disable it instead.',
      );
    }

    await category.deleteOne();
    return { id: categoryId };
  }

  async getActiveById(categoryId: string): Promise<CategoryDocument> {
    const category = await this.categoryModel
      .findOne({ _id: categoryId, isActive: true })
      .exec();

    if (!category || !(await this.isPubliclyAvailable(category))) {
      throw new BadRequestException('Category does not exist or is inactive.');
    }

    return category;
  }

  /**
   * Categories are public only when the category itself and every ancestor are
   * active. Keeping this rule here prevents child categories of a disabled
   * parent from leaking into catalog, cart, checkout, or recommendation flows.
   */
  async getPublicActiveIds(): Promise<string[]> {
    const categories = await this.categoryModel
      .find()
      .select('_id parentCategory isActive')
      .exec();
    const categoriesById = new Map(
      categories.map((category) => [category._id.toString(), category]),
    );

    return categories
      .filter((category) =>
        this.hasOnlyActiveAncestors(category, categoriesById),
      )
      .map((category) => category._id.toString());
  }

  async getActiveDescendantIdsBySlug(slug: string): Promise<string[]> {
    const root = await this.categoryModel
      .findOne({ slug: slug.toLowerCase(), isActive: true })
      .select('_id parentCategory isActive')
      .exec();

    if (!root) {
      return [];
    }

    const categories = await this.categoryModel
      .find()
      .select('_id parentCategory isActive')
      .exec();
    const categoriesById = new Map(
      categories.map((category) => [category._id.toString(), category]),
    );

    if (!this.hasOnlyActiveAncestors(root, categoriesById)) {
      return [];
    }

    const childrenByParent = new Map<string, CategoryDocument[]>();

    for (const category of categories) {
      if (!category.parentCategory) {
        continue;
      }

      const parentId = category.parentCategory.toString();
      const children = childrenByParent.get(parentId) ?? [];
      children.push(category);
      childrenByParent.set(parentId, children);
    }

    const result: string[] = [];
    const queue = [root._id.toString()];

    while (queue.length) {
      const currentId = queue.shift();

      if (!currentId) {
        continue;
      }

      result.push(currentId);
      for (const child of childrenByParent.get(currentId) ?? []) {
        if (child.isActive) {
          queue.push(child._id.toString());
        }
      }
    }

    return result;
  }

  async upsertForSeed(input: {
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    parentCategory?: string;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<CategoryDocument> {
    const slug = createSlug(input.slug ?? input.name);
    const existing = await this.categoryModel.findOne({ slug }).exec();
    const values = {
      ...input,
      slug,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    };

    if (existing) {
      Object.assign(existing, values);
      await existing.save();
      return existing;
    }

    return this.categoryModel.create(values);
  }

  private async findDocumentById(categoryId: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(categoryId).exec();

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  private async assertValidParent(
    parentCategoryId: string,
    currentCategoryId?: string,
  ): Promise<void> {
    const parent = await this.categoryModel.findById(parentCategoryId).exec();

    if (!parent) {
      throw new BadRequestException('Parent category does not exist.');
    }

    if (!parent.isActive) {
      throw new BadRequestException('Parent category must be active.');
    }

    if (!currentCategoryId) {
      return;
    }

    let cursor: CategoryDocument | null = parent;
    const visited = new Set<string>();

    while (cursor) {
      const cursorId = cursor._id.toString();

      if (!cursor.isActive) {
        throw new BadRequestException(
          'Parent category and all of its ancestors must be active.',
        );
      }

      if (cursorId === currentCategoryId) {
        throw new BadRequestException('A category cannot be its own descendant.');
      }

      if (visited.has(cursorId) || !cursor.parentCategory) {
        return;
      }

      visited.add(cursorId);
      cursor = await this.categoryModel.findById(cursor.parentCategory).exec();
    }
  }

  private async isPubliclyAvailable(
    category: CategoryDocument,
  ): Promise<boolean> {
    const categories = await this.categoryModel
      .find()
      .select('_id parentCategory isActive')
      .exec();
    const categoriesById = new Map(
      categories.map((item) => [item._id.toString(), item]),
    );

    return this.hasOnlyActiveAncestors(category, categoriesById);
  }

  private toOptionalTrimmed(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private async createUniqueSlug(
    value: string,
    excludeCategoryId?: string,
  ): Promise<string> {
    const baseSlug = createSlug(value);
    let candidate = baseSlug;
    let sequence = 2;

    while (true) {
      const filter: Record<string, unknown> = { slug: candidate };

      if (excludeCategoryId) {
        filter._id = { $ne: excludeCategoryId };
      }

      const exists = await this.categoryModel.exists(filter).exec();

      if (!exists) {
        return candidate;
      }

      candidate = `${baseSlug}-${sequence}`;
      sequence += 1;
    }
  }

  private toTree(categories: CategoryDocument[]): CategoryTreeNode[] {
    const nodes = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    for (const category of categories) {
      nodes.set(category._id.toString(), {
        ...this.toResponse(category),
        children: [],
      });
    }

    for (const category of categories) {
      const node = nodes.get(category._id.toString());

      if (!node) {
        continue;
      }

      const parentId = category.parentCategory?.toString();
      const parentNode = parentId ? nodes.get(parentId) : undefined;

      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private hasOnlyActiveAncestors(
    category: CategoryDocument,
    categoriesById: Map<string, CategoryDocument>,
  ): boolean {
    if (!category.isActive) {
      return false;
    }

    const visited = new Set<string>([category._id.toString()]);
    let parentId = category.parentCategory?.toString();

    while (parentId) {
      if (visited.has(parentId)) {
        return false;
      }

      const parent = categoriesById.get(parentId);
      if (!parent || !parent.isActive) {
        return false;
      }

      visited.add(parentId);
      parentId = parent.parentCategory?.toString();
    }

    return true;
  }

  private toResponse(category: CategoryDocument): CategoryResponse {
    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      ...(category.description ? { description: category.description } : {}),
      ...(category.imageUrl ? { imageUrl: category.imageUrl } : {}),
      ...(category.parentCategory
        ? { parentCategory: category.parentCategory.toString() }
        : {}),
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
