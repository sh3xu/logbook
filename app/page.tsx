"use client"

import { useEffect, useMemo, useState } from "react"

import { useUIStore, type AppKey } from "@/lib/ui-store"
import Eyes from "./components/Eyes"
import Dock from "./components/Dock"
import DesktopWindow from "./components/Window"
import CommandPalette from "./components/CommandPalette"
import Logbook from "./components/Logbook"
import Entry from "./components/Entry"
import Friends from "./components/Friends"
import Profile from "./components/Profile"
import Manual from "./components/Manual"
import Notifications from "./components/Notifications"
import KeySection from "./components/KeySection"
import FeatureRequests from "./components/FeatureRequests"
import { HelpCircle, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Modal from "./components/Modal"

type WindowSpec = {
  key: Exclude<AppKey, "palette" | null>
  title: string
  content: React.ReactNode
}

import { useAuth } from "@/hooks/use-auth"
import Landing from "@/components/Landing"

export default function Page() {
  const { session, loading } = useAuth()

  // Windows order doubles as z-order; last is topmost
  const [openApps, setOpenApps] = useState<Exclude<AppKey, "palette" | null>[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("logbook-open-apps")
      try {
        return stored ? JSON.parse(stored) : ["logbook"]
      } catch {
        return ["logbook"]
      }
    }
    return ["logbook"]
  })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { setActiveApp, activeApp, setWindowLayout, windowLayouts, setProfile, entries } = useUIStore()

  const [activeTopBarItem, setActiveTopBarItem] = useState<"key" | "notifications" | null>(null)

  // Sync profile and admin status on session change
  useEffect(() => {
    async function fetchProfile() {
      if (!session?.user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle()

      if (data && !error) {
        setProfile({
          id: data.id,
          username: data.username,
          name: data.full_name || "",
          avatar: data.avatar_url || (data.full_name ? data.full_name.charAt(0).toUpperCase() : "?"),
          bio: data.bio || "",
          joinDate: data.created_at,
          totalEntries: entries.length,
          currentStreak: 0,
          isAdmin: data.is_admin || false,
        })
      }
    }
    fetchProfile()
  }, [session, setProfile, entries.length])

  // Initialize active app (Logbook by default)
  useEffect(() => {
    if (session) {
      if (openApps.length > 0) {
        setActiveApp(openApps[openApps.length - 1])
      } else {
        setActiveApp(null)
      }
    }
  }, [setActiveApp, session, openApps.length])

  // Persist open apps to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("logbook-open-apps", JSON.stringify(openApps))
    }
  }, [openApps])

  // Global key handling: Esc closes palette or topmost window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (paletteOpen) {
          setPaletteOpen(false)
          setActiveApp(null)
          return
        }
        if (openApps.length > 0) {
          const top = openApps[openApps.length - 1]
          closeApp(top)
          return
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [paletteOpen, openApps])

  const windows: WindowSpec[] = useMemo(
    () => [
      { key: "logbook", title: "Daily Logbook", content: <Logbook /> },
      { key: "entry", title: "New Entry", content: <Entry /> },
      { key: "friends", title: "Friends", content: <Friends /> },
      { key: "profile", title: "Profile", content: <Profile /> },
      { key: "manual", title: "Manual", content: <Manual /> },
      { key: "requests", title: "Feature Requests", content: <FeatureRequests /> },
    ],
    [],
  )

  function openApp(app: Exclude<AppKey, "palette" | null>) {
    setOpenApps((prev) => {
      // Mobile check: Single app mode
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        return [app]
      }
      
      if (prev.includes(app)) {
        const without = prev.filter((a) => a !== app)
        return [...without, app]
      }
      return [...prev, app]
    })
    setWindowLayout(app, { isOpen: true })
    setActiveApp(app)
    setActiveTopBarItem(null)
  }

  function closeApp(app: Exclude<AppKey, "palette" | null>) {
    setOpenApps((prev) => prev.filter((a) => a !== app))
    setWindowLayout(app, { isOpen: false })
    setActiveApp(null)
  }

  function focusApp(app: Exclude<AppKey, "palette" | null>) {
    setOpenApps((prev) => {
      const without = prev.filter((a) => a !== app)
      return [...without, app]
    })
    setActiveApp(app)
  }
  const [modal, setModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: "confirm" | "alert"
    onConfirm: () => void
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: () => {},
  })

  function resetAll() {
    setOpenApps(["logbook"])
    setPaletteOpen(false)
    setActiveApp("logbook")
    
    setModal({
      isOpen: true,
      title: "Full Reset Protocol",
      message: "Are you sure you want to reset your desktop layout? This will clear all window positions and reload the session.",
      type: "confirm",
      onConfirm: () => {
        localStorage.removeItem("logbook-window-layouts")
        localStorage.removeItem("logbook-open-apps")
        window.location.reload()
      }
    })
  }

  const { isReencrypting, reencryptionProgress } = useUIStore()

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#FAFAF0]">
        <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Landing />
  }

  return (
    <main className="fixed inset-0 overflow-hidden">
      {/* Background: off-white, 8px grid + subtle grain */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#FAFAF0",
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 8px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 8px)
          `,
          backgroundSize: "8px 8px, 8px 8px",
        }}
      />
      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-30"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "2px 2px",
        }}
      />

      {/* p5 Eyes wallpaper */}
      <Eyes activeApp={activeApp ?? null} />

      {/* Top Bar (Notifications + Key + Manual + Logout) */}
      <div className="fixed top-3 right-3 md:top-6 md:right-6 z-40 flex items-center gap-2 md:gap-4">
        <button
          onClick={() => openApp("manual")}
          className="p-2 md:p-3 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-all flex items-center gap-2"
          title="User Manual"
        >
          <HelpCircle className="w-4 h-4 md:w-6 md:h-6" />
          <span className="font-black text-xs uppercase hidden md:inline">Help</span>
        </button>
        <KeySection 
          isOpen={activeTopBarItem === "key"} 
          onToggle={() => {
            setActiveTopBarItem(prev => prev === "key" ? null : "key")
            if (activeTopBarItem !== "key" && window.innerWidth < 768) {
               // Optional: close active app if opening key on mobile? 
               // For now, let's just let it overlay.
            }
          }}
        />
        <Notifications 
          isOpen={activeTopBarItem === "notifications"} 
          onToggle={() => setActiveTopBarItem(prev => prev === "notifications" ? null : "notifications")}
        />
        <button
          onClick={() => supabase.auth.signOut()}
          className="p-2 md:p-3 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-all flex items-center gap-2 group"
          title="Logout"
        >
          <LogOut className="w-4 h-4 md:w-6 md:h-6 group-hover:text-[#FF2E63] transition-colors" />
          <span className="font-black text-xs uppercase hidden md:inline">Logout</span>
        </button>
      </div>

      {/* Windows */}
      <div className="absolute inset-0 z-10">
        {windows
          .filter((w) => openApps.includes(w.key))
          .map((w) => {
            const zIndex = 100 + openApps.indexOf(w.key)
            return (
              <DesktopWindow
                key={w.key}
                appKey={w.key}
                title={w.title}
                zIndex={zIndex}
                onClose={() => closeApp(w.key)}
                onFocus={() => focusApp(w.key)}
              >
                {w.content}
              </DesktopWindow>
            )
          })}
      </div>

      {/* Dock */}
      <div className="absolute left-0 right-0 bottom-6 z-20 flex justify-center">
        <Dock
          activeApp={activeApp ?? null}
          onOpen={(k) => openApp(k)}
          onOpenPalette={() => {
            setPaletteOpen(true)
            setActiveApp("palette")
          }}
        />
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={(o) => {
          setPaletteOpen(o)
          if (!o) setActiveApp(null)
          if (o) setActiveApp("palette")
        }}
        onAction={(k) => {
          openApp(k)
          setPaletteOpen(false)
        }}
        onReset={resetAll}
      />

      {/* Re-encryption Progress Backdrop */}
      {isReencrypting && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
          <div className="max-w-md w-full space-y-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 border-[8px] border-white border-t-[#FF2E63] rounded-full animate-spin mx-auto shadow-[0_0_30px_rgba(255,46,99,0.3)]" />
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Securing Vault</h2>
              <p className="text-[#FF2E63] font-bold text-sm tracking-widest animate-pulse uppercase">Re-encrypting all data with new master key</p>
            </div>
            
            <div className="relative h-8 bg-white/10 border-[3px] border-white p-1 overflow-hidden">
               <div 
                 className="h-full bg-white transition-all duration-300 ease-out"
                 style={{ width: `${reencryptionProgress}%` }}
               />
               <span className="absolute inset-0 flex items-center justify-center mix-blend-difference text-white font-black text-xs">
                 {Math.round(reencryptionProgress)}% COMPLETE
               </span>
            </div>
            
            <p className="text-white/40 text-[10px] font-bold uppercase italic tracking-widest">
              DO NOT CLOSE BROWSER · SECURITY INTEGRITY IN PROGRESS
            </p>
          </div>
        </div>
      )}
      <Modal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />
    </main>
  )
}
