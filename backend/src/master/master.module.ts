import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { Roles } from '../auth/decorators';

class CustomerDto { @IsString() @IsNotEmpty() name: string; }
class ProductDto {
  @IsString() @IsNotEmpty() partNo: string;
  @IsString() @IsNotEmpty() name: string;
}

@Controller('master')
export class MasterController {
  constructor(private prisma: PrismaService) {}

  @Get('customers') customers() { return this.prisma.customer.findMany({ orderBy: { name: 'asc' } }); }
  @Get('products') products() { return this.prisma.product.findMany({ orderBy: { partNo: 'asc' } }); }
  @Get('users') users() {
    return this.prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, department: true, role: true }, orderBy: { name: 'asc' } });
  }

  @Roles('QC_STAFF', 'QC_SUPERVISOR')
  @Post('customers') addCustomer(@Body() dto: CustomerDto) { return this.prisma.customer.create({ data: dto }); }

  @Roles('QC_STAFF', 'QC_SUPERVISOR')
  @Post('products') addProduct(@Body() dto: ProductDto) { return this.prisma.product.create({ data: dto }); }
}

@Module({ controllers: [MasterController] })
export class MasterModule {}
