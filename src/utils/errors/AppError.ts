/**
 * AppError — Custom operational error class.
 *
 * Usage:
 *   throw new AppError('Resource not found', 404);
 *   next(new AppError('Unauthorized', 401));
 *
 * The globalErrorHandler middleware will catch these and format the response as:
 *   { success: false, error: { code: number, message: string } }
 */
export class AppError extends Error {
  public readonly statusCode: number;
  /** Marks errors that are known/expected (vs unexpected programming bugs). */
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture clean stack trace (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
