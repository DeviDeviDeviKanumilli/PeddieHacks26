// typed error envelopes. clients key off `code` + requestid, not the http reason phrase.
import type { ErrorResponse } from '@peddie/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface ErrorItem {
  readonly code: string;
  readonly message: string;
  readonly path?: readonly string[];
}

// thrown from handlers/repos so the envelope stays consistent. do not send raw error objects.
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly title: string;
  readonly errorItems?: readonly ErrorItem[];

  constructor(input: {
    readonly statusCode: number;
    readonly code: string;
    readonly title: string;
    readonly detail: string;
    readonly errors?: readonly ErrorItem[];
  }) {
    super(input.detail);
    this.name = 'ApiError';
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.title = input.title;
    if (input.errors !== undefined) {
      this.errorItems = input.errors;
    }
  }
}

const errorType = (code: string): string => `https://api.example/errors/${code}`;

const asErrorResponse = (request: FastifyRequest, error: ApiError): ErrorResponse => {
  // always include requestid so support can grep logs without leaking internals.
  const response: ErrorResponse = {
    type: errorType(error.code),
    title: error.title,
    status: error.statusCode,
    code: error.code,
    detail: error.message,
    requestId: request.id,
  };
  if (error.errorItems !== undefined) {
    return {
      ...response,
      errors: error.errorItems.map((item) =>
        item.path === undefined
          ? { code: item.code, message: item.message }
          : { ...item, path: [...item.path] },
      ),
    };
  }
  return response;
};

// unknown routes still use the typed envelope so clients don't parse html 404s.
export const registerErrorHandling = (app: FastifyInstance): void => {
  app.setNotFoundHandler((request, _reply) => {
    throw new ApiError({
      statusCode: 404,
      code: 'not_found',
      title: 'Not found',
      detail: `No route matches ${request.method} ${request.url}.`,
    });
  });

  app.setErrorHandler((error, request, reply) => {
    const validation = (
      error as { validation?: readonly { instancePath?: string; message?: string }[] }
    ).validation;
    // ajv failures become field errors. this is how we reject raw media/landmark extras.
    if (validation !== undefined) {
      const items = validation.map((item) => ({
        code: 'invalid_field',
        message: item.message ?? 'The field is invalid.',
        ...(item.instancePath === undefined || item.instancePath === ''
          ? {}
          : { path: item.instancePath.split('/').filter(Boolean) }),
      }));
      const apiError = new ApiError({
        statusCode: 400,
        code: 'invalid_request',
        title: 'Invalid request',
        detail: 'The request did not match the expected shape.',
        errors: items,
      });
      return reply.status(apiError.statusCode).send(asErrorResponse(request, apiError));
    }

    const errorRecord =
      typeof error === 'object' && error !== null
        ? (error as { readonly statusCode?: unknown })
        : undefined;
    const statusCode = typeof errorRecord?.statusCode === 'number' ? errorRecord.statusCode : 500;
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            statusCode,
            code: statusCode < 500 ? 'request_error' : 'internal_error',
            title: statusCode < 500 ? 'Request error' : 'Internal error',
            // 500 detail is generic on purpose. stack stays in logs only.
            detail:
              statusCode < 500 && error instanceof Error
                ? error.message
                : 'An unexpected error occurred.',
          });

    if (apiError.statusCode >= 500) {
      request.log.error(
        {
          requestId: request.id,
          route: request.routeOptions.url,
          statusCode: apiError.statusCode,
          code: apiError.code,
        },
        'request failed',
      );
    }
    return reply.status(apiError.statusCode).send(asErrorResponse(request, apiError));
  });
};
