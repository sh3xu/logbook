"use client"

import type React from "react"

import { X, GripVertical } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/lib/ui-store"

export default function DesktopWindow({
  appKey = "about",
  title = "Window",
  children,
  zIndex = 100,
  onClose = () => {},
  onFocus = () => {},
}: {
  appKey: string
  title?: string
  children?: React.ReactNode
  zIndex?: number
  onClose?: () => void
  onFocus?: () => void
}) {
  const { windowLayouts, setWindowLayout } = useUIStore()
  
  // Return stored layout or a default centered-ish one
  const getInitialPos = () => {
    if (windowLayouts[appKey]) return { x: windowLayouts[appKey].x, y: windowLayouts[appKey].y }
    if (typeof window !== "undefined") {
      const centerX = Math.max(40, (window.innerWidth - 800) / 2)
      const centerY = Math.max(40, (window.innerHeight - 500) / 2)
      return { x: centerX, y: centerY }
    }
    return { x: 20, y: 80 }
  }

  const winRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const pos = useRef<{ x: number; y: number }>(getInitialPos())
  const grabbing = useRef(false)
  const start = useRef<{ x: number; y: number; sx: number; sy: number }>({ x: 0, y: 0, sx: 0, sy: 0 })
  const rafRef = useRef<number | null>(null)

  const layout = windowLayouts[appKey]

  const applyTransform = () => {
    if (!winRef.current) return
    // Only apply transform on desktop (md breakpoint is usually 768px, lets use 768)
    if (window.innerWidth >= 768) {
      const { x, y } = pos.current
      winRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
    } else {
      winRef.current.style.transform = "none"
    }
  }

  // Ensure we apply the initial/correct transform on mount
  useEffect(() => {
    applyTransform()
  }, [])

  // Sync ref with store layout if it changes externally (like reset)
  useEffect(() => {
    if (layout && (layout.x !== pos.current.x || layout.y !== pos.current.y)) {
      pos.current = { x: layout.x, y: layout.y }
      applyTransform()
    }
  }, [layout?.x, layout?.y])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    // Mobile check to disable dragging logic entirely
    if (window.innerWidth < 768) return

    const onPointerDown = (e: PointerEvent) => {
      // Double check inside handler just in case of resize
      if (window.innerWidth < 768) return
      grabbing.current = true
      onFocus()
      start.current = { x: e.clientX, y: e.clientY, sx: pos.current.x, sy: pos.current.y }
      ;(e.target as Element).setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!grabbing.current) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      pos.current.x = start.current.sx + dx
      pos.current.y = start.current.sy + dy
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(applyTransform)
    }
    const onPointerUp = (e: PointerEvent) => {
      if (grabbing.current) {
        setWindowLayout(appKey, { x: pos.current.x, y: pos.current.y })
      }
      grabbing.current = false
      try {
        ;(e.target as Element).releasePointerCapture(e.pointerId)
      } catch {}
    }

    el.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)

    return () => {
      el.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [onFocus, appKey])

  return (
    <div
      ref={winRef}
      className={cn(
        "will-change-transform",
        // Mobile: Fixed position with space for Top Bar and Dock
        // Top Bar ~60px, Dock ~90px.
        // We use safe margins to ensure it doesn't overlap.
        "fixed left-4 right-4 top-20 bottom-28 z-[35] flex flex-col", 
        "md:absolute md:inset-auto md:top-0 md:left-0 md:w-[800px] md:block md:p-0 md:z-auto", // Desktop overrides
      )}
      style={{ 
        // Use styled zIndex on desktop, but on mobile we fixed it to 35 via class (which might be overridden by style, so we need to be careful).
        // The inline style 'zIndex' will override the tailwind class 'z-[35]'.
        // We should probably rely on the layout constraints to avoid overlap.
        zIndex: typeof window !== 'undefined' && window.innerWidth < 768 ? 35 : zIndex,
        // Only apply transform on desktop
      }}
      // We will conditionally apply the transform via ref in the useEffect or just override it in CSS.
      // Let's modify the useEffect to only apply transform if window.innerWidth >= 768.
      onMouseDown={onFocus}
      onTouchStart={onFocus}
    >
      <div className="w-full h-full border-[3px] border-black bg-white shadow-[6px_6px_0_0_#000] md:shadow-[10px_10px_0_0_#000] rounded-md overflow-hidden flex flex-col">
        <div
          ref={headerRef}
          className={cn(
            "flex items-center justify-between px-3 py-2 border-b-[3px] border-black touch-none shrink-0",
            "bg-[#FAFAF0]",
            "pointer-events-none md:pointer-events-auto md:cursor-grab md:active:cursor-grabbing" // Disable drag on mobile
          )}
          style={{ userSelect: "none" }}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-5 h-5 hidden md:block" aria-hidden="true" />
             {/* Show title centered or left depending on preference, keep as is */}
            <div className="font-black text-lg md:text-xl truncate">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center border-[3px] border-black rounded-md bg-white hover:translate-y-[-1px] transition-transform hidden md:grid" // Hide close on mobile
            aria-label={`Close ${title}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-white overscroll-contain">{children}</div>
      </div>
    </div>
  )
}
