/**
 * Unicode text normalization and validation utilities
 * Shared helpers for handling international characters in customer and address data
 */

/**
 * Normalize Unicode text for consistent storage and display
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeUnicodeText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let normalized = text.normalize('NFC');
  normalized = normalized.trim();
  normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Validate Unicode text for customer names
 * @param {string} text - Text to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} Validated and normalized text
 * @throws {Error} If text contains invalid characters
 */
export function validateUnicodeText(text, fieldName) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const normalized = normalizeUnicodeText(text);

  if (normalized.length === 0) {
    throw new Error(`${fieldName} cannot be empty after normalization`);
  }

  if (normalized.length > 255) {
    throw new Error(`${fieldName} is too long (${normalized.length} characters). Maximum 255 characters allowed.`);
  }

  if (!/^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(normalized)) {
    throw new Error(`${fieldName} contains invalid characters. Only letters, numbers, punctuation, and spaces are allowed.`);
  }

  if (fieldName.includes('name') && !/^[\p{L}\p{N}].*[\p{L}\p{N}]$/u.test(normalized)) {
    if (normalized.length === 1 && /^[\p{L}\p{N}]$/u.test(normalized)) {
      return normalized;
    }
    throw new Error(`${fieldName} should start and end with a letter or number`);
  }

  return normalized;
}

/**
 * Validate Unicode text for address fields
 * @param {string} text - Text to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Validated and normalized text
 * @throws {Error} If text contains invalid characters
 */
export function validateUnicodeAddressText(text, fieldName, maxLength = 255) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const normalized = normalizeUnicodeText(text);

  if (normalized.length === 0) {
    throw new Error(`${fieldName} cannot be empty after normalization`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} is too long (${normalized.length} characters). Maximum ${maxLength} characters allowed.`);
  }

  if (!/^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(normalized)) {
    throw new Error(`${fieldName} contains unsupported characters. Only letters, numbers, basic punctuation (hyphens, periods, apostrophes), and spaces are allowed. Emojis and special symbols are not supported by shipping providers.`);
  }

  return normalized;
}

/**
 * Normalize and validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {string} Normalized phone number
 * @throws {Error} If phone number is invalid
 */
export function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }

  let normalized = phone.trim().replace(/\s+/g, ' ');

  if (!/^[\+]?[\d\s\-\(\)\.]{7,20}$/.test(normalized)) {
    throw new Error('Phone number format is invalid. Use international format (e.g., +1-555-123-4567)');
  }

  const digitCount = (normalized.match(/\d/g) || []).length;
  if (digitCount < 7 || digitCount > 15) {
    throw new Error(`Phone number should have 7-15 digits, found ${digitCount}`);
  }

  return normalized;
}

/**
 * Validate postal/ZIP code with international support
 * @param {string} zip - Postal code to validate
 * @param {string} country - Country code for context
 * @returns {string} Normalized postal code
 * @throws {Error} If postal code is invalid
 */
export function validatePostalCode(zip, country = '') {
  if (!zip || typeof zip !== 'string') {
    return zip;
  }

  const normalized = normalizeUnicodeText(zip);

  if (!/^[\p{L}\p{N}\s\-]{2,12}$/u.test(normalized)) {
    throw new Error(`Invalid postal code format: ${zip}. Use alphanumeric characters, spaces, and hyphens only (2-12 characters).`);
  }

  const countryLower = country.toLowerCase();
  if (countryLower === 'us' || countryLower === 'usa' || countryLower === 'united states') {
    if (!/^\d{5}(-\d{4})?$/.test(normalized)) {
      throw new Error(`US ZIP code format should be 12345 or 12345-6789, got: ${zip}`);
    }
  } else if (countryLower === 'ca' || countryLower === 'canada') {
    if (!/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(normalized)) {
      throw new Error(`Canadian postal code format should be A1A 1A1 or A1A1A1, got: ${zip}`);
    }
  } else if (countryLower === 'uk' || countryLower === 'gb' || countryLower === 'united kingdom') {
    if (!/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(normalized)) {
      throw new Error(`UK postal code format should be like SW1A 1AA or M1 1AA, got: ${zip}`);
    }
  }

  return normalized;
}
