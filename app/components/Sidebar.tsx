'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const NAV = [
  { group: 'VACATION RENTALS', items: [
    { label: 'Vacation Rentals', href: '/str', icon: '🏖️' },
    { label: 'CRM', href: '/str/crm', icon: '👥' },
    { label: 'Marketing', href: '/str/marketing', icon: '📣' },
    { label: 'Sales', href: '/str/sales', icon: '💰' },
  ]},
  { group: 'PROPERTY MANAGEMENT', items: [
    { label: 'Property Management', href: '/pm', icon: '🏠' },
    { label: 'CRM', href: '/pm/crm', icon: '👥' },
    { label: 'Marketing', href: '/pm/marketing', icon: '📣' },
    { label: 'Sales', href: '/pm/sales', icon: '💰' },
  ]},
  { group: 'DEVELOPMENTS', items: [
    { label: 'Developments', href: '/dev', icon: '🏗️' },
    { label: 'CRM', href: '/dev/crm', icon: '👥' },
    { label: 'Marketing', href: '/dev/marketing', icon: '📣' },
    { label: 'Sales', href: '/dev/sales', icon: '💰' },
  ]},
]
export default function Sidebar() {
  const path = usePathname()
  const [user, setUser] = useState<any>(null)
  useEffect(() => { supabase.auth.getUser().then(({data:{user}})=>setUser(user)) }, [])
  return (
    <div style={{ width:200, background:'#fff', borderRight:'1px solid #F2F4F7', display:'flex', flexDirection:'column', minHeight:'100vh', paddingTop:16, flexShrink:0 }}>
      <div style={{ padding:'0 16px 16px', borderBottom:'1px solid #F2F4F7', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:28, height:28, background:'#101828', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'#fff', fontSize:14, fontWeight:700 }}>O</span>
        </div>
        <span style={{ fontSize:15, fontWeight:700, color:'#101828' }}>Opero</span>
      </div>
      <nav style={{ flex:1, padding:'8px 10px', overflowY:'auto' }}>
        {NAV.map(group=>(
          <div key={group.group}>
            <div style={{ fontSize:10, fontWeight:700, color:'#98A2B3', textTransform:'uppercase', letterSpacing:'0.06em', padding:'10px 10px 4px' }}>{group.group}</div>
            {group.items.map(item=>(
              <Link key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:7, background:path===item.href?'#F2F4F7':'transparent', color:path===item.href?'#101828':'#344054', fontSize:13, fontWeight:path===item.href?600:400, textDecoration:'none', marginBottom:1 }}>
                <span>{item.icon}</span>{item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ padding:'12px 16px', borderTop:'1px solid #F2F4F7', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'#F2F4F7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#101828' }}>{user?.email?.charAt(0).toUpperCase()??'A'}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#101828', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email?.split('@')[0]??'admin'}</div>
          <div style={{ fontSize:11, color:'#667085' }}>Professional</div>
        </div>
        <button onClick={()=>supabase.auth.signOut().then(()=>window.location.href='/login')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#667085' }}>→</button>
      </div>
    </div>
  )
}
