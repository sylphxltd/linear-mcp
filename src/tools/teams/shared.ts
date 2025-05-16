import { z } from 'zod';

// --- Tool definition utility (local copy) ---

// --- Team schemas (local copy) ---
export const TeamQuerySchema = {
  query: z.string().describe('The UUID or name of the team to retrieve'),
};
