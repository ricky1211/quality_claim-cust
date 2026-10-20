import { Body, Controller, Get, Injectable, Module, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ClaimCategory, ClaimStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { Roles } from '../auth/decorators';

class CreateClaimDto {
  @IsDateString() date: string;
  @IsOptional() @IsString() claimNo?: string;
  @IsEnum(ClaimCategory) category: ClaimCategory;
  @IsInt() customerId: number;
  @IsInt() productId: number;
  @IsOptional() @IsInt() complaintId?: number;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(0) qty: number;
  @IsNumber() @Min(0) amount: number;
}

class UpdateStatusDto {
  @IsEnum(ClaimStatus) status: ClaimStatus;
  @IsOptional() @IsString() notes?: string;
}

const include = { customer: true, product: true, complaint: { select: { docNo: true } } };

@Injectable()
export class ClaimsService {
  constructor(private prisma: PrismaService) {}

  list(year: number, category?: ClaimCategory, status?: ClaimStatus) {
    return this.prisma.claim.findMany({
      where: {
        date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
        ...(category && { category }),
        ...(status && { status }),
      },
      include,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async create(dto: CreateClaimDto) {
    const date = new Date(dto.date);
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    const count = await this.prisma.claim.count({
      where: { date: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } },
    });
    const claimNo = dto.claimNo?.trim() || `${String(count + 1).padStart(2, '0')}/QA/${String(m).padStart(2, '0')}/${y}`;
    return this.prisma.claim.create({ data: { ...dto, claimNo, date }, include });
  }

  setStatus(id: number, dto: UpdateStatusDto) {
    return this.prisma.claim.update({ where: { id }, data: dto, include });
  }
}

@Controller('claims')
export class ClaimsController {
  constructor(private svc: ClaimsService) {}

  @Get()
  list(@Query('year') year?: string, @Query('category') category?: ClaimCategory, @Query('status') status?: ClaimStatus) {
    return this.svc.list(+(year ?? new Date().getFullYear()), category, status);
  }

  @Roles('QC_STAFF', 'QC_SUPERVISOR', 'MARKETING')
  @Post()
  create(@Body() dto: CreateClaimDto) {
    return this.svc.create(dto);
  }

  @Roles('QC_SUPERVISOR', 'MANAGER')
  @Patch(':id/status')
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.svc.setStatus(id, dto);
  }
}

@Module({ controllers: [ClaimsController], providers: [ClaimsService] })
export class ClaimsModule {}
