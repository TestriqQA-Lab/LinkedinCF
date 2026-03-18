"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GateForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/site-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const next = searchParams.get("next") || "/";
        router.push(next);
        router.refresh();
      } else {
        setError("Incorrect password");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter password"
        autoFocus
        required
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "rgba(15, 23, 42, 0.6)",
          border: error
            ? "1px solid #ef4444"
            : "1px solid rgba(148, 163, 184, 0.2)",
          borderRadius: "10px",
          color: "#f1f5f9",
          fontSize: "15px",
          outline: "none",
          boxSizing: "border-box" as const,
          transition: "border-color 0.2s",
        }}
      />

      {error && (
        <p style={{ color: "#ef4444", fontSize: "13px", margin: "8px 0 0" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "16px",
          background: loading
            ? "rgba(59, 130, 246, 0.5)"
            : "linear-gradient(135deg, #3b82f6, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          fontSize: "15px",
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          transition: "opacity 0.2s",
          opacity: !password ? 0.5 : 1,
        }}
      >
        {loading ? "Verifying..." : "Enter Site"}
      </button>
    </form>
  );
}

export default function SiteGatePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(30, 41, 59, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(148, 163, 184, 0.1)",
          borderRadius: "16px",
          padding: "48px 40px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: "24px",
            }}
          >
            🔒
          </div>
          <h1 style={{ color: "#f1f5f9", fontSize: "22px", fontWeight: 600, margin: "0 0 8px" }}>
            Protected Site
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            Enter the password to continue
          </p>
        </div>

        <Suspense fallback={<div style={{ color: "#94a3b8", textAlign: "center" }}>Loading...</div>}>
          <GateForm />
        </Suspense>
      </div>
    </div>
  );
}
