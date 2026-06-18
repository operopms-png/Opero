'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SuccessContent() {
  const params = useSearchParams()
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (sessionId) {
      fetch(`/api/booking-confirmation?session_id=${sessionId}`)
        .then(r => r.json())
        .then(setSession)
        .catch(() => {})
    }
  }, [])

  return (
    <div style={{background:'#fff',borderRadius:20,border:'1px solid #e4e6ef',padding:48,maxWidth:480,width:'100%',textAlign:'center',margin:'0 24px'}}>
      <div style={{width:64,height:64,background:'#f0fdf4',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 20px'}}>✅</div>
      <div style={{fontSize:24,fontWeight:800,color:'#0a0f1e',letterSpacing:'-0.02em',marginBottom:8}}>Booking confirmed!</div>
      <div style={{fontSize:15,color:'#6b7280',lineHeight:1.65,marginBottom:24}}>Your booking is confirmed. A receipt has been sent to your email address.</div>
      {session && (
        <div style={{background:'#f8f9fc',borderRadius:12,padding:16,textAlign:'left',marginBottom:24}}>
          {[['Property',session.propertyName],['Check-in',session.checkIn],['Check-out',session.checkOut],['Nights',session.nights]].map(([l,v]) => (
            <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b7280',marginBottom:8}}>
              <span>{l}</span><span style={{fontWeight:600,color:'#0a0f1e'}}>{v}</span>
            </div>
          ))}
        </div>
      )}
      <a href="/landing.html" style={{display:'block',padding:'12px',background:'#0a0f1e',color:'#fff',borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none'}}>
        Back to Opero
      </a>
    </div>
  )
}

export default function BookingSuccess() {
  return (
    <div style={{minHeight:'100vh',background:'#f8f9fc',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter',system-ui",WebkitFontSmoothing:'antialiased'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')`}</style>
      <Suspense fallback={<div style={{color:'#9ca3af'}}>Loading...</div>}>
        <SuccessContent/>
      </Suspense>
    </div>
  )
}
