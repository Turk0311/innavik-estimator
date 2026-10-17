"use client";

interface Props {
  estimateId: string;
  showPackages: boolean;
}

export default function PrintControls({ estimateId, showPackages }: Props) {
  function togglePackages() {
    const url = new URL(window.location.href);
    // showPackages=true → turn off with ?packages=0; false → turn on with ?packages=1
    url.searchParams.set("packages", showPackages ? "0" : "1");
    window.location.href = url.toString();
  }

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
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {/* Back link */}
      <a
        href={`/estimates/${estimateId}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          color: "#94a3b8",
          textDecoration: "none",
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "white")}
        onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </a>

      <span style={{ color: "#334155" }}>|</span>

      {/* Good / Better / Best toggle */}
      <button
        onClick={togglePackages}
        title={showPackages ? "Switch to single-total view" : "Show Good / Better / Best pricing options"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "6px 14px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: "600",
          border: showPackages ? "1.5px solid #2563eb" : "1.5px solid #334155",
          background: showPackages ? "#1e3a8a" : "transparent",
          color: showPackages ? "#93c5fd" : "#64748b",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = "#2563eb";
          e.currentTarget.style.color = "#93c5fd";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = showPackages ? "#2563eb" : "#334155";
          e.currentTarget.style.color = showPackages ? "#93c5fd" : "#64748b";
        }}
      >
        {/* Three-bar icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="5" height="18" rx="1" />
          <rect x="9.5" y="3" width="5" height="18" rx="1" />
          <rect x="16" y="3" width="5" height="18" rx="1" />
        </svg>
        Good / Better / Best
        {showPackages && (
          <span style={{ fontSize: "10px", background: "#2563eb", color: "white", padding: "1px 5px", borderRadius: "4px" }}>
            ON
          </span>
        )}
      </button>

      <span style={{ fontSize: "12px", color: "#475569", marginLeft: "4px" }}>
        {showPackages
          ? "3-package proposal view"
          : "Standard single-total view"}
      </span>

      {/* Print button */}
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
          fontSize: "13px",
          border: "none",
          cursor: "pointer",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#3b82f6")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#2563eb")}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print / Save PDF
      </button>
    </div>
  );
}
