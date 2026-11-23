import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { AtualizarClienteDto, CriarClienteDto, ListarClientesDto } from './clientes.dto';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}
  @Get() @Header('Cache-Control', 'no-store')
  listar(@Query() dto: ListarClientesDto) { return this.clientes.listar(dto); }
  @Get(':id') @Header('Cache-Control', 'no-store')
  buscar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.clientes.buscar(id); }
  @Post()
  criar(@Body() dto: CriarClienteDto) { return this.clientes.criar(dto); }
  @Patch(':id')
  atualizar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: AtualizarClienteDto) { return this.clientes.atualizar(id, dto); }
  @Delete(':id') @HttpCode(204)
  excluir(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.clientes.excluir(id); }
}
