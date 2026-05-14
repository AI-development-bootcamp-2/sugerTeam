import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

async function wipeDatabase(): Promise<void> {
  console.log('Wiping database...');
  await prisma.activeTimer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.absenceDocument.deleteMany();
  await prisma.absenceReport.deleteMany();
  await prisma.timeReportEntry.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.monthLock.deleteMany();
  await prisma.workCalendarDay.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Database wiped');
}

const run = (file: string) => {
  console.log(`\n--- Running ${path.basename(file)} ---`);
  execSync(`ts-node ${file}`, { stdio: 'inherit' });
};

wipeDatabase()
  .then(async () => {
    await prisma.$disconnect();
    run(path.join(__dirname, 'seed.ts'));
    run(path.join(__dirname, 'seedQA.ts'));
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
