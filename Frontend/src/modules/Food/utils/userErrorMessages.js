export const ENABLE_USER_FRIENDLY_ERRORS = true;

/**
 * Escapes characters for regex matching.
 */
const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Maps a raw error string (e.g. developer error or backend response message) to a user-friendly string.
 */
export function getFriendlyMessageFromString(rawMsg) {
  if (typeof rawMsg !== 'string') return null;
  const msg = rawMsg.trim();
  const lowerMsg = msg.toLowerCase();

  // Network & Timeout checks
  if (lowerMsg.includes('network error') || lowerMsg.includes('err_network')) {
    return "Unable to connect to the server. Please check your internet connection.";
  }
  if (lowerMsg.includes('timeout') || lowerMsg.includes('econnaborted')) {
    return "The request timed out. Please check your network connection.";
  }
  if (lowerMsg.includes('connection refused') || lowerMsg.includes('econnrefused')) {
    return "Cannot reach the server right now.";
  }

  // Auth & OTP checks
  if (lowerMsg.includes('incorrect email or password') || lowerMsg.includes('invalid credentials')) {
    return "Incorrect email or password.";
  }
  if (lowerMsg.includes('unauthorized') || lowerMsg === '401') {
    return "Your session has expired. Please sign in again.";
  }
  if (lowerMsg.includes('otp has expired') || lowerMsg.includes('otp expired')) {
    return "Your OTP has expired. Please request a new one.";
  }
  if (lowerMsg.includes('incorrect otp') || lowerMsg.includes('invalid otp')) {
    return "OTP is incorrect. Please check and try again.";
  }
  if (lowerMsg.includes('phone number is already in use') || lowerMsg.includes('email already registered')) {
    return "Email or phone number is already registered.";
  }
  if (lowerMsg.includes('password is too short')) {
    return "Password is too short.";
  }

  // Category and business checks
  if (lowerMsg.includes('category already exists') || lowerMsg.includes('duplicate category')) {
    return "A category with this name already exists.";
  }
  if (lowerMsg.includes('category name is required')) {
    return "Category name is required.";
  }
  if (lowerMsg.includes('conflict') || lowerMsg === '409') {
    return "This item already exists.";
  }

  // HTTP status mappings (like plain codes)
  if (lowerMsg === '403' || lowerMsg.includes('forbidden')) {
    return "You don't have permission to perform this action.";
  }
  if (lowerMsg === '404' || lowerMsg.includes('not found')) {
    return "The requested information could not be found.";
  }
  if (lowerMsg === '408' || lowerMsg.includes('request timeout')) {
    return "The request took too long. Please try again.";
  }
  if (lowerMsg === '413' || lowerMsg.includes('payload too large') || lowerMsg.includes('file too large') || lowerMsg.includes('size exceeds')) {
    return "The selected file is too large.";
  }
  if (lowerMsg === '415' || lowerMsg.includes('unsupported media type') || lowerMsg.includes('unsupported file type')) {
    return "This file type is not supported.";
  }
  if (lowerMsg === '422' || lowerMsg.includes('unprocessable entity') || lowerMsg.includes('invalid input')) {
    return "Some information is invalid. Please review your input.";
  }
  if (lowerMsg === '429' || lowerMsg.includes('too many requests')) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (lowerMsg === '500' || lowerMsg.includes('internal server error')) {
    return "Something went wrong on our side. Please try again later.";
  }

  // Other specific validations
  if (lowerMsg.includes('location permission denied') || lowerMsg.includes('permission denied')) {
    return "Location permission denied.";
  }
  if (lowerMsg.includes('gps is disabled')) {
    return "GPS is disabled.";
  }
  if (lowerMsg.includes('payment failed')) {
    return "Payment failed. Please try again.";
  }

  return null;
}

/**
 * Normalizes and returns a user-friendly error message based on the input error.
 * Priority:
 * 1. Backend validation/error message (highest priority)
 * 2. Backend error code (if available)
 * 3. HTTP status code
 * 4. Network/timeout detection
 * 5. Generic fallback message
 */
