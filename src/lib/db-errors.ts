/**
 * Erros de query do postgres.js chegam envoltos em DrizzleQueryError, com o
 * PostgresError original em `.cause` (nao no proprio objeto). Este helper
 * verifica os dois lugares para nao perder o SQLSTATE (ex: 23505 = unique
 * violation, 23503 = foreign key violation).
 */
export function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code
  }

  if ("cause" in error) {
    return getPgErrorCode((error as { cause?: unknown }).cause)
  }

  return undefined
}

export function isUniqueViolation(error: unknown): boolean {
  return getPgErrorCode(error) === "23505"
}

export function isForeignKeyViolation(error: unknown): boolean {
  return getPgErrorCode(error) === "23503"
}
