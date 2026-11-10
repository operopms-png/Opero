'use client'
// Shown to anyone set to View only: they can look at everything they were given but not change it. Messages still work.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ViewOnlyBanner() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return
        const { data } = await supabase.from('team_members').select('view_only').eq('email', user.email).eq('view_only', true).limit(1)
        if (live && data?.length) setOn(true)
      } catch { /* banner is a courtesy; the database enforces the rule */ }
    })()
    return () => { live = false }
  }, [])
  if (!on) return null
  return (
    <div role="status" style={{ background: '#FEF0C7', color: '#93370D', fontSize: 13, fontWeight: 600, padding: '8px 16px', textAlign: 'center', borderBottom: '1px solid #FEDF89' }}>
      View only: you can look at everything you have access to, but you cannot change anything. Messages and replies still work.
    </div>
  )
}
