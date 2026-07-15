import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ApiError } from '../../utils/ApiError';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.resolveException(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveException(exception: unknown): {
    status: number;
    message: string;
  } {
    if (exception instanceof ApiError || exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && response !== null && 'message' in response
          ? Array.isArray((response as { message: string | string[] }).message)
            ? (response as { message: string[] }).message.join('; ')
            : String((response as { message: string }).message)
          : exception.message;
      return { status, message };
    }

    if (exception instanceof QueryFailedError) {
      return this.handleQueryError(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong',
    };
  }

  private handleQueryError(error: QueryFailedError): {
    status: number;
    message: string;
  } {
    const code = (error as QueryFailedError & { code?: string }).code;

    switch (code) {
      case '23505':
        return { status: 409, message: 'A record with this value already exists' };
      case '23503':
        return { status: 400, message: 'Invalid reference — related record not found' };
      default:
        return { status: 500, message: 'Database error' };
    }
  }
}
