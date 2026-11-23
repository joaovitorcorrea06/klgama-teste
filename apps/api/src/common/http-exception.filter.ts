import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const codes: Record<number, string> = {
      400: 'DADOS_INVALIDOS', 401: 'NAO_AUTENTICADO', 403: 'ACESSO_NEGADO',
      404: 'NAO_ENCONTRADO', 409: 'CONFLITO', 429: 'MUITAS_TENTATIVAS',
    };
    const messages: Record<number, string> = {
      401: 'Sua sessão não é válida. Entre novamente.',
      403: 'Você não tem permissão para esta ação.',
      404: 'Recurso não encontrado.',
      429: 'Muitas tentativas. Aguarde antes de tentar novamente.',
    };
    let message = messages[status] ?? 'Não foi possível concluir a operação.';
    let errors: unknown;
    if (exception instanceof HttpException && status < 500 && status !== 404) {
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if ('message' in body) {
        if (Array.isArray(body.message)) {
          message = 'Confira os dados informados.';
          errors = body.message;
        } else if (typeof body.message === 'string') message = body.message;
      }
    }
    if (status >= 500) {
      this.logger.error('Falha interna na requisição.', exception instanceof Error ? exception.stack : undefined);
    }
    response.status(status).json({ statusCode: status, code: codes[status] ?? 'ERRO_INTERNO', message, ...(errors ? { errors } : {}) });
  }
}
