import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Create Prisma client instance
export const prisma = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'], // Disabled 'query' for cleaner logs
});

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
