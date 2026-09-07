import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionResponse {
  message?: string | string[];
  errorCode?: string;
  details?: unknown;
}

interface MongooseValidationError {
  name?: string;
  message?: string;
  errors?: Record<string, { message?: string }>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const duplicateKeyError = exception as { code?: number; keyValue?: unknown };
    if (duplicateKeyError.code === 11000) {
      response.status(HttpStatus.CONFLICT).json({
        success: false,
        message: 'A record with this value already exists.',
        errorCode: 'DUPLICATE_RESOURCE',
      });
      return;
    }

    const mongooseError = exception as MongooseValidationError;
    if (
      mongooseError.name === 'ValidationError' ||
      mongooseError.name === 'CastError'
    ) {
      const validationMessages = Object.values(mongooseError.errors ?? {})
        .map((error) => error.message)
        .filter((message): message is string => Boolean(message));

      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message:
          validationMessages.join(', ') ||
          mongooseError.message ||
          'Invalid request data.',
        errorCode: 'VALIDATION_ERROR',
      });
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as string | ExceptionResponse)
        : undefined;

    const payload =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : exceptionResponse;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : (payload?.message ?? 'Internal server error.');

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      message,
      errorCode:
        payload?.errorCode ??
        (status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : 'REQUEST_FAILED'),
      ...(payload?.details ? { details: payload.details } : {}),
    });
  }
}
