/**
 * utils/validate.js
 * URL validation helpers.
 */

/**
 * Validates that the given string is an absolute HTTP/HTTPS URL.
 * @param {string} url
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: 'URL is required and must be a string.' };
  }

  const trimmed = url.trim();

  if (trimmed.length > 2048) {
    return { valid: false, message: 'URL must be 2048 characters or fewer.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, message: 'URL must use http or https protocol.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, message: 'Invalid URL format.' };
  }
}