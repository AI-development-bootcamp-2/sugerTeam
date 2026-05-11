-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "description" TEXT,
ADD COLUMN     "endDate" DATE,
ADD COLUMN     "primaryManagerId" TEXT,
ADD COLUMN     "startDate" DATE;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "description" TEXT,
ADD COLUMN     "endDate" DATE,
ADD COLUMN     "startDate" DATE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_primaryManagerId_fkey" FOREIGN KEY ("primaryManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
