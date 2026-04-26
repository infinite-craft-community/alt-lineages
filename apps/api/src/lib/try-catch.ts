type Success<T> = {
  data: T;
  error: null;
};

type Failure = {
  data: null;
  error: Error;
};

type Result<T> = Success<T> | Failure;

export async function tryCatch<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    const data = await promise;
    return { data, error: null } as const;
  } catch (error) {
    if (Error.isError(error)) {
      return { data: null, error } as const;
    } else {
      return {
        data: null,
        error: new Error(`Unknown error: ${error}`),
      } as const;
    }
  }
}
