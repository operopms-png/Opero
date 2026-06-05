import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: properties } = await supabase.from('properties').select('*')
  const { data: tasks } = await supabase.from('cleaning_tasks').select('*')
  const { data: tickets } = await supabase.from('maintenance_tickets').select('*')

  return (
    <main style={{fontFamily:'sans-serif',background:'#F9FAFB',minHeight:'100vh'}}>
      <nav style={{background:'#0A4FB3',padding:'0 32px',height:'60px',display:'flex',alignItems:'center'}}>
        <span style={{fontWeight:'700',fontSize:'1.2rem',color:'#fff'}}>⬡ Opero</span>
        <span style={{marginLeft:'auto',fontSize:'0.875rem',color:'rgba(255,255,255,0.7)'}}>Dashboard</span>
      </nav>
      <div style={{padding:'32px',maxWidth:'1200px',margin:'0 auto'}}>
        <h1 style={{fontSize:'1.5rem',fontWeight:'700',marginBottom:'8px',color:'#111827'}}>Good morning, Jordan</h1>
        <p style={{color:'#6B7280',marginBottom:'32px'}}>Here is what is happening today.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'32px'}}>
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'0.72rem',fontWeight:'600',color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'8px'}}>Properties</div>
            <div style={{fontSize:'2rem',fontWeight:'800',color:'#111827'}}>{properties?.length ?? 0}</div>
            <div style={{fontSize:'0.75rem',color:'#22C55E',marginTop:'4px'}}>All active</div>
          </div>
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'0.72rem',fontWeight:'600',color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'8px'}}>Cleaning Tasks</div>
            <div style={{fontSize:'2rem',fontWeight:'800',color:'#111827'}}>{tasks?.length ?? 0}</div>
            <div style={{fontSize:'0.75rem',color:'#6B7280',marginTop:'4px'}}>This month</div>
          </div>
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'0.72rem',fontWeight:'600',color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'8px'}}>Maintenance</div>
            <div style={{fontSize:'2rem',fontWeight:'800',color:'#0A4FB3'}}>{tickets?.length ?? 0}</div>
            <div style={{fontSize:'0.75rem',color:'#6B7280',marginTop:'4px'}}>Open tickets</div>
          </div>
          <div style={{background:'#0A4FB3',border:'1px solid #0A4FB3',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'0.72rem',fontWeight:'600',color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'8px'}}>Revenue</div>
            <div style={{fontSize:'2rem',fontWeight:'800',color:'#fff'}}>£0</div>
            <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.6)',marginTop:'4px'}}>This month</div>
          </div>
        </div>
        <h2 style={{fontSize:'1rem',fontWeight:'700',color:'#111827',marginBottom:'16px'}}>Your Properties</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'16px'}}>
          {properties?.map(p => (
            <div key={p.id} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:'12px',padding:'24px',cursor:'pointer'}}>
              <div style={{fontWeight:'700',fontSize:'1rem',color:'#111827',marginBottom:'4px'}}>{p.name}</div>
              <div style={{fontSize:'0.875rem',color:'#6B7280',marginBottom:'16px'}}>{p.address}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{background:'#DCFCE7',color:'#166534',padding:'3px 10px',borderRadius:'100px',fontSize:'0.72rem',fontWeight:'600'}}>{p.status?.replace('_',' ')}</span>
                <span style={{fontSize:'0.75rem',color:'#6B7280'}}>{p.bedrooms} bed</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}