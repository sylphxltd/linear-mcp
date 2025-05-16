import { describe, it, expect, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { getTeamTool } from './teams.js';
import { getLinearClient } from '../utils/linear-client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Mock the linear client
vi.mock('../utils/linear-client', () => ({
  getLinearClient: vi.fn(),
}));

describe('getTeamTool', () => {
  it('should throw MethodNotFound error with available teams when team is not found', async () => {
    interface MockLinearClient {
      team: (query: string) => Promise<unknown | undefined>;
      teams: (options?: unknown) => Promise<{ nodes: unknown[] }>;
    }

    const mockLinearClient: MockLinearClient = {
      team: vi.fn().mockResolvedValue(undefined), // Simulate team not found by ID
      teams: vi.fn().mockResolvedValue({
        nodes: [
          { id: 'team1-id', name: 'Team Alpha', key: 'ALPHA' },
          { id: 'team2-id', name: 'Team Beta', key: 'BETA' },
        ],
      }),
    };

    const mockedGetLinearClient = getLinearClient as MockedFunction<typeof getLinearClient>;
    mockedGetLinearClient.mockReturnValue(mockLinearClient as unknown as ReturnType<typeof getLinearClient>);

    const invalidQuery = 'invalid-team-id-or-name';

    const mockHandlerExtra = {
      signal: new AbortController().signal,
      requestId: 'test-request-id',
      sendNotification: vi.fn(),
      sendRequest: vi.fn(),
    };

    try {
      await getTeamTool.handler({ query: invalidQuery }, mockHandlerExtra);
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      expect((error as McpError).message).toBe(
        `Team with ID or name "${invalidQuery}" not found. Available teams: Team Alpha (ALPHA), Team Beta (BETA)`,
      );
      expect((error as McpError).code).toBe(ErrorCode.MethodNotFound);
    }
  });
});