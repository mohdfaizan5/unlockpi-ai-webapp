"use client";

import { Render } from "@puckeditor/core";
import {
  BotIcon,
  CaptionsIcon,
  CaptionsOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStopIcon,
  ExpandIcon,
  Grid2X2Icon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  PanelRightIcon,
  PauseIcon,
  PlayIcon,
  PowerIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AgentState } from "@livekit/components-react";
import type { RemoteAudioTrack } from "livekit-client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import { CopilotPanel } from "@/features/canvas/components/copilot-panel";
import { AgentAudioVisualizerWave } from "@/features/talk/components/agent-audio-visualizer-wave";
import {
  type CanvasRealtimeAction,
  type CanvasRealtimeStatus,
  type RealtimeActivity,
  useCanvasRealtimeSession,
} from "@/features/canvas/hooks/use-canvas-realtime-session";
import { useCopilotPanel } from "@/features/canvas/hooks/use-copilot-panel";
import type { PanelGenerateRequest } from "@/features/canvas/lib/panel-generation";
import { useEdgeReveal } from "@/features/canvas/hooks/use-edge-reveal";
import {
  applyCanvasAction,
  summarizeCanvas,
} from "@/features/canvas/lib/canvas-commands";
import {
  describeFrameForModel,
  getCanvasPresentationFrames,
} from "@/features/canvas/lib/canvas-presentation";
import type {
  CanvasAiAction,
  CanvasDocument,
} from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";

export type CanvasPresentationMode = "manual" | "voice" | "companion";

type CanvasPresenterProps = {
  canvasId?: string | null;
  document: CanvasDocument;
  initialFrameId?: string | null;
  mode?: CanvasPresentationMode;
  onClose?: () => void;
  publicView?: boolean;
  title: string;
};

