"use client";

import { useEffect, useState } from "react";

type UseEdgeRevealOptions = {
  /**
   * Height of the mouse-hover hotzone at each edge, in px. Header shows only
   * while the pointer is inside the top band; footer only inside the bottom
   * band. Hovering the middle of the page does nothing — that's what makes
   * the whole viewport usable for presenting.
   */
  hotzone?: number;
};

/**
 * Edge-only chrome reveal. Header and footer are ONLY visible while the
 * pointer is inside their respective hotzone at the top/bottom of the
 * viewport, plus a short pin when the mouse is over the bar itself so a slow
 * move to a button doesn't cause it to vanish under you.
 *
 * There is no idle timer and no "any mouse move reveals": general movement
 * across the middle of the frame stays quiet.
 */
export function useEdgeReveal({ hotzone = 96 }: UseEdgeRevealOptions = {}) {
  const [topVisible, setTopVisible] = useState(false);
  const [bottomVisible, setBottomVisible] = useState(false);
  const [topPinned, setTopPinned] = useState(false);
  const [bottomPinned, setBottomPinned] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setTopVisible(event.clientY <= hotzone);
      setBottomVisible(event.clientY >= window.innerHeight - hotzone);
    };

    // Hide both when the mouse leaves the window entirely — no ghost bars.
    const handleMouseLeave = () => {
      setTopVisible(false);
      setBottomVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hotzone]);

  return {
    top: topVisible || topPinned,
    bottom: bottomVisible || bottomPinned,
    /** Attach to the bar itself so hovering the bar keeps it visible. */
    topHoverHandlers: {
      onPointerEnter: () => setTopPinned(true),
      onPointerLeave: () => setTopPinned(false),
      onFocus: () => setTopPinned(true),
      onBlur: () => setTopPinned(false),
    },
    bottomHoverHandlers: {
      onPointerEnter: () => setBottomPinned(true),
      onPointerLeave: () => setBottomPinned(false),
      onFocus: () => setBottomPinned(true),
      onBlur: () => setBottomPinned(false),
    },
  };
}
