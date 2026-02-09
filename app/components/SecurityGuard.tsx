"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import disableDevtool from "disable-devtool"
import { useUIStore } from "@/lib/ui-store"

export default function SecurityGuard() {
  const router = useRouter()
  const { 
    setEncryptionKey, 
    setEntries, 
    setFriends, 
    setFriendEntries, 
    setNotifications, 
    setProfile 
  } = useUIStore()

  useEffect(() => {
    // Only run in production or when explicitly testing security measures
    // For now, enabled always as per user request
    const isDev = process.env.NODE_ENV === 'development'

    disableDevtool({
      disableMenu: true,
      disableSelect: true,
      disableCopy: true,
      disableCut: true, 
      disablePaste: true,
      disableIframeParents: true,
      
      // "detectors" with 'puppeteer', 'playwright' etc are NOT supported by this library version
      // and caused the crash. Removing them enables all default detectors (F12, Double-Key, details, etc.)
      
      ondevtoolopen: (type) => {
        // Clear sensitive data immediately
        setEncryptionKey(null)
        setEntries([])
        setFriends([])
        setFriendEntries({})
        setNotifications([])
        setProfile({
          id: "",
          username: "",
          name: "",
          avatar: "",
          bio: "",
          joinDate: "",
          totalEntries: 0,
          currentStreak: 0,
          isAdmin: false,
        })
        
        // Force reload to ensure memory is cleared if possible, or redirect
        window.location.href = '/access-denied'
      },

      interval: 200, 
      
      // Clear intervals when DevTools close
      clearIntervalWhenDevOpenTrigger: true,
      
      // URL to redirect when automation detected
      url: '/access-denied',
    } as any)

    // Manual console disabling since the library might not support it directly in this version
    if (process.env.NODE_ENV !== 'development') {
       const noop = () => {}
       ['log', 'debug', 'info', 'warn', 'error', 'table'].forEach(method => {
         (console as any)[method] = noop
       })
    }

    return () => {
      // Optional: Cleanup if needed, but security usually stays active
    }
  }, [setEncryptionKey, setEntries, setFriends, setFriendEntries, setNotifications, setProfile, router])

  return null
}
