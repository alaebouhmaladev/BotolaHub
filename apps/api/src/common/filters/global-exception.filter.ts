import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const requestId =
      (request.headers["x-request-id"] as string) || randomUUID();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (
        typeof response === "object" &&
        response !== null &&
        "error" in response
      ) {
        // Already structured (e.g. from ZodValidationPipe)
        reply.status(status).send({
          ...(response as object),
          meta: { requestId, timestamp: new Date().toISOString() },
        });
        return;
      }

      reply.status(status).send({
        success: false,
        error: {
          code: this.getErrorCode(status),
          message:
            typeof response === "string"
              ? response
              : (response as Record<string, unknown>)?.message ||
                "An error occurred",
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      });
      return;
    }

    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      meta: { requestId, timestamp: new Date().toISOString() },
    });
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_ERROR",
    };
    return codes[status] || "ERROR";
  }
}
