import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
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

    const sendStatus = (code: number, payload: object) => {
      if (typeof reply.code === "function") {
        reply.code(code).send(payload);
      } else if (typeof reply.status === "function") {
        reply.status(code).send(payload);
      } else {
        reply.send(payload);
      }
    };

    const isHttpExp =
      exception instanceof HttpException ||
      (typeof exception === "object" &&
        exception !== null &&
        typeof (exception as Record<string, unknown>).getStatus === "function");

    if (isHttpExp) {
      const httpExp = exception as HttpException;
      const status = httpExp.getStatus();
      const response = httpExp.getResponse();

      let errorMessage = "An error occurred";
      let details: unknown = undefined;

      if (typeof response === "string") {
        errorMessage = response;
      } else if (typeof response === "object" && response !== null) {
        const resObj = response as Record<string, unknown>;
        if (typeof resObj.message === "string") {
          errorMessage = resObj.message;
        } else if (Array.isArray(resObj.message)) {
          errorMessage = resObj.message.join(", ");
        }
        if (
          "error" in resObj &&
          typeof resObj.error === "object" &&
          resObj.error !== null
        ) {
          // Already formatted custom error object
          sendStatus(status, {
            ...(response as object),
            meta: { requestId, timestamp: new Date().toISOString() },
          });
          return;
        }
        if ("details" in resObj) {
          details = resObj.details;
        }
      }

      sendStatus(status, {
        success: false,
        error: {
          code: this.getErrorCode(status),
          message: errorMessage,
          ...(details ? { details } : {}),
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      });
      return;
    }

    throw exception;
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
