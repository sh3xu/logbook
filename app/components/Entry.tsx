"use client"

import { useState } from "react"
import { useUIStore, type DailyEntry } from "@/lib/ui-store"
import { X, Plus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { encryptMessage } from "@/lib/encryption"
import { getTodayDateString } from "@/lib/utils"
import Modal from "./Modal"

export default function Entry() {
  const { addEntry, addNotification, encryptionKey, entries, metricDefinitions, setMetricDefinitions } = useUIStore()
  
  const [formData, setFormData] = useState<{
    mood: DailyEntry["mood"]
    workingHours: number
    achievements: string[]
    challenges: string[]
    logText: string
    classification: Record<string, number>
  }>(() => {
    // Pick the last format used from entries or use defaults
    const lastEntry = entries[0]
    const baseMetrics = lastEntry ? Object.keys(lastEntry.classification) : metricDefinitions
    const initialClassification: Record<string, number> = {}
    baseMetrics.forEach(m => initialClassification[m] = 0)
    
    return {
      mood: "🙂",
      workingHours: 8,
      achievements: [],
      challenges: [],
      logText: "",
      classification: initialClassification,
    }
  })

  const [modal, setModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: "confirm" | "alert" | "prompt"
    onConfirm: (val?: string) => void
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: () => {},
  })

  const moodOptions = ["😢", "😕", "😐", "🙂", "😄"] as const

  const handleSubmit = async () => {
    if (formData.mood && formData.classification) {
      const entryData = {
        mood: formData.mood,
        workingHours: formData.workingHours || 0,
        achievements: formData.achievements || [],
        challenges: formData.challenges || [],
        logText: formData.logText || "",
        classification: formData.classification,
      }

      let content = JSON.stringify(entryData)
      let is_encrypted = false

      if (encryptionKey) {
        try {
          content = await encryptMessage(content, encryptionKey)
          is_encrypted = true
        } catch (err) {
          console.error("Encryption failed:", err)
          addNotification({
            id: Date.now().toString(),
            type: "streak", // Using streak as a generic error type or just message
            message: "Failed to encrypt entry. Please check your master key.",
            timestamp: "just now",
            read: false,
          })
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addNotification({
          id: Date.now().toString(),
          type: "streak",
          message: "You must be logged in to save entries.",
          timestamp: "just now",
          read: false,
        })
        return
      }

      const { error } = await supabase.from("entries").insert({
        user_id: user.id,
        content: content,
        is_encrypted: is_encrypted,
        created_at: new Date().toISOString()
      })

      if (error) {
        addNotification({
          id: Date.now().toString(),
          type: "streak",
          message: "Failed to save to database: " + error.message,
          timestamp: "just now",
          read: false,
        })
        return
      }

      const newEntry: DailyEntry = {
        id: Date.now().toString(),
        date: getTodayDateString(),
        ...entryData
      }
      
      // Update global metric definitions based on this entry if they changed
      const currentMetricKeys = Object.keys(formData.classification)
      if (JSON.stringify(currentMetricKeys) !== JSON.stringify(metricDefinitions)) {
        setMetricDefinitions(currentMetricKeys)
      }

      addEntry(newEntry)
      addNotification({
        id: Date.now().toString(),
        type: "entry_saved",
        message: is_encrypted ? "Entry encrypted and saved!" : "Entry saved (unencrypted).",
        timestamp: "just now",
        read: false,
      })
      
      const resetClassification: Record<string, number> = {}
      currentMetricKeys.forEach(k => resetClassification[k] = 0)

      setFormData({
        mood: "🙂",
        workingHours: 8,
        achievements: [],
        challenges: [],
        logText: "",
        classification: resetClassification,
      })
    }
  }

  return (
    <div className="p-6 space-y-4 bg-white h-full overflow-y-auto">
      <h2 className="font-black text-2xl mb-6">Create New Entry</h2>

      {/* Daily Log Text */}
      <div>
        <label className="font-black text-sm mb-2 block">Today's Log</label>
        <textarea
          value={formData.logText}
          onChange={(e) => setFormData({ ...formData, logText: e.target.value })}
          placeholder="Write about your day, thoughts, and feelings..."
          className="w-full border-[3px] border-black p-3 text-sm font-sans resize-none h-32 focus:outline-none focus:shadow-[4px_4px_0_0_#000]"
        />
      </div>

      {/* Mood */}
      <div>
        <label className="font-black text-sm mb-2 block">How's your mood?</label>
        <div className="flex gap-3">
          {moodOptions.map((m) => (
            <button
              key={m}
              onClick={() => setFormData({ ...formData, mood: m })}
              className={`text-3xl p-2 border-[3px] transition-all ${
                formData.mood === m ? "border-black scale-110 shadow-[3px_3px_0_0_#000]" : "border-gray-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Working Hours */}
      <div>
        <label className="font-black text-sm mb-2 block">Working Hours Today</label>
        <input
          type="number"
          min="0"
          max="24"
          value={formData.workingHours}
          onChange={(e) => setFormData({ ...formData, workingHours: parseInt(e.target.value) })}
          className="w-full border-[3px] border-black p-3 font-mono text-sm focus:outline-none focus:shadow-[4px_4px_0_0_#000]"
        />
      </div>

      {/* Achievements */}
      <div className="border-t-[2px] border-black pt-4">
        <label className="font-black text-sm mb-3 block">Achievements</label>
        <div className="space-y-2">
          {(formData.achievements || []).map((a, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={a}
                onChange={(e) => {
                  const newAchievements = [...(formData.achievements || [])]
                  newAchievements[i] = e.target.value
                  setFormData({ ...formData, achievements: newAchievements })
                }}
                className="flex-1 border-[2px] border-black p-2 text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#000]"
                placeholder="What did you achieve?"
              />
              <button
                onClick={() => {
                  const newAchievements = (formData.achievements || []).filter((_, idx) => idx !== i)
                  setFormData({ ...formData, achievements: newAchievements })
                }}
                className="px-2 border-[2px] border-black bg-red-100 hover:bg-red-200 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const current = formData.achievements || []
              if (current.length > 0 && !current[current.length - 1].trim()) {
                addNotification({
                  id: Date.now().toString(),
                  type: "streak",
                  message: "Please fill the current achievement before adding another.",
                  timestamp: "just now",
                  read: false,
                })
                return
              }
              setFormData({
                ...formData,
                achievements: [...current, ""],
              })
            }}
            className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1 mt-2"
          >
            <Plus className="w-4 h-4" /> Add Achievement
          </button>
        </div>
      </div>

      {/* Challenges */}
      <div className="border-t-[2px] border-black pt-4">
        <label className="font-black text-sm mb-3 block">Challenges</label>
        <div className="space-y-2">
          {(formData.challenges || []).map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={c}
                onChange={(e) => {
                  const newChallenges = [...(formData.challenges || [])]
                  newChallenges[i] = e.target.value
                  setFormData({ ...formData, challenges: newChallenges })
                }}
                className="flex-1 border-[2px] border-black p-2 text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#000]"
                placeholder="What was challenging?"
              />
              <button
                onClick={() => {
                  const newChallenges = (formData.challenges || []).filter((_, idx) => idx !== i)
                  setFormData({ ...formData, challenges: newChallenges })
                }}
                className="px-2 border-[2px] border-black bg-red-100 hover:bg-red-200 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const current = formData.challenges || []
              if (current.length > 0 && !current[current.length - 1].trim()) {
                addNotification({
                  id: Date.now().toString(),
                  type: "streak",
                  message: "Please fill the current challenge before adding another.",
                  timestamp: "just now",
                  read: false,
                })
                return
              }
              setFormData({
                ...formData,
                challenges: [...current, ""],
              })
            }}
            className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1 mt-2"
          >
            <Plus className="w-4 h-4" /> Add Challenge
          </button>
        </div>
      </div>

      {/* Classification */}
      <div className="border-t-[2px] border-black pt-4">
        <div className="flex items-center justify-between mb-4">
          <label className="font-black text-sm block">Focus Metrics (%)</label>
          <button 
            onClick={() => {
              setModal({
                isOpen: true,
                title: "New Metric",
                message: "Enter the name of the productivity or life metric you want to track:",
                type: "prompt",
                onConfirm: (name) => {
                  if (name && !formData.classification[name]) {
                    setFormData(prev => ({
                      ...prev,
                      classification: { ...prev.classification, [name]: 0 }
                    }))
                  }
                  setModal(prev => ({ ...prev, isOpen: false }))
                }
              })
            }}
            className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> New Metric
          </button>
        </div>
        <div className="space-y-4 bg-gray-50 p-4 border-[2px] border-black">
          {Object.entries(formData.classification).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold capitalize text-sm">{key}</span>
                  <button 
                    onClick={() => {
                      const { [key]: _, ...rest } = formData.classification
                      setFormData({ ...formData, classification: rest })
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <span className="font-mono font-black bg-white border-[2px] border-black px-3 py-1 text-xs">{value}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    classification: {
                      ...formData.classification,
                      [key]: parseInt(e.target.value),
                    },
                  })
                }}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
            </div>
          ))}
          {Object.keys(formData.classification).length === 0 && (
            <p className="text-[10px] font-bold text-gray-400 text-center py-4 italic">No metrics defined. Add one above.</p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4 border-t-[2px] border-black mt-6">
        <button
          onClick={handleSubmit}
          disabled={entries.some(e => e.date === getTodayDateString())}
          className="flex-1 border-[3px] border-black p-4 font-black bg-green-100 hover:translate-y-[-2px] transition-transform active:translate-y-0 shadow-[4px_4px_0_0_#000] disabled:opacity-50 disabled:bg-gray-100 disabled:shadow-none disabled:translate-y-0"
        >
          {entries.some(e => e.date === getTodayDateString()) ? "Already Logged Today" : "Save Entry"}
        </button>
        <button
          onClick={() => {
            const lastEntry = entries[0]
            const baseMetrics = lastEntry ? Object.keys(lastEntry.classification) : metricDefinitions
            const resetClassification: Record<string, number> = {}
            baseMetrics.forEach(m => resetClassification[m] = 0)

            setFormData({
              mood: "🙂",
              workingHours: 8,
              achievements: [],
              challenges: [],
              logText: "",
              classification: resetClassification,
            })
          }}
          className="flex-1 border-[3px] border-black p-4 font-black bg-gray-100 hover:translate-y-[-2px] transition-transform active:translate-y-0 shadow-[4px_4px_0_0_#000]"
        >
          Clear
        </button>
      </div>

      <Modal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
