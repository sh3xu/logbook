"use client"

import * as React from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import type { AppKey } from "@/lib/ui-store"
import { useUIStore } from "@/lib/ui-store"

export default function CommandPalette({
  open = false,
  onOpenChange = () => {},
  onAction = () => {},
  onReset = () => {},
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAction?: (k: Exclude<AppKey, "palette" | null>) => void
  onReset?: () => void
}) {
  const { profile } = useUIStore()
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Open">
          <CommandItem onSelect={() => onAction("entry")}>Create New Entry</CommandItem>
          <CommandItem onSelect={() => onAction("logbook")}>Open Daily Logbook</CommandItem>
          <CommandItem onSelect={() => onAction("friends")}>Open Friends</CommandItem>
          <CommandItem onSelect={() => onAction("profile")}>Open Profile</CommandItem>
          <CommandItem onSelect={() => onAction("manual")}>Open Manual</CommandItem>
          {profile.isAdmin && <CommandItem onSelect={() => onAction("requests")}>Open Feature Requests</CommandItem>}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="System">
          <CommandItem
            onSelect={() => {
              onReset()
            }}
          >
            Reset Desktop
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
