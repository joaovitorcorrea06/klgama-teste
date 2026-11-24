import { ApiTags, ApiBody } from '@nestjs/swagger';
import { ApiDoc } from '../documentation/api-doc.decorator';
import { BadRequestException, Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ColetasService } from './coletas.service';
import { AtualizarColetaDto, BuscarResiduosDto, CriarColetaDto, ListarColetasDto, RealizarColetaDto, RegistrarCdfDto } from './coletas.dto';

@ApiTags('Coletas')
@Controller('coletas')
export class ColetasController {
  constructor(private readonly coletas: ColetasService) {}
  @Get() @Header('Cache-Control', 'no-store')
  @ApiDoc('Listar coletas por cliente, situação, resíduo, data e CDF', 'ColetasPaginadas', 200, false)
  listar(@Query() dto: ListarColetasDto) { return this.coletas.listar(dto); }
  @Get('residuos') @Header('Cache-Control', 'no-store')
  @ApiDoc('Consultar sugestões de resíduos existentes', 'SugestoesResiduos', 200, false)
  residuos(@Query() dto: BuscarResiduosDto) { return this.coletas.residuos(dto.busca); }
  @Get(':id') @Header('Cache-Control', 'no-store')
  @ApiDoc('Consultar coleta e cliente vinculado', 'ColetaPublica', 200, false)
  buscar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.coletas.buscar(id); }
  @Post()
  @ApiDoc('Criar coleta sempre agendada', 'ColetaPublica', 201, false)
  criar(@Body() dto: CriarColetaDto) { return this.coletas.criar(dto); }
  @Patch(':id')
  @ApiDoc('Editar agendada ou somente observação de finalizada', 'ColetaPublica', 200, false)
  atualizar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: AtualizarColetaDto) { return this.coletas.atualizar(id, dto); }
  @Patch(':id/realizar')
  @ApiDoc('Finalizar coleta com peso positivo e data', 'ColetaPublica', 200, false)
  realizar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: RealizarColetaDto) { return this.coletas.realizar(id, dto); }
  @Patch(':id/cancelar')
  @ApiDoc('Cancelar agendada de forma definitiva', 'ColetaPublica', 200, false)
  @ApiBody({ required: false, schema: { type: 'object', additionalProperties: false, properties: {} } })
  cancelar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: unknown) {
    if (body !== undefined && (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)) throw new BadRequestException('O cancelamento não aceita campos no corpo.');
    return this.coletas.cancelar(id);
  }
  @Patch(':id/cdf')
  @ApiDoc('Registrar ou corrigir CDF de realizada', 'ColetaPublica', 200, false)
  cdf(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: RegistrarCdfDto) { return this.coletas.registrarCdf(id, dto); }
  @Delete(':id') @HttpCode(204)
  @ApiDoc('Excluir somente coleta agendada', undefined, 204, false)
  excluir(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.coletas.excluir(id); }
}
