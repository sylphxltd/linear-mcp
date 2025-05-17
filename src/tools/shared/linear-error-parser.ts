/**
 * Represents the details of an 'Entity Not Found' error.
 */
export interface EntityNotFoundErrorDetails {
  type: 'EntityNotFound';
  entityName: string; // e.g., 'Project', 'Team', 'IssueStatus'
  fieldName: string; // The input field name that caused the error, e.g., 'projectId', 'teamId'
  invalidId?: string; // The specific ID that was not found (if available in the error)
}

/**
 * Parses a Linear API error to identify if it's an 'Entity Not Found' error.
 * @param error The error object caught from a Linear API call.
 * @returns Details of the 'Entity Not Found' error if identified, otherwise null.
 */
export function parseLinearError(error: any): EntityNotFoundErrorDetails | null {
  if (error?.errors?.length > 0 && Array.isArray(error.errors)) {
    const firstError = error.errors[0];
    if (firstError?.extensions?.type === 'RecordNotFound') {
      const message = firstError.extensions.userPresentableMessage || firstError.message;
      if (typeof message === 'string') {
        // Try to match patterns like:
        // "Project with id \"some-id\" was not found"
        // "Team with id \"another-id\" was not found"
        // "User with id \"user-id\" was not found"
        // "IssueStatus with id \"status-id\" was not found" (assuming IssueStatus might be 'IssueStatus')
        const match = message.match(/^(\w+) with id "([^"]+)" was not found/);
        if (match?.[1] && match?.[2]) {
          const entityName = match[1];
          const invalidId = match[2];
          // Infer fieldName, e.g., "Project" -> "projectId"
          // This is a common pattern but might need refinement for specific cases.
          const fieldName = `${entityName.charAt(0).toLowerCase()}${entityName.slice(1)}Id`;

          return {
            type: 'EntityNotFound',
            entityName,
            fieldName,
            invalidId,
          };
        }
      }
    }
  }
  return null;
}