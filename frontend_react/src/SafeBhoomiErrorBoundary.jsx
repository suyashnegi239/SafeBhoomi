
import React from "react";

export class SafeBhoomiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("🛡️ SAFEBHOOMI RUNTIME ERROR");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error);
    console.error("Message:", error?.message);
    console.error("Component Stack:", errorInfo?.componentStack);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const error = this.state.error;
    const errorInfo = this.state.errorInfo;

    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #172554 0%, #020617 55%, #000 100%)",
          color: "#f8fafc",
          padding: "40px 20px",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            background: "rgba(15, 23, 42, 0.96)",
            border: "1px solid rgba(248, 113, 113, 0.35)",
            borderRadius: "20px",
            padding: "30px",
            boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "10px",
            }}
          >
            🛡️
          </div>

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "28px",
            }}
          >
            SafeBhoomi Runtime Diagnostic
          </h1>

          <p
            style={{
              color: "#cbd5e1",
              marginTop: 0,
              lineHeight: 1.6,
            }}
          >
            SafeBhoomi detected a component error instead of showing a
            completely blank screen.
          </p>

          <div
            style={{
              marginTop: "24px",
              padding: "18px",
              borderRadius: "14px",
              background: "rgba(127, 29, 29, 0.22)",
              border: "1px solid rgba(248, 113, 113, 0.25)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#fca5a5",
                fontWeight: 700,
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Error message
            </div>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                color: "#fecaca",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {error?.message || String(error)}
            </pre>
          </div>

          {errorInfo?.componentStack && (
            <details
              style={{
                marginTop: "18px",
                background: "rgba(2, 6, 23, 0.7)",
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  color: "#93c5fd",
                  fontWeight: 700,
                }}
              >
                Component stack
              </summary>

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#94a3b8",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  marginTop: "12px",
                }}
              >
                {errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "24px",
            }}
          >
            <button
              onClick={this.handleReset}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "12px 18px",
                background: "#2563eb",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>

            <button
              onClick={this.handleReload}
              style={{
                border: "1px solid rgba(148,163,184,0.3)",
                borderRadius: "10px",
                padding: "12px 18px",
                background: "rgba(30,41,59,0.8)",
                color: "#e2e8f0",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reload App
            </button>
          </div>

          <p
            style={{
              marginTop: "24px",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            Development diagnostic only. This screen is intended to identify
            the component causing the blank page.
          </p>
        </div>
      </div>
    );
  }
}

export default SafeBhoomiErrorBoundary;
