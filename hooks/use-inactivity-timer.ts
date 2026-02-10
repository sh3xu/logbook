import { useEffect, useRef } from "react"
import { useUIStore } from "@/lib/ui-store"

const INACTIVITY_LIMIT = 3 * 60 * 1000
const CHECK_INTERVAL = 1000

export function useInactivityTimer() {
    const setEncryptionKey = useUIStore((state) => state.setEncryptionKey)
    const encryptionKey = useUIStore((state) => state.encryptionKey)

    const lastActivityRef = useRef(Date.now())

    useEffect(() => {
        if (!encryptionKey) return

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
                    console.log("Tab woke up. Inactivity limit reached.")
                    setEncryptionKey(null)
                }
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange)

        const handleActivity = () => {
            if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
                setEncryptionKey(null)
                return
            }
            lastActivityRef.current = Date.now()
        }
        const events = [
            "mousedown",
            "mousemove",
            "keydown",
            "scroll",
            "touchstart",
            "click",
        ]

        events.forEach((event) => {
            window.addEventListener(event, handleActivity)
        })

        const intervalId = setInterval(() => {
            if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
                console.log("Inactivity timeout reached. Clearing encryption key.")
                setEncryptionKey(null)
            }
        }, CHECK_INTERVAL)

        return () => {
            clearInterval(intervalId)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity)
            })
        }
    }, [encryptionKey, setEncryptionKey])
}
