import { ZodError } from "zod";

export interface ScruffyError {
  getCode(): number;
  getBody(): object;
}

export class QueryValidationError<T = any> implements ScruffyError {
  private error: ZodError<T>;
  constructor(error: ZodError<T>) {
    this.error = error;
  }

  getCode() {
    return 400;
  }
  getBody() {
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

  getCode() {
    return 404;
  }
  getBody() {
    return { message: `${this.entity} not found` };
  }
}
