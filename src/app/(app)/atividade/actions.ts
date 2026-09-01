"use server"

import { withTenantContext } from "@/lib/db"
import { logRepository } from "@/repositories/log-repository"
import { getSessionClaims } from "@/services/auth/session"
import type { LogAtividade } from "@/types/domain"

export type LogFiltersInput = {
  from?: string
  to?: string
  term?: string
}

export async function listAtividadeAction(
  filters: LogFiltersInput
): Promise<LogAtividade[]> {
  const claims = await getSessionClaims()

  if (!claims || claims.app_role !== "desenvolvedor") {
    return []
  }

  const parsedFilters = {
    from: filters.from ? new Date(`${filters.from}T00:00:00`) : undefined,
    to: filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined,
    term: filters.term,
  }

  return withTenantContext(claims, (tx) => logRepository.list(tx, parsedFilters))
}
