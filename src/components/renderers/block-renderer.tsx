"use client";

import { motion } from "motion/react";
import type { Block } from "@/types/board";
import { LineRenderer } from "./line-renderer";
import { FormulaBlock } from "./formula-block";
import { MermaidDiagram } from "./mermaid-diagram";

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mb-4"
    >
      {renderBlockContent(block)}
    </motion.div>
  );
}

function renderBlockContent(block: Block) {
  switch (block.type) {
    case "paragraph":
      return (
        <div className="text-white text-lg leading-relaxed">
          {block.lines.map((line) => (
            <LineRenderer key={line.id} line={line} />
          ))}
        </div>
      );

    case "formula":
      return (
        <div className="my-2 p-4 rounded-lg bg-white/5 border border-white/10">
          <FormulaBlock formula={block.formula} />
        </div>
      );

    case "diagram":
      return (
        <div className="my-2 p-4 rounded-lg bg-white/5 border border-white/10">
          <MermaidDiagram chart={block.content} />
        </div>
      );

    default:
      return null;
  }
}
