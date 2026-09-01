import type { Metadata } from "next"
import { Package } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Entrar — SisEncomendas",
}

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center gap-3 pb-2 text-center">
        <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
          <Package className="size-5.5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl tracking-tight">SisEncomendas</CardTitle>
          <CardDescription>
            Entre com seu email e senha para acessar a portaria.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <LoginForm />
      </CardContent>
    </Card>
  )
}
