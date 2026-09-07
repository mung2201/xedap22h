import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductStatus } from '../common/enums/catalog.enum';
import { ProductQuestionStatus } from '../common/enums/product-question.enum';
import { UserRole } from '../common/enums/user-role.enum';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { escapeRegExp } from '../common/utils/slug.util';
import { MailService } from '../mail/mail.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AdminProductQuestionQueryDto } from './dto/admin-product-question-query.dto';
import { CreateProductQuestionDto } from './dto/create-product-question.dto';
import { MyProductQuestionQueryDto } from './dto/my-product-question-query.dto';
import { ProductQuestionQueryDto } from './dto/product-question-query.dto';
import { UpdateProductQuestionDto } from './dto/update-product-question.dto';
import {
  ProductQuestion,
  ProductQuestionDocument,
} from './schemas/product-question.schema';

export interface ProductQuestionProductReference {
  id: string;
  name: string;
  slug: string;
  thumbnail: string;
}

export interface ProductQuestionAnswerResponse {
  content: string;
  answeredByName: string;
  answeredAt: Date;
}

export interface ProductQuestionResponse {
  id: string;
  product: ProductQuestionProductReference;
  question: string;
  status: ProductQuestionStatus;
  answer?: ProductQuestionAnswerResponse;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminProductQuestionResponse extends ProductQuestionResponse {
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

interface SeedProductQuestionInput {
  userId: string;
  productId: string;
  question: string;
  answer?: string;
  answeredById?: string;
}

@Injectable()
export class ProductQuestionsService {
  private readonly logger = new Logger(ProductQuestionsService.name);

  constructor(
    @InjectModel(ProductQuestion.name)
    private readonly productQuestionModel: Model<ProductQuestion>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly mailService: MailService,
  ) {}

  async create(
    userId: string,
    dto: CreateProductQuestionDto,
  ): Promise<ProductQuestionResponse> {
    const [user, product] = await Promise.all([
      this.userModel.findById(userId).exec(),
      this.productModel
        .findOne({ _id: dto.productId, status: ProductStatus.ACTIVE })
        .exec(),
    ]);

    this.assertCustomer(user);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const question = await this.productQuestionModel.create({
      product: product._id,
      productSnapshot: this.toProductSnapshot(product),
      user: user._id,
      authorName: user.fullName,
      ...(user.avatarUrl ? { authorAvatarUrl: user.avatarUrl } : {}),
      question: dto.question.trim(),
      status: ProductQuestionStatus.PENDING,
    });

    return this.toResponse(question);
  }

  async findPublicByProduct(
    productId: string,
    query: ProductQuestionQueryDto,
  ): Promise<PaginatedResult<ProductQuestionResponse[]>> {
    const product = await this.productModel
      .exists({ _id: productId, status: ProductStatus.ACTIVE })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const filter = {
      product: new Types.ObjectId(productId),
      status: ProductQuestionStatus.ANSWERED,
    };
    const [questions, total] = await Promise.all([
      this.productQuestionModel
        .find(filter)
        .sort({ 'answer.answeredAt': -1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.productQuestionModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      questions.map((item) => this.toResponse(item)),
      query.page,
      query.limit,
      total,
    );
  }

  async findMine(
    userId: string,
    query: MyProductQuestionQueryDto,
  ): Promise<PaginatedResult<ProductQuestionResponse[]>> {
    const filter = {
      user: new Types.ObjectId(userId),
      ...(query.status ? { status: query.status } : {}),
    };
    const [questions, total] = await Promise.all([
      this.productQuestionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.productQuestionModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      questions.map((item) => this.toResponse(item)),
      query.page,
      query.limit,
      total,
    );
  }

  async removeMine(userId: string, questionId: string): Promise<{ id: string }> {
    const question = await this.productQuestionModel
      .findOne({ _id: questionId, user: userId })
      .exec();

    if (!question) {
      throw new NotFoundException('Product question not found.');
    }

    if (question.status !== ProductQuestionStatus.PENDING) {
      throw new ForbiddenException(
        'Only unanswered product questions can be deleted by the customer.',
      );
    }

    await question.deleteOne();
    return { id: questionId };
  }

  async findAdmin(
    query: AdminProductQuestionQueryDto,
  ): Promise<PaginatedResult<AdminProductQuestionResponse[]>> {
    const filter: Record<string, unknown> = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.productId ? { product: new Types.ObjectId(query.productId) } : {}),
    };

    if (query.keyword) {
      const keyword = new RegExp(escapeRegExp(query.keyword), 'i');
      filter.$or = [
        { question: keyword },
        { authorName: keyword },
        { 'productSnapshot.name': keyword },
      ];
    }

    const [questions, total] = await Promise.all([
      this.productQuestionModel
        .find(filter)
        .sort({ status: 1, updatedAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.productQuestionModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      questions.map((item) => this.toAdminResponse(item)),
      query.page,
      query.limit,
      total,
    );
  }

  async findAdminById(questionId: string): Promise<AdminProductQuestionResponse> {
    return this.toAdminResponse(await this.findDocumentById(questionId));
  }

  async updateByAdmin(
    questionId: string,
    dto: UpdateProductQuestionDto,
    actorId: string,
  ): Promise<AdminProductQuestionResponse> {
    assertNoUnexpectedNull(dto);
    const [question, actor] = await Promise.all([
      this.findDocumentById(questionId),
      this.userModel.findById(actorId).exec(),
    ]);

    if (!actor) {
      throw new NotFoundException('Staff user not found.');
    }

    const answer = dto.answer?.trim();
    if (dto.status === ProductQuestionStatus.ANSWERED && !answer) {
      throw new BadRequestException(
        'An answer is required when marking a product question as answered.',
      );
    }

    if (dto.status !== ProductQuestionStatus.ANSWERED && answer) {
      throw new BadRequestException(
        'An answer can only be saved with ANSWERED status.',
      );
    }

    const shouldNotifyCustomer =
      dto.status === ProductQuestionStatus.ANSWERED &&
      (question.status !== ProductQuestionStatus.ANSWERED ||
        question.answer?.content !== answer);

    question.status = dto.status;

    if (dto.status === ProductQuestionStatus.ANSWERED && answer) {
      question.answer = {
        content: answer,
        answeredBy: actor._id,
        answeredByName: actor.fullName,
        answeredAt: new Date(),
      };
    }

    if (dto.status === ProductQuestionStatus.PENDING) {
      question.answer = undefined;
    }

    await question.save();

    if (shouldNotifyCustomer) {
      void this.notifyCustomerOfAnswer(question).catch((error: unknown) => {
        this.logger.warn(
          `Could not send product-question answer notification for ${question._id.toString()}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
    }

    return this.toAdminResponse(question);
  }

  async upsertForSeed(
    input: SeedProductQuestionInput,
  ): Promise<ProductQuestionResponse> {
    const [user, product] = await Promise.all([
      this.userModel.findById(input.userId).exec(),
      this.productModel.findById(input.productId).exec(),
    ]);

    this.assertCustomer(user);
    if (!product) {
      throw new NotFoundException('Seed product not found.');
    }

    const normalizedQuestion = input.question.trim();
    const answerContent = input.answer?.trim();
    let answer:
      | {
          content: string;
          answeredBy: Types.ObjectId;
          answeredByName: string;
          answeredAt: Date;
        }
      | undefined;

    if (answerContent) {
      if (!input.answeredById) {
        throw new BadRequestException('answeredById is required for a seeded answer.');
      }

      const actor = await this.userModel.findById(input.answeredById).exec();
      if (!actor) {
        throw new NotFoundException('Seed answer author not found.');
      }

      answer = {
        content: answerContent,
        answeredBy: actor._id,
        answeredByName: actor.fullName,
        answeredAt: new Date(),
      };
    }

    let question = await this.productQuestionModel
      .findOne({
        user: user._id,
        product: product._id,
        question: normalizedQuestion,
      })
      .exec();

    if (!question) {
      question = new this.productQuestionModel({
        product: product._id,
        productSnapshot: this.toProductSnapshot(product),
        user: user._id,
        authorName: user.fullName,
        ...(user.avatarUrl ? { authorAvatarUrl: user.avatarUrl } : {}),
        question: normalizedQuestion,
      });
    }

    question.productSnapshot = this.toProductSnapshot(product);
    question.status = answer
      ? ProductQuestionStatus.ANSWERED
      : ProductQuestionStatus.PENDING;
    question.answer = answer;
    await question.save();

    return this.toResponse(question);
  }

  private assertCustomer(user: UserDocument | null): asserts user is UserDocument {
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can submit product questions.');
    }
  }

  private async findDocumentById(
    questionId: string,
  ): Promise<ProductQuestionDocument> {
    const question = await this.productQuestionModel.findById(questionId).exec();
    if (!question) {
      throw new NotFoundException('Product question not found.');
    }
    return question;
  }

  private async notifyCustomerOfAnswer(
    question: ProductQuestionDocument,
  ): Promise<void> {
    if (!question.answer) {
      return;
    }

    const customer = await this.userModel
      .findById(question.user)
      .select('fullName email')
      .exec();
    if (!customer) {
      return;
    }

    await this.mailService.sendProductQuestionAnswerEmail({
      to: customer.email,
      fullName: customer.fullName,
      productName: question.productSnapshot.name,
      question: question.question,
      answer: question.answer.content,
    });
  }

  private toProductSnapshot(
    product: ProductDocument,
  ): ProductQuestionProductReference {
    return {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      thumbnail: product.thumbnail,
    };
  }

  private toResponse(
    question: ProductQuestionDocument,
  ): ProductQuestionResponse {
    return {
      id: question._id.toString(),
      product: {
        id: question.product.toString(),
        name: question.productSnapshot.name,
        slug: question.productSnapshot.slug,
        thumbnail: question.productSnapshot.thumbnail,
      },
      question: question.question,
      status: question.status,
      ...(question.answer
        ? {
            answer: {
              content: question.answer.content,
              answeredByName: question.answer.answeredByName,
              answeredAt: question.answer.answeredAt,
            },
          }
        : {}),
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  private toAdminResponse(
    question: ProductQuestionDocument,
  ): AdminProductQuestionResponse {
    return {
      ...this.toResponse(question),
      author: {
        id: question.user.toString(),
        fullName: question.authorName,
        ...(question.authorAvatarUrl ? { avatarUrl: question.authorAvatarUrl } : {}),
      },
    };
  }
}
