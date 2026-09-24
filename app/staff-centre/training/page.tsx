'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { useRole } from '../../../lib/useRole'

const ACCENT = '#3B4AFF'
const TYPES = [
  { k: 'pdf', l: 'PDF' },
  { k: 'file', l: 'File' },
  { k: 'video', l: 'Video' },
]

function typeIcon(type: string) {
  if (type === 'video') return '▶'
  if (type === 'pdf') return '📄' // kept as text glyph only where an icon set isn't worth building for a one-off badge
  return '📁'
}

// Turns a pasted YouTube/Vimeo link into its embeddable form. Returns
// null for anything else (an uploaded file's own URL, or a direct .mp4
// link), which the player below falls back to rendering as <video>.
function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

async function uploadFile(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('pm-files').getPublicUrl(path)
  return data.publicUrl
}

export default function TrainingPage() {
  const { role, loading: roleLoading } = useRole()
  const isAdmin = role === 'Admin'

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [materials, setMaterials] = useState<any[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<{ title: string; description: string; category: string; type: string; url: string }>({ title: '', description: '', category: '', type: 'pdf', url: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUserEmail(user.email ?? '')
    const accountId = await getAccountId(user)

    const { data: mats } = await supabase.from('training_materials').select('*').eq('user_id', accountId).order('category').order('created_at', { ascending: false })
    setMaterials(mats ?? [])

    const matIds = (mats ?? []).map((m: any) => m.id)
    if (matIds.length && user.email) {
      const { data: completions } = await supabase.from('training_completions').select('material_id').eq('staff_email', user.email).in('material_id', matIds)
      setCompletedIds(new Set((completions ?? []).map((c: any) => c.material_id)))
    } else {
      setCompletedIds(new Set())
    }
    setLoading(false)
  }

  async function toggleComplete(materialId: string) {
    const done = completedIds.has(materialId)
    if (done) {
      await supabase.from('training_completions').delete().eq('material_id', materialId).eq('staff_email', userEmail)
      setCompletedIds(prev => { const s = new Set(prev); s.delete(materialId); return s })
    } else {
      await supabase.from('training_completions').upsert({ material_id: materialId, staff_email: userEmail }, { onConflict: 'material_id,staff_email' })
      setCompletedIds(prev => new Set(prev).add(materialId))
    }
  }

  async function handleFilePicked(file: File) {
    setUploading(true)
    const url = await uploadFile(file, 'training')
    setUploading(false)
    if (url) setForm(f => ({ ...f, url }))
  }

  async function addMaterial() {
    if (!form.title.trim() || !form.url.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const accountId = await getAccountId(user)
    const { data: inserted } = await supabase.from('training_materials').insert({
      user_id: accountId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      type: form.type,
      url: form.url.trim(),
      created_by_email: user.email,
    }).select().single()
    if (inserted) {
      setMaterials(prev => [inserted, ...prev])
      setForm({ title: '', description: '', category: '', type: 'pdf', url: '' })
      setShowAdd(false)
    }
  }

  async function deleteMaterial(id: string) {
    await supabase.from('training_materials').delete().eq('id', id)
    setMaterials(prev => prev.filter(m => m.id !== id))
  }

  if (loading || roleLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  const totalDone = materials.filter(m => completedIds.has(m.id)).length
  const groups: Record<string, any[]> = {}
  for (const m of materials) {
    const cat = m.category || 'General'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(m)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif", padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#101828', margin: '0 0 4px' }}>Staff Training</h1>
          <div style={{ fontSize: 13, color: '#667085' }}>
            {materials.length ? `${totalDone} of ${materials.length} completed` : 'PDFs, files, and videos for the team to work through and check off.'}
          </div>
        </div>
        {isAdmin && <button onClick={() => setShowAdd(v => !v)} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{showAdd ? 'Cancel' : '+ Add material'}</button>}
      </div>

      {isAdmin && showAdd && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#101828', marginBottom: 14 }}>New training material</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Guest check-in procedure" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Category (optional)</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Onboarding, Sales, Compliance" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 60, resize: 'vertical' as const }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Type</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {TYPES.map(t => (
                <button key={t.k} onClick={() => setForm({ ...form, type: t.k, url: '' })} style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${form.type === t.k ? ACCENT : '#D0D5DD'}`, background: form.type === t.k ? '#EEF0FF' : '#fff', color: form.type === t.k ? ACCENT : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t.l}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            {form.type === 'video' ? (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>YouTube / Vimeo link</label>
                <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 6 }}>or upload a video file instead:</div>
                <input type="file" accept="video/*" onChange={e => e.target.files?.[0] && handleFilePicked(e.target.files[0])} />
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>{form.type === 'pdf' ? 'PDF file' : 'File'}</label>
                <input type="file" accept={form.type === 'pdf' ? 'application/pdf' : undefined} onChange={e => e.target.files?.[0] && handleFilePicked(e.target.files[0])} />
              </>
            )}
            {uploading && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 6 }}>Uploading…</div>}
            {form.url && !uploading && <div style={{ fontSize: 12, color: '#10B981', marginTop: 6 }}>Ready to add.</div>}
          </div>
          <button onClick={addMaterial} disabled={!form.title.trim() || !form.url.trim() || uploading} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !form.title.trim() || !form.url.trim() || uploading ? 0.6 : 1 }}>Add material</button>
        </div>
      )}

      {materials.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 40, textAlign: 'center' as const, color: '#98A2B3' }}>
          {isAdmin ? 'No training material yet -- add a PDF, file, or video above.' : 'No training material has been added yet.'}
        </div>
      )}

      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>{cat}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(m => {
              const done = completedIds.has(m.id)
              const embed = m.type === 'video' ? embedUrl(m.url) : null
              return (
                <div key={m.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: m.type === 'video' ? 12 : 0 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{typeIcon(m.type)}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#101828' }}>{m.title}</div>
                        {m.description && <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{m.description}</div>}
                        {(m.type === 'pdf' || m.type === 'file') && (
                          <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>{m.type === 'pdf' ? 'Open PDF' : 'Open file'} →</a>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: done ? '#10B981' : '#667085', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                        <input type="checkbox" checked={done} onChange={() => toggleComplete(m.id)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                        {done ? 'Completed' : 'Mark as done'}
                      </label>
                      {isAdmin && <button onClick={() => deleteMaterial(m.id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#FEE2E2', fontSize: 11, cursor: 'pointer', color: '#EF4444' }}>×</button>}
                    </div>
                  </div>
                  {m.type === 'video' && (
                    embed ? (
                      <iframe src={embed} style={{ width: '100%', maxWidth: 560, height: 315, borderRadius: 8, border: 'none' }} allowFullScreen />
                    ) : (
                      <video src={m.url} controls style={{ width: '100%', maxWidth: 560, borderRadius: 8 }} />
                    )
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
