import { Body, Controller, Get, Injectable, Module, Post, Req, UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { IsEmail, IsString } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.module';
import { JwtStrategy } from './jwt.strategy';
import { Public } from './decorators';

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const u = await this.prisma.user.findUnique({ where: { email } });
    if (!u || !u.active || !(await bcrypt.compare(password, u.passwordHash))) {
      throw new UnauthorizedException('Email atau kata sandi salah');
    }
    const token = await this.jwt.signAsync({ sub: u.id, role: u.role, name: u.name });
    return { token, user: { id: u.id, name: u.name, role: u.role, department: u.department } };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }
}

@Module({
  imports: [PassportModule, JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h' } })],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
