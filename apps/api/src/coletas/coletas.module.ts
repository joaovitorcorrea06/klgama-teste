import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coleta } from './coleta.entity';
import { ColetasController } from './coletas.controller';
import { ColetasService } from './coletas.service';

@Module({ imports: [TypeOrmModule.forFeature([Coleta])], controllers: [ColetasController], providers: [ColetasService] })
export class ColetasModule {}
