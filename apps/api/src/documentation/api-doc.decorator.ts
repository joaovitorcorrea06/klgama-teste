import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function ApiDoc(summary: string, model?: string, status = 200, publicRoute = false): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary, ...(publicRoute ? { security: [] } : {}) }),
    ApiResponse({ status, description: status === 204 ? 'Operação concluída sem corpo.' : 'Operação concluída.', ...(model ? { schema: { $ref: `#/components/schemas/${model}` } } : {}) }),
  );
}
