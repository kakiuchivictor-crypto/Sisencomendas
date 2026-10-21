"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowBigUp, ArrowRight, CircleAlert, Eye, EyeOff } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { loginSchema, type LoginInput } from "@/schemas/auth"

import { loginAction } from "./actions"

function isCapsLockOn(event: React.KeyboardEvent) {
  return event.getModifierState?.("CapsLock") ?? false
}

/*
 * Campo "so com linha inferior" (papel timbrado). Para nao perder area de
 * toque: altura minima de 52px (56px em toque), largura total, leve fundo
 * no hover/foco, e no foco a linha engrossa para 3px na cor de destaque.
 */
const fieldClassName =
  "border-field-line text-foreground placeholder:text-muted-foreground/80 h-[52px] w-full rounded-t-sm rounded-b-none border-0 border-b-[1.5px] bg-transparent px-1 py-2.5 text-lg transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:bg-muted/60 focus:border-primary focus:bg-accent/40 focus:shadow-[0_1.5px_0_0_var(--primary)] aria-invalid:border-danger-ink aria-invalid:shadow-[0_1.5px_0_0_var(--danger-ink)] motion-reduce:transition-none pointer-coarse:h-14 short:h-12 short:text-base"

const labelClassName = "text-foreground text-sm font-semibold data-[error=true]:text-foreground"

const messageClassName = "text-danger-ink text-sm font-medium"

export function LoginForm() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  // Foco automatico no e-mail so com mouse/trackpad: no celular/tablet ele
  // abriria o teclado virtual por cima da tela antes do porteiro ver a pagina.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      form.setFocus("email")
    }
  }, [form])

  function onSubmit(values: LoginInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await loginAction(values)

      if (result?.error) {
        setServerError(result.error)
        form.setFocus("password", { shouldSelect: true })
        return
      }

      // Pode haver outro usuario antes neste aparelho (sessao expirada sem
      // "Sair"): o QueryClient vive no layout raiz e sobreviveria a uma
      // navegacao do Next. Limpa o cache e faz carga completa da pagina.
      queryClient.clear()
      window.location.assign(new URL("/", window.location.origin))
    })
  }

  function trackCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(isCapsLockOn(event))
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        aria-busy={isPending}
        className="short:gap-4 grid gap-[22px]"
      >
        {serverError ? (
          <div
            role="alert"
            className="border-danger-ink bg-danger-soft text-foreground flex items-start gap-2.5 border-l-[3px] px-3.5 py-3 text-[15px]"
          >
            <CircleAlert
              className="text-danger-ink mt-0.5 size-4.5 shrink-0"
              aria-hidden="true"
            />
            <span>{serverError}</span>
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className={labelClassName}>E-mail</FormLabel>
              <FormControl>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="voce@condominio.com.br"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={fieldClassName}
                  {...field}
                  onChange={(event) => {
                    setServerError(null)
                    field.onChange(event)
                  }}
                  onKeyDown={trackCapsLock}
                  onKeyUp={trackCapsLock}
                />
              </FormControl>
              <FormMessage className={messageClassName} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className={labelClassName}>Senha</FormLabel>
              <div className="relative flex items-center">
                <FormControl>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className={`${fieldClassName} pr-28`}
                    {...field}
                    onChange={(event) => {
                      setServerError(null)
                      field.onChange(event)
                    }}
                    onKeyDown={trackCapsLock}
                    onKeyUp={trackCapsLock}
                    onBlur={() => {
                      setCapsLock(false)
                      field.onBlur()
                    }}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword((value) => !value)
                    form.setFocus("password")
                  }}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="text-muted-foreground hover:text-foreground absolute right-0 inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold tracking-[0.04em] uppercase outline-none focus-visible:outline-[2.5px] focus-visible:outline-offset-0 focus-visible:outline-primary"
                >
                  {showPassword ? (
                    <EyeOff className="size-4.5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4.5" aria-hidden="true" />
                  )}
                  <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
                </button>
              </div>
              <p
                aria-live="polite"
                className="text-warn-ink flex items-center gap-2 text-sm font-medium empty:hidden"
              >
                {capsLock ? (
                  <>
                    <ArrowBigUp className="size-4 shrink-0" aria-hidden="true" />
                    Caps Lock está ativado.
                  </>
                ) : null}
              </p>
              <FormMessage className={messageClassName} />
            </FormItem>
          )}
        />

        <button
          type="submit"
          disabled={isPending}
          className="group bg-foreground text-background hover:bg-primary hover:text-primary-foreground disabled:bg-primary disabled:text-primary-foreground short:min-h-12 mt-1.5 flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full text-base font-semibold tracking-[0.01em] transition-[background-color,color,transform] duration-200 outline-none focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-primary active:translate-y-px disabled:cursor-progress motion-reduce:transition-none"
        >
          {isPending ? (
            <>
              Entrando…
              <span
                aria-hidden="true"
                className="size-4.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none motion-reduce:border-r-current motion-reduce:opacity-60"
              />
            </>
          ) : (
            <>
              Entrar
              <ArrowRight
                className="size-4.5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </form>
    </Form>
  )
}
