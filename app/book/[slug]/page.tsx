'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function Calendar({ bookedRanges, onSelect, checkIn, checkOut }: {
  bookedRanges: {start: string, end: string}[]
  onSelect: (date: string) => void
  checkIn: string | null
  checkOut: string | null
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  function isBooked(dateStr: string) {
    return bookedRanges.some(r => dateStr >= r.start && dateStr < r.end)
  }
  function isPast(dateStr: string) {
    return dateStr < today.toISOString().split('T')[0]
  }
  function isSelected(dateStr: string) {
    if (!checkIn) return false
    if (checkIn === dateStr || checkOut === dateStr) return true
    if (checkIn && checkOut && dateStr > checkIn && dateStr < checkOut) return true
    return false
  }
  function isCheckIn(dateStr: string) { return checkIn === dateStr }
  function isCheckOut(dateStr: string) { return checkOut === dateStr }
  function formatDate(y: number, m: number, d: number) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <button onClick={() => { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1)}else setViewMonth(m=>m-1)}}
          style={{width:32,height:32,border:'1px solid #e4e6ef',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:14,color:'#6b7280'}}>‹</button>
        <div style={{fontWeight:700,fontSize:15,color:'#0a0f1e'}}>{MONTHS[viewMonth]} {viewYear}</div>
        <button onClick={() => { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1)}else setViewMonth(m=>m+1)}}
          style={{width:32,height:32,border:'1px solid #e4e6ef',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:14,color:'#6b7280'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:6}}>
        {DAYS.map(d => <div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,color:'#9ca3af',padding:'4px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((d, i) => {
          if (!d) return <div key={i}/>
          const ds = formatDate(viewYear, viewMonth, d)
          const booked = isBooked(ds)
          const past = isPast(ds)
          const sel = isSelected(ds)
          const ci = isCheckIn(ds)
          const co = isCheckOut(ds)
          const disabled = booked || past
          return (
            <div key={i} onClick={() => !disabled && onSelect(ds)}
              style={{
                textAlign:'center',padding:'8px 4px',borderRadius:8,fontSize:13,fontWeight:sel?700:500,
                cursor:disabled?'not-allowed':'pointer',
                background: ci||co ? '#5B7BF8' : sel ? '#EEF3FF' : booked ? '#f3f4f6' : '#fff',
                color: ci||co ? '#fff' : booked||past ? '#d1d5db' : sel ? '#5B7BF8' : '#0a0f1e',
                textDecoration: booked ? 'line-through' : 'none',
                border: ci||co ? 'none' : '1px solid #f0f0f0',
              }}>
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BookingPage({ params }: { params: { slug: string } }) {
  const [property, setProperty] = useState<any>(null)
  const [bookedRanges, setBookedRanges] = useState<{start:string,end:string}[]>([])
  const [checkIn, setCheckIn] = useState<string|null>(null)
  const [checkOut, setCheckOut] = useState<string|null>(null)
  const [step, setStep] = useState<'dates'|'details'|'payment'>('dates')
  const [form, setForm] = useState({name:'',email:'',phone:''})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: prop } = await supabase
        .from('properties')
        .select('*')
        .eq('slug', params.slug)
        .single()
      if (prop) {
        setProperty(prop)
        const { data: bookings } = await supabase
          .from('direct_bookings')
          .select('check_in, check_out')
          .eq('property_id', prop.id)
          .eq('status', 'confirmed')
        if (bookings) setBookedRanges(bookings.map((b:any) => ({start:b.check_in, end:b.check_out})))
      }
    }
    load()
  }, [params.slug])

  function handleDateSelect(date: string) {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date); setCheckOut(null)
    } else {
      if (date <= checkIn) { setCheckIn(date); setCheckOut(null) }
      else setCheckOut(date)
    }
  }

  function nights() {
    if (!checkIn || !checkOut) return 0
    return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
  }

  const nightly = property?.nightly_rate || 0
  const cleaning = property?.cleaning_fee || 0
  const n = nights()
  const subtotal = n * nightly
  const totalAmt = subtotal + cleaning

  async function handleBooking() {
    if (!form.name || !form.email || !form.phone) { setError('Please fill all fields'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/create-booking-checkout', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ propertyId:property.id, propertyName:property.name, checkIn, checkOut, nights:n, total:totalAmt, guestName:form.name, guestEmail:form.email, guestPhone:form.phone })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Something went wrong')
    } catch { setError('Something went wrong') }
    setLoading(false)
  }

  if (!property) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f9fc',fontFamily:'system-ui'}}>
      <div style={{color:'#9ca3af'}}>Loading...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f8f9fc',fontFamily:"'Inter',system-ui",WebkitFontSmoothing:'antialiased'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}input,button{font-family:inherit}`}</style>
      <nav style={{background:'#fff',borderBottom:'1px solid #e4e6ef',height:60,display:'flex',alignItems:'center',padding:'0 24px',position:'sticky',top:0,zIndex:10}}>
        <a href="/landing.html" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
          <img src="/logo.PNG" alt="Opero" style={{width:26,height:26,objectFit:'contain'}}/>
          <span style={{fontWeight:700,fontSize:15,color:'#0a0f1e'}}>Opero</span>
        </a>
        <div style={{marginLeft:'auto',fontSize:13,color:'#9ca3af'}}>🔒 Secure booking</div>
      </nav>

      <div style={{maxWidth:1000,margin:'0 auto',padding:'40px 24px',display:'grid',gridTemplateColumns:'1fr 380px',gap:32,alignItems:'start'}}>
        <div>
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #e4e6ef',overflow:'hidden',marginBottom:20}}>
            {property.image_url && <img src={property.image_url} alt={property.name} style={{width:'100%',height:220,objectFit:'cover'}}/>}
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#5B7BF8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{property.location}</div>
              <div style={{fontSize:22,fontWeight:800,color:'#0a0f1e',marginBottom:6}}>{property.name}</div>
              <div style={{fontSize:14,color:'#6b7280',lineHeight:1.6}}>{property.description}</div>
              {property.bedrooms && (
                <div style={{display:'flex',gap:20,marginTop:14,paddingTop:14,borderTop:'1px solid #f0f0f0'}}>
                  <div style={{fontSize:13,color:'#6b7280'}}><b style={{color:'#0a0f1e'}}>{property.bedrooms}</b> bed{property.bedrooms>1?'s':''}</div>
                  <div style={{fontSize:13,color:'#6b7280'}}><b style={{color:'#0a0f1e'}}>{property.bathrooms}</b> bath{property.bathrooms>1?'s':''}</div>
                  <div style={{fontSize:13,color:'#6b7280'}}>Up to <b style={{color:'#0a0f1e'}}>{property.max_guests}</b> guests</div>
                </div>
              )}
            </div>
          </div>

          <div style={{display:'flex',gap:0,marginBottom:20,background:'#fff',borderRadius:12,border:'1px solid #e4e6ef',padding:4}}>
            {(['dates','details','payment'] as const).map((s,i) => (
              <div key={s} onClick={() => { if(s==='dates') setStep('dates'); if(s==='details'&&checkIn&&checkOut) setStep('details') }}
                style={{flex:1,textAlign:'center',padding:'9px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',background:step===s?'#5B7BF8':'transparent',color:step===s?'#fff':'#6b7280',transition:'all 0.15s'}}>
                {i+1}. {s.charAt(0).toUpperCase()+s.slice(1)}
              </div>
            ))}
          </div>

          {step === 'dates' && (
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e4e6ef',padding:24}}>
              <div style={{fontSize:17,fontWeight:700,color:'#0a0f1e',marginBottom:4}}>Select your dates</div>
              <div style={{fontSize:13,color:'#9ca3af',marginBottom:24}}>Click check-in then check-out date</div>
              <Calendar bookedRanges={bookedRanges} onSelect={handleDateSelect} checkIn={checkIn} checkOut={checkOut}/>
              {checkIn && checkOut && (
                <button onClick={() => setStep('details')} style={{width:'100%',marginTop:20,padding:'13px',background:'#5B7BF8',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}}>Continue →</button>
              )}
              {checkIn && !checkOut && <div style={{marginTop:16,textAlign:'center',fontSize:13,color:'#9ca3af'}}>Now select your check-out date</div>}
            </div>
          )}

          {step === 'details' && (
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e4e6ef',padding:24}}>
              <div style={{fontSize:17,fontWeight:700,color:'#0a0f1e',marginBottom:20}}>Your details</div>
              {[['name','Full name','John Smith','text'],['email','Email address','john@example.com','email'],['phone','Phone number','+44 7700 900000','tel']].map(([field,label,placeholder,type]) => (
                <div key={field} style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>{label}</label>
                  <input type={type} value={(form as any)[field]} onChange={e => setForm(f=>({...f,[field]:e.target.value}))} placeholder={placeholder}
                    style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e4e6ef',borderRadius:9,fontSize:14,color:'#0a0f1e',outline:'none'}}/>
                </div>
              ))}
              {error && <div style={{color:'#ef4444',fontSize:13,marginBottom:12}}>{error}</div>}
              <button onClick={() => { if(!form.name||!form.email||!form.phone){setError('Please fill all fields');return} setError(''); setStep('payment') }}
                style={{width:'100%',padding:'13px',background:'#5B7BF8',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}}>Continue to payment →</button>
            </div>
          )}

          {step === 'payment' && (
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e4e6ef',padding:24}}>
              <div style={{fontSize:17,fontWeight:700,color:'#0a0f1e',marginBottom:6}}>Confirm & pay</div>
              <div style={{fontSize:13,color:'#9ca3af',marginBottom:20}}>You'll be redirected to Stripe's secure checkout</div>
              <div style={{background:'#f8f9fc',borderRadius:10,padding:16,marginBottom:20}}>
                {[['Guest',form.name],['Email',form.email],['Phone',form.phone],['Check-in',checkIn!],['Check-out',checkOut!]].map(([l,v]) => (
                  <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b7280',marginBottom:8}}><span>{l}</span><span style={{color:'#0a0f1e',fontWeight:600}}>{v}</span></div>
                ))}
              </div>
              {error && <div style={{color:'#ef4444',fontSize:13,marginBottom:12}}>{error}</div>}
              <button onClick={handleBooking} disabled={loading}
                style={{width:'100%',padding:'13px',background:loading?'#9ca3af':'#0a0f1e',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:loading?'not-allowed':'pointer'}}>
                {loading ? 'Processing...' : `Pay £${totalAmt.toFixed(2)} securely →`}
              </button>
              <div style={{textAlign:'center',marginTop:12,fontSize:11,color:'#9ca3af'}}>🔒 Secured by Stripe · Cancel up to 48hrs before check-in</div>
            </div>
          )}
        </div>

        <div style={{position:'sticky',top:80}}>
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #e4e6ef',padding:24}}>
            <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Booking Summary</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:16,paddingBottom:16,borderBottom:'1px solid #f0f0f0'}}>
              <span style={{fontSize:28,fontWeight:800,color:'#0a0f1e'}}>£{nightly}</span>
              <span style={{fontSize:13,color:'#9ca3af'}}> / night</span>
            </div>
            {checkIn && checkOut ? (
              <>
                <div style={{background:'#f8f9fc',borderRadius:10,padding:12,marginBottom:16}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1}}>
                    <div style={{padding:'10px 12px',background:'#fff',borderRadius:'8px 0 0 8px',border:'1px solid #e4e6ef'}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Check-in</div>
                      <div style={{fontSize:13,fontWeight:700,color:'#0a0f1e'}}>{checkIn}</div>
                    </div>
                    <div style={{padding:'10px 12px',background:'#fff',borderRadius:'0 8px 8px 0',border:'1px solid #e4e6ef',borderLeft:'none'}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Check-out</div>
                      <div style={{fontSize:13,fontWeight:700,color:'#0a0f1e'}}>{checkOut}</div>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16,paddingBottom:16,borderBottom:'1px solid #f0f0f0'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b7280'}}><span>£{nightly} × {n} night{n>1?'s':''}</span><span style={{color:'#0a0f1e',fontWeight:500}}>£{subtotal.toFixed(2)}</span></div>
                  {cleaning > 0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b7280'}}><span>Cleaning fee</span><span style={{color:'#0a0f1e',fontWeight:500}}>£{cleaning.toFixed(2)}</span></div>}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:800,color:'#0a0f1e',marginBottom:20}}>
                  <span>Total</span><span>£{totalAmt.toFixed(2)}</span>
                </div>
                {step === 'dates' && (
                  <button onClick={() => setStep('details')} style={{width:'100%',padding:'13px',background:'#5B7BF8',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}}>Reserve now →</button>
                )}
              </>
            ) : (
              <div style={{textAlign:'center',padding:'20px 0',color:'#9ca3af',fontSize:13}}>Select dates to see pricing</div>
            )}
            <div style={{marginTop:16,textAlign:'center',fontSize:11,color:'#9ca3af'}}>You won't be charged yet</div>
          </div>
        </div>
      </div>
    </div>
  )
}
