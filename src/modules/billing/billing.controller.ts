import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { UsageReportQueryDto } from './dto/usage-report-query.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@ApiTags('Billing')
@ApiBearerAuth('JWT')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get billing summary for current user' })
  getSummary(@CurrentUser('id') userId: string) {
    return this.billingService.getBillingSummary(userId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get invoice history' })
  getInvoices(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.billingService.getInvoices(userId, query);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice detail' })
  getInvoice(
    @CurrentUser('id') userId: string,
    @Param('id') invoiceId: string,
  ) {
    return this.billingService.getInvoiceById(userId, invoiceId);
  }

  @Get('usage-report')
  @ApiOperation({ summary: 'Get usage report for a period' })
  getUsageReport(
    @CurrentUser('id') userId: string,
    @Query() query: UsageReportQueryDto,
  ) {
    return this.billingService.getUsageReport(userId, query);
  }
}
