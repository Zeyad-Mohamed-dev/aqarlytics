export interface ApiError {
  message: string;
  statusCode?: number;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError | null;
  meta?: Record<string, any> | null;
}

export default ApiResponse;