export function getUserFriendlyErrorMessage(error) {
  if (!error) return null;

  // If error is already a string, check if we have a direct mapping
  if (typeof error === 'string') {
    return getFriendlyMessageFromString(error) || error;
  }

  // 1. Backend validation/error message (highest priority)
  const backendMessage = error.response?.data?.message || error.response?.data?.error;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    const friendlyMapped = getFriendlyMessageFromString(backendMessage);
    if (friendlyMapped) return friendlyMapped;

    // Check if it's a generic developer message (we don't want to return those)
    const isGenericDeveloperMsg = /internal\s*server\s*error|bad\s*request|forbidden|unauthorized|not\s*found|conflict|precondition\s*failed|unprocessable\s*entity|gateway\s*timeout|request\s*timeout/i.test(backendMessage);
    if (!isGenericDeveloperMsg) {
      return backendMessage.trim();
    }
  }

  // 2. Backend error code (if available)
  const backendCode = error.response?.data?.code || error.response?.data?.errorCode;
  if (backendCode) {
    switch (String(backendCode).toUpperCase()) {
      case 'CATEGORY_EXISTS':
      case 'DUPLICATE_CATEGORY':
        return "A category with this name already exists.";
      case 'CATEGORY_NAME_REQUIRED':
        return "Category name is required.";
      case 'INVALID_OTP':
      case 'OTP_INVALID':
        return "OTP is incorrect. Please check and try again.";
      case 'OTP_EXPIRED':
        return "Your OTP has expired. Please request a new one.";
      case 'AUTH_FAILED':
      case 'INVALID_CREDENTIALS':
        return "Incorrect email or password.";
      case 'EMAIL_EXISTS':
      case 'PHONE_EXISTS':
      case 'USER_EXISTS':
        return "Email or phone number is already registered.";
      case 'PASSWORD_TOO_SHORT':
        return "Password is too short.";
      case 'LOCATION_DENIED':
        return "Location permission denied.";
      case 'PAYMENT_FAILED':
        return "Payment failed. Please try again.";
      case 'FILE_TOO_LARGE':
      case 'LIMIT_FILE_SIZE':
        return "The selected file is too large.";
      case 'UNSUPPORTED_FILE_TYPE':
        return "This file type is not supported.";
    }
  }

  // 3. HTTP status code
  if (error.response?.status) {
    const status = error.response.status;
    switch (status) {
      case 401:
        const url = error.config?.url || '';
        if (url.includes('/login') || url.includes('/signin') || url.includes('/verify-otp')) {
          return "Incorrect email or password.";
        }
        return "Your session has expired. Please sign in again.";
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return "The requested information could not be found.";
      case 408:
        return "The request took too long. Please try again.";
      case 409:
        if (error.config?.url?.includes('/categories')) {
          return "A category with this name already exists.";
        }
        return "This item already exists.";
      case 413:
        return "The selected file is too large.";
      case 415:
        return "This file type is not supported.";
      case 422:
        return "Some information is invalid. Please review your input.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Something went wrong on our side. Please try again later.";
      case 502:
      case 503:
      case 504:
        return "Server unavailable. Please try again later.";
    }
  }

  // 4. Network/timeout detection
  const errCode = error.code;
  const errMsg = error.message || '';
  if (errCode === 'ERR_NETWORK' || errMsg.toLowerCase().includes('network error')) {
    return "Unable to connect to the server. Please check your internet connection.";
  }
  if (errCode === 'ECONNABORTED' || errMsg.toLowerCase().includes('timeout')) {
    return "The request timed out. Please check your network connection.";
  }
  if (errMsg.toLowerCase().includes('connection refused') || errMsg.toLowerCase().includes('econnrefused')) {
    return "Cannot reach the server right now.";
  }

  // 5. Generic fallback message
  return "Something went wrong. Please try again.";
}
