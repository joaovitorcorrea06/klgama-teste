import { BadRequestException, Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ColetasService } from './coletas.service';
import { AtualizarColetaDto, BuscarResiduosDto, CriarColetaDto, ListarColetasDto, RealizarColetaDto, RegistrarCdfDto } from './coletas.dto';

@Controller('coletas')
export class ColetasController {
  constructor(private readonly coletas: ColetasService) {}
  @Get() @Header('Cache-Control', 'no-store')
  listar(@Query() dto: ListarColetasDto) { return this.coletas.listar(dto); }
  @Get('residuos') @Header('Cache-Control', 'no-store')
  residuos(@Query() dto: BuscarResiduosDto) { return this.coletas.residuos(dto.busca); }
  @Get(':id') @Header('Cache-Control', 'no-store')
  buscar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.coletas.buscar(id); }
  @Post()
  criar(@Body() dto: CriarColetaDto) { return this.coletas.criar(dto); }
  @Patch(':id')
  atualizar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: AtualizarColetaDto) { return this.coletas.atualizar(id, dto); }
  @Patch(':id/realizar')
  realizar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: RealizarColetaDto) { return this.coletas.realizar(id, dto); }
  @Patch(':id/cancelar')
  cancelar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: unknown) {
    if (body !== undefined && (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)) throw new BadRequestException('O cancelamento não aceita campos no corpo.');
    return this.coletas.cancelar(id);
  }
  @Patch(':id/cdf')
  cdf(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: RegistrarCdfDto) { return this.coletas.registrarCdf(id, dto); }
  @Delete(':id') @HttpCode(204)
  excluir(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.coletas.excluir(id); }
}
