import { ApiTags } from '@nestjs/swagger';
import { ApiDoc } from '../documentation/api-doc.decorator';
import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { AtualizarClienteDto, CriarClienteDto, ListarClientesDto } from './clientes.dto';

@ApiTags('Clientes')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}
  @Get() @Header('Cache-Control', 'no-store')
  @ApiDoc('Listar clientes com busca e paginação', 'ClientesPaginados', 200, false)
  listar(@Query() dto: ListarClientesDto) { return this.clientes.listar(dto); }
  @Get(':id') @Header('Cache-Control', 'no-store')
  @ApiDoc('Consultar um cliente', 'ClientePublico', 200, false)
  buscar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.clientes.buscar(id); }
  @Post()
  @ApiDoc('Cadastrar cliente', 'ClientePublico', 201, false)
  criar(@Body() dto: CriarClienteDto) { return this.clientes.criar(dto); }
  @Patch(':id')
  @ApiDoc('Atualizar dados ou situação do cliente', 'ClientePublico', 200, false)
  atualizar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: AtualizarClienteDto) { return this.clientes.atualizar(id, dto); }
  @Delete(':id') @HttpCode(204)
  @ApiDoc('Excluir cliente sem coletas vinculadas', undefined, 204, false)
  excluir(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.clientes.excluir(id); }
}
