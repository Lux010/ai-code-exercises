// tests/decomposition_equivalence.test.js
// Verifies the refactored validateUserData (user_validator.js) produces IDENTICAL
// output to the original monolithic function from the exercise brief, across many inputs.
// This is the "run tests to verify the refactoring preserves behavior" step.

// --- Original monolithic function, copied verbatim from the exercise prompt ---------
function validateUserDataMonolith(userData, options = {}) {
  const errors = [];
  const isRegistration = options.isRegistration || false;
  const requiredForRegistration = ['username', 'email', 'password', 'confirmPassword'];
  const requiredForProfile = ['firstName', 'lastName', 'dateOfBirth', 'address'];

  if (isRegistration) {
    for (const field of requiredForRegistration) {
      if (!userData[field] || userData[field].trim() === '') {
        errors.push(`${field} is required for registration`);
      }
    }
    if (userData.username) {
      if (userData.username.length < 3) {
        errors.push('Username must be at least 3 characters long');
      } else if (userData.username.length > 20) {
        errors.push('Username must be at most 20 characters long');
      } else if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
      } else {
        if (options.checkExisting && options.checkExisting.usernameExists(userData.username)) {
          errors.push('Username is already taken');
        }
      }
    }
    if (userData.password) {
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
  } else {
    for (const field of requiredForProfile) {
      if (userData[field] !== undefined && userData[field].trim() === '') {
        errors.push(`${field} cannot be empty if provided`);
      }
    }
  }

  if (userData.email !== undefined) {
    if (userData.email.trim() === '') {
      if (isRegistration) errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('Email format is invalid');
      } else {
        if (options.checkExisting && options.checkExisting.emailExists(userData.email)) {
          errors.push('Email is already registered');
        }
      }
    }
  }

  if (userData.dateOfBirth !== undefined && userData.dateOfBirth !== '') {
    const dobDate = new Date(userData.dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      errors.push('Date of birth is not a valid date');
    } else {
      const now = new Date();
      const minAgeDate = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());
      const maxAgeDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      if (dobDate > now) errors.push('Date of birth cannot be in the future');
      else if (dobDate > minAgeDate) errors.push('You must be at least 13 years old');
      else if (dobDate < maxAgeDate) errors.push('Invalid date of birth (age > 120 years)');
    }
  }

  if (userData.address !== undefined && userData.address !== '') {
    if (typeof userData.address === 'object') {
      const requiredAddressFields = ['street', 'city', 'zip', 'country'];
      for (const field of requiredAddressFields) {
        if (!userData.address[field] || userData.address[field].trim() === '') {
          errors.push(`Address ${field} is required`);
        }
      }
      if (userData.address.zip && userData.address.country) {
        if (userData.address.country === 'US' && !/^\d{5}(-\d{4})?$/.test(userData.address.zip)) {
          errors.push('Invalid US ZIP code format');
        } else if (userData.address.country === 'CA' && !/^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/.test(userData.address.zip)) {
          errors.push('Invalid Canadian postal code format');
        } else if (userData.address.country === 'UK' && !/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(userData.address.zip)) {
          errors.push('Invalid UK postal code format');
        }
      }
    } else {
      errors.push('Address must be an object with required fields');
    }
  }

  if (userData.phone !== undefined && userData.phone !== '') {
    if (!/^\+?[\d\s\-()]{10,15}$/.test(userData.phone)) {
      errors.push('Phone number format is invalid');
    }
  }

  if (options.customValidations) {
    for (const validation of options.customValidations) {
      const field = validation.field;
      if (userData[field] !== undefined) {
        const valid = validation.validator(userData[field], userData);
        if (!valid) errors.push(validation.message || `Invalid value for ${field}`);
      }
    }
  }

  return errors;
}

// --- Refactored version under test -------------------------------------------------
const { validateUserData } = require('../user_validator');

// Shared fixtures -> [userData, options]
const fixtures = [
  [{ username: '', email: '', password: '', confirmPassword: '' }, { isRegistration: true }],
  [{ username: 'ab', email: 'x@y.com', password: 'Password123!', confirmPassword: 'Password123!' }, { isRegistration: true }],
  [{ username: 'validuser', email: 'valid@example.com', password: 'Password123!', confirmPassword: 'Password123!' }, { isRegistration: true }],
  [{ username: 'a@', email: 'test@example.com', password: 'Password123!', confirmPassword: 'Password123!' }, { isRegistration: true }],
  [{ firstName: '', lastName: '', dateOfBirth: '', address: '' }, {}],
  [{ email: 'invalid-email' }, { isRegistration: true }],
  [{ email: 'invalid-email' }, {}],
  [{ dateOfBirth: 'not-a-date' }, {}],
  [{ dateOfBirth: '2010-01-01' }, {}],
  [{ address: { street: '1 Main', city: 'Town', zip: '12345', country: 'US' } }, { isRegistration: true }],
  [{ address: { street: '1 Main', city: 'Town', zip: 'BAD', country: 'US' } }, { isRegistration: true }],
  [{ phone: 'abc' }, {}],
  [{ phone: '(555) 123-4567' }, {}],
  [{ nickname: 'x' }, { customValidations: [{ field: 'nickname', validator: v => v.length > 5, message: 'Nickname must be longer than 5 characters' }] }],
  [
    { username: 'taken', email: 'new@example.com', password: 'Password123!', confirmPassword: 'Password123!' },
    { isRegistration: true, checkExisting: { usernameExists: () => true, emailExists: () => false } }
  ],
  [
    { username: 'newuser', email: 'taken@example.com', password: 'Password123!', confirmPassword: 'Password123!' },
    { isRegistration: true, checkExisting: { usernameExists: () => false, emailExists: () => true } }
  ],
];

describe('Decomposition equivalence (monolith vs refactored)', () => {
  test.each(fixtures.map((f, i) => [i, ...f]))(
    'fixture %i produces identical errors',
    (_i, userData, options) => {
      const expected = validateUserDataMonolith(userData, options);
      const actual = validateUserData(userData, options);
      expect(actual).toEqual(expected);
    }
  );
});
