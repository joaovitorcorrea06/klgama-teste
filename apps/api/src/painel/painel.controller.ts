import { Controller, Get, Header, Query } from '@nestjs/common';
import { ConsultarPainelDto } from './painel.dto';
import { PainelService } from './painel.service';

@Controller('painel')
export class PainelController {
  constructor(private readonly painel: PainelService) {}
  @Get() @Header('Cache-Control', 'no-store')
  consultar(@Query() dto: ConsultarPainelDto) { return this.painel.consultar(dto); }
}
