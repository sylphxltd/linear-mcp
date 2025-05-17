/// <reference types="vitest/globals" />
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as linearSdk from '../../utils/linear-client.js';
import * as entityErrorHandler from '../shared/entity-error-handler.js';
import { createIssueTool } from './create_issue.js';
// mapIssueToDetails is mocked below, no need for separate type import here

// Mock a simplified LinearClient
const mockLinearClient = {
  createIssue: vi.fn(),
  // Add other methods if needed by other tools being tested similarly
};

vi.mock('../../utils/linear-client.js', () => ({
  getLinearClient: () => mockLinearClient,
}));

// Mock only mapIssueToDetails from './shared.js'
const mockMapIssueToDetails = vi.fn();
vi.mock('./shared.js', async () => {
  const originalModule = await vi.importActual('./shared.js') as Record<string, unknown>;
  return {
    ...originalModule,
    mapIssueToDetails: mockMapIssueToDetails,
  };
});


// Mock entity-error-handler functions
const mockIsEntityError = vi.fn();
const mockGetAvailableTeamsJson = vi.fn();
const mockGetAvailableProjectsJson = vi.fn();
// Add other mocks if needed by other tests

vi.mock('../shared/entity-error-handler.js', () => ({
  isEntityError: mockIsEntityError,
  getAvailableTeamsJson: mockGetAvailableTeamsJson,
  getAvailableProjectsJson: mockGetAvailableProjectsJson,
  getAvailableStatesJson: vi.fn(),
  getAvailableAssigneesJson: vi.fn(),
  getAvailableLabelsJson: vi.fn(),
  getAvailableProjectMilestonesJson: vi.fn(),
}));

describe('createIssueTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validInput = {
    title: 'Test Issue',
    teamId: 'team-uuid',
    description: 'Test description',
  };

  const mockIssue = {
    id: 'issue-uuid',
    title: 'Test Issue',
    description: 'Test description',
    teamId: 'team-uuid',
    // ... other properties as needed by mapIssueToDetails
  };

  const mockDetailedIssue = {
    id: 'issue-uuid',
    identifier: 'TEST-1',
    title: 'Test Issue',
    // ... other mapped properties
  };

  it('should create an issue successfully', async () => {
    mockLinearClient.createIssue.mockResolvedValue({
      success: true,
      issue: Promise.resolve(mockIssue as any),
      lastSyncId: 'sync-id-1',
    });
    mockMapIssueToDetails.mockResolvedValue(mockDetailedIssue);

    const result = await createIssueTool.handler(validInput, {} as any);
    expect(mockLinearClient.createIssue).toHaveBeenCalledWith(validInput);
    expect(mockMapIssueToDetails).toHaveBeenCalledWith(mockIssue as any, false);
    expect(result.content[0].text).toBe(JSON.stringify(mockDetailedIssue));
  });

  it('should throw Error if issue creation fails without returning an issue', async () => {
    mockLinearClient.createIssue.mockResolvedValue({
      success: true,
      issue: Promise.resolve(null as any), // Simulate issue not being returned
      lastSyncId: 'sync-id-2',
    });

    await expect(createIssueTool.handler(validInput, {} as any)).rejects.toThrow(
      new Error('Failed to create issue or retrieve details. Sync ID: sync-id-2'),
    );
  });

  it('should throw new Error with available teams if isEntityError is true for teamId', async () => {
    const errorMessage = 'Entity not found: Team - Could not find referenced Team.';
    mockLinearClient.createIssue.mockRejectedValue(new Error(errorMessage));
    mockIsEntityError.mockReturnValue(true);
    mockGetAvailableTeamsJson.mockResolvedValue(
      JSON.stringify([{ id: 'team1', name: 'Team 1' }]),
    );

    await expect(createIssueTool.handler(validInput, {} as any)).rejects.toThrow(
      new Error(`${errorMessage}\nAvailable: ${JSON.stringify([{ id: 'team1', name: 'Team 1' }])}`),
    );
    expect(mockIsEntityError).toHaveBeenCalledWith(errorMessage);
    expect(mockGetAvailableTeamsJson).toHaveBeenCalledWith(mockLinearClient);
  });

  it('should throw new Error with available projects if isEntityError is true for projectId', async () => {
    const inputWithProject = { ...validInput, projectId: 'project-uuid' };
    const errorMessage = 'Entity not found: Project - Could not find referenced Project.';
    mockLinearClient.createIssue.mockRejectedValue(new Error(errorMessage));
    mockIsEntityError.mockReturnValue(true);
    mockGetAvailableProjectsJson.mockResolvedValue(
      JSON.stringify([{ id: 'proj1', name: 'Project 1' }]),
    );

    await expect(createIssueTool.handler(inputWithProject, {} as any)).rejects.toThrow(
      new Error(`${errorMessage}\nAvailable: ${JSON.stringify([{ id: 'proj1', name: 'Project 1' }])}`),
    );
    expect(mockIsEntityError).toHaveBeenCalledWith(errorMessage);
    expect(mockGetAvailableProjectsJson).toHaveBeenCalledWith(mockLinearClient);
  });


  it('should re-throw McpError if caught', async () => {
    const mcpErrorMessage = 'MCP specific error';
    const mcpError = new McpError(ErrorCode.InvalidParams, mcpErrorMessage);
    mockLinearClient.createIssue.mockRejectedValue(mcpError);
    mockIsEntityError.mockReturnValue(false); // Ensure it doesn't go into the new path

    await expect(createIssueTool.handler(validInput, {} as any)).rejects.toThrow(mcpError);
  });

  it('should throw McpError for generic SDK errors when isEntityError is false', async () => {
    const genericErrorMessage = 'Some generic SDK error';
    mockLinearClient.createIssue.mockRejectedValue(new Error(genericErrorMessage));
    mockIsEntityError.mockReturnValue(false);

    try {
      await createIssueTool.handler(validInput, {} as any);
    } catch (e: any) {
      expect(e).toBeInstanceOf(McpError);
      expect(e.errorCode).toBe(ErrorCode.InternalError);
      expect(e.message).toBe(`Failed to create issue: ${genericErrorMessage}`);
    }
    expect(mockIsEntityError).toHaveBeenCalledWith(genericErrorMessage);
  });
});