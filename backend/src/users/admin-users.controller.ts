import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { PaginatedResult } from '../common/interfaces/pagination.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { PublicUser, UsersService } from './users.service';

@ApiTags('Admin Users')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Permissions(Permission.MANAGE_USERS)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users for administration' })
  @ApiQuery({ type: AdminUserQueryDto })
  @ResponseMessage('Get users successfully.')
  findAll(
    @Query() query: AdminUserQueryDto,
  ): Promise<PaginatedResult<PublicUser[]>> {
    return this.usersService.findAdmin(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Lock, unlock, or change user status' })
  @ResponseMessage('User status updated successfully.')
  updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) userId: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<PublicUser> {
    return this.usersService.updateStatusByAdmin(actor, userId, dto);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change a user role (ADMIN only)' })
  @ResponseMessage('User role updated successfully.')
  updateRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) userId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<PublicUser> {
    return this.usersService.updateRoleByAdmin(actor, userId, dto);
  }

  @Patch(':id/permissions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Configure STAFF permissions (ADMIN only)' })
  @ResponseMessage('User permissions updated successfully.')
  updatePermissions(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseMongoIdPipe) userId: string,
    @Body() dto: UpdateUserPermissionsDto,
  ): Promise<PublicUser> {
    return this.usersService.updatePermissionsByAdmin(actor, userId, dto);
  }
}
