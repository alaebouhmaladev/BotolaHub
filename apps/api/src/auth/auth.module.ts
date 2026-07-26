import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { Argon2Service } from './argon2.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, Argon2Service],
  exports: [AuthService, Argon2Service],
})
export class AuthModule {}
