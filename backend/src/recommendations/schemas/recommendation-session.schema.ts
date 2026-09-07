import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  RecommendationBudget,
  RecommendationPurpose,
  RecommendationStep,
} from '../../common/enums/recommendation.enum';

export type RecommendationSessionDocument = HydratedDocument<RecommendationSession>;

@Schema({ collection: 'chatbot_sessions', timestamps: true, versionKey: false })
export class RecommendationSession {
  @Prop({
    type: String,
    enum: RecommendationStep,
    required: true,
    default: RecommendationStep.PURPOSE,
    index: true,
  })
  step!: RecommendationStep;

  @Prop({ type: String, enum: RecommendationPurpose })
  purpose?: RecommendationPurpose;

  @Prop({ type: String, enum: RecommendationBudget })
  budget?: RecommendationBudget;

  @Prop({ type: Number, min: 100, max: 250 })
  heightCm?: number;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const RecommendationSessionSchema = SchemaFactory.createForClass(
  RecommendationSession,
);
RecommendationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RecommendationSessionSchema.index({ step: 1, updatedAt: -1 });
