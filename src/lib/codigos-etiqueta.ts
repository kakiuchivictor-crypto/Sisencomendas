import type { TransportadoraFixa } from "@/lib/labels"

/**
 * Regras puras (sem DOM, sem banco) para interpretar o texto lido pelo
 * leitor de código de barras/QR da etiqueta (ver
 * src/components/barcode/barcode-scanner-dialog.tsx).
 *
 * Princípio: na dúvida, NÃO sugerir transportadora. Só há sugestão para
 * formatos com estrutura e dígito verificador bem definidos (Correios S10 e
 * UPS 1Z). Formatos numéricos genéricos (Jadlog 14 dígitos, FedEx 12, DHL 10,
 * Loggi, Total Express, Shopee, Mercado Livre) são ambíguos e ficam só como
 * rastreio. O porteiro sempre confere antes de salvar.
 */

/** Mesmo limite de `codigoRastreio` em src/schemas/encomenda.ts e correspondencia.ts (max 60). */
export const CODIGO_RASTREIO_MAX = 60

export type CodigoInterpretado =
  | {
      tipo: "nfe"
      /** nNF sem zeros à esquerda. */
      nf: string
      chave: string
      /** 55 = NF-e, 65 = NFC-e. */
      modelo: "55" | "65"
    }
  | {
      tipo: "rastreio"
      rastreio: string
      transportadoraSugerida?: TransportadoraFixa
      /** Valor extraído por heurística ou truncado: pedir conferência. */
      conferir?: boolean
    }
  | {
      tipo: "desconhecido"
      /** Texto normalizado e já truncado em CODIGO_RASTREIO_MAX ("" = leitura vazia). */
      bruto: string
      truncado: boolean
    }

/**
 * Limpa o texto lido: quebras de linha/tab viram espaço, demais caracteres
 * de controle (ex.: separador GS do GS1) somem, pontas aparadas. Se o
 * resultado for só blocos alfanuméricos separados por espaço
 * ("BR 123 456 789 BR"), junta os blocos.
 */
export function normalizarTextoLido(texto: string): string {
  const limpo = texto
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()

  if (/^[A-Za-z0-9]+(?: +[A-Za-z0-9]+)*$/.test(limpo)) {
    return limpo.replace(/ +/g, "")
  }
  return limpo
}

// ---------------------------------------------------------------------------
// NF-e / NFC-e (chave de acesso de 44 dígitos)
// ---------------------------------------------------------------------------

/** Códigos IBGE das UFs (cUF, 2 primeiros dígitos da chave). */
const CODIGOS_UF = new Set([
  "11", "12", "13", "14", "15", "16", "17",
  "21", "22", "23", "24", "25", "26", "27", "28", "29",
  "31", "32", "33", "35",
  "41", "42", "43",
  "50", "51", "52", "53",
])

