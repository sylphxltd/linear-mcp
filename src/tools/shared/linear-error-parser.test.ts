import { describe, it, expect } from 'vitest';
import { parseLinearError } from './linear-error-parser.js';

describe('parseLinearError', () => {
  const createMockLinearError = (userPresentableMessage: string, type = 'RecordNotFound', path = ['someMutation']) => ({
    message: `GraphQL Error (Code: 422): {"data":null,"errors":[{"message":"${userPresentableMessage.replace(/"/g, '\\"')}", "path":["${path.join('","')}"],"locations":[{"line":2,"column":3}],"extensions":{"code":"INVALID_INPUT","userPresentableMessage":"${userPresentableMessage.replace(/"/g, '\\"')}","serviceName":"api","type":"${type}"}}]}`,
    errors: [
      {
        message: userPresentableMessage,
        extensions: {
          code: 'INVALID_INPUT',
          userPresentableMessage,
          serviceName: 'api',
          type,
        },
        path,
      },
    ],
  });

  describe('Pattern 1: "{EntityName} with id \\"{invalidId}\\" was not found"', () => {
    it('should parse Project not found error', () => {
      const error = createMockLinearError('Project with id "test-project-id" was not found');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'Project',
        fieldName: 'projectId',
        invalidId: 'test-project-id',
      });
    });

    it('should parse Team not found error', () => {
      const error = createMockLinearError('Team with id "team-123" was not found');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'Team',
        fieldName: 'teamId',
        invalidId: 'team-123',
      });
    });

    it('should parse User not found error', () => {
      const error = createMockLinearError('User with id "user-abc" was not found');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'User',
        fieldName: 'userId',
        invalidId: 'user-abc',
      });
    });

    it('should parse IssueLabel not found error', () => {
      const error = createMockLinearError('IssueLabel with id "label-def" was not found');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'IssueLabel',
        fieldName: 'issueLabelId',
        invalidId: 'label-def',
      });
    });

    it('should parse WorkflowState not found error', () => {
      const error = createMockLinearError('WorkflowState with id "state-ghi" was not found');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'WorkflowState',
        fieldName: 'workflowStateId',
        invalidId: 'state-ghi',
      });
    });

    it('should parse ProjectMilestone not found error', () => {
      const error = createMockLinearError('ProjectMilestone with id "milestone-jkl" was not found');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'ProjectMilestone',
        fieldName: 'projectMilestoneId',
        invalidId: 'milestone-jkl',
      });
    });
  });

  describe('Pattern 2: "Entity not found: {EntityName} - Could not find referenced {EntityName}."', () => {
    it('should parse generic Project not found error', () => {
      const error = createMockLinearError('Entity not found: Project - Could not find referenced Project.');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'Project',
        fieldName: 'projectId', // Inferred
        invalidId: undefined,
      });
    });

    it('should parse generic Team not found error', () => {
      const error = createMockLinearError('Entity not found: Team - Could not find referenced Team.');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'Team',
        fieldName: 'teamId', // Inferred
        invalidId: undefined,
      });
    });
     it('should parse generic User not found error', () => {
      const error = createMockLinearError('Entity not found: User - Could not find referenced User.');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'User',
        fieldName: 'userId', // Inferred
        invalidId: undefined,
      });
    });
  });

  describe('Pattern 3: "Entity not found: {EntityName}: {fieldName} contained an entry that could not be found."', () => {
    it('should parse Team list field error', () => {
      const error = createMockLinearError('Entity not found: Team: teamIds contained an entry that could not be found.');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'Team',
        fieldName: 'teamIds',
        invalidId: undefined,
      });
    });

    it('should parse IssueLabel list field error', () => {
      const error = createMockLinearError('Entity not found: IssueLabel: labelIds contained an entry that could not be found.');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'IssueLabel',
        fieldName: 'labelIds',
        invalidId: undefined,
      });
    });
     it('should parse Project list field error (hypothetical)', () => {
      const error = createMockLinearError('Entity not found: Project: projectIds contained an entry that could not be found.');
      expect(parseLinearError(error)).toEqual({
        type: 'EntityNotFound',
        entityName: 'Project',
        fieldName: 'projectIds',
        invalidId: undefined,
      });
    });
  });


  it('should return null for an error that is not an entity not found error (e.g. wrong type)', () => {
    const mockNonEntityError = createMockLinearError('Some other error', 'SOME_OTHER_TYPE');
    expect(parseLinearError(mockNonEntityError)).toBeNull();
  });

  it('should return null for an error that is RecordNotFound but does not match known patterns', () => {
    const mockNonEntityError = createMockLinearError('Unparseable record not found error message');
    expect(parseLinearError(mockNonEntityError)).toBeNull();
  });
  
  it('should return null if error.errors is not an array or is empty', () => {
    expect(parseLinearError({ message: 'Some error' })).toBeNull();
    expect(parseLinearError({ message: 'Some error', errors: [] })).toBeNull();
    expect(parseLinearError({ message: 'Some error', errors: {} })).toBeNull();
  });

  it('should return null if firstError or extensions are missing', () => {
    const malformedError1 = { errors: [{ message: 'Missing extensions' }] };
    expect(parseLinearError(malformedError1)).toBeNull();
    const malformedError2 = { errors: [{ extensions: { userPresentableMessage: null, type: 'RecordNotFound' } }] };
     expect(parseLinearError(malformedError2)).toBeNull();
  });
});