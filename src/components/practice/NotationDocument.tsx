"use client";

import { X } from "lucide-react";
import type { PracticeLine } from "@/lib/types";
import { formatLine } from "@/lib/lineTree";

/** Flattens a line tree into (text, sourceLineId, depth) rows, one row per rendered text line. */
function flattenForDisplay(
  lines: PracticeLine[],
  depth = 0,
): { text: string; id: string; depth: number }[] {
  const rows: { text: string; id: string; depth: number }[] = [];
  for (const line of lines) {
    if (line.kind === "round") {
      rows.push({ text: `${line.multiplier}x[`, id: line.id, depth });
      rows.push(...flattenForDisplay(line.items, depth + 1));
      rows.push({ text: "]", id: line.id, depth });
    } else {
      rows.push({ text: formatLine(line)[0], id: line.id, depth });
    }
  }
  return rows;
}

export function NotationDocument({
  lines,
  onDeleteLine,
}: {
  lines: PracticeLine[];
  onDeleteLine: (id: string) => void;
}) {
  const rows = flattenForDisplay(lines);

  if (rows.length === 0) {
    return <p className="text-sm text-text-tertiary">No lines yet — add one below.</p>;
  }

  return (
    <div className="font-mono text-[13px] leading-6 text-text-primary">
      {rows.map((row, i) => (
        <div
          key={`${row.id}-${i}`}
          className="group flex items-center justify-between"
          style={{ paddingLeft: row.depth * 16 }}
        >
          <span>{row.text}</span>
          <button
            type="button"
            onClick={() => onDeleteLine(row.id)}
            className="p-1 text-text-tertiary opacity-60 active:opacity-100"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
