/**
 * Extract a human-readable error message from an API response error.
 * Handles FastAPI validation error arrays (422) and standard error messages.
 * 
 * @param {any} err - The catch block error object (typically Axios error)
 * @param {string} fallback - The fallback error message if none is extracted
 * @returns {string} Human-readable error message
 */
export function extractErrorMessage(err, fallback = 'An unexpected error occurred') {
  if (!err) return fallback;
  
  const detail = err.response?.data?.detail;
  
  if (Array.isArray(detail)) {
    // FastAPI validation errors (422)
    return detail
      .map((item) => {
        const field = item.loc ? item.loc[item.loc.length - 1] : 'field';
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
        
        let message = item.msg;
        if (message.startsWith('Value error, ')) {
          message = message.replace('Value error, ', '');
        } else if (message.includes("match pattern '^[A-Z]+$'")) {
          message = "must contain uppercase letters only (A-Z) with no spaces, numbers, or special characters";
        }
        
        return `${fieldName}: ${message}`;
      })
      .join('\n');
  }
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  return err.response?.data?.message || err.message || fallback;
}
