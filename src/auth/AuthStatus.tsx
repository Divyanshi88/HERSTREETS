import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import MyObservationsPanel from '@/observations/MyObservationsPanel'
import ModerationPanel from '@/moderation/ModerationPanel'
import { isModerator as checkModeratorAccess } from '@/moderation/moderationService'
import styles from './AuthStatus.module.css'

export default function AuthStatus() {
    const [user, setUser] = useState<User | null>(null)
    const [signingOut, setSigningOut] = useState(false)
    const [observationsOpen, setObservationsOpen] = useState(false)
    const [moderationOpen, setModerationOpen] = useState(false)
    const [moderator, setModerator] = useState(false)

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

    useEffect(() => {
        let active = true
        setModerator(false)
        setModerationOpen(false)
        if (!user)
            return () => {
                active = false
            }

        checkModeratorAccess()
            .then(hasAccess => active && setModerator(hasAccess))
            .catch(() => active && setModerator(false))
        return () => {
            active = false
        }
    }, [user?.id])

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
                    {moderator ? (
                        <button
                            className={styles.moderationButton}
                            type="button"
                            onClick={() => setModerationOpen(true)}
                        >
                            Moderation
                        </button>
                    ) : null}
                    <button className={styles.signOutButton} type="button" onClick={signOut} disabled={signingOut}>
                        {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </span>
            </div>
            <MyObservationsPanel open={observationsOpen} onClose={() => setObservationsOpen(false)} />
            <ModerationPanel open={moderationOpen} onClose={() => setModerationOpen(false)} />
        </>
    )
}
