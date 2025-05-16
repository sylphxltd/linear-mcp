import { z } from 'zod';

// --- Tool definition utility (local copy) ---


// --- User schemas (local copy) ---
export const UserQuerySchema = {
  query: z.string().describe('The UUID or name of the user to retrieve'),
};
