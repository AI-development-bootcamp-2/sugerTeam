import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaShutdownRegistered: boolean | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

export const prisma: PrismaClient =
  globalThis.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'error', 'warn'],
  });

if (!isProduction) {
  globalThis.prisma = prisma;
}

if (!globalThis.prismaShutdownRegistered) {
  const shutdown = async (): Promise<void> => {
    await prisma.$disconnect();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  globalThis.prismaShutdownRegistered = true;
}
