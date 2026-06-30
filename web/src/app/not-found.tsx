import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found (404)",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background:
          "radial-gradient(120% 120% at 50% -20%, #1a2150 0%, #0a0e22 55%)",
        color: "#e8ecf8",
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div
          style={{
            fontSize: "clamp(4.5rem, 16vw, 9rem)",
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            background: "linear-gradient(90deg, #c4b5fd, #818cf8)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: "1.6rem",
            margin: "0.6rem 0 0.4rem",
            fontWeight: 700,
          }}
        >
          Page not found
        </h1>
        <p style={{ color: "#aeb6cd", fontSize: "1.02rem", lineHeight: 1.6, margin: "0 0 1.6rem" }}>
          The page you&apos;re looking for doesn&apos;t exist, was moved, or the link is broken.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
            padding: "0.8rem 1.5rem",
            borderRadius: "999px",
            boxShadow: "0 12px 28px -10px rgba(99,102,241,.6)",
          }}
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
