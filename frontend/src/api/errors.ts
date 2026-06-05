import { isAxiosError } from 'axios';

/**
 * Extracts a user-friendly message from an API error. The backend's global exception
 * middleware returns a JSON body of the shape `{ error: string }`; validation failures
 * from the `[ApiController]` filter return an RFC 7807 ProblemDetails instead. This
 * normalizes both into a single string for display.
 */
export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong.'): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (data && typeof data === 'object') {
      // Our custom middleware shape.
      if ('error' in data && typeof data.error === 'string') {
        return data.error;
      }

      // ProblemDetails from model validation: surface the first field error if present.
      if ('errors' in data && data.errors && typeof data.errors === 'object') {
        const firstField = Object.values(data.errors as Record<string, string[]>)[0];
        if (Array.isArray(firstField) && firstField.length > 0) {
          return firstField[0];
        }
      }

      if ('title' in data && typeof data.title === 'string') {
        return data.title;
      }
    }

    return error.message;
  }

  return fallback;
};
