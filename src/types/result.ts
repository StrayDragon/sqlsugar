/**
 * Result type for better error handling
 * Based on functional programming patterns for robust error management
 */

/**
 * Base Result interface for operations that can succeed or fail
 */
export interface Result<T, E = Error> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: E;
  readonly message?: string | undefined;

  /**
   * Transform the successful value
   */
  map<U>(fn: (value: T) => U): Result<U, E>;

  /**
   * Transform the error
   */
  mapError<F>(fn: (error: E) => F): Result<T, F>;

  /**
   * Chain operations that return Results
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;

  /**
   * Get value or default
   */
  getOrElse(defaultValue: T): T;

  /**
   * Execute side effects based on result
   */
  match(onSuccess: (value: T) => void, onError: (error: E) => void): void;

  /**
   * Convert to Promise
   */
  toPromise(): Promise<T>;
}

/**
 * Successful result
 */
export class Ok<T, E = Error> implements Result<T, E> {
  readonly ok = true;
  readonly value: T;
  readonly error?: E;

  constructor(value: T) {
    this.value = value;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    try {
      return new Ok(fn(this.value));
    } catch (error) {
      return new Err(error as E);
    }
  }

  mapError<F>(_fn: (error: E) => F): Result<T, F> {
    return new Ok(this.value);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    try {
      return fn(this.value);
    } catch (error) {
      return new Err(error as E);
    }
  }

  getOrElse(_defaultValue: T): T {
    return this.value;
  }

  match(onSuccess: (value: T) => void, _onError: (error: E) => void): void {
    onSuccess(this.value);
  }

  toPromise(): Promise<T> {
    return Promise.resolve(this.value);
  }
}

/**
 * Error result
 */
export class Err<T, E = Error> implements Result<T, E> {
  readonly ok = false;
  readonly error: E;
  readonly message?: string | undefined;

  constructor(error: E, message?: string) {
    this.error = error;
    this.message = message;
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err(this.error, this.message);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    try {
      return new Err(fn(this.error), this.message);
    } catch (error) {
      return new Err(error as F);
    }
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err(this.error, this.message);
  }

  getOrElse(defaultValue: T): T {
    return defaultValue;
  }

  match(onSuccess: (value: T) => void, onError: (error: E) => void): void {
    onError(this.error);
  }

  toPromise(): Promise<T> {
    return Promise.reject(this.error);
  }
}

/**
 * Utility functions for creating Results
 */
export const Result = {
  /**
   * Create a successful result
   */
  ok<T, E = Error>(value: T): Result<T, E> {
    return new Ok(value);
  },

  /**
   * Create an error result
   */
  err<T, E = Error>(error: E, message?: string): Result<T, E> {
    return new Err(error, message);
  },

  /**
   * Wrap a function that might throw
   */
  wrap<T, E = Error>(fn: () => T): Result<T, E> {
    try {
      return new Ok(fn());
    } catch (error) {
      return new Err(error as E);
    }
  },

  /**
   * Wrap an async function
   */
  wrapAsync<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> {
    // @ts-ignore - Complex generic type compatibility issue
    return fn()
      .then(value => new Ok(value))
      .catch(error => new Err(error as E));
  },
};

/**
 * Async utility for working with Results and Promises
 */
export const AsyncResult = {
  /**
   * Convert a Promise to a Result
   */
  fromPromise<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
    // @ts-ignore - Complex generic type compatibility issue
    return promise.then(value => Result.ok(value)).catch(error => Result.err(error as E));
  },

  /**
   * Chain async operations
   */
  chain: async <T, U, E = Error>(
    result: Result<T, E>,
    fn: (value: T) => Promise<Result<U, E>>
  ): Promise<Result<U, E>> => {
    // @ts-ignore - Complex generic type compatibility issue
    if (result.ok) {
      return await fn(result.value!);
    }
    return Promise.resolve(Result.err(result.error as E));
  },
};
