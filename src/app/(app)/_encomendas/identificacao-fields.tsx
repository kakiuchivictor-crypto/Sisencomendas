"use client"

import { useId, useState } from "react"
import {
  type Control,
  type FieldPath,
  type FieldValues,
  type PathValue,
  useFormContext,
} from "react-hook-form"
import { ScanBarcode } from "lucide-react"
import { toast } from "sonner"

import { BarcodeScannerDialog } from "@/components/barcode/barcode-scanner-dialog"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { interpretarCodigoLido } from "@/lib/codigos-etiqueta"
import {
  IDENTIFICACAO_LABELS,
  TRANSPORTADORA_LABELS,
  type Transportadora,
  type TransportadoraFixa,
} from "@/lib/labels"
import { selecaoParaCampos } from "@/lib/transportadoras"
import { cn } from "@/lib/utils"

/**
 * Campos "Codigo de rastreio" + "Nota fiscal" de um item (encomenda ou
 * correspondencia), com a regra fixa de pelo menos um dos dois (ver
 * src/schemas/identificacao.ts). O erro do schema cai no campo de rastreio;
 * a NF declara `deps` no rastreio para o erro sumir assim que o porteiro
 * digita a nota fiscal. O grupo e descrito pela dica (aria-describedby).
 *
 * `obrigatorio = false` so na edicao de registros legados que nunca tiveram
 * NF/rastreio: ai os campos voltam a aparecer como opcionais.
 *
 * Botão "Escanear": lê o código da etiqueta pela câmera e preenche o
 * rastreio (ou a NF, se for chave de acesso de NF-e/NFC-e). Com
 * `transportadora` informado (só encomendas), aplica a transportadora
 * sugerida pelo formato do código conforme `transportadora.aplicar`:
 * - "se-nao-escolhida" (cadastro/adicionar item): o campo começa com o
 *   padrão "Correios", então "vazio" = porteiro ainda não mexeu no combobox
 *   (campo não tocado). Se ele já escolheu, nunca sobrescreve;
 * - "se-vazio" (edição): só preenche se o campo estiver realmente vazio,
 *   para não trocar a transportadora já gravada.
 * O porteiro sempre confere antes de salvar.
 */
export function IdentificacaoFields<T extends FieldValues>({
  control,
  rastreioName,
  notaFiscalName,
  obrigatorio = true,
  transportadora,
  className,
}: {
  control: Control<T>
  rastreioName: FieldPath<T>
  notaFiscalName: FieldPath<T>
  obrigatorio?: boolean
  transportadora?: {
    transportadoraName: FieldPath<T>
    transportadoraOutroName: FieldPath<T>
    aplicar: "se-nao-escolhida" | "se-vazio"
  }
  className?: string
}) {
  const dicaId = useId()
  const [leitorAberto, setLeitorAberto] = useState(false)
  const { getValues, setValue, getFieldState, trigger } = useFormContext<T>()

  function definir(name: FieldPath<T>, valor: string) {
    setValue(name, valor as PathValue<T, FieldPath<T>>, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  /** Aplica a sugestão (se permitido) e devolve o texto para o toast. */
  function aplicarTransportadora(sugerida: TransportadoraFixa): string {
    const nome = TRANSPORTADORA_LABELS[sugerida]
    if (!transportadora) return ""

    const { transportadoraName, transportadoraOutroName, aplicar } = transportadora
    const atual = getValues(transportadoraName) as Transportadora | undefined | null
    const outroAtual = String(getValues(transportadoraOutroName) ?? "").trim()

    if (atual === sugerida) return ` · Transportadora sugerida: ${nome}`

    const vazio = !atual || (atual === "outros" && !outroAtual)
    const escolhida =
      getFieldState(transportadoraName).isTouched ||
      getFieldState(transportadoraOutroName).isTouched
    const pode = vazio || (aplicar === "se-nao-escolhida" && !escolhida)

    if (!pode) return ` · Sugestão: ${nome} (mantida a transportadora escolhida)`

    const campos = selecaoParaCampos({ tipo: "fixa", valor: sugerida })
    setValue(
      transportadoraName,
      campos.transportadora as PathValue<T, FieldPath<T>>,
      { shouldDirty: true }
    )
    setValue(
      transportadoraOutroName,
      campos.transportadoraOutro as PathValue<T, FieldPath<T>>,
      { shouldDirty: true, shouldValidate: true }
    )
    return ` · Transportadora sugerida: ${nome}`
  }

  function aoLerCodigo(texto: string) {
    const lido = interpretarCodigoLido(texto)

    if (lido.tipo === "nfe") {
      definir(notaFiscalName, lido.nf)
      // A NF satisfaz a regra "NF ou rastreio": limpa o erro do rastreio.
      void trigger(rastreioName)
      toast.success(
        `Nota fiscal lida: ${lido.nf} (${lido.modelo === "65" ? "NFC-e" : "NF-e"})`
      )
      return
    }

    if (lido.tipo === "desconhecido") {
      if (!lido.bruto) return
      definir(rastreioName, lido.bruto)
      toast.warning("Confira o código lido", {
        description: "O formato não foi reconhecido. Revise o rastreio antes de salvar.",
      })
      return
    }

    definir(rastreioName, lido.rastreio)
    const sufixo = lido.transportadoraSugerida
      ? aplicarTransportadora(lido.transportadoraSugerida)
      : ""
    const mensagem = `Código lido: ${resumirCodigo(lido.rastreio)}${sufixo}`
    if (lido.conferir) {
      toast.warning("Confira o código lido", { description: mensagem })
    } else {
      toast.success(mensagem)
    }
  }

  return (
    <div
      role="group"
      aria-label="Identificação do item"
      aria-describedby={dicaId}
      className={cn("space-y-2", className)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={control}
          name={rastreioName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {IDENTIFICACAO_LABELS.codigoRastreio}
                {!obrigatorio && <OpcionalHint />}
              </FormLabel>
              <FormControl>
                <Input placeholder="Ex: BR123456789BR" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={notaFiscalName}
          rules={{ deps: [rastreioName] }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {IDENTIFICACAO_LABELS.notaFiscal}
                {!obrigatorio && <OpcionalHint />}
              </FormLabel>
              <FormControl>
                <Input placeholder="Número da NF" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          id={dicaId}
          className={cn(
            "text-muted-foreground min-w-48 flex-1 text-xs",
            !obrigatorio && "sr-only"
          )}
        >
          {obrigatorio
            ? IDENTIFICACAO_LABELS.dica
            : "Registro antigo sem nota fiscal nem rastreio: campos opcionais."}
        </p>
        <Button
          type="button"
          variant="outline"
          className="ml-auto pointer-coarse:w-full sm:pointer-coarse:w-auto"
          aria-label="Escanear código de barras"
          onClick={() => setLeitorAberto(true)}
        >
          <ScanBarcode />
          Escanear
        </Button>
      </div>

      <BarcodeScannerDialog
        open={leitorAberto}
        onOpenChange={setLeitorAberto}
        onDetected={aoLerCodigo}
      />
    </div>
  )
}

/** "BR123456789BR" → "BR123456…" para caber no toast. */
function resumirCodigo(codigo: string): string {
  return codigo.length > 12 ? `${codigo.slice(0, 9)}…` : codigo
}

function OpcionalHint() {
  return <span className="text-muted-foreground text-xs font-normal">opcional</span>
}