export function CanvasPresenter({
  canvasId,
  document: authoredDocument,
  initialFrameId,
  mode = "manual",
  onClose,
  publicView = false,
  title,
}: CanvasPresenterProps) {
  const [runtimeDocument, setRuntimeDocument] = useState(() =>
    structuredClone(authoredDocument),
  );
  const [selectedMode, setSelectedMode] =
    useState<CanvasPresentationMode>(mode);
  const [hasLiveChanges, setHasLiveChanges] = useState(false);
  const frames = useMemo(
    () => getCanvasPresentationFrames(runtimeDocument),
    [runtimeDocument],
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      frames.findIndex((frame) => frame.id === initialFrameId),
    ),
  );
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pointerStartRef = useRef<number | null>(null);
  const presenterRef = useRef<HTMLDivElement | null>(null);
  const activeFrame = frames[activeIndex] ?? null;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (frames.length === 0) return;
      const boundedIndex = Math.min(Math.max(nextIndex, 0), frames.length - 1);
      setDirection(boundedIndex < activeIndex ? "backward" : "forward");
      setActiveIndex(boundedIndex);
      setOverviewOpen(false);
    },
    [activeIndex, frames.length],
  );

  const applyRealtimeAction = useCallback(
    (action: CanvasRealtimeAction) => {
      const navigationIndex = resolveNavigationIndex(
        action,
        frames,
        activeIndex,
      );
      if (navigationIndex !== null) {
        goTo(navigationIndex);
        const frame = frames[navigationIndex];
        return frame
          ? `Frame ${navigationIndex + 1} of ${frames.length}: ${frame.title}`
          : "No frame is available.";
      }

      const canvasAction = toCanvasAction(action);
      if (!canvasAction || !activeFrame) {
        return "The requested live visual change could not be applied.";
      }

      const result = applyCanvasAction(
        runtimeDocument,
        activeFrame.id,
        canvasAction,
      );
      const nextFrames = getCanvasPresentationFrames(result.document);
      setRuntimeDocument(result.document);
      setActiveIndex(
        Math.max(
          0,
          nextFrames.findIndex((frame) => frame.id === result.activeSlideId),
        ),
      );
      setHasLiveChanges(true);

      return `${result.message}\n${summarizeCanvas(result.document, result.activeSlideId)}`;
    },
    [activeFrame, activeIndex, frames, goTo, runtimeDocument],
  );

  const panel = useCopilotPanel();
  const [panelOpen, setPanelOpen] = useState(false);
  const { addPending: addPanelItem, resolve: resolvePanelItem } = panel;
  const lastPanelRequestRef = useRef<{ key: string; at: number } | null>(null);

  // When the AI asks to show something in the panel: open it, drop a skeleton
  // in instantly, then generate independently and stream the result in. Because
  // this lives in the panel (not on the frame), navigating away never breaks it.
  const handlePanelRequest = useCallback(
    async (request: PanelGenerateRequest) => {
      // Defensive dedupe: if the AI calls show_in_panel again for the same
      // type+topic within a few seconds (e.g. from a forced follow-up
      // response), don't spawn a second skeleton/generation for it.
      const key = `${request.type}:${request.topic}`;
      const now = Date.now();
      if (
        lastPanelRequestRef.current?.key === key &&
        now - lastPanelRequestRef.current.at < 6000
      ) {
        return;
      }
      lastPanelRequestRef.current = { key, at: now };

      setPanelOpen(true);
      const itemId = addPanelItem(request.type, request.topic);
      try {
        const frameContext = activeFrame
          ? describeFrameForModel(activeFrame, frames.length)
          : undefined;
        const response = await fetch("/api/canvas/panel-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, frameContext }),
        });
        const data = await response.json();
        if (!response.ok || !data.content) {
          throw new Error(data.error ?? "Generation failed.");
        }
        resolvePanelItem(itemId, {
          status: "ready",
          content: data.content,
          topic: data.topic ?? request.topic,
          language: data.language,
        });
      } catch {
        resolvePanelItem(itemId, { status: "error" });
      }
    },
    [activeFrame, frames.length, addPanelItem, resolvePanelItem],
  );

  const realtimeSession = useCanvasRealtimeSession({
    canvasId,
    canvasTitle: title,
    frames,
    mode: selectedMode === "companion" ? "companion" : "director",
    onAction: applyRealtimeAction,
    onPanelRequest: handlePanelRequest,
  });

  const {
    activity: aiActivity,
    caption: aiCaption,
    isConnected: aiConnected,
    remoteAudioStream,
    status: aiStatus,
    syncFrameContext,
  } = realtimeSession;

  // `AgentAudioVisualizerWave` drives its "speaking" amplitude from LiveKit's
  // `useTrackVolume`, which only ever reads `.mediaStream` and
  // `.mediaStreamTrack` off the track (verified in the bundle). A minimal shim
  // over the raw WebRTC stream satisfies it without constructing a full LiveKit
  // RemoteAudioTrack — that's what makes the wave move with the actual voice.
  const aiAudioTrack = useMemo(() => {
    const track = remoteAudioStream?.getAudioTracks()[0];
    if (!remoteAudioStream || !track) {
      return undefined;
    }
    return {
      mediaStream: remoteAudioStream,
      mediaStreamTrack: track,
    } as unknown as RemoteAudioTrack;
  }, [remoteAudioStream]);
  const [captionsOn, setCaptionsOn] = useState(true);

  // Presenter chrome (header + footer + activity/live-changes pills) auto-hides
  // when the mouse sits still, so the whole viewport is usable for teaching.
  // Move the mouse and both reveal; hovering the top/bottom edges keeps the
  // matching bar pinned. In publicView (embedded), we keep them always visible.
  const edgeReveal = useEdgeReveal();
  const topVisible = publicView ? true : edgeReveal.top;
  const bottomVisible = publicView ? true : edgeReveal.bottom;

  // Give the AI sight: every time the visible frame changes — whether the
  // teacher navigated manually or the AI did — tell the model exactly what is
  // now on screen. Also fires on connect (aiConnected flips true), so the AI
  // gets its bearings the moment it joins. This is what stops it going blind
  // after the first second.
  useEffect(() => {
    if (!aiConnected || !activeFrame) return;
    syncFrameContext(describeFrameForModel(activeFrame, frames.length));
  }, [aiConnected, activeFrame, frames.length, syncFrameContext]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowRight" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        goTo(activeIndex + 1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goTo(activeIndex - 1);
      }
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(frames.length - 1);
      if (event.key === "Escape" && overviewOpen) setOverviewOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, frames.length, goTo, overviewOpen]);

  useEffect(() => {
    const syncFullscreen = () =>
      setIsFullscreen(Boolean(window.document.fullscreenElement));
    window.document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      window.document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (window.document.fullscreenElement) {
      await window.document.exitFullscreen();
    } else {
      await presenterRef.current?.requestFullscreen();
    }
  };

  const selectMode = (nextMode: CanvasPresentationMode) => {
    if (nextMode === selectedMode) return;
    realtimeSession.disconnect();
    setSelectedMode(nextMode);
  };

  const resetLiveChanges = () => {
    const nextDocument = structuredClone(authoredDocument);
    const nextFrames = getCanvasPresentationFrames(nextDocument);
    const currentFrameId = activeFrame?.id;
    setRuntimeDocument(nextDocument);
    setActiveIndex(
      Math.max(
        0,
        nextFrames.findIndex((frame) => frame.id === currentFrameId),
      ),
    );
    setHasLiveChanges(false);
  };

  const endClass = () => {
    realtimeSession.disconnect();
    onClose?.();
  };

  if (!activeFrame) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        This canvas has no frames yet.
      </div>
    );
  }

  return (
    <div
      ref={presenterRef}
      className={cn(
        // Header/footer are now absolute overlays inside this container,
        // so it just needs to be a full-viewport positioned box — no flex
        // column with sticky-height children.
        "canvas-presenter relative h-svh w-full overflow-hidden bg-background text-foreground",
        !publicView && "fixed inset-0 z-[100]",
      )}
    >
      <header
        {...edgeReveal.topHoverHandlers}
        className={cn(
          // Fixed overlay so it floats over the presentation instead of
          // eating the top 4rem of every frame. Slight bg translucency so
          // the slide beneath is faintly visible — reads as a temporary
          // control layer, not a page chrome.
          "absolute inset-x-0 top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-2 backdrop-blur-xl transition-[opacity,transform] duration-200 ease-out sm:px-6",
          topVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
          <p className="text-xs text-muted-foreground">
            Frame {activeIndex + 1} of {frames.length} / {activeFrame.title}
          </p>
        </div>

        {!publicView ? (
          <div className="order-3 flex w-full items-center justify-center gap-0.5 rounded-lg bg-muted p-0.5 md:order-none md:w-auto">
            <ModeButton
              active={selectedMode === "manual"}
              label="Manual"
              onClick={() => selectMode("manual")}
            />
            <ModeButton
              active={selectedMode === "voice"}
              icon={<MicIcon className="size-3.5" />}
              label="Copilot"
              onClick={() => selectMode("voice")}
            />
            <ModeButton
              active={selectedMode === "companion"}
              icon={<BotIcon className="size-3.5" />}
              label="Co-teacher"
              onClick={() => selectMode("companion")}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-1.5">
          {!publicView && selectedMode !== "manual" ? (
            <RealtimeControls session={realtimeSession} />
          ) : null}
          {!publicView && selectedMode !== "manual" ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label={captionsOn ? "Hide captions" : "Show captions"}
              title={captionsOn ? "Hide captions" : "Show captions"}
              onClick={() => setCaptionsOn((on) => !on)}
            >
              {captionsOn ? (
                <CaptionsIcon className="size-4" />
              ) : (
                <CaptionsOffIcon className="size-4 text-muted-foreground" />
              )}
            </Button>
          ) : null}
          {!publicView && selectedMode !== "manual" ? (
            <Button
              size="icon"
              variant="ghost"
              className="relative"
              aria-label={panelOpen ? "Hide Copilot panel" : "Show Copilot panel"}
              onClick={() => setPanelOpen((open) => !open)}
            >
              <PanelRightIcon className="size-4" />
              {!panelOpen && panel.items.length > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
              ) : null}
            </Button>
          ) : null}
          {hasLiveChanges ? (
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground"
              aria-label="Reset temporary class changes"
              title="Reset temporary class changes"
              onClick={resetLiveChanges}
            >
              <RotateCcwIcon className="size-4" />
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Open frame overview"
            onClick={() => setOverviewOpen((open) => !open)}
          >
            <Grid2X2Icon className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? (
              <MinimizeIcon className="size-4" />
            ) : (
              <ExpandIcon className="size-4" />
            )}
          </Button>
          {onClose ? (
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="End class"
              onClick={endClass}
            >
              <CircleStopIcon className="size-4" />
              <span className="hidden sm:inline">End class</span>
            </Button>
          ) : null}
        </div>
      </header>

      {aiActivity ? (
        <div
          className={cn(
            // Pinned just below the header — fades with it so nothing floats
            // in the middle of the frame when chrome is hidden.
            "pointer-events-none absolute left-1/2 top-[4.75rem] z-30 flex max-w-[80vw] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium backdrop-blur-xl transition-opacity duration-200",
            topVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              aiActivity.kind === "listening"
                ? "bg-muted-foreground"
                : "animate-pulse bg-primary",
            )}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">{activityVerb(aiActivity.kind)}</span>
          <span className="truncate text-foreground">{aiActivity.label}</span>
        </div>
      ) : null}

      {hasLiveChanges ? (
        <div
          className={cn(
            "absolute left-4 top-[4.75rem] z-30 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl transition-opacity duration-200",
            topVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
          Live-only changes · not saved to canvas
        </div>
      ) : null}

      {/* Fills the whole viewport now that the header/footer are overlays. */}
      <div className="absolute inset-0 flex">
        <main
          className="relative grid flex-1 place-items-center overflow-hidden"
          onPointerDown={(event) => {
            pointerStartRef.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (pointerStartRef.current === null) return;
            const distance = event.clientX - pointerStartRef.current;
            pointerStartRef.current = null;
            if (Math.abs(distance) < 70) return;
            goTo(activeIndex + (distance < 0 ? 1 : -1));
          }}
        >
          {aiConnected ? (
            // Anchored inside `main` (not the outer presenter) so it shares the
            // same box the frame card centers in — when the Copilot panel opens
            // and narrows `main`, both move together instead of drifting into
            // each other. `main`'s overflow-hidden also clips it from ever
            // reaching into the panel. z-0, below the frame card's z-10, so the
            // card visually wins any overlap rather than drawing over it.
            //
            // The panel eats into main's width, so the wave itself shrinks
            // (xl -> sm) rather than relying on overflow-hidden to crop it —
            // clipping read as a cut-off shape, not a resize.
            <div className="pointer-events-none absolute left-4 top-1/2 z-0 -translate-y-1/2">
              <AgentAudioVisualizerWave
                size={panelOpen ? "sm" : "xl"}
                color="#ff0d00"
                colorShift={0.06}
                lineWidth={1.8}
                state={toAgentVisualizerState(aiStatus, aiActivity)}
                audioTrack={aiAudioTrack}
                className="mx-auto aspect-square size-auto h-full transition-[height,width] duration-300 ease-out"
              />
            </div>
          ) : null}

          <div
            key={activeFrame.id}
            className={cn(
              // Fills the whole viewport — no width/height cap. The slide's
              // own layout (SlideBlock in canvas-puck-config) already caps its
              // internal content at max-w-5xl and centers it, so the block
              // stays readable while the outer surface goes edge-to-edge and
              // aspect ratios inside are unaffected.
              "canvas-presenter-frame relative z-10 h-full w-full animate-in fade-in duration-300",
              direction === "forward"
                ? "slide-in-from-right-8"
                : "slide-in-from-left-8",
            )}
          >
            <Render config={canvasPuckConfig} data={activeFrame.document} />
          </div>

          <FrameArrow
            direction="previous"
            disabled={activeIndex === 0}
            onClick={() => goTo(activeIndex - 1)}
          />
          <FrameArrow
            direction="next"
            disabled={activeIndex === frames.length - 1}
            onClick={() => goTo(activeIndex + 1)}
          />
        </main>

        {!publicView && selectedMode !== "manual" && panelOpen ? (
          <CopilotPanel
            items={panel.items}
            onClose={() => setPanelOpen(false)}
            onRemove={panel.remove}
          />
        ) : null}
      </div>

      <footer
        {...edgeReveal.bottomHoverHandlers}
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 flex h-12 items-center justify-center gap-1 border-t border-border bg-background/80 px-4 backdrop-blur-xl transition-[opacity,transform] duration-200 ease-out",
          bottomVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        {frames.map((frame) => (
          <button
            key={frame.id}
            type="button"
            aria-label={`Go to frame ${frame.index + 1}`}
            onClick={() => goTo(frame.index)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              frame.index === activeIndex
                ? "w-8 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60",
            )}
          />
        ))}
      </footer>

      {captionsOn && aiCaption ? (
        // Captions ride just above the footer bar — fade together so the
        // caption doesn't linger over the frame after the chrome goes.
        <div
          className={cn(
            "pointer-events-none absolute bottom-20 left-1/2 z-30 w-[min(90%,42rem)] -translate-x-1/2 rounded-xl border border-border bg-background/85 px-4 py-2.5 text-center text-sm leading-snug text-foreground shadow-lg backdrop-blur-xl transition-opacity duration-200",
            bottomVisible ? "opacity-100" : "opacity-0",
          )}
        >
          {aiCaption}
        </div>
      ) : null}

      {realtimeSession.error ? (
        <div className="absolute bottom-16 left-1/2 z-30 -translate-x-1/2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive shadow-xl backdrop-blur-xl">
          {realtimeSession.error}
        </div>
      ) : null}

      {overviewOpen ? (
        <FrameOverview
          activeIndex={activeIndex}
          frames={frames}
          onClose={() => setOverviewOpen(false)}
          onSelect={goTo}
        />
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-[color,background-color,box-shadow]",
        active
          ? "bg-background text-foreground shadow-sm/5"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function RealtimeControls({
  session,
}: {
  session: ReturnType<typeof useCanvasRealtimeSession>;
}) {
  return (
    <div className="mr-1 flex items-center gap-1">
      {!session.isConnected ? (
        session.status === "connecting" ? (
          <Spinner className="size-5 text-primary" aria-label="Connecting" />
        ) : (
          <Button size="sm" onClick={() => void session.connect()}>
            <PowerIcon aria-hidden="true" />
            Connect AI
          </Button>
        )
      ) : (
        <>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={session.togglePause}
            aria-label={
              session.isPaused ? "Resume listening" : "Pause listening"
            }
          >
            {session.isPaused ? (
              <PlayIcon className="size-3.5" />
            ) : (
              <PauseIcon className="size-3.5" />
            )}
          </Button>
          <span className="hidden items-center gap-1.5 px-1 text-[11px] font-medium text-muted-foreground lg:flex">
            <span
              className={cn(
                "size-1.5 rounded-full",
                session.isPaused
                  ? "bg-muted-foreground"
                  : "animate-pulse bg-primary",
              )}
              aria-hidden="true"
            />
            {session.isPaused ? "Paused" : "Live"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={session.disconnect}
          >
            <MicOffIcon className="size-3.5" />
            <span className="hidden xl:inline">Disconnect</span>
          </Button>
        </>
      )}
    </div>
  );
}

function FrameArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "next" ? ChevronRightIcon : ChevronLeftIcon;
  return (
    <button
      type="button"
      aria-label={`${direction === "next" ? "Next" : "Previous"} frame`}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "absolute z-20 grid size-11 place-items-center rounded-full border bg-card/80 text-foreground shadow-lg backdrop-blur-xl transition hover:bg-accent disabled:pointer-events-none disabled:opacity-20",
        direction === "next" ? "right-2 sm:right-5" : "left-2 sm:left-5",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function FrameOverview({
  activeIndex,
  frames,
  onClose,
  onSelect,
}: {
  activeIndex: number;
  frames: ReturnType<typeof getCanvasPresentationFrames>;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-background/95 p-5 backdrop-blur-xl sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Overview
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Choose a frame</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Close frame overview"
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              onClick={() => onSelect(frame.index)}
              className={cn(
                "rounded-2xl border bg-card p-4 text-left outline-none transition hover:-translate-y-0.5 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                frame.index === activeIndex && "border-primary",
              )}
            >
              <div className="mb-8 aspect-video rounded-xl bg-muted/40 p-4">
                <span className="text-4xl font-semibold text-muted-foreground/40">
                  {String(frame.index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Frame {frame.index + 1}</p>
              <p className="mt-1 truncate font-semibold">{frame.title}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * `AgentAudioVisualizerWave` and its animation hook take a LiveKit `AgentState`
 * purely as a prop — they don't call `useAgent()` or read from a LiveKit Room
 * themselves, so they work here even though this session is an OpenAI
 * Realtime WebRTC connection with no LiveKit room in the tree. This just maps
 * our own connection status/activity onto that same state vocabulary.
 */
function toAgentVisualizerState(
  status: CanvasRealtimeStatus,
  activity: RealtimeActivity | null,
): AgentState {
  if (status === "connecting") return "connecting";
  if (status === "error") return "failed";
  if (status === "idle") return "disconnected";

  // status is "connected" or "paused" here.
  if (!activity) return "idle";

  switch (activity.kind) {
    case "listening":
      return "listening";
    case "generating":
    case "navigating":
      return "thinking";
    case "explaining":
    case "walkthrough":
      return "speaking";
  }
}

function activityVerb(kind: NonNullable<ReturnType<typeof useCanvasRealtimeSession>["activity"]>["kind"]) {
  switch (kind) {
    case "listening":
      return "Listening";
    case "navigating":
      return "Showing";
    case "explaining":
      return "Explaining";
    case "generating":
      return "Creating";
    case "walkthrough":
      return "Walkthrough";
  }
}

function resolveNavigationIndex(
  action: CanvasRealtimeAction,
  frames: ReturnType<typeof getCanvasPresentationFrames>,
  activeIndex: number,
) {
  if (action.action === "next")
    return Math.min(activeIndex + 1, frames.length - 1);
  if (action.action === "previous") return Math.max(activeIndex - 1, 0);
  if (action.action === "first") return 0;
  if (action.action === "last") return Math.max(frames.length - 1, 0);
  if (action.action === "goto" && action.frame_number) {
    return Math.min(Math.max(action.frame_number - 1, 0), frames.length - 1);
  }
  if (action.action === "find" && action.query) {
    const words = action.query.toLowerCase().split(/\s+/).filter(Boolean);
    const match = frames
      .map((frame) => ({
        frame,
        score: words.filter((word) => frame.searchText.includes(word)).length,
      }))
      .sort((left, right) => right.score - left.score)[0];
    return match?.score ? match.frame.index : activeIndex;
  }
  return null;
}

function toCanvasAction(action: CanvasRealtimeAction): CanvasAiAction | null {
  if (action.action === "add_array") {
    return {
      action: "add_array_block",
      title: action.title,
      values: action.values,
    };
  }
  if (action.action === "set_array") {
    return { action: "set_array_values", values: action.values ?? [] };
  }
  if (action.action === "resize_array") {
    return { action: "resize_array", length: action.length ?? 4 };
  }
  if (action.action === "highlight_array_index") {
    return { action: "highlight_array_index", index: action.index };
  }
  if (action.action === "clear_array_highlight") {
    return { action: "highlight_array_index" };
  }
  return null;
}
