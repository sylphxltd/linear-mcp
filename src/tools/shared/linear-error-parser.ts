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
  if (!error?.errors || !Array.isArray(error.errors) || error.errors.length === 0) {
    return null;
  }

  const firstError = error.errors[0];
  if (
    !firstError?.extensions ||
    firstError.extensions.type !== 'RecordNotFound' ||
    typeof firstError.extensions.userPresentableMessage !== 'string'
  ) {
    return null;
  }

  const message = firstError.extensions.userPresentableMessage;

  // Pattern 1: "{EntityName} with id "{invalidId}" was not found"
  // Examples:
  // "Project with id \"some-id\" was not found"
  // "Team with id \"another-id\" was not found"
  // "User with id \"user-id\" was not found"
  // "IssueLabel with id \"label-id\" was not found"
  // "WorkflowState with id \"state-id\" was not found"
  // "ProjectMilestone with id \"milestone-id\" was not found"
  let match = message.match(/^(\w+) with id "([^"]+)" was not found$/);
  if (match?.[1] && match?.[2]) {
    const entityName = match[1];
    const invalidId = match[2];
    const fieldName = `${entityName.charAt(0).toLowerCase()}${entityName.slice(1)}Id`;
    return {
      type: 'EntityNotFound',
      entityName,
      fieldName,
      invalidId,
    };
  }

  // Pattern 2: "Entity not found: {EntityName} - Could not find referenced {EntityName}."
  // Examples:
  // "Entity not found: Project - Could not find referenced Project."
  // "Entity not found: Team - Could not find referenced Team."
  match = message.match(/^Entity not found: (\w+) - Could not find referenced \1\.$/);
  if (match?.[1]) {
    const entityName = match[1];
    // Infer fieldName, e.g., "Project" -> "projectId"
    const fieldName = `${entityName.charAt(0).toLowerCase()}${entityName.slice(1)}Id`;
    return {
      type: 'EntityNotFound',
      entityName,
      fieldName,
      invalidId: undefined, // No specific ID in this message type
    };
  }

  // Pattern 3: "Entity not found: {EntityName}: {fieldName} contained an entry that could not be found."
  // Examples:
  // "Entity not found: Team: teamIds contained an entry that could not be found."
  // "Entity not found: IssueLabel: labelIds contained an entry that could not be found."
  match = message.match(/^Entity not found: (\w+): (\w+) contained an entry that could not be found\.$/);
  if (match?.[1] && match?.[2]) {
    const entityName = match[1];
    const fieldName = match[2];
    return {
      type: 'EntityNotFound',
      entityName,
      fieldName,
      invalidId: undefined, // No specific ID in this message type for a single invalid entry
    };
  }

  return null;
}