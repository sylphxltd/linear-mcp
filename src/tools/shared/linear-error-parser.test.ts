import { describe, it, expect } from 'vitest';
import { parseLinearError } from './linear-error-parser.js';

describe('parseLinearError', () => {
  it('should return EntityNotFoundErrorDetails for a known entity not found error pattern', () => {
    const mockLinearError = {
      message: 'GraphQL Error (Code: 422): {"data":null,"errors":[{"message":"Project with id \\"test-project-id\\" was not found","path":["projectUpdate"],"locations":[{"line":2,"column":3}],"extensions":{"code":"INVALID_INPUT","userPresentableMessage":"Project with id \\"test-project-id\\" was not found","serviceName":"api","type":"RecordNotFound"}}]}',
      errors: [
        {
          message: 'Project with id "test-project-id" was not found',
          extensions: {
            code: 'INVALID_INPUT',
            userPresentableMessage: 'Project with id "test-project-id" was not found',
            serviceName: 'api',
            type: 'RecordNotFound',
            // Hypothetical structure, actual Linear errors might differ
            // We need to inspect actual errors to refine this.
            // For now, we assume some way to get fieldName.
            // Let's assume the error message or path implies the field.
            // For "projectUpdate" and "Project with id", fieldName might be "projectId"
          },
          path: ['projectUpdate'], // This might indicate the operation, not the field directly
        },
      ],
      // It's common for SDKs to wrap the raw error, so we might have nested structures.
      // The actual structure of the error from the Linear SDK needs to be known.
      // For now, this is a placeholder.
      // Let's assume the relevant info is in `errors[0].extensions` or `errors[0].message`.
    };

    // This test is designed to fail initially.
    // We need to determine how to extract entityName and fieldName.
    // Based on "Project with id..." -> entityName: 'Project'
    // Based on "projectUpdate" and "Project with id..." -> fieldName: 'projectId' (assumption)
    const expectedDetails = {
      type: 'EntityNotFound',
      entityName: 'Project',
      fieldName: 'projectId', // This is an assumption for now
      invalidId: 'test-project-id',
    };

    expect(parseLinearError(mockLinearError)).toEqual(expectedDetails);
  });

  it('should return null for an error that is not an entity not found error', () => {
    const mockNonEntityError = {
      message: 'GraphQL Error (Code: 500): Internal Server Error',
      errors: [
        {
          message: 'Internal Server Error',
          extensions: {
            code: 'SERVER_ERROR',
            serviceName: 'api',
          },
        },
      ],
    };
    expect(parseLinearError(mockNonEntityError)).toBeNull();
  });

  // Add more test cases:
  // - Different entity types (Team, IssueStatus, User, etc.)
  // - Different error message patterns if they vary
  // - Errors where invalidId might not be present or easily extractable
  // - Errors where fieldName is harder to determine
});