/** Dígito verificador da chave: módulo 11, pesos 2..9 da direita para a esquerda. */
export function digitoChaveAcesso(chave43: string): number {
  let soma = 0
  let peso = 2
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

/**
 * Layout: cUF(2) AAMM(4) CNPJ(14) mod(2) série(3) nNF(9) tpEmis(1) cNF(8) cDV(1).
 * Devolve null se não for uma chave de NF-e (55) ou NFC-e (65) válida.
 */
export function interpretarChaveAcesso(
  texto: string
): Extract<CodigoInterpretado, { tipo: "nfe" }> | null {
  if (!/^\d{44}$/.test(texto)) return null

  const cUF = texto.slice(0, 2)
  const mes = Number(texto.slice(4, 6))
  const modelo = texto.slice(20, 22)
  const nNF = texto.slice(25, 34)

  if (!CODIGOS_UF.has(cUF)) return null
  if (mes < 1 || mes > 12) return null
  if (modelo !== "55" && modelo !== "65") return null
  if (digitoChaveAcesso(texto.slice(0, 43)) !== Number(texto[43])) return null

  return { tipo: "nfe", nf: nNF.replace(/^0+/, "") || "0", chave: texto, modelo }
}

// ---------------------------------------------------------------------------
// Correios (UPU S10) e UPS (1Z)
// ---------------------------------------------------------------------------

const S10_REGEX = /^[A-Z]{2}\d{9}[A-Z]{2}$/
const S10_BR_BUSCA = /\b[A-Z]{2}\d{9}BR\b/g

/** Dígito verificador S10: pesos 8,6,4,2,3,5,9,7 sobre os 8 dígitos do número de série. */
export function digitoS10(serie8: string): number {
  const pesos = [8, 6, 4, 2, 3, 5, 9, 7]
  const soma = pesos.reduce((acc, peso, i) => acc + peso * Number(serie8[i]), 0)
  const resultado = 11 - (soma % 11)
  if (resultado === 10) return 0
  if (resultado === 11) return 5
  return resultado
}

export function s10Valido(codigo: string): boolean {
  if (!S10_REGEX.test(codigo)) return false
  return digitoS10(codigo.slice(2, 10)) === Number(codigo[10])
}

const UPS_REGEX = /^1Z[0-9A-Z]{16}$/

/**
 * Dígito verificador do "1Z" da UPS: os 15 caracteres após "1Z" (sem o
 * último) viram números (dígitos = valor; letras = (código ASCII - 63) mod 10),
 * posições pares (1-based) valem o dobro; DV = (10 - soma mod 10) mod 10.
 */
export function upsValido(codigo: string): boolean {
  if (!UPS_REGEX.test(codigo)) return false
  const corpo = codigo.slice(2, 17)
  let soma = 0
  for (const [i, ch] of [...corpo].entries()) {
    let valor = /\d/.test(ch) ? Number(ch) : (ch.charCodeAt(0) - 63) % 10
    if (i % 2 === 1) valor *= 2
    soma += valor
  }
  return (10 - (soma % 10)) % 10 === Number(codigo[17])
}

/** Classifica um código "limpo" (sem espaços). Null se não for um padrão conhecido. */
function classificarCodigoConhecido(
  codigo: string
): Extract<CodigoInterpretado, { tipo: "rastreio" | "nfe" }> | null {
  const chave = interpretarChaveAcesso(codigo)
  if (chave) return chave

  const maiusculo = codigo.toUpperCase()

  if (S10_REGEX.test(maiusculo)) {
    // S10 de outro país ou com DV inválido: aceita como rastreio, sem sugestão.
    return maiusculo.endsWith("BR") && s10Valido(maiusculo)
      ? { tipo: "rastreio", rastreio: maiusculo, transportadoraSugerida: "correios" }
      : { tipo: "rastreio", rastreio: maiusculo }
  }

  if (upsValido(maiusculo)) {
    return { tipo: "rastreio", rastreio: maiusculo, transportadoraSugerida: "ups" }
  }

  return null
}

// ---------------------------------------------------------------------------
// QR codes com URL ou JSON
// ---------------------------------------------------------------------------

/** Chaves (minúsculas) de parâmetro/campo que costumam trazer o rastreio, em ordem de prioridade. */
const CHAVES_RASTREIO = [
  "tracking_number",
  "trackingnumber",
  "tracking_code",
  "trackingcode",
  "tracking",
  "codigo_rastreio",
  "codigorastreio",
  "rastreio",
  "objetos",
  "objeto",
  "codigo",
  "code",
  "shipment_id",
  "id",
]

/** Chaves que podem trazer a chave de acesso (QR da NFC-e usa "p=<chave>|2|1|..."). */
const CHAVES_NFE = ["p", "chnfe", "chave", "chaveacesso", "chave_acesso"]

/** Valor plausível de rastreio: 4 a 60 caracteres alfanuméricos (hífen permitido). */
const RASTREIO_PLAUSIVEL = /^[A-Za-z0-9-]{4,60}$/

function primeiroValor(valor: string): string {
  // Correios aceita vários objetos separados por ";" ou ",".
  return normalizarTextoLido(valor.split(/[;,|]/)[0] ?? "")
}

/** Extrai pares chave → valor (chaves minúsculas) de uma URL ou JSON de primeiro nível. */
function extrairCampos(texto: string): Map<string, string> | null {
  const campos = new Map<string, string>()

  if (/^https?:\/\//i.test(texto)) {
    let url: URL
    try {
      url = new URL(texto)
    } catch {
      return null
    }
    url.searchParams.forEach((valor, chave) => {
      const k = chave.toLowerCase()
      if (!campos.has(k)) campos.set(k, valor)
    })
    return campos
  }

  if (texto.startsWith("{")) {
    let dados: unknown
    try {
      dados = JSON.parse(texto)
    } catch {
      return null
    }
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return null
    for (const [chave, valor] of Object.entries(dados)) {
      if (typeof valor === "string" || typeof valor === "number") {
        const k = chave.toLowerCase()
        if (!campos.has(k)) campos.set(k, String(valor))
      }
    }
    return campos
  }

  return null
}

function truncar(texto: string): { valor: string; truncado: boolean } {
  return texto.length > CODIGO_RASTREIO_MAX
    ? { valor: texto.slice(0, CODIGO_RASTREIO_MAX), truncado: true }
    : { valor: texto, truncado: false }
}

/**
 * Interpreta o texto lido de uma etiqueta:
 * - chave de acesso de NF-e/NFC-e válida → NF (o rastreio NÃO recebe a chave);
 * - Correios S10 "...BR" com DV válido → rastreio + sugestão "correios";
 * - UPS "1Z..." com DV válido → rastreio + sugestão "ups";
 * - QR com URL/JSON → chave NF-e embutida, código conhecido ou campo óbvio
 *   (tracking/id/...), senão texto bruto truncado (desconhecido);
 * - código alfanumérico genérico → rastreio sem sugestão.
 */
export function interpretarCodigoLido(texto: string): CodigoInterpretado {
  const normalizado = normalizarTextoLido(texto)
  if (!normalizado) return { tipo: "desconhecido", bruto: "", truncado: false }

  // 1. Código "simples" de padrão conhecido (chave, S10, UPS).
  const conhecido = classificarCodigoConhecido(normalizado)
  if (conhecido) return conhecido

  // 2. Código alfanumérico genérico (Code 128/39, ITF, EAN...).
  if (/^[A-Za-z0-9\-./]+$/.test(normalizado) && !/^https?:/i.test(normalizado)) {
    const { valor, truncado } = truncar(normalizado)
    // 44 dígitos com DV inválido: provavelmente uma chave mal lida.
    const pareceChave = /^\d{44}$/.test(normalizado)
    return {
      tipo: "rastreio",
      rastreio: valor,
      ...(truncado || pareceChave ? { conferir: true } : {}),
    }
  }

  // 3. QR com URL ou JSON: procura campos óbvios.
  const campos = extrairCampos(normalizado)
  if (campos) {
    for (const chave of CHAVES_NFE) {
      const valor = campos.get(chave)
      const nfe = valor ? interpretarChaveAcesso(primeiroValor(valor)) : null
      if (nfe) return nfe
    }

    for (const chave of CHAVES_RASTREIO) {
      const valor = campos.get(chave)
      if (!valor) continue
      const candidato = primeiroValor(valor)
      const classificado = classificarCodigoConhecido(candidato)
      if (classificado) return classificado
      if (RASTREIO_PLAUSIVEL.test(candidato)) {
        return { tipo: "rastreio", rastreio: candidato, conferir: true }
      }
    }
  }

  // 4. Texto livre/URL: um código dos Correios válido embutido (ex.: no caminho da URL).
  for (const encontrado of normalizado.toUpperCase().matchAll(S10_BR_BUSCA)) {
    if (s10Valido(encontrado[0])) {
      return { tipo: "rastreio", rastreio: encontrado[0], transportadoraSugerida: "correios" }
    }
  }

  const { valor, truncado } = truncar(normalizado)
  return { tipo: "desconhecido", bruto: valor, truncado }
}
