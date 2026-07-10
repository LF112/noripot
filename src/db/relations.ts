import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  scripts: {
    gateways: r.many.gateway(),
  },

  gateway: {
    script: r.one.scripts({
      from: r.gateway.pathname,
      to: r.scripts.pathname,
    }),
  },
}));
