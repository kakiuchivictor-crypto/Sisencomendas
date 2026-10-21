export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="bg-background flex min-h-dvh flex-col">{children}</div>
}
