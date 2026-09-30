'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { useRole } from '../../../lib/useRole'
import { C, CrmPage, CrmHeader, Body, Stat, Pill, Group, Row, Empty, Modal, Loading, btn, input as inp, label as lbl } from '../../../components/crm/Page'

const TYPES = [
  { k: 'pdf', l: 'PDF', color: '#DF2F4A' },
  { k: 'file', l: 'File', color: '#579BFC' },
  { k: 'video', l: 'Video', color: '#9D50DD' },
]
const GROUP_COLORS = ['#D0AE4C', '#579BFC', '#00C875', '#9D50DD', '#FDAB3D', '#DF2F4A', '#66CCFF', '#784BD1']

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
  const [watching, setWatching] = useState<string | null>(null)
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

  if (loading || roleLoading) return <Loading />

  const totalDone = materials.filter(m => completedIds.has(m.id)).length
  const groups: Record<string, any[]> = {}
  for (const m of materials) {
    const cat = m.category || 'General'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(m)
  }
  const pct = materials.length ? Math.round(totalDone / materials.length * 100) : 0
  const cols = [
    { k: 'n', l: 'Material', w: 'minmax(280px,1.6fr)' },
    { k: 't', l: 'Type', w: 110 },
    { k: 'o', l: 'Open', w: 130 },
    { k: 's', l: 'My status', w: 140 },
    { k: 'd', l: 'Added', w: 120 },
    ...(isAdmin ? [{ k: 'x', l: '', w: 56 }] : []),
  ]

  return (
    <CrmPage>
      <CrmHeader
        title="Staff Training"
        subtitle="PDFs, files and videos for the team to work through and tick off."
        actions={isAdmin ? <button onClick={() => setShowAdd(true)} style={btn('gold')}>+ Add material</button> : undefined}
      />
      <Body>
        {materials.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
            <Stat label="Materials" value={materials.length} />
            <Stat label="Completed by you" value={totalDone} />
            <Stat label="Still to do" value={materials.length - totalDone} />
            <Stat label="Your progress" value={pct + '%'} highlight />
          </div>
        )}

        {materials.length === 0 && <Empty>{isAdmin ? 'No training material yet. Click “+ Add material” to add a PDF, file or video.' : 'No training material has been added yet.'}</Empty>}

        {Object.entries(groups).map(([cat, items], gi) => (
          <Group key={cat} title={cat} color={GROUP_COLORS[gi % GROUP_COLORS.length]} count={items.length} cols={cols}>
            {items.map(m => {
              const done = completedIds.has(m.id)
              const t = TYPES.find(x => x.k === m.type) ?? TYPES[1]
              const embed = m.type === 'video' ? embedUrl(m.url) : null
              const open = watching === m.id
              return (
                <Row key={m.id} active={open}
                  cells={[
                    <div key="n" style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                      {m.description && <div style={{ fontSize: 12, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.description}</div>}
                    </div>,
                    <Pill key="t" color={t.color} width={70}>{t.l}</Pill>,
                    m.type === 'video'
                      ? <button key="o" onClick={() => setWatching(open ? null : m.id)} style={{ ...btn('ghost', true), minWidth: 96, justifyContent: 'center' }}>{open ? 'Close' : '▶ Watch'}</button>
                      : <a key="o" href={m.url} target="_blank" rel="noreferrer" style={{ ...btn('ghost', true), minWidth: 96, justifyContent: 'center' }}>{m.type === 'pdf' ? 'Open PDF' : 'Open file'}</a>,
                    <Pill key="s" color={done ? C.green : C.grey} onClick={() => toggleComplete(m.id)} title="Click to tick / untick" width={112}>{done ? '✓ Done' : 'Not started'}</Pill>,
                    <span key="d" style={{ fontSize: 13, color: C.muted }}>{m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</span>,
                    ...(isAdmin ? [<button key="x" onClick={() => { if (confirm('Delete this material?')) deleteMaterial(m.id) }} title="Delete" style={{ ...btn('danger', true), padding: '5px 8px' }}>×</button>] : []),
                  ]}
                  below={open ? (
                    <div style={{ padding: 16 }}>
                      {embed ? <iframe src={embed} style={{ width: '100%', maxWidth: 640, aspectRatio: '16 / 9', borderRadius: 4, border: 'none' }} allowFullScreen />
                        : <video src={m.url} controls style={{ width: '100%', maxWidth: 640, borderRadius: 4 }} />}
                    </div>
                  ) : undefined}
                />
              )
            })}
          </Group>
        ))}
      </Body>

      {isAdmin && showAdd && (
        <Modal title="New training material" width={600} onClose={() => setShowAdd(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label style={lbl}>Title *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Guest check-in procedure" style={inp} /></div>
            <div><label style={lbl}>Category</label><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Onboarding, Sales" list="training-cats" style={inp} />
              <datalist id="training-cats">{Object.keys(groups).map(g => <option key={g} value={g} />)}</datalist></div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inp, minHeight: 60, resize: 'vertical' }} /></div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Type</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {TYPES.map(t => {
                const on = form.type === t.k
                return <button key={t.k} onClick={() => setForm({ ...form, type: t.k, url: '' })} style={{ padding: '6px 16px', borderRadius: 4, border: '1px solid ' + (on ? t.color : C.border), background: on ? t.color : '#fff', color: on ? '#fff' : C.ink, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{t.l}</button>
              })}
            </div>
          </div>
          <div style={{ marginBottom: 6 }}>
            {form.type === 'video' ? (
              <>
                <label style={lbl}>YouTube / Vimeo link</label>
                <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." style={{ ...inp, marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: C.faint, marginBottom: 6 }}>or upload a video file instead:</div>
                <input type="file" accept="video/*" onChange={e => e.target.files?.[0] && handleFilePicked(e.target.files[0])} />
              </>
            ) : (
              <>
                <label style={lbl}>{form.type === 'pdf' ? 'PDF file' : 'File'}</label>
                <input type="file" accept={form.type === 'pdf' ? 'application/pdf' : undefined} onChange={e => e.target.files?.[0] && handleFilePicked(e.target.files[0])} />
              </>
            )}
            {uploading && <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>Uploading…</div>}
            {form.url && !uploading && <div style={{ fontSize: 12, color: C.green, marginTop: 6 }}>Ready to add.</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={btn('ghost')}>Cancel</button>
            <button onClick={addMaterial} disabled={!form.title.trim() || !form.url.trim() || uploading} style={{ ...btn('gold'), opacity: !form.title.trim() || !form.url.trim() || uploading ? 0.6 : 1 }}>Add material</button>
          </div>
        </Modal>
      )}
    </CrmPage>
  )
}
