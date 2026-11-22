-- AlterTable
ALTER TABLE "EstimateItem" ADD COLUMN "fromAssembly" BOOLEAN NOT NULL DEFAULT false;

-- Existing lines can't be told apart, so keep today's behaviour for them: re-apply replaces them.
-- Custom lines (typed in by hand) were never built by a scope and stay.
UPDATE "EstimateItem" SET "fromAssembly" = true WHERE "productId" <> 'custom';
