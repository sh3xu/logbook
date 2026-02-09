
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { hashKey } from "@/lib/encryption"
import { useUIStore } from "@/lib/ui-store"
import { Loader2, Shield, Lock, Eye, EyeOff, CheckCircle2, XCircle, Copy, RefreshCw, Check } from "lucide-react"

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [decryptionKey, setDecryptionKey] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [copied, setCopied] = useState(false)

  // Redirect to Proton Mail logic: Check if email is likely a temp mail
  // But we only allow Proton.
  const isProtonMail = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase()
    return ['proton.me', 'protonmail.com', 'protonmail.ch', 'pm.me'].includes(domain)
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (username.length >= 3 && !isLogin) {
        setCheckingUsername(true)
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username)
          .single()
        
        setUsernameAvailable(!data)
        setCheckingUsername(false)
      } else {
        setUsernameAvailable(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username, isLogin])

  const setEncryptionKey = useUIStore((s) => s.setEncryptionKey)

  const generateSecureKey = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+"
    const length = 24
    let result = ""
    const values = new Uint32Array(length)
    crypto.getRandomValues(values)
    for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length]
    }
    setDecryptionKey(result)
    setMessage({ type: "success", text: "Secure key generated! Make sure to save it." })
  }

  const copyKey = () => {
    navigator.clipboard.writeText(decryptionKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!isLogin) {
      // Signup Validations
      if (!isProtonMail(email)) {
        setMessage({ type: "error", text: "Please use a valid secure email provider." })
        setLoading(false)
        return
      }

      if (usernameAvailable === false) {
        setMessage({ type: "error", text: "Username is already taken." })
        setLoading(false)
        return
      }

      if (decryptionKey.length < 8) {
        setMessage({ type: "error", text: "Decryption key must be at least 8 characters." })
        setLoading(false)
        return
      }

      const keyHash = await hashKey(decryptionKey)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            key_hash: keyHash,
          }
        }
      })

      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        // We set the key in store on signup too so they don't have to re-enter it immediately
        setEncryptionKey(decryptionKey)
        setMessage({ type: "success", text: "Check your email for the verification link!" })
      }
    } else {
      // Login Logic (Email or Username)
      let loginEmail = email
      
      // If it doesn't look like an email, treat as username
      if (!email.includes("@")) {
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", email)
          .single()
        
        if (profileErr || !profile?.email) {
          setMessage({ type: "error", text: "Username not found." })
          setLoading(false)
          return
        }
        loginEmail = profile.email
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (authError) {
        setMessage({ type: "error", text: authError.message })
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF0] p-4 font-sans selection:bg-black selection:text-white">
      {/* Background patterns similar to main app */}
      <div className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 8px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 8px)
          `,
          backgroundSize: "8px 8px, 8px 8px",
        }}
      />
      
      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-black uppercase">Logbook</h1>
          <p className="text-black/60 font-medium italic">Secure. Private. Encrypted.</p>
        </div>

        <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
          <div className="flex border-b-2 border-black mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 font-bold uppercase tracking-wider transition-colors ${isLogin ? 'bg-black text-white' : 'hover:bg-black/5'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 font-bold uppercase tracking-wider transition-colors ${!isLogin ? 'bg-black text-white' : 'hover:bg-black/5'}`}
            >
              Signup
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-black/50">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full p-4 border-2 border-black outline-none focus:bg-yellow-50 font-bold transition-colors"
                    placeholder="YOUR_REAL_NAME"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-black/50">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full p-4 border-2 border-black outline-none focus:bg-yellow-50 font-bold transition-colors"
                      placeholder="CHOOSE_A_HANDLE"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {checkingUsername && <Loader2 className="w-5 h-5 animate-spin text-black/40" />}
                      {usernameAvailable === true && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      {usernameAvailable === false && <XCircle className="w-5 h-5 text-red-600" />}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black/50">
                {isLogin ? "Username or Email" : "Email"}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-4 border-2 border-black outline-none focus:bg-yellow-50 font-bold transition-colors"
                placeholder={isLogin ? "HANDLE_OR_MAIL" : "YOUR_ENCRYPTED_MAIL"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black/50">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-4 border-2 border-black outline-none focus:bg-yellow-50 font-bold transition-colors"
                  placeholder="********"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Critical Warning Block */}
            <div className="p-4 border-2 border-dashed border-[#FF2E63] bg-red-50 space-y-2">
              <div className="flex items-center gap-2 text-[#FF2E63] font-black text-xs uppercase">
                <Shield className="w-4 h-4" /> Security Notice
              </div>
              <p className="text-[10px] text-gray-700 font-bold leading-tight">
                Your data is encrypted locally. If you lose your Master Key, your data <span className="text-[#FF2E63] underline">CANNOT BE RECOVERED</span>. Resetting your key will make all previous entries unreadable forever. <span className="italic">Use at your own risk.</span>
              </p>
            </div>

            {!isLogin ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase tracking-widest text-black/50 italic">Master Decryption Key</label>
                  <Lock className="w-4 h-4 text-black/40" />
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={decryptionKey}
                    onChange={(e) => setDecryptionKey(e.target.value)}
                    required
                    autoComplete="off"
                    className="w-full p-4 border-2 border-black outline-none focus:bg-green-50 font-bold transition-colors placeholder:text-black/20"
                    placeholder="CREATE_SECURE_KEY"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={copyKey}
                      disabled={!decryptionKey}
                      className="p-2 hover:bg-black/5 rounded transition-colors"
                      title="Copy Key"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-black/40" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-[10px] text-black/40 font-bold uppercase italic leading-tight">
                    Choose a key you will never forget. You will need this inside to unlock your data.
                  </p>
                  <button
                    type="button"
                    onClick={generateSecureKey}
                    className="w-fit text-[10px] bg-black text-white px-3 py-1 font-black uppercase tracking-tighter hover:bg-[#FF2E63] transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> System Generated Key
                  </button>
                </div>
              </div>
            ) : null}

            {message && (
              <div className={`p-4 border-2 border-black font-bold text-sm ${message.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-black text-white font-black uppercase tracking-widest hover:bg-white hover:text-black border-2 border-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Initiate Link' : 'Register Securely'}
                  <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
            End-to-End Encrypted &bull; No Tracking &bull; zero Knowledge
          </p>
        </div>
      </div>
    </div>
  )
}
