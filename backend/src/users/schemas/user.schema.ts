import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Permission } from '../../common/enums/permission.enum';
import {
  Gender,
  UserRole,
  UserStatus,
} from '../../common/enums/user-role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  fullName!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 40,
  })
  username!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255,
  })
  email!: string;

  @Prop({ type: String, required: true, select: false, minlength: 60 })
  passwordHash!: string;

  @Prop({ type: String, trim: true, maxlength: 25 })
  phone?: string;

  @Prop({ type: Date })
  dateOfBirth?: Date;

  @Prop({ type: String, enum: Gender })
  gender?: Gender;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  avatarUrl?: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Prop({ type: [String], enum: Permission, default: [] })
  permissions!: Permission[];

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Prop({ type: Number, default: 0, select: false })
  tokenVersion!: number;

  @Prop({ type: String, select: false })
  passwordResetTokenHash?: string;

  @Prop({ type: Date, select: false })
  passwordResetExpiresAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, status: 1 });
