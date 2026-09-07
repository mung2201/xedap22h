import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnyPermissions } from '../common/decorators/any-permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Controller({ path: 'admin', version: '1' })
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class AdminController {
  @Get('access-check')
  @AnyPermissions(Permission.VIEW_DASHBOARD, Permission.VIEW_STATISTICS)
  @ApiOperation({ summary: 'Verify ADMIN/STAFF RBAC access' })
  @ResponseMessage('Admin access granted.')
  accessCheck(@CurrentUser() user: AuthenticatedUser) {
    return {
      userId: user.userId,
      role: user.role,
      permissions: user.permissions,
    };
  }
}
