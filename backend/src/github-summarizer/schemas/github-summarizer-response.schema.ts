import { z } from 'zod';

export const GitHubSummarizerResponseSchema = z.object({
  summary: z.string().min(1, 'Summary must not be empty'),
  coolFacts: z.array(z.string().min(1, 'Cool fact must not be empty')).min(1, 'At least one cool fact is required'),
  filesAnalyzed: z.number().int().nonnegative(),
  repo: z.string().url(),
  readmeLength: z.number().int().nonnegative().optional(),
});

export type GitHubSummarizerResponse = z.infer<typeof GitHubSummarizerResponseSchema>;

