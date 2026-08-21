import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import MyObservationsPanel from '@/observations/MyObservationsPanel'
import styles from './AuthStatus.module.css'

export default function AuthStatus() {
    const [user, setUser] = useState<User | null>(null)
    const [signingOut, setSigningOut] = useState(false)
    const [observationsOpen, setObservationsOpen] = useState(false)

    useEffect(() => {
        if (!supabase) return

        let active = true
        supabase.auth.getUser().then(({ data }) => active && setUser(data.user))
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            if (active) setUser(session?.user ?? null)
        })

        return () => {
            active = false
            data.subscription.unsubscribe()
        }
    }, [])

    if (!supabase || !user) return null

    async function signOut() {
        if (!supabase) return
        setSigningOut(true)
        await supabase.auth.signOut()
        setSigningOut(false)
    }

    return (
        <>
            <div className={styles.account} aria-label="Signed-in account">
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.email} title={user.email}>
                    {user.email}
                </span>
                <span className={styles.actions}>
                    <button
                        className={styles.observationsButton}
                        type="button"
                        onClick={() => setObservationsOpen(true)}
                    >
                        My observations
                    </button>
                    <button className={styles.signOutButton} type="button" onClick={signOut} disabled={signingOut}>
                        {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </span>
            </div>
            <MyObservationsPanel open={observationsOpen} onClose={() => setObservationsOpen(false)} />
        </>
    )
}
