import { describe, it, expect } from 'vitest';
import { isEntityError } from './entity-error-handler.js';

describe('isEntityError', () => {
  // Messages that should be identified as entity errors based on the new dynamic logic
  const messagesThatShouldBeEntityErrors = [
    // Original handleEntityError cases, now dynamically identified
    'Argument Validation Error - projectId must be a UUID.',
    'Argument Validation Error - each value in teamIds must be a UUID.',
    'Entity not found: Project - Could not find referenced Project.',
    'Entity not found: Team - Could not find referenced Team.',
    'Entity not found: Team: teamIds contained an entry that could not be found.',
    'Argument Validation Error - each value in labelIds must be a UUID.',
    'Argument Validation Error - stateId is invalid.',
    'Entity not found: assigneeId.',
    'Argument Validation Error - projectMilestoneId is required.',
    // New cases covering 'labelId' and 'projectMilestone'
    'Argument Validation Error - labelId must be a UUID.',
    'Entity not found: labelId - Could not find referenced label.',
    'Argument Validation Error - projectMilestone must be a UUID.',
    'Entity not found: projectMilestone - Could not find referenced milestone.',
    // Test cases with additional text and different separators
    'Argument Validation Error - projectId must be a UUID. Additional info here.',
    'Argument Validation Error - each value in teamIds must be a UUID (details).',
    'Entity not found: Project - Could not find referenced Project. Check ID.',
    'Entity not found: Team - Could not find referenced Team. User ID: 123.',
    'Entity not found: Team: teamIds contained an entry that could not be found. Error code 404.',
    'Argument Validation Error - each value in labelIds must be a UUID - invalid format.',
    'Argument Validation Error: stateId is invalid format.',
    'Entity not found: assigneeId not found in workspace.',
    'Argument Validation Error: projectMilestoneId is required field.',
    'Argument Validation Error: labelId is invalid type.',
    'Entity not found: labelId - Label not found.',
    'Argument Validation Error: projectMilestone must be a valid UUID.',
    'Entity not found: projectMilestone - Milestone not found.',
    // Cases with different spacing/punctuation
    'Argument Validation Error:projectId must be a UUID.',
    'Entity not found:Project - Could not find referenced Project.',
    'Entity not found:Team:teamIds contained an entry that could not be found.',
  ];

  // Messages that should NOT be identified as entity errors
  const messagesThatShouldNotBeEntityErrors = [
    'Some other random error message.', // No core keyword
    'User permission error.', // No core keyword
    'Network connection timeout.', // No core keyword
    'Argument Validation Error - name must be a string.', // Core keyword, but irrelevant field
    'Entity not found: User - Could not find user.', // Core keyword, but irrelevant entity
    'Argument Validation Error - invalid input.', // Core keyword, but no extractable relevant name
    'Entity not found: SomeOtherEntity.', // Core keyword, but irrelevant entity
    // Cases with core keyword but no relevant entity/field after it
    'Argument Validation Error - invalid format provided.',
    'Entity not found: The requested resource was not found.',
    'Argument Validation Error: Input data is malformed.',
    'Entity not found: Resource does not exist.',
  ];

  for (const message of messagesThatShouldBeEntityErrors) {
    it(`should return true for message containing core keyword and relevant entity/field: "${message}"`, () => {
      expect(isEntityError(message)).toBe(true);
    });
  }

  for (const message of messagesThatShouldNotBeEntityErrors) {
    it(`should return false for message not matching entity error criteria: "${message}"`, () => {
      expect(isEntityError(message)).toBe(false);
    });
  }

  it('should return false for an empty string', () => {
    expect(isEntityError('')).toBe(false);
  });
});