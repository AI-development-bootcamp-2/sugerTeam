import { PrismaClient, DayType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!',
    12
  );

  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      fullName: 'מנהל מערכת',
      email: 'admin@company.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✓ Admin user seeded: admin@company.com');
}

async function seedCalendarYear(year: number): Promise<void> {
  const records: {
    date: Date;
    dayType: DayType;
    isWorkingDay: boolean;
    standardHours: number;
  }[] = [];

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));

  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    const isWeekend = day === 5 || day === 6;
    records.push({
      date: new Date(d),
      dayType: isWeekend ? DayType.WEEKEND : DayType.REGULAR,
      isWorkingDay: !isWeekend,
      standardHours: isWeekend ? 0 : 9,
    });
  }

  for (const record of records) {
    await prisma.workCalendarDay.upsert({
      where: { date: record.date },
      update: {},
      create: record,
    });
  }

  console.log(`✓ Seeded ${records.length} calendar days for ${year}`);
}

async function seedMonthLocks(year: number): Promise<void> {
  for (let month = 1; month <= 12; month += 1) {
    await prisma.monthLock.upsert({
      where: { year_month: { year, month } },
      update: {},
      create: { year, month, isLocked: false },
    });
  }
  console.log(`✓ Seeded 12 unlocked month locks for ${year}`);
}

async function main(): Promise<void> {
  await seedAdmin();
  for (const year of [2025, 2026, 2027]) {
    await seedCalendarYear(year);
    await seedMonthLocks(year);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
