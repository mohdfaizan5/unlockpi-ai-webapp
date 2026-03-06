/**
 * /talk route — Voice-only interface for talking to the UnlockPi AI agent.
 *
 * Layout (when connected):
 *   The LiveKitRoom fills the full viewport height.
 *   TalkVisualizer gets flex-1, giving it all remaining space after TalkBackground.
 *   Inside TalkVisualizer: compact header bar + full-height board + transcript overlay.
 */
"use client";

import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
    useVoiceAssistant,
    useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { useConnection } from "./_hooks/use-connection";
import { useBoardRPC } from "./_hooks/use-board-rpc";
import { useTranscript } from "./_hooks/use-transcript";
import { TalkVisualizer } from "./_components/talk-visualizer";
import { TalkTranscript } from "./_components/talk-transcript";
import { ConnectionScreen } from "./_components/connection-screen";
import { TalkBackground } from "./_components/talk-background";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TalkPage — top-level component
// ---------------------------------------------------------------------------
export default function TalkPage() {
    const { token, isConnecting, error, connect, disconnect } = useConnection();

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
                <ActiveRoom
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

// ---------------------------------------------------------------------------
// ActiveRoom — all interactive UI, lives inside <LiveKitRoom>.
// ---------------------------------------------------------------------------
interface ActiveRoomProps {
    connect: () => void;
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;
}

function ActiveRoom({ connect, isConnecting, isConnected, error }: ActiveRoomProps) {
    const { state, audioTrack } = useVoiceAssistant();
    const { localParticipant, microphoneTrack } = useLocalParticipant();

    // Board RPC State
    const { boardText, boardHighlights } = useBoardRPC();

    // Transcript State
    const { transcriptLog, liveAgentText, liveUserText } = useTranscript();

    // Build a TrackReferenceOrPlaceholder for the local mic
    const micTrackRef = microphoneTrack
        ? { participant: localParticipant, publication: microphoneTrack, source: Track.Source.Microphone }
        : undefined;

    // Whether we're truly "live" in a room
    const isLive = isConnected && state !== "disconnected" && state !== "connecting";

    return (
        // h-full so the inner flex column can stretch to 100vh from LivKitRoom
        <div className={cn(
            "flex flex-col h-full relative overflow-hidden transition-all duration-500",
            // Center content vertically only on the pre-connection screen
            !isConnected ? "items-center justify-center px-6 py-6 gap-6" : "items-stretch gap-0"
        )}>
            <TalkBackground state={state} />

            {/* TalkVisualizer grows to fill all remaining height when connected */}
            <TalkVisualizer
                state={state}
                isLive={isLive}
                isConnected={isConnected}
                audioTrack={audioTrack}
                micTrackRef={micTrackRef}
                liveAgentText={liveAgentText}
                boardText={boardText}
                boardHighlights={boardHighlights}
                onDisconnect={() => window.location.reload()}
                // Pass transcript as a slot so it renders overlaid on the board
                transcriptSlot={isLive ? (
                    <TalkTranscript
                        transcriptLog={transcriptLog}
                        liveAgentText={liveAgentText}
                        liveUserText={liveUserText}
                    />
                ) : undefined}
            />

            {/* ── Connect button (shown when not connected) ── */}
            {!isConnected && (
                <div className="mt-8">
                    <ConnectionScreen
                        connect={connect}
                        isConnecting={isConnecting}
                        error={error}
                    />
                </div>
            )}
        </div>
    );
}
