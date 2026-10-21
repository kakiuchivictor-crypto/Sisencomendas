"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { CameraOff, Flashlight, FlashlightOff, Loader2, RotateCcw, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { normalizarTextoLido } from "@/lib/codigos-etiqueta"
import { cn } from "@/lib/utils"

/**
 * Leitor de código de barras/QR pela câmera do aparelho. Tudo roda no
 * navegador: nenhuma imagem sai do dispositivo.
 *
 * Motor:
 * - `BarcodeDetector` nativo (Chrome/Edge Android, Safari recente) quando
 *   existe e suporta pelo menos Code 128 e QR Code (etiquetas dos Correios e
 *   DANFE usam Code 128);
 * - senão, fallback com @zxing/browser (JS puro, sem WebAssembly), carregado
 *   via import() dinâmico só quando o leitor abre (fica fora do bundle inicial).
 *
 * A câmera é sempre desligada (todas as tracks paradas) ao ler, fechar,
 * desmontar ou dar erro, para a luz da câmera apagar.
 */
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Texto lido, já normalizado e não vazio. O leitor já foi fechado. */
  onDetected: (texto: string) => void
}) {
  // Remonta o leitor a cada abertura e em "Tentar novamente".
  const [tentativa, setTentativa] = useState(0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Celular: tela cheia. Desktop: diálogo central.
          "top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0",
          "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
        )}
      >
        {open && (
          <LeitorCamera
            key={tentativa}
            onFechar={() => onOpenChange(false)}
            onTentarNovamente={() => setTentativa((n) => n + 1)}
            onDetected={(texto) => {
              onOpenChange(false)
              onDetected(texto)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Formatos desejados (nomes da API BarcodeDetector). */
const FORMATOS_NATIVOS = [
  "code_128",
  "code_39",
  "ean_13",
  "itf",
  "qr_code",
  "data_matrix",
  "pdf417",
] as const

/** Intervalo entre tentativas de leitura (ms): equilíbrio entre resposta e bateria. */
const INTERVALO_LEITURA_MS = 150

type EstadoLeitor =
  | { fase: "iniciando" }
  | { fase: "lendo"; lanterna: boolean | null }
  | { fase: "erro"; mensagem: string; podeTentar: boolean }

// Tipagem mínima da API BarcodeDetector (ainda fora do lib.dom do TypeScript).
type DetectedBarcode = { rawValue: string }
type BarcodeDetectorInstancia = {
  detect: (fonte: HTMLVideoElement) => Promise<DetectedBarcode[]>
}
type BarcodeDetectorConstrutor = {
  new (opcoes: { formats: string[] }): BarcodeDetectorInstancia
  getSupportedFormats: () => Promise<string[]>
}

/** Erro detectável antes de pedir a câmera (calculado no render, sem efeito). */
function diagnosticarAmbiente(): string | null {
  if (typeof window === "undefined") return null
  if (!window.isSecureContext) {
    return "A câmera só funciona em conexão segura (HTTPS). Abra o sistema pelo endereço oficial."
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Este navegador não permite acesso à câmera. Digite o código manualmente."
  }
  return null
}

function mensagemErroCamera(erro: unknown): { mensagem: string; podeTentar: boolean } {
  const nome = erro instanceof DOMException || erro instanceof Error ? erro.name : ""
  switch (nome) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return {
        mensagem: "Permita o acesso à câmera nas configurações do navegador e tente novamente.",
        podeTentar: true,
      }
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return { mensagem: "Nenhuma câmera foi encontrada neste aparelho.", podeTentar: false }
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return {
        mensagem: "A câmera está em uso por outro aplicativo. Feche-o e tente novamente.",
        podeTentar: true,
      }
    default:
      return { mensagem: "Não foi possível abrir a câmera. Tente novamente.", podeTentar: true }
  }
}

type Leitura = (video: HTMLVideoElement) => Promise<string | null>

async function criarLeituraNativa(): Promise<Leitura | null> {
  const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstrutor })
    .BarcodeDetector
  if (!Detector) return null

  try {
    const suportados = await Detector.getSupportedFormats()
    const formatos = FORMATOS_NATIVOS.filter((f) => suportados.includes(f))
    if (!formatos.includes("code_128") || !formatos.includes("qr_code")) return null

    const detector = new Detector({ formats: [...formatos] })
    return async (video) => {
      const codigos = await detector.detect(video)
      return codigos.find((c) => c.rawValue.trim())?.rawValue ?? null
    }
  } catch {
    return null
  }
}

/** Fallback zxing: devolve uma função que inicia o loop e retorna o "parar". */
async function iniciarLeituraZxing(
  video: HTMLVideoElement,
  aoLer: (texto: string) => void,
  aoFalhar: (erro: Error) => void
): Promise<() => void> {
  const [{ BrowserMultiFormatReader, BarcodeFormat }, { DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ])

  const hints = new Map<unknown, unknown>([
    [
      DecodeHintType.POSSIBLE_FORMATS,
      [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.PDF_417,
      ],
    ],
    [DecodeHintType.TRY_HARDER, true],
  ])

  const leitor = new BrowserMultiFormatReader(hints as Map<never, never>, {
    delayBetweenScanAttempts: INTERVALO_LEITURA_MS,
  })
  const controles = leitor.scan(
    video,
    (resultado) => {
      if (resultado) aoLer(resultado.getText())
    },
    // Chamado quando o loop termina. Com erro, o zxing parou sozinho (falha
    // inesperada): sem isso a camera ficaria ligada sem ler nada.
    (erro) => {
      if (erro) aoFalhar(erro)
    }
  )
  return () => controles.stop()
}

function LeitorCamera({
  onFechar,
  onTentarNovamente,
  onDetected,
}: {
  onFechar: () => void
  onTentarNovamente: () => void
  onDetected: (texto: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const [erroAmbiente] = useState(diagnosticarAmbiente)
  const [estado, setEstado] = useState<EstadoLeitor>({ fase: "iniciando" })

  const entregarLeitura = useEffectEvent((texto: string) => {
    navigator.vibrate?.(80)
    onDetected(texto)
  })

  useEffect(() => {
    if (erroAmbiente) return

    const video = videoRef.current
    if (!video) return

    let ativo = true
    let stream: MediaStream | null = null
    let pararLoop: (() => void) | null = null

    const desligarCamera = () => {
      pararLoop?.()
      pararLoop = null
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
      trackRef.current = null
      video.srcObject = null
    }

    // Garante uma única entrega por abertura.
    const aoLer = (bruto: string) => {
      if (!ativo) return
      const texto = normalizarTextoLido(bruto)
      if (!texto) return
      ativo = false
      desligarCamera()
      entregarLeitura(texto)
    }

    async function iniciar(alvo: HTMLVideoElement) {
      try {
        const midia = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (!ativo) {
          midia.getTracks().forEach((track) => track.stop())
          return
        }
        stream = midia

        const track = midia.getVideoTracks()[0] ?? null
        trackRef.current = track
        const capacidades = (track?.getCapabilities?.() ?? {}) as { torch?: boolean }

        alvo.srcObject = midia
        await alvo.play()
        if (!ativo) return

        const leituraNativa = await criarLeituraNativa()
        if (!ativo) return

        if (leituraNativa) {
          let timer: ReturnType<typeof setTimeout> | undefined
          let parado = false
          const passo = async () => {
            if (parado || !ativo) return
            try {
              if (alvo.readyState >= 2) {
                const texto = await leituraNativa(alvo)
                if (texto) aoLer(texto)
              }
            } catch {
              // Quadro inválido (ex.: vídeo ainda sem dimensão): tenta o próximo.
            }
            if (!parado && ativo) timer = setTimeout(passo, INTERVALO_LEITURA_MS)
          }
          pararLoop = () => {
            parado = true
            clearTimeout(timer)
          }
          void passo()
        } else {
          const parar = await iniciarLeituraZxing(alvo, aoLer, (erro) => {
            if (!ativo) return
            ativo = false
            desligarCamera()
            setEstado({ fase: "erro", ...mensagemErroCamera(erro) })
          })
          if (!ativo) {
            parar()
            return
          }
          pararLoop = parar
        }

        setEstado({ fase: "lendo", lanterna: capacidades.torch ? false : null })
      } catch (erro) {
        desligarCamera()
        if (ativo) setEstado({ fase: "erro", ...mensagemErroCamera(erro) })
      }
    }

    void iniciar(video)

    return () => {
      ativo = false
      desligarCamera()
    }
  }, [erroAmbiente])

  async function alternarLanterna() {
    if (estado.fase !== "lendo" || estado.lanterna === null) return
    const track = trackRef.current
    if (!track) return
    const ligar = !estado.lanterna
    try {
      await track.applyConstraints({
        advanced: [{ torch: ligar } as MediaTrackConstraintSet],
      })
      setEstado({ fase: "lendo", lanterna: ligar })
    } catch {
      setEstado({ fase: "lendo", lanterna: null })
    }
  }

  const erro =
    erroAmbiente !== null
      ? { mensagem: erroAmbiente, podeTentar: false }
      : estado.fase === "erro"
        ? estado
        : null

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <DialogTitle>Escanear código</DialogTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Fechar leitor"
          onClick={onFechar}
        >
          <XIcon />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black sm:aspect-[4/3] sm:flex-none">
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          playsInline
          muted
          autoPlay
          aria-hidden="true"
        />

        {!erro && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[8%] top-1/2 h-[38%] max-h-56 -translate-y-1/2 rounded-xl border-2 border-white/90 shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]"
          />
        )}

        {!erro && estado.fase === "iniciando" && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white"
          >
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            Abrindo a câmera...
          </div>
        )}

        {erro && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-popover p-6 text-center text-popover-foreground"
          >
            <CameraOff className="text-muted-foreground size-8" aria-hidden="true" />
            <p className="max-w-xs text-sm">{erro.mensagem}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {erro.podeTentar && (
                <Button type="button" size="lg" onClick={onTentarNovamente}>
                  <RotateCcw />
                  Tentar novamente
                </Button>
              )}
              <Button type="button" size="lg" variant="outline" onClick={onFechar}>
                Digitar manualmente
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <DialogDescription>Aponte para o código de barras da etiqueta</DialogDescription>
        {estado.fase === "lendo" && estado.lanterna !== null && (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={estado.lanterna ? "Desligar lanterna" : "Ligar lanterna"}
            aria-pressed={estado.lanterna}
            onClick={alternarLanterna}
          >
            {estado.lanterna ? <FlashlightOff /> : <Flashlight />}
          </Button>
        )}
      </div>
    </>
  )
}
