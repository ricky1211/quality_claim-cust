import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { ComplaintsModule } from './complaints/complaints.module';
import { ClaimsModule } from './claims/claims.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MasterModule } from './master/master.module';

@Module({
  imports: [PrismaModule, AuthModule, ComplaintsModule, ClaimsModule, DashboardModule, MasterModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
