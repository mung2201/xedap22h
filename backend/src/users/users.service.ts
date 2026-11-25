import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from '../common/enums/permission.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import { escapeRegExp } from '../common/utils/slug.util';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import {
  Gender,
  UserRole,
  UserStatus,
} from '../common/enums/user-role.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User, UserDocument } from './schemas/user.schema';

export interface CreateUserInput {
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  permissions?: Permission[];
}

export interface PublicUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission[];
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();

    await this.assertEmailAndUsernameAvailable(email, username);

    return this.userModel.create({
      ...input,
      email,
      username,
      role: input.role ?? UserRole.CUSTOMER,
      permissions: input.permissions ?? [],
    });
  }

  async findByIdentifierWithPassword(
    identifier: string,
  ): Promise<UserDocument | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    return this.userModel
      .findOne({
        $or: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      })
      .select('+passwordHash +tokenVersion')
      .exec();
  }

  async findByIdForAuthentication(
    userId: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findById(userId).select('+tokenVersion').exec();
  }

  async findByIdWithPassword(userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(userId)
      .select('+passwordHash +tokenVersion')
      .exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  async findByResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordHash +tokenVersion +passwordResetTokenHash +passwordResetExpiresAt')
      .exec();
  }

  async getPublicById(userId: string): Promise<PublicUser> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toPublicUser(user);
  }

  async findAdmin(
    query: AdminUserQueryDto,
  ): Promise<PaginatedResult<PublicUser[]>> {
    const filter: Record<string, unknown> = {};

    if (query.keyword) {
      const keyword = new RegExp(escapeRegExp(query.keyword), 'i');
      filter.$or = [
        { fullName: keyword },
        { username: keyword },
        { email: keyword },
        { phone: keyword },
      ];
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      users.map((user) => this.toPublicUser(user)),
      query.page,
      query.limit,
      total,
    );
  }

  async updateStatusByAdmin(
    actor: AuthenticatedUser,
    userId: string,
    dto: UpdateUserStatusDto,
  ): Promise<PublicUser> {
    const user = await this.findDocumentById(userId);
    this.assertCanManageTarget(actor, user);

    user.status = dto.status;
    user.tokenVersion += 1;
    await user.save();
    return this.toPublicUser(user);
  }

  async updateRoleByAdmin(
    actor: AuthenticatedUser,
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<PublicUser> {
    this.assertAdminActor(actor);
    const user = await this.findDocumentById(userId);

    if (actor.userId === userId) {
      throw new ForbiddenException('Administrators cannot change their own role.');
    }

    const previousRole = user.role;
    user.role = dto.role;
    if (dto.role === UserRole.CUSTOMER) {
      user.permissions = [];
    } else if (dto.role === UserRole.ADMIN) {
      user.permissions = Object.values(Permission);
    } else if (previousRole !== UserRole.STAFF) {
      // A demoted administrator must not silently retain every STAFF capability.
      user.permissions = [];
    }
    user.tokenVersion += 1;
    await user.save();
    return this.toPublicUser(user);
  }

  async updatePermissionsByAdmin(
    actor: AuthenticatedUser,
    userId: string,
    dto: UpdateUserPermissionsDto,
  ): Promise<PublicUser> {
    this.assertAdminActor(actor);
    const user = await this.findDocumentById(userId);

    if (user.role !== UserRole.STAFF) {
      throw new ConflictException('Permissions can only be configured for STAFF users.');
    }

    user.permissions = [...new Set(dto.permissions)];
    user.tokenVersion += 1;
    await user.save();
    return this.toPublicUser(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    const clearableFields = ['phone', 'dateOfBirth', 'gender', 'avatarUrl'] as const;
    assertNoUnexpectedNull(dto, clearableFields);
    const values = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== null && value !== undefined),
    );
    const removedFields = Object.fromEntries(
      clearableFields.filter((field) => dto[field] === null).map((field) => [field, 1]),
    );
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: values,
          ...(Object.keys(removedFields).length ? { $unset: removedFields } : {}),
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toPublicUser(user);
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          $set: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: expiresAt,
          },
        },
      )
      .exec();
  }

  async resetPassword(
    user: UserDocument,
    passwordHash: string,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: user._id },
        {
          $set: { passwordHash },
          $inc: { tokenVersion: 1 },
          $unset: {
            passwordResetTokenHash: 1,
            passwordResetExpiresAt: 1,
          },
        },
      )
      .exec();
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
        { new: true, runValidators: true },
      )
      .select('+tokenVersion')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    const result = await this.userModel
      .updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } })
      .exec();

    if (result.matchedCount !== 1) {
      throw new NotFoundException('User not found.');
    }
  }

  async createIfMissing(input: CreateUserInput): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({ email: input.email }).exec();

    if (existingUser) {
      // This helper is used exclusively by the idempotent development seed. Keep
      // existing passwords and customer data intact, but reconcile seed roles and
      // permissions so new capabilities are available after a seed upgrade.
      existingUser.role = input.role ?? existingUser.role;
      existingUser.permissions = input.permissions ?? existingUser.permissions;
      await existingUser.save();
      return existingUser;
    }

    return this.create(input);
  }

  toPublicUser(user: UserDocument): PublicUser {
    return {
      id: user._id.toString(),
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      ...(user.phone ? { phone: user.phone } : {}),
      ...(user.dateOfBirth ? { dateOfBirth: user.dateOfBirth } : {}),
      ...(user.gender ? { gender: user.gender } : {}),
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      role: user.role,
      permissions: user.permissions ?? [],
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async assertEmailAndUsernameAvailable(
    email: string,
    username: string,
  ): Promise<void> {
    const existingUser = await this.userModel
      .findOne({ $or: [{ email }, { username }] })
      .lean()
      .exec();

    if (!existingUser) {
      return;
    }

    if (existingUser.email === email) {
      throw new ConflictException('Email is already in use.');
    }

    throw new ConflictException('Username is already in use.');
  }

  private async findDocumentById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).select('+tokenVersion').exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private assertAdminActor(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can change roles or permissions.');
    }
  }

  private assertCanManageTarget(
    actor: AuthenticatedUser,
    target: UserDocument,
  ): void {
    if (actor.userId === target._id.toString()) {
      throw new ForbiddenException('You cannot change your own account status.');
    }

    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (target.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('STAFF can only manage CUSTOMER accounts.');
    }
  }
}
