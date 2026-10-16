import { Body, Controller, Get, Module, Param, ParseIntPipe, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../auth/decorators';
import { ComplaintsService } from './complaints.service';
import { ActionDto, CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';

const QC = ['QC_STAFF', 'QC_SUPERVISOR', 'PRODUKSI', 'MARKETING'] as const;

@Controller('complaints')
export class ComplaintsController {
  constructor(private svc: ComplaintsService) {}

  @Get()
  list(@Query('year') year?: string, @Query('month') month?: string, @Query('status') status?: 'OPEN' | 'CLOSED') {
    return this.svc.list(+(year ?? new Date().getFullYear()), month ? +month : undefined, status);
  }

  @Get('export')
  async export(@Res() res: Response, @Query('year') year?: string, @Query('month') month?: string) {
    const y = +(year ?? new Date().getFullYear());
    const buf = await this.svc.exportXlsx(y, month ? +month : undefined);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="komplain-${y}${month ? '-' + month : ''}.xlsx"`);
    res.send(buf);
  }

  @Roles('QC_STAFF', 'MARKETING')
  @Post()
  create(@Body() dto: CreateComplaintDto) {
    return this.svc.create(dto);
  }

  @Roles('QC_STAFF')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateComplaintDto) {
    return this.svc.update(id, dto);
  }

  @Roles('QC_STAFF', 'QC_SUPERVISOR')
  @Post(':id/close')
  close(@Param('id', ParseIntPipe) id: number) {
    return this.svc.close(id);
  }

  // action: prepare | check | approve | reject  (otorisasi detail di service)
  @Roles('QC_STAFF', 'QC_SUPERVISOR', 'MANAGER')
  @Post(':id/:action')
  act(@Param('id', ParseIntPipe) id: number, @Param('action') action: string, @Body() dto: ActionDto, @Req() req: any) {
    return this.svc.act(id, action, req.user, dto.note);
  }
}

@Module({ controllers: [ComplaintsController], providers: [ComplaintsService] })
export class ComplaintsModule {}
