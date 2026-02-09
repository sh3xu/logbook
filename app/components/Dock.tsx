"use client"

import type React from "react"
import { BookOpen, PlusCircle, Users, User, HelpCircle, Palette, MessageSquare } from "lucide-react"
import { useUIStore, type AppKey } from "@/lib/ui-store"
import { cn, getTodayDateString } from "@/lib/utils"

const ACCENT = "#FF2E63"

type DockItem = {
  key: Exclude<AppKey, "palette" | null>
  label: string
  icon: React.ComponentType<any>
}

const ITEMS: DockItem[] = [
  { key: "entry", label: "New Entry", icon: PlusCircle },
  { key: "logbook", label: "Logbook", icon: BookOpen },
  { key: "friends", label: "Friends", icon: Users },
  { key: "profile", label: "Profile", icon: User },
  { key: "requests", label: "Features", icon: MessageSquare },
]

export default function Dock({
  activeApp = null,
  onOpen = () => {},
  onOpenPalette = () => {},
}: {
  activeApp?: AppKey | null
  onOpen?: (k: Exclude<AppKey, "palette" | null>) => void
  onOpenPalette?: () => void
}) {
  const { entries, profile } = useUIStore()
  const todayEntryExists = entries.some(e => e.date === getTodayDateString())


  return (
    <div className="flex items-center gap-3 bg-white border-[3px] border-black px-3 py-3 rounded-xl shadow-[6px_6px_0_0_#000]">
      {ITEMS.map((it) => {
        const Icon = it.icon
        const isActive = activeApp === it.key
        const isEntryApp = it.key === "entry"
        const isDisabled = isEntryApp && todayEntryExists

        return (
          <button
            key={it.key}
            onClick={() => !isDisabled && onOpen(it.key)}
            disabled={isDisabled}
            className={cn(
              "relative w-16 h-16 md:w-18 md:h-18 grid place-items-center border-[3px] border-black rounded-lg transition-all",
              isActive ? "shadow-[6px_6px_0_0_#000] bg-[#FAFAF0]" : "shadow-[4px_4px_0_0_#000] bg-[#FAFAF0]",
              isDisabled 
                ? "opacity-50 grayscale cursor-not-allowed border-gray-300 shadow-none bg-gray-50" 
                : "hover:translate-y-[-2px]",
              "focus-visible:outline-4",
            )}
            style={{ outlineColor: ACCENT }}
            aria-label={it.label}
            title={isDisabled ? "Today already logged. Delete to re-enter." : it.label}
          >
            <Icon className="w-7 h-7" />
            <span className="sr-only">{it.label}</span>
          </button>
        )
      })}

      {/* <div className="mx-1 w-[2px] self-stretch bg-black/20" />
      <button
        onClick={onOpenPalette}
        className={cn(
          "relative w-16 h-16 md:w-18 md:h-18 grid place-items-center border-[3px] border-black rounded-lg bg-[#FAFAF0]",
          "hover:translate-y-[-2px] transition-transform shadow-[4px_4px_0_0_#000]",
          "focus-visible:outline-4",
        )}
        style={{ outlineColor: ACCENT }}
        aria-label="Command Palette"
        title="Command Palette"
      >
        <Palette className="w-7 h-7" />
        <span className="sr-only">Command Palette</span>
      </button> */}
    </div>
  )
}
