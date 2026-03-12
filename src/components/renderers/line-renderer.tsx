"use client";

import { motion } from "motion/react";
import type { Line } from "@/types/board";
import { BlockHighlight } from "./block-highlight";

interface LineRendererProps {
  line: Line;
}

export function LineRenderer({ line }: LineRendererProps) {
  const content = (
    <motion.span
      key={line.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="text-gray-100"
    >
      {line.text}
    </motion.span>
  );

  if (line.highlight) {
    return <BlockHighlight type={line.highlight}>{content}</BlockHighlight>;
  }

  return <div className="my-1.5 text-gray-100">{content}</div>;
}
