"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

let mermaidIdCounter = 0;

export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const idRef = useRef(`mermaid-${++mermaidIdCounter}`);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let cancelled = false;
    setSvg("");
    setError(null);
    idRef.current = `mermaid-${++mermaidIdCounter}`;

    async function renderDiagram() {
      let cleanedChart = chart
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      cleanedChart = cleanedChart.replace(/^```(?:mermaid)?\s*\n?/, "");
      cleanedChart = cleanedChart.replace(/\n?```\s*$/, "");
      cleanedChart = cleanedChart.trim();
      cleanedChart = cleanedChart.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      cleanedChart = cleanedChart.replace(/\u00a0/g, " ");
      cleanedChart = cleanedChart.replace(/≠/g, "!=");
      cleanedChart = cleanedChart.replace(/([A-Za-z0-9_]+)\[([^\]"]+)\]/g, (match, nodeId, label) => {
        if (/[()[\]{}]/.test(label)) {
          return `${nodeId}["${label.replace(/"/g, '\\"')}"]`;
        }

        return match;
      });

      if (!cleanedChart) {
        if (!cancelled) setError("Empty diagram code.");
        return;
      }

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: "base",
          securityLevel: "loose",
          themeCSS: `
            .node rect {
              rx: 22px !important;
              ry: 22px !important;
            }
          `,
          themeVariables: {
            darkMode: true,
            background: "#1a1a1a",
            primaryColor: "#DC2626",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#DC2626",
            lineColor: "#DC2626",
            secondaryColor: "#0364CE",
            tertiaryColor: "#333333",
            textColor: "#ffffff",
            nodeTextColor: "#ffffff",
            clusterBkg: "#7f1d1d",
            clusterBorder: "#DC2626",
            borderRadius: 22,
            fontSize: "22px",
          },
          flowchart: {
            htmlLabels: true,
            curve: "basis",
          },
        });

        try {
          await mermaid.parse(cleanedChart);
        } catch (parseErr: unknown) {
          const message = getErrorMessage(parseErr);
          if (!cancelled) setError(`Syntax error: ${message}`);
          return;
        }

        const staleElement = document.getElementById(idRef.current);
        if (staleElement) staleElement.remove();

        await new Promise((resolve) => setTimeout(resolve, 0));
        if (cancelled) return;

        const { svg: renderedSvg } = await mermaid.render(idRef.current, cleanedChart);

        if (!cancelled) {
          setSvg(renderedSvg);
          const tempElement = document.getElementById(idRef.current);
          if (tempElement) tempElement.remove();
        }
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        const brokenElement = document.getElementById(idRef.current);
        if (brokenElement) brokenElement.remove();
        if (!cancelled) setError(`Render error: ${message}`);
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
      const tempElement = document.getElementById(idRef.current);
      if (tempElement) tempElement.remove();
    };
  }, [chart, isClient]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-500/30 bg-red-950/20 p-4 text-sm">
        <p className="text-red-400 font-medium mb-2">Diagram could not be rendered</p>
        <p className="text-red-300 text-xs mb-3 font-mono bg-red-950/30 rounded p-2 border border-red-500/20">{error}</p>
        <details className="text-xs">
          <summary className="text-gray-400 cursor-pointer hover:text-gray-300 mb-2">Show diagram code</summary>
          <pre className="text-gray-400 text-xs whitespace-pre-wrap overflow-x-auto bg-black/30 rounded p-3 border border-white/5 mt-2">
            {chart.trim()}
          </pre>
        </details>
      </div>
    );
  }

  if (!isClient || !svg) {
    return (
      <div className="my-4 flex justify-center items-center min-h-[200px] text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Rendering diagram...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="my-4 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error && "str" in error) {
    return String((error as { str: unknown }).str);
  }

  return String(error);
}
