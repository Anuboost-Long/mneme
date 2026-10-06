import {
  desktop,
  type ChainError,
  type ChainErrorCode,
  type HttpError,
  type HttpRequestConfig,
  type HttpResponse
} from "@chain/sdk";

import { errorMessage } from "./errorMessage";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: ChainErrorCode,
    readonly status: number | null = null
  ) {
    super(message);
  }
}

function toApiError(error: unknown) {
  const code = (error as ChainError | null)?.code ?? "NATIVE_FAILURE";
  switch (code) {
    case "HTTP_ERROR": {
      const { status } = (error as HttpError).response;
      return new ApiError(`The site responded with an error (status ${status}).`, code, status);
    }
    case "UNAVAILABLE":
      return new ApiError("Couldn’t reach that address. Check it and your connection.", code);
    case "INVALID_ARGUMENT":
      return new ApiError("That doesn’t look like a valid web address.", code);
    case "TOO_LARGE":
      return new ApiError("That file is too large to download.", code);
    default:
      return new ApiError(errorMessage(error, "Couldn’t complete the request. Try again."), code);
  }
}

const DEFAULT_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; mneme)" };

export async function apiRequest<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
  try {
    return await desktop.http.request<T>({
      ...config,
      headers: { ...DEFAULT_HEADERS, ...config.headers }
    });
  } catch (error) {
    throw toApiError(error);
  }
}

export function apiGet<T = unknown>(
  url: string,
  config: Omit<HttpRequestConfig, "url" | "method" | "data"> = {}
) {
  return apiRequest<T>({ ...config, url, method: "GET" });
}
