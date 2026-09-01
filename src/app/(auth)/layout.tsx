export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(60rem 30rem at 50% -10%, oklch(0.4 0.15 258 / 0.1), transparent 60%), radial-gradient(40rem 24rem at 100% 100%, oklch(0.4 0.15 258 / 0.06), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.5_0.02_258/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0.02_258/0.06)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_10%,transparent_70%)]"
      />
      {children}
    </div>
  )
}
