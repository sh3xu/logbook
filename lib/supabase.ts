import { createClient, SupportedStorage } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Custom cookie storage for Supabase
const cookieStorage: SupportedStorage = {
    getItem: (key: string) => {
        if (typeof window === "undefined") return null
        const name = key + "="
        const decodedCookie = decodeURIComponent(document.cookie)
        const ca = decodedCookie.split(";")
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i]
            while (c.charAt(0) === " ") c = c.substring(1)
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length)
        }
        return null
    },
    setItem: (key: string, value: string) => {
        if (typeof window === "undefined") return
        document.cookie = `${key}=${value};path=/;SameSite=Lax`
    },
    removeItem: (key: string) => {
        if (typeof window === "undefined") return
        document.cookie = `${key}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC;SameSite=Lax`
    },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storage: cookieStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
})
