import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateComplaintDto {
  @IsDateString() date: string;
  @IsOptional() @IsString() docNo?: string;
  @IsInt() customerId: number;
  @IsInt() productId: number;
  @IsString() @IsNotEmpty() defectType: string;
  @IsInt() @Min(0) rejectQty: number;
  @IsInt() picId: number;
  @IsOptional() @IsString() description?: string;
}

export class UpdateComplaintDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsInt() customerId?: number;
  @IsOptional() @IsInt() productId?: number;
  @IsOptional() @IsString() defectType?: string;
  @IsOptional() @IsInt() @Min(0) rejectQty?: number;
  @IsOptional() @IsInt() picId?: number;
  @IsOptional() @IsString() description?: string;
}

export class ActionDto {
  @IsOptional() @IsString() note?: string;
}
