export interface JsonResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
}

export function success<T>(data: T): JsonResponse<T> {
  return { success: true, data };
}

export function error(code: number, message: string): JsonResponse<never> {
  return { success: false, error: { code, message } };
}

export function output<T>(response: JsonResponse<T>): void {
  console.log(JSON.stringify(response, null, 2));
}

export function outputSuccess<T>(data: T): void {
  output(success(data));
}

export function outputError(code: number, message: string): never {
  output(error(code, message));
  process.exit(code);
}
