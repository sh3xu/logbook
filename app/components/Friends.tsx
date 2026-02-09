"use client"

import { useState, useEffect } from "react"
import { useUIStore } from "@/lib/ui-store"
import { 
  Check, 
  X, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  UserPlus, 
  Users, 
  Search,
  MessageSquare,
  Flame,
  BookOpen,
  ChevronRight
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function Friends() {
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "search">("friends")
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const { 
    friends, 
    setFriends, 
    friendRequests, 
    setFriendRequests,
    addNotification 
  } = useUIStore()

  useEffect(() => {
    fetchFriends()
    fetchRequests()
  }, [])

  const fetchFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("friends")
      .select(`
        friend_id,
        profiles!friends_friend_id_fkey (id, username, full_name, avatar_url, created_at)
      `)
      .eq("user_id", user.id)
      .eq("status", "accepted")

    if (data) {
      const formatted = data.map((f: any) => ({
        id: f.friend_id,
        username: f.profiles.username,
        name: f.profiles.full_name || f.profiles.username,
        avatar: f.profiles.avatar_url || f.profiles.full_name?.charAt(0) || "?",
        status: "offline" as "offline", 
        lastEntry: "Unknown",
        totalEntries: 0,
        currentStreak: 0,
        joinDate: new Date(f.profiles.created_at).toLocaleDateString()
      }))
      setFriends(formatted)
    }
  }

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("friends")
      .select(`
        id,
        user_id,
        profiles!friends_user_id_fkey (username, full_name, avatar_url)
      `)
      .eq("friend_id", user.id)
      .eq("status", "pending")

    if (data) {
      const formatted = data.map((r: any) => ({
        id: r.id,
        fromId: r.user_id,
        username: r.profiles.username,
        name: r.profiles.full_name || r.profiles.username,
        avatar: r.profiles.avatar_url || r.profiles.full_name?.charAt(0) || "?",
        timestamp: "Recently",
        type: "received" as "received"
      }))
      setFriendRequests(formatted)
    }
  }

  // Debounced Search Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 400) // 400ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearch = async (query: string) => {
    setLoading(true)
    try {
      // Use PostgreSQL regex matching (~* for case-insensitive) via .filter
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        // 'imatch' in Supabase maps to ~* in Postgres (Case-insensitive regex).
        .filter("username", "imatch", query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) 
        .limit(10)

      if (data) setSearchResults(data)
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }

  const sendRequest = async (friendId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("friends")
      .insert({ user_id: user.id, friend_id: friendId, status: "pending" })

    if (!error) {
      addNotification({
        id: Date.now().toString(),
        type: "friend_request",
        message: "Friend request sent!",
        timestamp: "just now",
        read: false
      })
      setActiveTab("friends")
    }
  }

  const acceptRequest = async (requestId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("friends")
      .update({ status: "accepted" })
      .eq("id", requestId)

    if (!error) {
      fetchFriends()
      fetchRequests()
      addNotification({
        id: Date.now().toString(),
        type: "friend_request",
        message: "Request accepted!",
        timestamp: "just now",
        read: false
      })
    }
  }

  if (selectedFriendId) {
    const friend = friends.find(f => f.id === selectedFriendId)
    return (
      <div className="p-6 bg-white h-full flex flex-col selection:bg-black selection:text-white">
        <button 
          onClick={() => setSelectedFriendId(null)}
          className="flex items-center gap-2 font-black text-xs uppercase mb-6 hover:-translate-x-1 transition-transform"
        >
          <ChevronLeft size={16} /> Connection Roster
        </button>

        {friend && (
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            <div className="border-[3px] border-black p-6 bg-[#FAFAF0] shadow-[6px_6px_0_0_#000]">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-20 h-20 border-[4px] border-black bg-black text-white flex items-center justify-center font-black text-3xl shadow-[4px_4px_0_0_#FF2E63]">
                  {friend.avatar.length > 2 ? <img src={friend.avatar} className="w-full h-full object-cover" /> : friend.avatar}
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">{friend.name}</h2>
                  <p className="text-xs font-bold text-gray-500 italic">@{friend.username}</p>
                  <div className="mt-2 inline-block px-2 py-0.5 border-[2px] border-black bg-white text-[9px] font-black uppercase">
                    Member Since {friend.joinDate}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border-[3px] border-black flex flex-col items-center">
                  <BookOpen size={16} className="mb-1" />
                  <span className="text-xl font-black">{friend.totalEntries}</span>
                  <span className="text-[9px] font-black uppercase text-gray-400">Total Logs</span>
                </div>
                <div className="p-4 bg-white border-[3px] border-black flex flex-col items-center">
                  <Flame size={16} className="mb-1 text-[#FF2E63]" />
                  <span className="text-xl font-black text-[#FF2E63]">{friend.currentStreak}</span>
                  <span className="text-[9px] font-black uppercase text-gray-400">Day Streak</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">Activity Stream</h3>
              <div className="p-12 border-[3px] border-black border-dashed flex flex-col items-center justify-center text-center gap-4 bg-gray-50">
                <div className="w-12 h-12 border-[3px] border-black flex items-center justify-center">
                  <Users size={24} className="text-gray-300" />
                </div>
                <div>
                  <p className="font-black text-xs uppercase">Restricted Access</p>
                  <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic">Log details are privately encrypted. Only shared metrics are visible in this cycle.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 bg-white h-full flex flex-col selection:bg-black selection:text-white">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Connection Hub</h2>
        <div className="flex gap-1">
          <button onClick={() => setActiveTab("friends")} className={`p-2 border-[2px] border-black transition-all ${activeTab === 'friends' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}><Users size={16}/></button>
          <button onClick={() => setActiveTab("requests")} className={`p-2 border-[2px] border-black transition-all ${activeTab === 'requests' ? 'bg-black text-white shadow-[2px_2px_0_0_#FF2E63]' : 'bg-white hover:bg-gray-50'}`}><UserPlus size={16}/></button>
          <button onClick={() => setActiveTab("search")} className={`p-2 border-[2px] border-black transition-all ${activeTab === 'search' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}><Search size={16}/></button>
        </div>
      </div>

      {activeTab === "friends" && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {friends.length === 0 ? (
            <div className="h-40 border-[3px] border-black border-dashed flex items-center justify-center text-center p-6 bg-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-loose">No active connections found.<br/>Search users to populate your grid.</p>
            </div>
          ) : (
            friends.map(friend => (
              <button 
                key={friend.id}
                onClick={() => setSelectedFriendId(friend.id)}
                className="w-full text-left p-4 border-[3px] border-black bg-white shadow-[6px_6px_0_0_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 border-[2px] border-black bg-black text-white flex items-center justify-center font-black group-hover:bg-[#FF2E63] transition-colors">
                  {friend.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-black text-sm uppercase">{friend.name}</div>
                  <div className="text-[10px] font-bold text-gray-400 italic">@{friend.username}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase">Streak</span>
                    <span className="text-sm font-black text-[#FF2E63]">🔥{friend.currentStreak}</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-black" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {activeTab === "requests" && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {friendRequests.length === 0 ? (
             <div className="h-40 border-[3px] border-black border-dashed flex items-center justify-center text-center p-6 bg-gray-50">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">All communication channels clear.</p>
           </div>
          ) : (
            friendRequests.map(req => (
              <div key={req.id} className="p-4 border-[3px] border-black bg-blue-50 flex items-center justify-between gap-4 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border-[2px] border-black bg-black text-white flex items-center justify-center font-black">{req.avatar}</div>
                  <div>
                    <div className="text-xs font-black uppercase">{req.name}</div>
                    <div className="text-[9px] font-bold text-gray-500 italic">Incoming Signal</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(req.id)} className="p-2 border-[2px] border-black bg-white hover:bg-green-500 hover:text-white transition-all"><Check size={16}/></button>
                  <button className="p-2 border-[2px] border-black bg-white hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "search" && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="IDENTIFY_USER_BY_HANDLE..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-4 border-[3px] border-black font-black uppercase text-sm outline-none focus:bg-blue-50 focus:shadow-[4px_4px_0_0_#000] transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/>
              ) : (
                <Search size={16} className="text-gray-400" />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"/></div>
            ) : searchResults.length > 0 ? (
              searchResults.map(user => (
                <div key={user.id} className="p-4 border-[3px] border-black bg-white flex items-center justify-between gap-4 hover:translate-x-1 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border-[2px] border-black bg-black text-white flex items-center justify-center font-black">{user.avatar_url || user.full_name?.charAt(0) || "?"}</div>
                    <div>
                      <div className="text-xs font-black uppercase">{user.full_name || user.username}</div>
                      <div className="text-[9px] font-bold text-gray-400">@{user.username}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => sendRequest(user.id)}
                    className="px-3 py-1.5 border-[2px] border-black text-[10px] font-black uppercase bg-white hover:bg-black hover:text-white transition-all active:translate-y-1"
                  >
                    Send Signal
                  </button>
                </div>
              ))
            ) : searchQuery && (
              <p className="text-center text-[10px] font-black text-gray-400 uppercase italic">No users found on this frequency.</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 border-[2px] border-black bg-[#FAFAF0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">{friends.length} Active Connections</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-gray-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">{friendRequests.length} Pending Signals</span>
        </div>
      </div>
    </div>
  )
}
