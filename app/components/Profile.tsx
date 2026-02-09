"use client"

import { useState, useEffect, useRef } from "react"
import { useUIStore } from "@/lib/ui-store"
import { Calendar, Flame, BookOpen, User, Camera, Save, X, Edit3, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function Profile() {
  const { profile, setProfile, entries } = useUIStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: profile.name,
    bio: profile.bio,
    avatar: profile.avatar,
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [editForm.avatar])

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (data && !profileError) {
        const p = {
          id: data.id,
          username: data.username,
          name: data.full_name || "",
          avatar: data.avatar_url || (data.full_name ? data.full_name.charAt(0).toUpperCase() : "?"),
          bio: data.bio || "",
          joinDate: data.created_at,
          totalEntries: entries.length,
          currentStreak: 0,
          isAdmin: data.is_admin || false,
        }
        setProfile(p)
        setEditForm({ name: p.name, bio: p.bio, avatar: p.avatar })
      }
    }
    fetchProfile()
  }, [setProfile, entries.length])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // 1. Validation: Image only
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, etc.)")
      return
    }

    // 2. Validation: 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB")
      return
    }

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("You must be logged in to upload an avatar")
      setUploading(false)
      return
    }

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}` // Use timestamp for uniqueness
      const filePath = `${fileName}`

      // Upload image to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Clean up: Delete old image if it exists in the storage bucket
      // We check if the current avatar URL belongs to our bucket
      const currentAvatar = editForm.avatar
      if (currentAvatar && currentAvatar.includes("/storage/v1/object/public/avatars/")) {
        try {
          // Extract path from URL (format: .../avatars/user_id/timestamp.ext)
          const oldPathMatch = currentAvatar.split("/avatars/")[1]
          if (oldPathMatch) {
            await supabase.storage.from('avatars').remove([oldPathMatch])
          }
        } catch (cleanupErr) {
          console.warn("Could not delete old avatar, ignoring...", cleanupErr)
        }
      }

      setEditForm({ ...editForm, avatar: publicUrl })
    } catch (uploadErr: any) {
      console.error("Error uploading image:", uploadErr)
      setError(uploadErr.message || "Failed to upload image. Check your connection or Supabase settings.")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: saveError } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.name,
          bio: editForm.bio,
          avatar_url: editForm.avatar,
        })
        .eq("id", user.id)

      if (!saveError) {
        setProfile({ ...profile, ...editForm })
        setIsEditing(false)
      } else {
        setError("Failed to save profile changes. Please try again.")
      }
    }
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-6 bg-white transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="text-2xl font-black">Profile</div>
        {!isEditing && (
          <button 
            onClick={() => {
              setIsEditing(true)
              setError(null)
            }}
            className="p-2 border-[2px] border-black hover:bg-black hover:text-white transition-colors"
          >
            <Edit3 size={18} />
          </button>
        )}
      </div>

      {/* Avatar and Name */}
      <div className="text-center relative">
        <div className="relative inline-block group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
            accept="image/*"
          />
          <div 
            onClick={() => isEditing && !uploading && fileInputRef.current?.click()}
            className={`w-32 h-32 border-[4px] border-black bg-black text-white flex items-center justify-center font-bold text-5xl mx-auto mb-4 shadow-[6px_6px_0_0_#000] overflow-hidden ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`}
          >
            {uploading ? (
              <Loader2 className="animate-spin text-white" size={40} />
            ) : (editForm.avatar && editForm.avatar.length > 2 && !imgError) ? (
              <img 
                src={editForm.avatar} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
                onError={() => setImgError(true)}
              />
            ) : (
              editForm.avatar || "?"
            )}
          </div>
          {isEditing && !uploading && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-white/80 border-[2px] border-black p-1">
                <Camera size={16} />
              </div>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4 max-w-sm mx-auto">
            {error && (
              <div className="bg-red-50 border-[2px] border-red-500 p-2 text-red-600 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full text-center text-3xl font-black border-b-[4px] border-black outline-none focus:bg-gray-50"
              placeholder="Display Name"
            />
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              className="w-full text-center text-sm font-semibold text-gray-700 border-[2px] border-black p-2 outline-none h-20"
              placeholder="Tell us about yourself..."
            />
          </div>
        ) : (
          <>
            <div className="text-3xl font-black">{profile.name || "Set your name"}</div>
            <div className="text-sm font-semibold text-gray-600 mt-2 px-8">
              {profile.bio || "No bio yet."}
            </div>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] text-center">
          <div className="text-2xl font-black">{entries.length}</div>
          <div className="text-sm font-semibold text-gray-700 mt-1 flex items-center justify-center gap-1">
            <BookOpen size={14} /> Entries
          </div>
        </div>

        <div className="p-4 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] text-center">
          <div className="text-2xl font-black" style={{ color: "#FF2E63" }}>
            {profile.currentStreak}
          </div>
          <div className="text-sm font-semibold text-gray-700 mt-1 flex items-center justify-center gap-1">
            <Flame size={14} /> Day Streak
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="space-y-3">
        <div className="p-4 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] flex items-center gap-3">
          <Calendar size={20} className="flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-gray-600">Member Since</div>
            <div className="font-semibold">{profile.joinDate ? new Date(profile.joinDate).toLocaleDateString() : "Loading..."}</div>
          </div>
        </div>
        <div className="p-4 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] flex items-center gap-3">
          <User size={20} className="flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-gray-600">Username</div>
            <div className="font-semibold italic">@{profile.username}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-4 pt-4 border-t-[3px] border-black">
          <button 
            disabled={loading || uploading}
            onClick={() => {
              setIsEditing(false)
              setError(null)
              setEditForm({ name: profile.name, bio: profile.bio, avatar: profile.avatar })
            }}
            className="flex-1 p-4 border-[3px] border-black font-black flex items-center justify-center gap-2 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            <X size={20} /> Cancel
          </button>
          <button 
            disabled={loading || uploading}
            onClick={handleSave}
            className="flex-1 p-4 bg-black text-white font-black flex items-center justify-center gap-2 hover:shadow-[4px_4px_0_0_#FF2E63] transition-all disabled:opacity-50"
          >
            <Save size={20} /> {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  )
}
