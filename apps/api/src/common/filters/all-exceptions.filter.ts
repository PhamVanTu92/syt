import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj['message'] as string) || message;
        if (Array.isArray(resObj['message'])) {
          errors = resObj['message'];
          message = 'Validation failed';
        }
      }
      // Log 5xx HTTP errors
      if (status >= 500) {
        this.logger.error(
          `[${request.method}] ${request.url} → HTTP ${status}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
    } else if (exception instanceof Error) {
      // CRITICAL FIX: Always log unexpected crashes
      this.logger.error(
        `[${request.method}] ${request.url} — Unhandled: ${exception.message}`,
        exception.stack,
      );
      message = process.env['NODE_ENV'] === 'production'
        ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
        : exception.message;
    } else {
      this.logger.error(`[${request.method}] ${request.url} — Unknown exception`, String(exception));
    }

    response.status(status).json({
      success: false,
      message,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
