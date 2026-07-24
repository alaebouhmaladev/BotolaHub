import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";
import { ZodError } from "zod";

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

    // Zod validation exception handling
    if (
      exception instanceof ZodError ||
      (typeof exception === "object" &&
        exception !== null &&
        (exception as { name?: string }).name === "ZodError")
    ) {
      const zodErr = exception as ZodError;
      const message =
        zodErr.errors.map((e) => e.message).join("; ") || "Validation failed";
      sendStatus(400, {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message,
          details: zodErr.errors,
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      });
      return;
    }

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

    // Fastify native error handling (e.g. FST_ERR_CTP_EMPTY_JSON_BODY)
    if (
      typeof exception === "object" &&
      exception !== null &&
      "statusCode" in exception &&
      typeof (exception as { statusCode: number }).statusCode === "number"
    ) {
      const fastifyErr = exception as {
        statusCode: number;
        message: string;
        code?: string;
      };
      sendStatus(fastifyErr.statusCode, {
        success: false,
        error: {
          code: fastifyErr.code || this.getErrorCode(fastifyErr.statusCode),
          message: fastifyErr.message,
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      });
      return;
    }

    // Fallback 500 error handler
    const fallbackMessage =
      exception instanceof Error ? exception.message : "Internal server error";
    console.error("UNHANDLED EXCEPTION IN API 500 FALLBACK:", exception);
    sendStatus(500, {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: fallbackMessage,
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
