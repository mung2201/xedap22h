export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED',
}

export enum Permission {
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',
  MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',
  MANAGE_ORDERS = 'MANAGE_ORDERS',
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_VOUCHERS = 'MANAGE_VOUCHERS',
  MANAGE_CMS = 'MANAGE_CMS',
  MANAGE_CHATBOT = 'MANAGE_CHATBOT',
  MANAGE_SERVICE_BOOKINGS = 'MANAGE_SERVICE_BOOKINGS',
  VIEW_STATISTICS = 'VIEW_STATISTICS',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export interface CurrentUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  avatarUrl?: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  user: CurrentUser;
}

export interface RegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  emailOrUsername: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  avatarUrl?: string | null;
}
