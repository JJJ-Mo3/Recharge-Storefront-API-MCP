import { z } from 'zod';

const baseSchema = z.object({
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const purgeSessionCacheSchema = z.object({
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  all: z.boolean().default(true).describe('Clear all cached sessions (default: true)'),
  older_than_minutes: z.number().min(1).max(1440).optional().describe('Clear sessions older than X minutes (1-1440 minutes, i.e., 1 minute to 24 hours)'),
  reason: z.string().default('manual purge').describe('Reason for purging (for logging purposes)'),
});

export const utilityTools = [
  {
    name: 'purge_session_cache',
    description: 'Clear cached customer session tokens. Useful when switching between dev/test/production environments or when experiencing authentication issues.',
    inputSchema: purgeSessionCacheSchema,
    execute: async (client, args) => {
      const { all, older_than_minutes, reason } = args;
      
      const result = client.purgeSessionCache({
        all,
        olderThanMinutes: older_than_minutes,
        reason
      });
      
      let message = `Session Cache Purged:\n`;
      message += `- Sessions cleared: ${result.cleared}\n`;
      message += `- Reason: ${result.reason}\n`;
      
      if (result.emailMappings !== undefined) {
        message += `- Email mappings cleared: ${result.emailMappings}\n`;
      }
      
      message += `\nThis clears cached customer session tokens. New session tokens will be automatically created when needed.`;
      
      if (all) {
        message += `\n\nNote: All cached sessions have been cleared. This is recommended when switching between environments (dev/test/production) to prevent cross-environment token usage.`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    },
  },
  {
    name: 'get_session_cache_stats',
    description: 'Get statistics about cached customer session tokens',
    inputSchema: baseSchema,
    execute: async (client, args) => {
      const stats = client.sessionCache.getStats();
      
      let message = `Session Cache Statistics:\n`;
      message += `- Total cached sessions: ${stats.totalSessions}\n`;
      message += `- Email mappings: ${stats.emailMappings}\n`;
      
      if (stats.oldestSessionAge !== null) {
        const oldestMinutes = Math.floor(stats.oldestSessionAge / 60);
        const oldestHours = Math.floor(oldestMinutes / 60);
        message += `- Oldest session age: ${oldestHours > 0 ? `${oldestHours}h ${oldestMinutes % 60}m` : `${oldestMinutes}m`}\n`;
      }
      
      if (stats.newestSessionAge !== null) {
        const newestMinutes = Math.floor(stats.newestSessionAge / 60);
        message += `- Newest session age: ${newestMinutes}m\n`;
      }
      
      message += `\nSession tokens are automatically created and cached to improve performance. They expire and are renewed as needed.`;
      
      if (stats.totalSessions > 10) {
        message += `\n\nTip: You have many cached sessions. Consider using 'purge_session_cache' with 'older_than_minutes' to clean up old sessions.`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    },
  },
];