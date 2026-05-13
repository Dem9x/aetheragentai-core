"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020305", color: "#e6f6ff", fontFamily: "Consolas, monospace" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 560, border: "1px solid rgba(244,63,94,.35)", background: "#05070a", padding: 24 }}>
            <p style={{ color: "#fb7185", textTransform: "uppercase", fontSize: 12, letterSpacing: 3 }}>AetherAgentAI Fatal Boundary</p>
            <h1>Runtime recovery required</h1>
            <p style={{ color: "#94a3b8", lineHeight: 1.6 }}>A top-level rendering fault occurred. Retry the session to reinitialize the terminal.</p>
            <button onClick={reset} style={{ background: "transparent", color: "#67e8f9", border: "1px solid rgba(103,232,249,.4)", padding: "10px 14px", cursor: "pointer" }}>Retry</button>
          </section>
        </main>
      </body>
    </html>
  );
}
