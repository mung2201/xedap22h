import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const ANY_PERMISSIONS_KEY = 'any_permissions';

/**
 * Allows an authenticated staff member with at least one listed permission.
 * Use this only for screens that are intentionally shared across permission
 * groups; ordinary management endpoints should keep using @Permissions.
 */
export const AnyPermissions = (...permissions: Permission[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
