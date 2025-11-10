import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { collection, getDocs } from 'firebase/firestore';
import { resolveApiKeyFromHeaders } from '../src/lib/apiAuth.js';
import { getServerFirestore } from '../src/lib/serverFirebase.js';

const typeDefs = `#graphql
  type Lead { id: ID!, name: String, email: String, status: String }
  type Invoice { id: ID!, customer: String, amount: Float, status: String, createdAt: String }
  type Campaign { id: ID!, name: String, status: String, channel: String }

  type Query {
    leads: [Lead!]!
    invoices: [Invoice!]!
    campaigns: [Campaign!]!
  }
`;

const fetchCollection = async (db, path) => {
  const snapshot = await getDocs(collection(db, path));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

const resolvers = {
  Query: {
    leads: async (_, __, context) => fetchCollection(context.db, `tenants/${context.tenantId}/leads`),
    invoices: async (_, __, context) => fetchCollection(context.db, `tenants/${context.tenantId}/billing/invoices`),
    campaigns: async (_, __, context) => fetchCollection(context.db, `tenants/${context.tenantId}/marketingCampaigns`),
  },
};

export const buildGraphQLServer = async () => {
  const server = new ApolloServer({ typeDefs, resolvers });
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.GRAPHQL_PORT || 5056) },
    context: async ({ req }) => {
      const { tenantId } = await resolveApiKeyFromHeaders(req.headers);
      return { tenantId, db: getServerFirestore() };
    },
  });
  console.log(`GraphQL ready at ${url}`);
  return server;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  buildGraphQLServer();
}
