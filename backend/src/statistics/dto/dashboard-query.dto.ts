import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

// Date parsing normalizes impossible dates such as 2026-02-31 into March.
// Check the original calendar components before accepting that converted Date.
const rejectInvalidCalendarDate = ({ obj, key, value }: TransformFnParams): unknown => {
  const input: unknown = (obj as Record<string, unknown>)[key];
  if (typeof input !== 'string') {
    return value;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(input);
  if (!match) {
    return value;
  }

  const [, year, month, day] = match.map(Number);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return new Date(Number.NaN);
  }

  return value;
};

export enum DashboardPeriod {
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  THIS_YEAR = 'THIS_YEAR',
  CUSTOM = 'CUSTOM',
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: DashboardPeriod, default: DashboardPeriod.LAST_30_DAYS })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period: DashboardPeriod = DashboardPeriod.LAST_30_DAYS;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'First calendar day in Asia/Ho_Chi_Minh. Custom ranges allow at most 366 days.',
  })
  @IsOptional()
  @Type(() => Date)
  @Transform(rejectInvalidCalendarDate)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    example: '2026-01-31',
    description: 'Last calendar day in Asia/Ho_Chi_Minh, including the entire day.',
  })
  @IsOptional()
  @Type(() => Date)
  @Transform(rejectInvalidCalendarDate)
  @IsDate()
  endDate?: Date;
}
