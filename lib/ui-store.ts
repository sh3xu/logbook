"use client"

import { create } from "zustand"

export type AppKey = "logbook" | "entry" | "friends" | "profile" | "manual" | "palette" | "requests" | null

export type DailyEntry = {
  id: string
  date: string
  mood: "😢" | "😕" | "😐" | "🙂" | "😄"
  workingHours: number
  achievements: string[]
  challenges: string[]
  logText: string
  classification: Record<string, number>
}

export type Friend = {
  id: string
  username: string
  name: string
  status: "online" | "offline" | "away"
  lastEntry: string
  avatar: string
  totalEntries: number
  currentStreak: number
  joinDate: string
}

export type UserProfile = {
  id: string
  username: string
  name: string
  avatar: string
  bio: string
  joinDate: string
  totalEntries: number
  currentStreak: number
  isAdmin: boolean
}

export type FriendRequest = {
  id: string
  fromId: string
  name: string
  username: string
  avatar: string
  type: "received" | "sent"
  timestamp: string
}

export type Notification = {
  id: string
  type: "friend_request" | "friend_added" | "entry_saved" | "streak"
  message: string
  timestamp: string
  read: boolean
}

export type WindowLayout = {
  x: number
  y: number
  zIndex: number
  isOpen: boolean
}

type UIState = {
  activeApp: AppKey
  setActiveApp: (app: AppKey | ((prev: AppKey) => AppKey)) => void
  entries: DailyEntry[]
  addEntry: (entry: DailyEntry) => void
  updateEntry: (id: string, entry: Partial<DailyEntry>) => void
  deleteEntry: (id: string) => void
  friends: Friend[]
  friendEntries: { [friendId: string]: DailyEntry[] }
  profile: UserProfile
  setProfile: (profile: Partial<UserProfile>) => void
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  friendRequests: FriendRequest[]
  addFriendRequest: (request: FriendRequest) => void
  acceptFriendRequest: (id: string) => void
  declineFriendRequest: (id: string) => void
  encryptionKey: string | null
  setEncryptionKey: (key: string | null) => void
  isReencrypting: boolean
  setIsReencrypting: (status: boolean) => void
  reencryptionProgress: number
  setReencryptionProgress: (progress: number) => void
  setEntries: (entries: DailyEntry[]) => void
  setFriends: (friends: Friend[]) => void
  setNotifications: (notifications: Notification[]) => void
  setFriendRequests: (requests: FriendRequest[]) => void
  metricDefinitions: string[]
  setMetricDefinitions: (metrics: string[]) => void
  setFriendEntries: (entries: { [friendId: string]: DailyEntry[] }) => void
  windowLayouts: Record<string, WindowLayout>
  setWindowLayout: (appKey: string, layout: Partial<WindowLayout>) => void
  setWindowLayouts: (layouts: Record<string, WindowLayout>) => void
}

const getStoredKey = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("logbook-encryption-key")
  }
  return null
}

const getStoredLayouts = (): Record<string, WindowLayout> => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("logbook-window-layouts")
    return stored ? JSON.parse(stored) : {}
  }
  return {}
}

const getStoredMetrics = (): string[] => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("logbook-metric-definitions")
    return stored ? JSON.parse(stored) : ["Work", "Personal", "Health", "Learning"]
  }
  return ["Work", "Personal", "Health", "Learning"]
}

export const useUIStore = create<UIState>((set) => ({
  activeApp: "logbook",
  entries: [],
  encryptionKey: getStoredKey(),
  isReencrypting: false,
  reencryptionProgress: 0,
  setIsReencrypting: (status) => set({ isReencrypting: status }),
  setReencryptionProgress: (progress) => set({ reencryptionProgress: progress }),
  setEncryptionKey: (key) => {
    if (typeof window !== "undefined") {
      if (key) {
        sessionStorage.setItem("logbook-encryption-key", key)
      } else {
        sessionStorage.removeItem("logbook-encryption-key")
      }
    }
    set({ encryptionKey: key })
  },
  friends: [],
  friendEntries: {},
  profile: {
    id: "",
    username: "",
    name: "",
    avatar: "",
    bio: "",
    joinDate: "",
    totalEntries: 0,
    currentStreak: 0,
    isAdmin: false,
  },
  notifications: [],
  friendRequests: [],
  metricDefinitions: getStoredMetrics(),
  setMetricDefinitions: (metrics) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("logbook-metric-definitions", JSON.stringify(metrics))
    }
    set({ metricDefinitions: metrics })
  },
  windowLayouts: getStoredLayouts(),
  setWindowLayout: (appKey, layout) =>
    set((s) => {
      const newLayouts = {
        ...s.windowLayouts,
        [appKey]: { ...(s.windowLayouts[appKey] || { x: 120, y: 120, zIndex: 100, isOpen: false }), ...layout },
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("logbook-window-layouts", JSON.stringify(newLayouts))
      }
      return { windowLayouts: newLayouts }
    }),
  setWindowLayouts: (layouts) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("logbook-window-layouts", JSON.stringify(layouts))
    }
    set({ windowLayouts: layouts })
  },
  setActiveApp: (app) =>
    set((s) => ({
      activeApp: typeof app === "function" ? (app as (p: AppKey) => AppKey)(s.activeApp) : app,
    })),
  addEntry: (entry) =>
    set((s) => ({
      entries: [entry, ...s.entries],
    })),
  updateEntry: (id, updates) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  deleteEntry: (id) =>
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
    })),
  setProfile: (profile) =>
    set((s) => ({
      profile: { ...s.profile, ...profile },
    })),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications],
    })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  addFriendRequest: (request) =>
    set((s) => ({
      friendRequests: [request, ...s.friendRequests],
    })),
  acceptFriendRequest: (id) =>
    set((s) => ({
      friendRequests: s.friendRequests.filter((r) => r.id !== id),
    })),
  declineFriendRequest: (id) =>
    set((s) => ({
      friendRequests: s.friendRequests.filter((r) => r.id !== id),
    })),
  setEntries: (entries) => set({ entries }),
  setFriends: (friends) => set({ friends }),
  setNotifications: (notifications) => set({ notifications }),
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  setFriendEntries: (friendEntries) => set({ friendEntries }),
}))

