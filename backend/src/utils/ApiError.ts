import { HttpException } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(status: number, message: string) {
    super({ success: false, statusCode: status, message }, status);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
