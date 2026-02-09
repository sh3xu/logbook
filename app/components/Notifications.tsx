"use client"

import { useState, useEffect } from "react"
import { useUIStore } from "@/lib/ui-store"
import { Bell, X, Trash2, CheckSquare } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, setNotifications } = useUIStore()

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) {
      const formatted = data.map((n: any) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        timestamp: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: n.read
      }))
      setNotifications(formatted)
    }
  }

  const markRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)

    if (!error) {
       setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
    }
  }

  const clearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)

    if (!error) {
      setNotifications([])
    }
  }

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, read: true })))
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-all"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-[#FF2E63] border-[2px] border-black text-white font-black text-xs min-w-[24px] h-6 flex items-center justify-center rounded-sm px-1">
            {unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-96 border-[3px] border-black bg-white shadow-[8px_8px_0_0_#000] p-0 z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="p-5 border-b-[3px] border-black flex items-center justify-between bg-black text-white">
            <div className="flex items-center gap-2">
              <Bell size={18} />
              <span className="font-black text-xs uppercase tracking-widest">Signal Queue</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform">
              <X size={20} />
            </button>
          </div>

          <div className="p-2 border-b-[2px] border-black grid grid-cols-2 gap-2">
            <button 
              onClick={markAllRead}
              className="px-3 py-2 border-[2px] border-black text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <CheckSquare size={12} /> Mark All Read
            </button>
            <button 
              onClick={clearAll}
              className="px-3 py-2 border-[2px] border-black text-[10px] font-black uppercase flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} /> Purge All
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y-[3px] divide-black/5">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">No signals currently in buffer.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markRead(notif.id)}
                  className={`p-5 group cursor-pointer transition-all ${
                    !notif.read ? "bg-blue-50/50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className={`text-sm font-bold uppercase tracking-tight transition-colors ${!notif.read ? 'text-black' : 'text-gray-400'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{notif.timestamp}</span>
                        {!notif.read && (
                          <span className="px-1.5 py-0.5 border-[1px] border-[#FF2E63] text-[8px] font-black text-[#FF2E63] uppercase">New Signal</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t-[3px] border-black bg-[#FAFAF0]">
            <p className="text-[9px] font-bold text-center uppercase tracking-widest text-gray-400 italic">
              System signals are automatically archived after 7 cycles.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
