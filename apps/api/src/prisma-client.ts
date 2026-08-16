import { PrismaPg } from '@prisma/adapter-pg';
import { type Prisma, PrismaClient } from './generated/prisma/client.js';

export type PrismaDatabase = PrismaClient;
export type PrismaTransaction = Prisma.TransactionClient;

export type PrismaRoleContext =
  | { readonly role: 'anon' }
  | { readonly role: 'authenticated'; readonly userId: string };

export const createPrismaClient = (connectionString: string): PrismaDatabase => {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

const setRequestContext = async (
  transaction: PrismaTransaction,
  context: PrismaRoleContext,
): Promise<void> => {
  const userId = context.role === 'authenticated' ? context.userId : '';
  // postgres rls reads these the same way supabase jwt claims do. skip them and policies see no user.
  await transaction.$executeRaw`select set_config('request.jwt.claim.sub', ${userId}, true)`;
  await transaction.$executeRaw`select set_config('request.jwt.claim.role', ${context.role}, true)`;
  await transaction.$executeRawUnsafe(`set local role ${context.role}`);
};

export const withPrismaContext = async <T>(
  database: PrismaDatabase,
  context: PrismaRoleContext,
  callback: (transaction: PrismaTransaction) => Promise<T>,
): Promise<T> =>
  database.$transaction(async (transaction) => {
    // local to this txn so the next request cannot inherit another user's role.
    await setRequestContext(transaction, context);
    return callback(transaction);
  });

export const withAnonymousPrismaContext = <T>(
  database: PrismaDatabase,
  callback: (transaction: PrismaTransaction) => Promise<T>,
): Promise<T> => withPrismaContext(database, { role: 'anon' }, callback);

// owner path. never pass the service role here or rls becomes a no-op.
export const withUserPrismaContext = <T>(
  database: PrismaDatabase,
  userId: string,
  callback: (transaction: PrismaTransaction) => Promise<T>,
): Promise<T> => withPrismaContext(database, { role: 'authenticated', userId }, callback);
