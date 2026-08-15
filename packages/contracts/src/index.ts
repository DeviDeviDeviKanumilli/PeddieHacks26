import { type Static, Type } from '@sinclair/typebox';

export const HealthResponseSchema = Type.Object({
  data: Type.Object({
    service: Type.Literal('api'),
    status: Type.Literal('ok'),
  }),
});

export type HealthResponse = Static<typeof HealthResponseSchema>;

export const ErrorResponseSchema = Type.Object({
  type: Type.String(),
  title: Type.String(),
  status: Type.Integer({ minimum: 400, maximum: 599 }),
  code: Type.String(),
  detail: Type.String(),
  requestId: Type.String(),
});

export type ErrorResponse = Static<typeof ErrorResponseSchema>;
