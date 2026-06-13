'use client'
import { useEffect, useState } from 'react'

const WMO_ICONS: Record<number, string> = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'🌨️', 73:'🌨️', 75:'❄️',
  80:'🌦️', 81:'🌧️', 82:'⛈️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
}

const WMO_LABEL: Record<number, string> = {
  0:'Clear', 1:'Mostly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Foggy', 48:'Foggy',
  51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain',
  71:'Light snow', 73:'Snow', 75:'Heavy snow',
  80:'Showers', 81:'Heavy showers', 82:'Violent showers',
  95:'Thunderstorm', 96:'Thunderstorm', 99:'Thunderstorm',
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null)
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [dayOffset, setDayOffset] = useState(0)

  useEffect(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          // Reverse geocode
          const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          const geoData = await geo.json()
          setCity(geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Your location')

          // Weather from Open-Meteo
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
          const res = await fetch(url)
          const data = await res.json()
          setWeather(data)
        } catch {
          setError('Could not load weather')
        }
      },
      () => setError('Location access denied')
    )
  }, [])

  if (error) return (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px', fontSize:13, color:'#98A2B3' }}>
      {error} — enable location to see weather
    </div>
  )

  if (!weather) return (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px', fontSize:13, color:'#98A2B3' }}>
      Loading weather...
    </div>
  )

  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + dayOffset)
  const dateStr = targetDate.toISOString().split('T')[0]
  const dayLabel = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : targetDate.toLocaleDateString('en-GB', { weekday:'long' })

  // Get hourly slots for target day
  const slots = [9, 12, 15, 18].map(hour => {
    const timeStr = `${dateStr}T${String(hour).padStart(2,'0')}:00`
    const idx = weather.hourly.time.indexOf(timeStr)
    return {
      time: `${String(hour).padStart(2,'0')}:00`,
      temp: idx >= 0 ? Math.round(weather.hourly.temperature_2m[idx]) : '—',
      code: idx >= 0 ? weather.hourly.weathercode[idx] : 0,
    }
  })

  // 5-day forecast
  const forecast = weather.daily.time.slice(0, 5).map((d: string, i: number) => ({
    day: i === 0 ? 'Today' : new Date(d).toLocaleDateString('en-GB', { weekday:'short' }),
    max: Math.round(weather.daily.temperature_2m_max[i]),
    min: Math.round(weather.daily.temperature_2m_min[i]),
    code: weather.daily.weathercode[i],
  }))

  return (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      {/* Hourly */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:14 }}>🌤️</span>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#101828' }}>Weather</div>
              <div style={{ fontSize:10, color:'#667085' }}>{city}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <button onClick={()=>setDayOffset(d=>Math.max(0,d-1))} disabled={dayOffset===0} style={{ background:'none', border:'none', cursor:dayOffset===0?'default':'pointer', color:dayOffset===0?'#D0D5DD':'#344054', fontSize:14, padding:'0 2px', lineHeight:1 }}>‹</button>
            <span style={{ fontSize:11, fontWeight:500, color:'#101828', minWidth:52, textAlign:'center' }}>{dayLabel}</span>
            <button onClick={()=>setDayOffset(d=>Math.min(6,d+1))} disabled={dayOffset===6} style={{ background:'none', border:'none', cursor:dayOffset===6?'default':'pointer', color:dayOffset===6?'#D0D5DD':'#344054', fontSize:14, padding:'0 2px', lineHeight:1 }}>›</button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
          {slots.map(s=>(
            <div key={s.time} style={{ textAlign:'center', padding:'6px 4px', background:'#F7F8FA', borderRadius:8 }}>
              <div style={{ fontSize:10, color:'#667085' }}>{s.time}</div>
              <div style={{ fontSize:16, margin:'2px 0' }}>{WMO_ICONS[s.code]??'🌡️'}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#101828' }}>{s.temp}°C</div>
            </div>
          ))}
        </div>
      </div>
      {/* 5-day */}
      <div>
        <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>5-day forecast</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
          {forecast.map((f: any)=>(
            <div key={f.day} style={{ textAlign:'center', padding:'6px 2px', background:'#F7F8FA', borderRadius:8 }}>
              <div style={{ fontSize:10, color:'#667085', marginBottom:2 }}>{f.day}</div>
              <div style={{ fontSize:14 }}>{WMO_ICONS[f.code]??'🌡️'}</div>
              <div style={{ fontSize:11, fontWeight:600, color:'#101828' }}>{f.max}°</div>
              <div style={{ fontSize:10, color:'#98A2B3' }}>{f.min}°</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
