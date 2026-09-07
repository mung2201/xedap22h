import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { isPaginatedResult } from '../interfaces/pagination.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const message = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data: unknown) => {
        if (isPaginatedResult(data)) {
          return {
            success: true,
            message: message ?? 'Request completed successfully.',
            data: data.data,
            meta: data.meta,
          };
        }

        return {
          success: true,
          message: message ?? 'Request completed successfully.',
          data: data ?? null,
        };
      }),
    );
  }
}
