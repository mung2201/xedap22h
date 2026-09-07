import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { escapeRegExp } from '../common/utils/slug.util';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Faq, FaqDocument } from './schemas/faq.schema';

const SUGGESTION_LIMIT = 4;

export interface FaqResponse {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FaqSuggestionResponse {
  id: string;
  question: string;
}

export interface ChatbotMessageResponse {
  type: 'FAQ' | 'FALLBACK';
  message: string;
  matchedFaqId?: string;
  suggestions: FaqSuggestionResponse[];
}

interface NormalizedFaqInput {
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  active: boolean;
}

interface RankedFaq {
  faq: FaqDocument;
  exactQuestion: boolean;
  longestKeywordWordCount: number;
  matchedKeywordCount: number;
}

@Injectable()
export class ChatbotService {
  constructor(
    @InjectModel(Faq.name) private readonly faqModel: Model<Faq>,
  ) {}

  async respond(dto: ChatbotMessageDto): Promise<ChatbotMessageResponse> {
    const normalizedMessage = this.normalizeForMatching(dto.message);
    if (!normalizedMessage) {
      throw new BadRequestException('Message must contain searchable text.');
    }

    const activeFaqs = await this.findActiveFaqs();
    const rankedFaqs = activeFaqs
      .map((faq) => this.rankFaq(faq, normalizedMessage))
      .filter((candidate): candidate is RankedFaq => candidate !== null)
      .sort(
        (left, right) =>
          Number(right.exactQuestion) - Number(left.exactQuestion) ||
          right.longestKeywordWordCount - left.longestKeywordWordCount ||
          right.faq.priority - left.faq.priority ||
          right.matchedKeywordCount - left.matchedKeywordCount ||
          right.faq.updatedAt.getTime() - left.faq.updatedAt.getTime(),
      );
    const match = rankedFaqs[0];

    if (!match) {
      return {
        type: 'FALLBACK',
        message:
          'Mình chưa tìm được câu trả lời phù hợp. Bạn có thể chọn một câu hỏi gợi ý bên dưới hoặc liên hệ cửa hàng để được hỗ trợ.',
        suggestions: this.toSuggestions(activeFaqs),
      };
    }

    return {
      type: 'FAQ',
      message: match.faq.answer,
      matchedFaqId: match.faq._id.toString(),
      suggestions: this.toSuggestions(activeFaqs, match.faq._id.toString()),
    };
  }

  async findPublicSuggestions(): Promise<FaqSuggestionResponse[]> {
    return this.toSuggestions(await this.findActiveFaqs());
  }

