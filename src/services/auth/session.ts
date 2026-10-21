import "server-only"

import { cache } from "react"

import {
  isUuid,
  withTenantContext,
  type AuthIdentity,
  type TenantClaims,
  type Transaction,
} from "@/lib/db"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { usuarioRepository } from "@/repositories/usuario-repository"
import type { Tema } from "@/types/domain"

/**
 * Identidade (sub) do JWT do Supabase Auth, verificada LOCALMENTE com
 * getClaims(): a assinatura do access token e conferida com a chave publica
 * do projeto (JWKS em /auth/v1/.well-known/jwks.json, guardado em memoria
 * por 10 min pelo auth-js), sem ida ao servidor do GoTrue a cada pagina.
 * Se o projeto ainda assinasse com chave simetrica (HS256), o proprio
 * getClaims() cairia em getUser() (ida ao GoTrue), sem quebrar nada.
 *
 * Trade-off aceito (antes era getUser(), que consulta o GoTrue sempre):
 *  - logout em outro dispositivo, sessao revogada ou usuario banido no
 *    GoTrue so perdem efeito quando o access token expira (1h no Supabase),
 *    EXCETO nas areas exclusivas do desenvolvedor, que usam
 *    getSessionClaimsEstrita() (confirma no GoTrue a cada requisicao);
 *  - troca de perfil/condominio e exclusao do usuario em "usuarios" valem NA
 *    HORA: getSessionContext le "usuarios" ao vivo a cada requisicao (abaixo)
 *    e a RLS tambem (current_condominio_id()/current_usuario_role()).
 *    Usuario sem linha em "usuarios" = sem sessao no app.
 *
 * React.cache: uma verificacao por requisicao, mesmo que layout, pagina e
 * acoes chamem varias vezes.
 */
const getAuthIdentity = cache(async (): Promise<AuthIdentity | null> => {
  const supabase = await createSupabaseServerClient()

  // getClaims() pode LANCAR excecao (em vez de devolver { error }) com um JWT
  // malformado ou forjado (ex.: alg "none", ou RS256 com o kid de uma chave
  // real do projeto e assinatura invalida). Sem o try/catch isso virava erro
  // 500; aqui qualquer falha significa "sem sessao". O token nunca e logado.
  let resultado: Awaited<ReturnType<typeof supabase.auth.getClaims>>
  try {
    resultado = await supabase.auth.getClaims()
  } catch {
    return null
  }

  const { data, error } = resultado
  const sub = data?.claims?.sub
  if (error || !isUuid(sub)) {
    return null
  }

  return { sub, role: "authenticated" }
})

/**
 * Confere a sessao NO SERVIDOR DO GOTRUE com getUser() (ida a rede), ao
 * contrario de getClaims(), que so valida a assinatura do JWT localmente.
 * Pega na hora sessao revogada (logout em outro dispositivo, "sair de todos")
 * e usuario banido/excluido no Supabase Auth, que com getClaims() so perderiam
 * efeito quando o access token expirasse (ate 1h). Qualquer falha (erro,
 * excecao, usuario diferente do sub do JWT) = nao autenticado.
 */
const confirmarNoGoTrue = cache(async (sub: string): Promise<boolean> => {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    return !error && data.user?.id === sub
  } catch {
    return false
  }
})

export type SessionCondominio = {
  id: string
  nome: string
  tema: Tema
}

export type SessionContext = {
  claims: TenantClaims
  condominio: SessionCondominio
}

type SessaoRow = NonNullable<Awaited<ReturnType<typeof usuarioRepository.findSessao>>>

function toSessionContext(sub: string, row: SessaoRow): SessionContext {
  return {
    claims: {
      sub,
      role: "authenticated",
      app_role: row.role,
      condominio_id: row.condominioId,
      nome: row.nome,
    },
    condominio: {
      id: row.condominioId,
      nome: row.condominioNome,
      tema: row.condominioTema,
    },
  }
}

/**
 * Sessao completa: identidade do JWT + perfil em "usuarios" (lido ao vivo)
 * + nome/tema do condominio, numa unica consulta. Uma vez por requisicao.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const identity = await getAuthIdentity()
  if (!identity) {
    return null
  }

  const row = await withTenantContext(identity, (tx) => usuarioRepository.findSessao(tx))
  return row ? toSessionContext(identity.sub, row) : null
})

/**
 * Claims da sessao para checagens de UI/permissao no app (o banco continua
 * aplicando a RLS por conta propria). null = sem sessao valida.
 */
export const getSessionClaims = cache(async (): Promise<TenantClaims | null> => {
  const session = await getSessionContext()
  return session?.claims ?? null
})

/**
 * Versao ESTRITA de getSessionClaims(), para as telas e acoes exclusivas do
 * perfil "desenvolvedor" (usuarios, configuracoes, atividade): alem do JWT
 * verificado localmente e do perfil lido ao vivo em "usuarios", exige que o
 * GoTrue confirme a sessao (getUser()). Sao as areas de maior impacto (criar
 * e excluir usuarios, alterar o condominio, ler o log de auditoria), entao
 * vale a ida extra ao Supabase Auth para que uma sessao revogada ou um
 * usuario banido percam o acesso imediatamente, sem esperar o access token
 * expirar. O resto do app segue com getSessionClaims() (so getClaims()).
 *
 * null = sem sessao valida (o chamador redireciona/nega).
 */
export const getSessionClaimsEstrita = cache(async (): Promise<TenantClaims | null> => {
  const claims = await getSessionClaims()
  if (!claims) {
    return null
  }

  const confirmada = await confirmarNoGoTrue(claims.sub)
  return confirmada ? claims : null
})

/**
 * Sessao + dados da pagina/acao numa UNICA transacao: a consulta do perfil e
 * as consultas de `carregar` seguem juntas para o banco (em vez de uma
 * transacao so para a sessao e outra para os dados). Use quando os dados nao
 * dependem do perfil para serem buscados (a RLS ja restringe ao condominio);
 * telas restritas por perfil devem checar getSessionClaims() ANTES de buscar.
 *
 * Devolve null se nao houver sessao valida (o chamador redireciona/nega).
 */
export async function withSession<T>(
  carregar: (tx: Transaction) => Promise<T>
): Promise<(SessionContext & { dados: T; geradoEm: number }) | null> {
  const identity = await getAuthIdentity()
  if (!identity) {
    return null
  }

  // Instante da leitura, usado pelo cliente para saber se o payload do
  // servidor e mais novo que o cache do TanStack (ver useDadosDoServidor).
  const geradoEm = Date.now()
  const { row, dados } = await withTenantContext(identity, async (tx) => {
    const [row, dados] = await Promise.all([usuarioRepository.findSessao(tx), carregar(tx)])
    return { row, dados }
  })

  if (!row) {
    return null
  }

  return { ...toSessionContext(identity.sub, row), dados, geradoEm }
}
