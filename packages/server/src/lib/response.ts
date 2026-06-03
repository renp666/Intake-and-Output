/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}

/**
 * Create a success response
 */
export function success<T>(data: T, message: string = 'Success'): ApiResponse<T> {
  return {
    code: 200,
    message,
    data,
  };
}

/**
 * Create an error response
 */
export function error(message: string, code: number = 500): ApiResponse<null> {
  return {
    code,
    message,
    data: null,
  };
}

/**
 * Create a paginated response
 */
export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  message: string = 'Success'
): ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  return {
    code: 200,
    message,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
