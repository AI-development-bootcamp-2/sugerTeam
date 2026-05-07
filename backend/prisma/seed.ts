import { PrismaClient, DayType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin1234!', 12);

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

async function seedWeekends(year: number): Promise<void> {
  const records: {
    date: Date;
    dayType: DayType;
    isWorkingDay: boolean;
    standardHours: number;
  }[] = [];

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 5 || day === 6) {
      records.push({
        date: new Date(d),
        dayType: DayType.WEEKEND,
        isWorkingDay: false,
        standardHours: 0,
      });
    }
  }

  for (const record of records) {
    await prisma.workCalendarDay.upsert({
      where: { date: record.date },
      update: {},
      create: record,
    });
  }

  console.log(`✓ Seeded ${records.length} weekend days for ${year}`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedWeekends(2026);
  await seedWeekends(2027);
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
