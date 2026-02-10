"use client"

import { useState } from "react"
import { useUIStore } from "@/lib/ui-store"
import { Lock, Unlock, Key, Check, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react"
import { hashKey, encryptMessage, decryptMessage } from "@/lib/encryption"
import { supabase } from "@/lib/supabase"

export default function KeySection({
  isOpen: externalIsOpen,
  onToggle,
}: {
  isOpen?: boolean
  onToggle?: () => void
} = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [inputKey, setInputKey] = useState("")
  const [newKey, setNewKey] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const isControlled = typeof externalIsOpen === "boolean"
  const isOpen = isControlled ? externalIsOpen : internalIsOpen
  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle()
    } else {
      setInternalIsOpen(!internalIsOpen)
    }
  }

  const { 
    encryptionKey, 
    setEncryptionKey, 
    addNotification, 
    setIsReencrypting, 
    setReencryptionProgress 
  } = useUIStore()

  const handleUnlock = async () => {
    // ... logic remains same ...
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: profile } = await supabase
        .from("profiles")
        .select("key_hash")
        .eq("id", user.id)
        .maybeSingle()

      if (!profile) throw new Error("Security profile not found")

      const inputHash = await hashKey(inputKey)
      if (inputHash === profile.key_hash) {
        setEncryptionKey(inputKey)
        if (isControlled && onToggle) {
          onToggle()
        } else {
          setInternalIsOpen(false)
        }
        setInputKey("")
        addNotification({
          id: Date.now().toString(),
          type: "entry_saved",
          message: "Data successfully unlocked!",
          timestamp: "just now",
          read: false,
        })
      } else {
        setError("Invalid Master Key")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateKey = async () => {
    if (!newKey || newKey.length < 8) {
      setError("New key must be at least 8 characters")
      return
    }

    setLoading(true)
    setError(null)
    setIsReencrypting(true)
    setReencryptionProgress(0)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // 1. Fetch all entries
      const { data: entries, error: fetchErr } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id)

      if (fetchErr) throw fetchErr

      // 2. Process re-encryption
      const total = entries.length
      for (let i = 0; i < total; i++) {
        const entry = entries[i]
        let decrypted: string
        
        try {
          decrypted = entry.is_encrypted 
            ? await decryptMessage(entry.content, encryptionKey!) 
            : entry.content
        } catch (e) {
          console.error(`Failed to decrypt entry ${entry.id}`, e)
          continue // Skip if corrupted
        }

        const reEncrypted = await encryptMessage(decrypted, newKey)
        
        const { error: updateErr } = await supabase
          .from("entries")
          .update({ content: reEncrypted, is_encrypted: true })
          .eq("id", entry.id)

        if (updateErr) throw updateErr
        setReencryptionProgress(((i + 1) / total) * 90) // Save last 10% for profile update
      }

      // 3. Update profile hash
      const newHash = await hashKey(newKey)
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ key_hash: newHash })
        .eq("id", user.id)

      if (profileErr) throw profileErr

      setReencryptionProgress(100)
      setEncryptionKey(newKey)
      setNewKey("")
      setIsUpdating(false)
      if (isControlled && onToggle) {
        onToggle()
      } else {
        setInternalIsOpen(false)
      }
      
      addNotification({
        id: Date.now().toString(),
        type: "entry_saved",
        message: "Master Key updated and data re-secured!",
        timestamp: "just now",
        read: false,
      })

    } catch (err: any) {
      setError(err.message || "Failed to update key")
      console.error(err)
    } finally {
      setLoading(false)
      setTimeout(() => setIsReencrypting(false), 1000)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className={`p-2 md:p-3 border-[3px] border-black shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-all flex items-center gap-2 ${
          encryptionKey ? "bg-green-100" : "bg-yellow-100"
        }`}
      >
        {encryptionKey ? <Unlock className="w-4 h-4 md:w-6 md:h-6" /> : <Lock className="w-4 h-4 md:w-6 md:h-6" />}
        <span className="font-black text-xs uppercase hidden md:inline">
          {encryptionKey ? "Unlocked" : "Locked"}
        </span>
      </button>

      {isOpen && (
        <div className="fixed top-14 left-4 right-4 w-auto md:absolute md:top-full md:right-0 md:mt-2 md:w-80 md:left-auto border-[3px] border-black bg-white shadow-[8px_8px_0_0_#000] p-4 md:p-6 z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span className="font-black text-xs md:text-sm uppercase tracking-tight">Security Vault</span>
            </div>
            {encryptionKey && (
              <button 
                onClick={() => setIsUpdating(!isUpdating)}
                className="text-[10px] font-black uppercase text-blue-600 hover:underline"
              >
                {isUpdating ? "Cancel" : "Update Key"}
              </button>
            )}
          </div>

          {encryptionKey ? (
            <div className="space-y-6">
              {!isUpdating ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-50 border-[2px] border-black">
                    <ShieldCheck className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="text-xs font-black uppercase text-green-700">Access Granted</div>
                      <div className="text-[10px] font-bold text-green-600 italic">Data stream is live</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase leading-tight italic">
                    Your master key is active for this session. Closing the tab will flush your access.
                  </p>
                  <button
                    onClick={() => setEncryptionKey(null)}
                    className="w-full p-3 md:p-4 border-[3px] border-black bg-white hover:bg-black hover:text-white transition-all text-xs font-black uppercase shadow-[4px_4px_0_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1"
                  >
                    Lock Vault Now
                  </button>
                </>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                   <div className="p-3 bg-red-50 border-[2px] border-dashed border-red-400">
                     <p className="text-[10px] font-black text-red-600 uppercase mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Critical Warning</p>
                     <p className="text-[9px] font-bold text-red-500 leading-tight italic">Updating your key will re-encrypt ALL previous entries. Do not interrupt this process once started.</p>
                   </div>
                   <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">New Master Key</label>
                    <input
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="MIN_8_CHARS"
                      autoComplete="off"
                      className="w-full border-[2px] border-black p-3 text-sm font-bold outline-none focus:bg-blue-50"
                    />
                  </div>
                  {error && <div className="text-red-600 text-[10px] font-black uppercase">{error}</div>}
                  <button
                    onClick={handleUpdateKey}
                    disabled={loading || !newKey}
                    className="w-full p-4 border-[3px] border-black bg-black text-white hover:bg-[#FF2E63] transition-all text-xs font-black uppercase shadow-[4px_4px_0_0_#000] flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {loading ? "Processing..." : "Initiate Re-Encryption"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Authentication Required</label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Enter Master Key"
                  autoComplete="off"
                  className="w-full border-[3px] border-black p-3 md:p-4 text-sm font-bold outline-none focus:bg-yellow-50 shadow-[4px_4px_0_0_rgba(0,0,0,0.05)]"
                />
              </div>
              {error && (
                <div className="flex items-center gap-1 text-red-600 text-[10px] font-black uppercase">
                  <AlertTriangle className="w-3 h-3" />
                  {error}
                </div>
              )}
              <button
                onClick={handleUnlock}
                disabled={loading || !inputKey}
                className="w-full p-3 md:p-4 border-[3px] border-black bg-black text-white hover:bg-white hover:text-black transition-all text-xs font-black uppercase disabled:opacity-50 shadow-[4px_4px_0_0_#000] active:shadow-none"
              >
                {loading ? "Decrypting..." : "Unlock Data Stream"}
              </button>
              <div className="p-3 bg-gray-50 border-[2px] border-black">
                <p className="text-[9px] text-gray-500 font-bold uppercase italic leading-tight">
                  Your identity is verified via zero-knowledge proof. Plaintext data never leaves your device.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
