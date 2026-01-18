import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Create Prisma client instance
export const prisma = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
