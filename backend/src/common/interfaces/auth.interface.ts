import { Permission } from '../enums/permission.enum';
import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  tokenVersion: number;
  type: 'access' | 'refresh';
  jti?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  tokenVersion: number;
}

export interface RequestMetadata {
  ip?: string;
  userAgent?: string;
}
