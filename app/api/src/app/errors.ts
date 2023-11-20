import { ZodError } from "zod";

export interface ScruffyError {
  code: number;
  body: object;
}

export class QueryValidationError<T = any> implements ScruffyError {
  private error: ZodError<T>;
  constructor(error: ZodError<T>) {
    this.error = error;
  }

  get code() {
    return 400;
  }

  get body() {
    return {
      message: "Could not read query parameters",
      errors: this.error.errors.map((err) => ({
        path: err.path,
        message: err.message,
      })),
    };
  }
}

export class NotFoundError implements ScruffyError {
  private entity: string;
  constructor(entity: string) {
    this.entity = entity;
  }

  get code() {
    return 404;
  }

  get body() {
    return { message: `${this.entity} not found` };
  }
}
