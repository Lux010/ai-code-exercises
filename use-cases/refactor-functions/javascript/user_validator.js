/**
 * Validates user input data for user registration and profile updates.
 *
 * This module was refactored for the "Function Decomposition" exercise: the original
 * single ~150-line `validateUserData` function was split into small, single-purpose
 * helpers. The public `validateUserData(userData, options)` signature and the exact set
 * of error messages are preserved, so existing behaviour (and the test suite) is unchanged.
 *
 * Returns an array of validation error strings (empty when valid).
 */

// ---------------------------------------------------------------------------
// Registration-only validations
// ---------------------------------------------------------------------------

/** Push an error for every required registration field that is missing/empty. */
function validateRequiredRegistrationFields(userData, errors) {
  const requiredForRegistration = ['username', 'email', 'password', 'confirmPassword'];
  for (const field of requiredForRegistration) {
    if (!userData[field] || userData[field].trim() === '') {
      errors.push(`${field} is required for registration`);
    }
  }
}

/** Validate username format and (optionally) uniqueness. */
function validateUsername(userData, options, errors) {
  if (!userData.username) return;

  if (userData.username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  } else if (userData.username.length > 20) {
    errors.push('Username must be at most 20 characters long');
  } else if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  } else if (options.checkExisting && options.checkExisting.usernameExists(userData.username)) {
    errors.push('Username is already taken');
  }
}

/** Validate password strength and confirmation match. */
function validatePassword(userData, errors) {
  if (!userData.password) return;

  if (userData.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (!/[A-Z]/.test(userData.password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (!/[a-z]/.test(userData.password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (!/[0-9]/.test(userData.password)) {
    errors.push('Password must contain at least one number');
  } else if (!/[^A-Za-z0-9]/.test(userData.password)) {
    errors.push('Password must contain at least one special character');
  }

  if (userData.confirmPassword !== userData.password) {
    errors.push('Password and confirmation do not match');
  }
}

// ---------------------------------------------------------------------------
// Profile-update-only validations
// ---------------------------------------------------------------------------

/** Push an error when a provided (but empty) profile field is supplied. */
function validateRequiredProfileFields(userData, errors) {
  const requiredForProfile = ['firstName', 'lastName', 'dateOfBirth', 'address'];
  for (const field of requiredForProfile) {
    if (userData[field] !== undefined && userData[field] === '') {
      errors.push(`${field} cannot be empty if provided`);
    }
  }
}

// ---------------------------------------------------------------------------
// Shared validations (registration AND profile update)
// ---------------------------------------------------------------------------

/** Validate email format and (optionally) uniqueness. */
function validateEmail(userData, options, errors) {
  if (userData.email === undefined) return;

  const isRegistration = options.isRegistration || false;

  if (userData.email.trim() === '') {
    if (isRegistration) {
      errors.push('Email is required');
    }
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    errors.push('Email format is invalid');
  } else if (options.checkExisting && options.checkExisting.emailExists(userData.email)) {
    errors.push('Email is already registered');
  }
}

/** Validate date of birth: parseable, not future, age between 13 and 120. */
function validateDateOfBirth(userData, errors) {
  if (userData.dateOfBirth === undefined || userData.dateOfBirth === '') return;

  const dobDate = new Date(userData.dateOfBirth);

  if (isNaN(dobDate.getTime())) {
    errors.push('Date of birth is not a valid date');
    return;
  }

  const now = new Date();
  const minAgeDate = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());
  const maxAgeDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());

  if (dobDate > now) {
    errors.push('Date of birth cannot be in the future');
  } else if (dobDate > minAgeDate) {
    errors.push('You must be at least 13 years old');
  } else if (dobDate < maxAgeDate) {
    errors.push('Invalid date of birth (age > 120 years)');
  }
}

/** Validate address object, required fields, and country-specific postal codes. */
function validateAddress(userData, errors) {
  if (userData.address === undefined || userData.address === '') return;

  if (typeof userData.address !== 'object') {
    errors.push('Address must be an object with required fields');
    return;
  }

  const requiredAddressFields = ['street', 'city', 'zip', 'country'];
  for (const field of requiredAddressFields) {
    if (!userData.address[field] || userData.address[field].trim() === '') {
      errors.push(`Address ${field} is required`);
    }
  }

  if (userData.address.zip && userData.address.country) {
    const { zip, country } = userData.address;
    if (country === 'US' && !/^\d{5}(-\d{4})?$/.test(zip)) {
      errors.push('Invalid US ZIP code format');
    } else if (country === 'CA' && !/^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/.test(zip)) {
      errors.push('Invalid Canadian postal code format');
    } else if (country === 'UK' && !/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(zip)) {
      errors.push('Invalid UK postal code format');
    }
  }
}

/** Validate phone number format (basic, length-based). */
function validatePhone(userData, errors) {
  if (userData.phone === undefined || userData.phone === '') return;
  if (!/^\+?[\d\s\-()]{10,15}$/.test(userData.phone)) {
    errors.push('Phone number format is invalid');
  }
}

/** Run caller-supplied custom field validations. */
function runCustomValidations(userData, options, errors) {
  if (!options.customValidations) return;
  for (const validation of options.customValidations) {
    const field = validation.field;
    if (userData[field] !== undefined) {
      const valid = validation.validator(userData[field], userData);
      if (!valid) {
        errors.push(validation.message || `Invalid value for ${field}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates user input data for registration or profile updates.
 *
 * @param {Object} userData - The data to validate.
 * @param {Object} [options] - Options:
 *   - isRegistration {boolean} – treat as a registration (stricter required fields).
 *   - checkExisting {object} – object with `usernameExists`/`emailExists` methods.
 *   - customValidations {Array} – [{ field, validator, message }].
 * @returns {string[]} List of validation error messages (empty when valid).
 */
function validateUserData(userData, options = {}) {
  const errors = [];
  const isRegistration = options.isRegistration || false;

  if (isRegistration) {
    validateRequiredRegistrationFields(userData, errors);
    validateUsername(userData, options, errors);
    validatePassword(userData, errors);
  } else {
    validateRequiredProfileFields(userData, errors);
  }

  validateEmail(userData, options, errors);
  validateDateOfBirth(userData, errors);
  validateAddress(userData, errors);
  validatePhone(userData, errors);
  runCustomValidations(userData, options, errors);

  return errors;
}

module.exports = { validateUserData };
