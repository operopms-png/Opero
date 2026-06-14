'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function load() {
      const {data:{user}} = await supabase.auth.getUser()
      if (!user) { window.location.href='/login'; return }
      const {data:sub} = await supabase.from('subscriptions').select('api_key').eq('user_id',user.id).single()
      if (sub?.api_key) setApiKey(sub.api_key)
      setLoading(false)
    }
    load()
  }, [])
  function copy() { navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#98A2B3' }}>Loading...</div>
  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #E4E7EC', padding:'0 32px', height:64, display:'flex', alignItems:'center' }}>
        <h1 style={{ fontSize:18, fontWeight:600, margin:0, color:'#101828' }}>Settings</h1>
      </div>
      <div style={{ maxWidth:700, margin:'40px auto', padding:'0 32px' }}>
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:32 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#101828', marginBottom:6 }}>Your API Key</div>
          <div style={{ fontSize:13, color:'#667085', marginBottom:20, lineHeight:1.6 }}>Add this key to your website form so enquiries flow into your Opero CRM. Keep it private — anyone with this key can add contacts to your account.</div>
          <div style={{ display:'flex', gap:10 }}>
            <input readOnly value={apiKey} style={{ flex:1, padding:'10px 14px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:13, fontFamily:'monospace', color:'#101828', background:'#F9FAFB' }}/>
            <button onClick={copy} style={{ padding:'10px 20px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', minWidth:80 }}>{copied?'Copied!':'Copy'}</button>
          </div>
          <div style={{ marginTop:28, padding:20, background:'#F8F9FA', borderRadius:10, border:'1px solid #E4E7EC' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#101828', marginBottom:10 }}>How to use</div>
            <div style={{ fontSize:12, color:'#667085', lineHeight:1.8 }}>
              1. Copy your API key above<br/>
              2. In your website form script, add <code style={{ background:'#E4E7EC', padding:'1px 5px', borderRadius:4 }}>api_key: 'YOUR_KEY'</code> to the Opero fetch call<br/>
              3. Enquiries from your website will appear in your STR and PM CRM automatically
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
