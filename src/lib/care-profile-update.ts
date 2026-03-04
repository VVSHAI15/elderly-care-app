import prisma from "@/lib/db";

/**
 * Updates JSON care profile fields on a Patient record using raw SQL.
 * This bypasses Prisma's runtime field validation, which rejects the
 * JSON care-profile columns if the Prisma client module is cached
 * before those columns were added via migration.
 */
export async function updatePatientCareProfile(
  patientId: string,
  careData: Record<string, unknown>
): Promise<void> {
  const entries = Object.entries(careData).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return;

  const isPostgres = /^(postgresql|postgres):/i.test(process.env.DATABASE_URL ?? "");

  if (isPostgres) {
    // PostgreSQL: named positional placeholders ($1, $2, ...)
    const setClauses = entries.map(([key], i) => `"${key}" = $${i + 1}`).join(", ");
    const whereClause = `"id" = $${entries.length + 1}`;
    const values: unknown[] = [...entries.map(([, v]) => JSON.stringify(v)), patientId];
    await prisma.$executeRawUnsafe(
      `UPDATE "Patient" SET ${setClauses} WHERE ${whereClause}`,
      ...values
    );
  } else {
    // SQLite: ? placeholders, JSON stored as TEXT
    const setClauses = entries.map(([key]) => `"${key}" = ?`).join(", ");
    const values: unknown[] = [...entries.map(([, v]) => JSON.stringify(v)), patientId];
    await prisma.$executeRawUnsafe(
      `UPDATE "Patient" SET ${setClauses} WHERE "id" = ?`,
      ...values
    );
  }
}
