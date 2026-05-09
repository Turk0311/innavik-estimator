"use client";

export default function PrintControls({ estimateId }: { estimateId: string }) {
  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "#1e293b",
        borderBottom: "1px solid #334155",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <a
        href={`/estimates/${estimateId}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          color: "#94a3b8",
          textDecoration: "none",
          transition: "color 0.15s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "white")}
        onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Estimate
      </a>

      <span style={{ color: "#475569" }}>|</span>

      <span style={{ fontSize: "13px", color: "#64748b" }}>
        Use browser print (Ctrl+P / ⌘P) to save as PDF
      </span>

      <button
        onClick={() => window.print()}
        style={{
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#2563eb",
          color: "white",
          fontWeight: "600",
          padding: "8px 16px",
          borderRadius: "8px",
          fontSize: "14px",
          border: "none",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#3b82f6")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#2563eb")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print / Save PDF
      </button>
    </div>
  );
}
