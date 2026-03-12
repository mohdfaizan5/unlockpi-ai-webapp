"use client";

import { useState } from "react";
import { useRpcHandler } from "@/hooks/use-rpc-handler";
import { useBoardState } from "./use-board-state";
import type { BoardOperation } from "@/types/board";

export function useBoardRPC() {
    // ── Legacy Board State (markdown content + word-level highlights) ──
    const [boardText, setBoardText] = useState("");
    const [boardHighlights, setBoardHighlights] = useState<
        { word: string; type: string; positions: number[] }[]
    >([]);

    // ── New Structured Board State ──
    const { boardDocument, dispatch } = useBoardState();

    // ── New RPC: board_operation — receives a single BoardOperation ──
    useRpcHandler("board_operation", async (payload: any) => {
        console.log("[RPC] board_operation:", payload);
        const op = payload as BoardOperation;
        if (op && op.type) {
            dispatch(op);
        }
        return JSON.stringify({ success: true });
    });

    // ── New RPC: set_board — full board replacement ──
    useRpcHandler("set_board", async (payload: any) => {
        console.log("[RPC] set_board:", payload);
        if (payload && payload.blocks) {
            dispatch({ type: "setBoard", document: payload });
            // Clear legacy state when structured board is active
            setBoardText("");
            setBoardHighlights([]);
        }
        return JSON.stringify({ success: true });
    });

    // ── Legacy RPC: update_content (markdown string) ──
    useRpcHandler("update_content", async (payload: any) => {
        console.log("[RPC] update_content:", payload);
        if (payload.text !== undefined) {
            setBoardText(payload.text);
            setBoardHighlights([]);
        }
        return JSON.stringify({ success: true });
    });

    // ── Legacy RPC: highlight_text (word-level highlights) ──
    useRpcHandler("highlight_text", async (payload: any) => {
        console.log("[RPC] highlight_text:", payload);
        if (payload.words) {
            setBoardHighlights(payload.words);
        }
        return JSON.stringify({ success: true });
    });

    // RPC: clear_board — clears both legacy and structured board
    useRpcHandler("clear_board", async () => {
        console.log("[RPC] clear_board");
        setBoardText("");
        setBoardHighlights([]);
        dispatch({ type: "setBoard", document: { id: "board-1", version: 0, blocks: [] } });
        return JSON.stringify({ success: true });
    });

    // RPC: show_student_focus — no-op on talk page
    useRpcHandler("show_student_focus", async (payload: any) => {
        console.log("[RPC] show_student_focus (ignored on talk page):", payload);
        return JSON.stringify({ success: true });
    });

    return { boardText, boardHighlights, boardDocument };
}
