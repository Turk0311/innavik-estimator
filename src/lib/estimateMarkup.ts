import { prisma } from "@/lib/prisma";

export const DEFAULT_MARKUP = 30;

// The estimate's global markup is the most common markup among its items;
// items set to anything else are per-line overrides.
export async function getEstimateMarkup(estimateId: string): Promise<number> {
  const [top] = await prisma.estimateItem.groupBy({
    by: ["markup"],
    where: { estimateId },
    _count: { markup: true },
    orderBy: { _count: { markup: "desc" } },
    take: 1,
  });
  return top?.markup ?? DEFAULT_MARKUP;
}
