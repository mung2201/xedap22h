import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnyPermissions } from '../common/decorators/any-permissions.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardStatisticsResponse, StatisticsService } from './statistics.service';

@ApiTags('Admin Statistics')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.STAFF)
@AnyPermissions(Permission.VIEW_DASHBOARD, Permission.VIEW_STATISTICS)
@Controller({ path: 'admin/statistics', version: '1' })
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics and chart data' })
  @ApiQuery({ type: DashboardQueryDto })
  @ResponseMessage('Get dashboard statistics successfully.')
  getDashboard(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardStatisticsResponse> {
    return this.statisticsService.getDashboard(query);
  }
}