  async findAdmin(
    query: FaqQueryDto,
  ): Promise<PaginatedResult<FaqResponse[]>> {
    const filter: Record<string, unknown> = {
      ...(query.active !== undefined ? { active: query.active } : {}),
    };

    if (query.keyword) {
      const keyword = new RegExp(escapeRegExp(query.keyword), 'i');
      filter.$or = [
        { question: keyword },
        { answer: keyword },
        { keywords: keyword },
      ];
    }

    const [faqs, total] = await Promise.all([
      this.faqModel
        .find(filter)
        .sort({ priority: -1, updatedAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.faqModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      faqs.map((faq) => this.toResponse(faq)),
      query.page,
      query.limit,
      total,
    );
  }

  async findAdminById(faqId: string): Promise<FaqResponse> {
    return this.toResponse(await this.findDocumentById(faqId));
  }

  async create(dto: CreateFaqDto, actorId?: string): Promise<FaqResponse> {
    const input = this.normalizeCreateInput(dto);
    const actor = actorId ? new Types.ObjectId(actorId) : undefined;
    const faq = await this.faqModel.create({
      ...input,
      ...(actor ? { createdBy: actor, updatedBy: actor } : {}),
    });

    return this.toResponse(faq);
  }

  async update(
    faqId: string,
    dto: UpdateFaqDto,
    actorId?: string,
  ): Promise<FaqResponse> {
    assertNoUnexpectedNull(dto);
    const faq = await this.findDocumentById(faqId);

    if (dto.question !== undefined) {
      faq.question = dto.question.trim();
    }
    if (dto.answer !== undefined) {
      faq.answer = dto.answer.trim();
    }
    if (dto.keywords !== undefined) {
      faq.keywords = this.normalizeKeywords(dto.keywords);
    }
    if (dto.priority !== undefined) {
      faq.priority = dto.priority;
    }
    if (dto.active !== undefined) {
      faq.active = dto.active;
    }
    if (actorId) {
      faq.updatedBy = new Types.ObjectId(actorId);
    }

    await faq.save();
    return this.toResponse(faq);
  }

  async remove(faqId: string): Promise<{ id: string }> {
    const faq = await this.findDocumentById(faqId);
    await faq.deleteOne();
    return { id: faqId };
  }

  async upsertForSeed(dto: CreateFaqDto): Promise<FaqResponse> {
    const existing = await this.faqModel
      .findOne({ question: dto.question.trim() })
      .exec();

    return existing
      ? this.update(existing._id.toString(), dto)
      : this.create(dto);
  }

  private async findActiveFaqs(): Promise<FaqDocument[]> {
    return this.faqModel
      .find({ active: true })
      .sort({ priority: -1, updatedAt: -1 })
      .exec();
  }

  private rankFaq(faq: FaqDocument, message: string): RankedFaq | null {
    const matchingKeywords = faq.keywords
      .map((keyword) => this.normalizeForMatching(keyword))
      .filter((keyword) => keyword && this.containsPhrase(message, keyword));
    const exactQuestion = this.normalizeForMatching(faq.question) === message;

    if (!exactQuestion && matchingKeywords.length === 0) {
      return null;
    }

    const longestKeywordWordCount = matchingKeywords.reduce(
      (longest, keyword) => Math.max(longest, keyword.split(' ').length),
      0,
    );

    return {
      faq,
      exactQuestion,
      longestKeywordWordCount,
      matchedKeywordCount: matchingKeywords.length,
    };
  }

  private toSuggestions(
    faqs: FaqDocument[],
    excludedFaqId?: string,
  ): FaqSuggestionResponse[] {
    return faqs
      .filter((faq) => faq._id.toString() !== excludedFaqId)
      .slice(0, SUGGESTION_LIMIT)
      .map((faq) => ({ id: faq._id.toString(), question: faq.question }));
  }

  private normalizeCreateInput(dto: CreateFaqDto): NormalizedFaqInput {
    return {
      question: dto.question.trim(),
      answer: dto.answer.trim(),
      keywords: this.normalizeKeywords(dto.keywords),
      priority: dto.priority ?? 0,
      active: dto.active ?? true,
    };
  }

  private normalizeKeywords(keywords: string[]): string[] {
    const normalizedKeywords = keywords
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    const uniqueKeywords = normalizedKeywords.filter(
      (keyword, index, values) =>
        values.findIndex(
          (candidate) =>
            this.normalizeForMatching(candidate) ===
            this.normalizeForMatching(keyword),
        ) === index,
    );

    if (uniqueKeywords.length === 0) {
      throw new BadRequestException('At least one non-empty keyword is required.');
    }

    return uniqueKeywords;
  }

  private async findDocumentById(faqId: string): Promise<FaqDocument> {
    const faq = await this.faqModel.findById(faqId).exec();
    if (!faq) {
      throw new NotFoundException('FAQ not found.');
    }
    return faq;
  }

  private normalizeForMatching(value: string): string {
    return value
      .toLocaleLowerCase('vi-VN')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private containsPhrase(message: string, phrase: string): boolean {
    return ` ${message} `.includes(` ${phrase} `);
  }

  private toResponse(faq: FaqDocument): FaqResponse {
    return {
      id: faq._id.toString(),
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords,
      priority: faq.priority,
      active: faq.active,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
    };
  }
}
