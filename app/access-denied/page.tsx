import { AlertTriangle, Lock } from "lucide-react"
import Link from "next/link"

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4 font-mono">
      <div className="max-w-md w-full bg-white border-4 border-red-600 shadow-[8px_8px_0_0_#991b1b] p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto border-4 border-red-600">
          <Lock className="w-10 h-10 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase text-red-600 tracking-tighter">
            Security Alert
          </h1>
          <p className="font-bold text-gray-800">
            Developer tools or automation software detected.
          </p>
        </div>

        <div className="bg-red-50 p-4 border-2 border-red-200 text-left space-y-2">
          <div className="flex items-start gap-2 text-red-700 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Session terminated for security.</p>
          </div>
          <div className="flex items-start gap-2 text-red-700 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Encryption keys have been wiped.</p>
          </div>
          <div className="flex items-start gap-2 text-red-700 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Local data cache has been cleared.</p>
          </div>
        </div>

        <Link 
          href="/"
          className="block w-full py-4 bg-black text-white font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
