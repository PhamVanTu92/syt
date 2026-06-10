import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

interface JwtUser {
  id: number;
  role: string;
  unit?: string | null;
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  /**
   * GET /api/v2/reports/gsat
   *
   * Báo cáo Giám sát Y tế (GSAT) — KSHL report
   * - Admin / user không có unit: xem toàn bộ
   * - User có unit: chỉ thấy dữ liệu cơ sở của mình (phụ lục luôn đầy đủ)
   */
  @Get('gsat')
  @RequirePermissions('report.gsat.view')
  @ApiOperation({ summary: 'Báo cáo Giám sát Y tế (GSAT)' })
  @ApiQuery({ name: 'survey_key', required: false, description: 'ID của Survey. Nếu không truyền → lấy survey evaluate mới nhất' })
  getGSAT(
    @Query('survey_key') surveyKey?: string,
    @CurrentUser() user?: JwtUser,
  ) {
    const isAdmin = !user || user.role === 'admin';
    const userUnit = isAdmin ? null : (user?.unit ?? null);
    return this.svc.getGSAT(surveyKey ?? null, userUnit, isAdmin);
  }
}
