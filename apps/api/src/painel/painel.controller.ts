import { ApiTags } from '@nestjs/swagger';
import { ApiDoc } from '../documentation/api-doc.decorator';
import { Controller, Get, Header, Query } from '@nestjs/common';
import { ConsultarPainelDto } from './painel.dto';
import { PainelService } from './painel.service';

@ApiTags('Painel')
@Controller('painel')
export class PainelController {
  constructor(private readonly painel: PainelService) {}
  @Get() @Header('Cache-Control', 'no-store')
  @ApiDoc('Consultar indicadores SQL; atenção ignora o período', 'Painel', 200, false)
  consultar(@Query() dto: ConsultarPainelDto) { return this.painel.consultar(dto); }
}
