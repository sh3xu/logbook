"use client"
import { useState } from "react"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useUIStore } from "@/lib/ui-store"

export default function Manual() {
  const [isPurging, setIsPurging] = useState(false)
  const { addNotification } = useUIStore()

  const handlePurgeData = async () => {
    const confirmed = window.confirm(
      "CRITICAL ACTION: Are you absolutely sure? This will delete all your entries, your profile, and social connections. This cannot be undone."
    )
    
    if (!confirmed) return

    setIsPurging(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Authentication required")

      // Try the RPC first for a clean full wipe
      const { error: rpcErr } = await supabase.rpc("delete_user_account")
      
      if (rpcErr) {
        console.warn("RPC purge failed, falling back to manual deletion:", rpcErr)
        
        // Fallback: Delete high-level data manually
        await supabase.from("entries").delete().eq("user_id", user.id)
        await supabase.from("friends").delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        await supabase.from("profiles").delete().eq("id", user.id)
      }

      // Final step: Sign Out
      await supabase.auth.signOut()
      
      // Force reload to lander
      window.location.reload()

    } catch (err: any) {
      console.error("Purge failed:", err)
      alert(`Purge failed: ${err.message}`)
      addNotification({
        id: Date.now().toString(),
        type: "entry_saved",
        message: `Purge failed: ${err.message}`,
        timestamp: "just now",
        read: false,
      })
    } finally {
      setIsPurging(false)
    }
  }

  const sections = [
    {
      title: "Getting Started",
      content:
        "Welcome to your Daily Logbook! This is your personal space to track your daily progress, emotions, and achievements. Open the Logbook app from the dock to start creating entries.",
    },
    {
      title: "Creating an Entry",
      content:
        "Click 'Add Entry' to begin logging your day. Fill in today's mood, working hours, achievements, and challenges. You can add multiple items in each category and they will be saved automatically.",
    },
    {
      title: "Mood Tracking",
      content:
        "Select your emotional state from five options: Very Sad, Sad, Neutral, Happy, and Very Happy. Your mood emoji is displayed at the top of each entry for quick visual reference of your emotional journey.",
    },
    {
      title: "Logging Achievements",
      content:
        "List the things you accomplished today. Click the plus button to add multiple achievements. Each achievement can be removed by clicking the X button if you want to edit your entry.",
    },
    {
      title: "Recording Challenges",
      content:
        "Document the obstacles or difficulties you faced. This helps you reflect and plan how to overcome similar challenges in the future. Add as many as needed for a complete picture of your day.",
    },
    {
      title: "Working Hours",
      content:
        "Enter the total hours you spent working today. This helps you track your productivity and maintain a healthy work-life balance over time.",
    },
    {
      title: "Time Classification",
      content:
        "Distribute your day's activities across four categories: Work, Personal, Health, and Learning. Use the sliders to allocate percentages that reflect how you spent your time. The total should equal 100%.",
    },
    {
      title: "Viewing Your History",
      content:
        "All your past entries are listed below today's form. Click the chevron icon to expand any entry and see the full details. Entries are stored chronologically for easy reference.",
    },
    {
      title: "Friends",
      content:
        "Connect with friends who also use the Daily Logbook. See their online status and last entry time. Send messages to share experiences and support each other's growth journey.",
    },
    {
      title: "Your Profile",
      content:
        "View and manage your profile information including your total entries count and current streak. Your streak increases as you make entries consistently. Edit your profile to update your information.",
    },
    {
      title: "Security & Encryption",
      content:
        "Your data is encrypted on the client side before being sent to the server. Only you hold the Master Decryption Key. This ensures total privacy as the server never sees your raw data.",
    },
    {
      title: "⚠️ CRITICAL: Master Key Loss",
      content:
        "If you lose or forget your Master Decryption Key, your previously encrypted data CANNOT and WILL NEVER be recovered. Even our support team cannot assist with this. If you reset your key, all past data remains locked with the old key and will be lost forever. Use this at your own risk.",
    },
    {
      title: "Logout & Session Security",
      content:
        "Your Master Key is stored only in temporary memory (sessionStorage) while your tab is open. When you close the tab or logout, the key is permanently removed from the device. This means your data is safe even if you forget to logout, as long as the tab is closed. However, we recommend logging out if you share your device with others.",
    },
  ]

  return (
    <div className="p-6 space-y-4 bg-white h-full overflow-y-auto">
      <div className="text-2xl font-black mb-6 sticky top-0 bg-white">User Manual</div>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="p-4 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000]">
            <div className="text-lg font-black mb-2">{section.title}</div>
            <div className="text-sm leading-relaxed text-gray-800">{section.content}</div>
          </div>
        ))}
      </div>

      <div className="p-6 border-[4px] border-black bg-red-50 space-y-4">
        <div className="flex items-center gap-2 text-[#FF2E63] font-black uppercase text-lg">
          <AlertTriangle className="w-6 h-6" /> Danger Zone
        </div>
        <p className="text-sm font-bold text-gray-700 leading-tight">
          This action is <span className="underline decoration-2">PERMANENT</span> and cannot be undone. 
          All your encrypted entries, profile information, and social connections will be wiped from our systems forever.
        </p>
        
        <button
          onClick={handlePurgeData}
          disabled={isPurging}
          className="w-full p-4 bg-[#FF2E63] text-black font-black uppercase tracking-widest hover:bg-black hover:text-white border-[3px] border-black transition-all flex items-center justify-center gap-3 shadow-[4px_4px_0_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50"
        >
          {isPurging ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Trash2 className="w-5 h-5" />
              Purge All Data & Delete Account
            </>
          )}
        </button>
      </div>

      <div className="p-4 border-[3px] border-black bg-[#FF2E63] text-black">
        <div className="font-bold">Pro Tips:</div>
        <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
          <li>Create entries daily for best streak tracking</li>
          <li>Be honest about challenges - reflection leads to growth</li>
          <li>Review past entries to identify patterns in your mood and productivity</li>
          <li>Share achievements with friends for extra motivation</li>
        </ul>
      </div>
    </div>
  )
}
