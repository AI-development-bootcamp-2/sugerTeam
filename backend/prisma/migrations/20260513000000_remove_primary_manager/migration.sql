-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_primaryManagerId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "primaryManagerId";
