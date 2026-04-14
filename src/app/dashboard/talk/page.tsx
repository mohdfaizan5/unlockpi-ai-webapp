/**
 * /talk route — Voice-only interface for talking to the UnlockPi AI agent.
 *
 * Layout (when connected):
 *   The LiveKitRoom fills the full viewport height.
 *   TalkVisualizer gets flex-1, giving it all remaining space after TalkBackground.
 *   Inside TalkVisualizer: compact header bar + full-height board + transcript overlay.
 */
"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { TalkRoomContent } from "./_components/talk-room-content";

// ---------------------------------------------------------------------------
// TalkPage — top-level component
// ---------------------------------------------------------------------------
export default function TalkPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session") ?? searchParams.get("sessionId");

    const [token, setToken] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);
        try {
            const tokenUrl = new URLSearchParams({
                room: "classroom-101",
                username: "teacher-interface",
            });

            if (sessionId) {
                tokenUrl.set("session_id", sessionId);
            }

            const resp = await fetch(`/api/token?${tokenUrl.toString()}`);
            const data = await resp.json();
            if (data.error) {
                setError(data.error);
                setIsConnecting(false);
                return;
            }
            setToken(data.accessToken);
        } catch {
            setError("Failed to connect. Is the server running?");
            setIsConnecting(false);
        }
    }, [sessionId]);

    const disconnect = useCallback(() => {
        setToken("");
        setIsConnecting(false);
        setError(null);
    }, []);

    return (
        <div className="min-h-screen bg-[var(--color-black)]">
            <LiveKitRoom
                video={false}
                audio={true}
                token={token || undefined}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                data-lk-theme="default"
                style={{ height: "100vh" }}
                onDisconnected={disconnect}
            >
                <TalkRoomContent
                    connect={connect}
                    isConnecting={isConnecting}
                    isConnected={!!token}
                    error={error}
                />
                <RoomAudioRenderer />
                <StartAudio label="Click to allow audio" />
            </LiveKitRoom>
        </div>
    );
}

/*
2 parts
- marketing site
- dashboard (protected by auth, contains the /talk route)

ANALOGY of the product: notebooklm for teachers but better with Voice:

dashboard layout: teachers/trainers
1. tools (aid teaching )
    1. debate coach (for practicing debate skills)
    2. 
2. main: unlockpi ai agent (/talk route)
    - optimizing for voice interaction (visual board)
    - heavy on livekit 
    - 


- vector/graph dbs;

*/ 