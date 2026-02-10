"use client";

import type React from "react";

import { X, GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/ui-store";

export default function DesktopWindow({
  appKey = "about",
  title = "Window",
  children,
  zIndex = 100,
  onClose = () => {},
  onFocus = () => {},
}: {
  appKey: string;
  title?: string;
  children?: React.ReactNode;
  zIndex?: number;
  onClose?: () => void;
  onFocus?: () => void;
}) {
  const { windowLayouts, setWindowLayout } = useUIStore();

  const WINDOW_WIDTH = 800;
  const MAX_HEIGHT_VH = 0.7;

  const clampPosition = (x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const maxH = window.innerHeight * MAX_HEIGHT_VH;
    const maxX = Math.max(0, window.innerWidth - WINDOW_WIDTH);
    const maxY = Math.max(0, window.innerHeight - maxH);
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  };

  const getInitialPos = () => {
    if (windowLayouts[appKey]) {
      return clampPosition(windowLayouts[appKey].x, windowLayouts[appKey].y);
    }
    if (typeof window !== "undefined") {
      const centerX = (window.innerWidth - WINDOW_WIDTH) / 2;
      const maxH = window.innerHeight * MAX_HEIGHT_VH;
      const centerY = (window.innerHeight - maxH) / 2;
      return clampPosition(centerX, centerY);
    }
    return { x: 20, y: 80 };
  };

  const winRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const pos = useRef<{ x: number; y: number }>(getInitialPos());
  const grabbing = useRef(false);
  const start = useRef<{ x: number; y: number; sx: number; sy: number }>({
    x: 0,
    y: 0,
    sx: 0,
    sy: 0,
  });
  const rafRef = useRef<number | null>(null);

  const layout = windowLayouts[appKey];

  const applyTransform = () => {
    if (!winRef.current) return;
    if (window.innerWidth >= 768) {
      const clamped = clampPosition(pos.current.x, pos.current.y);
      pos.current.x = clamped.x;
      pos.current.y = clamped.y;
      winRef.current.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;
    } else {
      winRef.current.style.transform = "none";
    }
  };

  // Ensure we apply the initial/correct transform on mount
  useEffect(() => {
    applyTransform();
  }, []);

  useEffect(() => {
    if (layout && (layout.x !== pos.current.x || layout.y !== pos.current.y)) {
      pos.current = clampPosition(layout.x, layout.y);
      applyTransform();
    }
  }, [layout?.x, layout?.y]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    // Mobile check to disable dragging logic entirely
    if (window.innerWidth < 768) return;

    const onPointerDown = (e: PointerEvent) => {
      // Double check inside handler just in case of resize
      if (window.innerWidth < 768) return;
      grabbing.current = true;
      onFocus();
      start.current = {
        x: e.clientX,
        y: e.clientY,
        sx: pos.current.x,
        sy: pos.current.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!grabbing.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const next = clampPosition(start.current.sx + dx, start.current.sy + dy);
      pos.current.x = next.x;
      pos.current.y = next.y;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(applyTransform);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (grabbing.current) {
        setWindowLayout(appKey, { x: pos.current.x, y: pos.current.y });
      }
      grabbing.current = false;
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onFocus, appKey]);

  return (
    <div
      ref={winRef}
      className={cn(
        "will-change-transform overflow-hidden",
        "fixed left-4 right-4 top-20 bottom-28 z-[35] flex min-h-0 flex-col",
        "md:absolute md:inset-auto md:top-0 md:left-0 md:w-[800px] md:block md:p-0 md:z-auto",
      )}
      style={{
        zIndex:
          typeof window !== "undefined" && window.innerWidth < 768
            ? 35
            : zIndex,
        height: "80vh",
        maxHeight: "80vh",
      }}
      // We will conditionally apply the transform via ref in the useEffect or just override it in CSS.
      // Let's modify the useEffect to only apply transform if window.innerWidth >= 768.
      onMouseDown={onFocus}
      onTouchStart={onFocus}
    >
      <div className="w-full h-full min-h-0 max-h-full border-[3px] border-black bg-white shadow-[6px_6px_0_0_#000] md:shadow-[10px_10px_0_0_#000] rounded-md overflow-hidden flex flex-col">
        <div
          ref={headerRef}
          className={cn(
            "flex items-center justify-between px-3 py-2 border-b-[3px] border-black touch-none shrink-0",
            "bg-[#FAFAF0]",
            "pointer-events-none md:pointer-events-auto md:cursor-grab md:active:cursor-grabbing", // Disable drag on mobile
          )}
          style={{ userSelect: "none" }}
        >
          <div className="flex items-center gap-2">
            <GripVertical
              className="w-5 h-5 hidden md:block"
              aria-hidden="true"
            />
            {/* Show title centered or left depending on preference, keep as is */}
            <div className="font-black text-lg md:text-xl truncate">
              {title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 hidden md:grid place-items-center border-[3px] border-black rounded-md bg-white hover:translate-y-[-1px] transition-transform"
            aria-label={`Close ${title}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto bg-white overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
