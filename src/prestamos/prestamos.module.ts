import { Module } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { MensajeriaModule } from '../mensajeria/mensajeria.module.js';
import { PrestamosController } from './prestamos.controller.js';
import { PrestamosRepositorio } from './prestamos.repositorio.js';

@Module({
  imports: [MensajeriaModule],
  controllers: [PrestamosController],
  providers: [PrestamosRepositorio, JwtGuard],
})
export class PrestamosModule {}
