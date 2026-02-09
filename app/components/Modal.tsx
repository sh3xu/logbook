"use client"

import React from "react"
import { AlertCircle, HelpCircle } from "lucide-react"

interface ModalProps {
  isOpen: boolean
  title: string
  message: string
  type?: "confirm" | "alert" | "prompt"
  onConfirm?: (value?: string) => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  placeholder?: string
  defaultValue?: string
}

export default function Modal({
  isOpen,
  title,
  message,
  type = "alert",
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
  placeholder = "Type here...",
  defaultValue = "",
}: ModalProps) {
  const [inputValue, setInputValue] = React.useState(defaultValue)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue)
      if (type === "prompt") {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }, [isOpen, defaultValue, type])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0_0_#121212] p-8 animate-in zoom-in-95 duration-200 rounded-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-full ${type === "confirm" || type === "prompt" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-[#FF2E63]"}`}>
            {type === "confirm" || type === "prompt" ? (
              <HelpCircle className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">{title}</h3>
        </div>
        
        <p className="text-base font-bold text-gray-600 leading-relaxed mb-6">
          {message}
        </p>

        {type === "prompt" && (
          <div className="mb-8">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="w-full border-[3px] border-black p-4 font-bold text-sm outline-none focus:bg-blue-50 focus:shadow-[4px_4px_0_0_#000] transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirm?.(inputValue)
                if (e.key === "Escape") onCancel?.()
              }}
            />
          </div>
        )}

        <div className="flex gap-4">
          {(type === "confirm" || type === "prompt") && (
            <button
              onClick={onCancel}
              className="flex-1 py-4 border-[3px] border-black font-black uppercase text-xs hover:bg-gray-100 transition-all rounded-md"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => onConfirm?.(type === "prompt" ? inputValue : undefined)}
            className={`flex-1 py-4 border-[3px] border-black font-black uppercase text-xs shadow-[4px_4px_0_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all rounded-md ${
              type === "confirm" || type === "prompt" ? "bg-black text-white" : "bg-[#FF2E63] text-white shadow-[#000]"
            }`}
          >
            {type === "prompt" ? "Submit" : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
