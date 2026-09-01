"use server"

import { redirect } from "next/navigation"

import { signOut } from "@/services/auth/auth-service"

export async function logoutAction(): Promise<void> {
  await signOut()
  redirect("/login")
}
