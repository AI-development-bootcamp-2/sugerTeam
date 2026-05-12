-- AlterTable
ALTER TABLE "Client" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "description" TEXT;
ALTER TABLE "Project" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "primaryManagerId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "description" TEXT;
ALTER TABLE "Task" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "endDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_primaryManagerId_fkey" FOREIGN KEY ("primaryManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
