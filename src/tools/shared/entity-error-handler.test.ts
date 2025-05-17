import { describe, it, expect } from 'vitest';
import { isEntityError } from './entity-error-handler.js';

describe('isEntityError', () => {
  const errorMessages = [
    'Argument Validation Error - projectId must be a UUID.',
    'Argument Validation Error - each value in teamIds must be a UUID.',
    'Entity not found: Project - Could not find referenced Project.',
    'Entity not found: Team - Could not find referenced Team.',
    'Entity not found: Team: teamIds contained an entry that could not be found.',
    'Argument Validation Error - each value in labelIds must be a UUID.',
  ];

  const nonErrorMessages = [
    'Some other random error message.',
    'User permission error.',
    'Network connection timeout.',
    'Argument Validation Error - name must be a string.',
    'Entity not found: User - Could not find user.',
  ];

  for (const message of errorMessages) {
    it(`should return true for error message: "${message}"`, () => {
      expect(isEntityError(message)).toBe(true);
    });
  }

  for (const message of nonErrorMessages) {
    it(`should return false for non-error message: "${message}"`, () => {
      expect(isEntityError(message)).toBe(false);
    });
  }

  it('should return false for an empty string', () => {
    expect(isEntityError('')).toBe(false);
  });
});