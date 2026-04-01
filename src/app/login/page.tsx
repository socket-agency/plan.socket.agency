import { EmberLoginForm } from "../(app)/_components/login-form";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen"
      style={
        {
          "--background": "#0A0A0C",
          "--foreground": "#F7F7F8",
          "--card": "#131316",
          "--card-foreground": "#F7F7F8",
          "--popover": "#1C1C21",
          "--popover-foreground": "#F7F7F8",
          "--primary": "#D4453A",
          "--primary-foreground": "#FFFFFF",
          "--secondary": "#1C1C21",
          "--secondary-foreground": "#E0E0E0",
          "--muted": "#1C1C21",
          "--muted-foreground": "#9494A0",
          "--accent": "#252529",
          "--accent-foreground": "#F7F7F8",
          "--border": "rgba(255,255,255,0.06)",
          "--input": "rgba(255,255,255,0.08)",
          "--ring": "#D4453A",
          "--radius": "0.5rem",
        } as React.CSSProperties
      }
    >
      {/* Left decoration panel — 60% */}
      <div className="relative hidden w-[60%] items-center justify-center overflow-hidden bg-[#0A0A0C] lg:flex">
        {/* Gradient mesh */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(212,69,58,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(240,168,104,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(212,69,58,0.08) 0%, transparent 40%)",
          }}
        />
        <div className="bg-noise absolute inset-0" />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-12">
          <div className="text-5xl font-semibold tracking-tight text-[#F7F7F8]">
            plan
            <span
              style={{
                background: "linear-gradient(135deg, #D4453A, #F0A868)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              .
            </span>
            socket
            <span
              style={{
                background: "linear-gradient(135deg, #D4453A, #F0A868)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              .
            </span>
            agency
          </div>
          <p className="max-w-md text-center text-sm leading-relaxed text-[#9494A0]">
            Task management with clarity and purpose. Track progress, collaborate
            with your team, and get things done.
          </p>
        </div>
      </div>

      {/* Right login panel — 40% */}
      <div className="flex w-full items-center justify-center bg-[#131316] lg:w-[40%]">
        <div className="bg-noise absolute inset-y-0 right-0 hidden w-[40%] lg:block" />
        <EmberLoginForm />
      </div>
    </div>
  );
}
