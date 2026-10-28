'use client'
// The document editor used for templates and for documents before they're sent.
//  • Template mode: blanks are written {key} in the saved HTML; here they show as gold chips
//    that can't be typed into. "Insert blank" drops one at the cursor.
//  • Document mode: filled blanks are highlighted gold, empty ones red. When the template is
//    locked only the blanks can be typed in; otherwise the whole text can be edited.
import React, { useEffect, useRef, useState } from 'react'
import { BLANKS, blankLabel, TOKEN_RE } from '../../lib/doc-text'

export const DOC_CSS = `
.doc-sheet{font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;color:#1F1F1F;outline:none}
.doc-sheet h1{font-family:Figtree,Arial,sans-serif;font-size:21px;font-weight:800;text-align:center;letter-spacing:.01em;margin:0 0 18px;text-transform:uppercase}
.doc-sheet h2{font-family:Figtree,Arial,sans-serif;font-size:15px;font-weight:700;color:#89CFF0;margin:22px 0 6px}
.doc-sheet h3{font-family:Figtree,Arial,sans-serif;font-size:14px;font-weight:700;margin:16px 0 4px}
.doc-sheet p{margin:0 0 11px}.doc-sheet ul,.doc-sheet ol{margin:0 0 11px;padding-left:26px}.doc-sheet li{margin-bottom:4px}
.doc-sheet hr{border:none;border-top:1px solid #ccc;margin:16px 0}
.doc-sheet blockquote{margin:0 0 11px;padding-left:14px;border-left:3px solid #89CFF0;color:#555}
.doc-sheet .blank{display:inline-block;background:#FBF1D3;border:1px solid #89CFF0;color:#89CFF0;border-radius:4px;padding:0 6px;font:600 12.5px/1.6 ui-monospace,Menlo,monospace;margin:0 1px;cursor:default;user-select:all}
.doc-sheet span[data-field]{background:#FBF1D3;border-bottom:2px solid #E2C46F;padding:0 2px;border-radius:2px}
.doc-sheet span[data-field][data-empty]{background:#FDECEC;border-bottom:2px dashed #E08A8A;color:#B42318}
.doc-read span[data-field]{background:none;border:none;padding:0}
.doc-read span[data-field][data-empty]{background:none;border:none;color:#999}
`

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
// {key} / {key:A|B}  <->  chip spans
export function tokensToChips(html: string) {
  return html.replace(TOKEN_RE, (all, key: string, opts?: string) => `<span class="blank" contenteditable="false" data-token="${escAttr(all)}">${escAttr(blankLabel(key))}${opts ? ' ▾' : ''}</span>`)
}
export function chipsToTokens(html: string) {
  return html.replace(/<span class="blank"[^>]*data-token="([^"]*)"[^>]*>[\s\S]*?<\/span>/g, (_, t) => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&'))
}

type Props = {
  html: string                 // starting content; change resetKey to load new content
  resetKey: string | number
  mode: 'template' | 'document'
  lock?: 'locked' | 'approval' | 'editable'
  onChange: (html: string) => void
  readOnly?: boolean
  minHeight?: number
}

export default function DocEditor({ html, resetKey, mode, lock = 'editable', onChange, readOnly, minHeight = 520 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [blankMenu, setBlankMenu] = useState(false)
  const [custom, setCustom] = useState('')
  const lockedDoc = mode === 'document' && lock === 'locked'

  useEffect(() => {
    const el = ref.current; if (!el) return
    el.innerHTML = mode === 'template' ? tokensToChips(html) : html
    if (mode === 'document') el.querySelectorAll('span[data-field]').forEach(s => (s as HTMLElement).contentEditable = readOnly ? 'false' : 'true')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const emit = () => { const el = ref.current; if (!el) return; onChange(mode === 'template' ? chipsToTokens(el.innerHTML) : el.innerHTML) }
  const cmd = (c: string, v?: string) => { ref.current?.focus(); document.execCommand(c, false, v); emit() }
  const insertBlank = (token: string) => {
    ref.current?.focus()
    const key = token.slice(1, -1).split(':')[0]
    const opts = token.includes(':')
    document.execCommand('insertHTML', false, `<span class="blank" contenteditable="false" data-token="${escAttr(token)}">${escAttr(blankLabel(key))}${opts ? ' ▾' : ''}</span>&nbsp;`)
    setBlankMenu(false); emit()
  }
  const groups = [...new Set(BLANKS.map(b => b.group))]
  const tb: React.CSSProperties = { border: '1px solid #E3E1DB', background: '#fff', borderRadius: 5, padding: '4px 9px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Figtree,Arial,sans-serif', color: '#323338' }
  const showToolbar = !readOnly && !lockedDoc

  return (
    <div style={{ background: '#fff', border: '1px solid #E6E3DB', borderRadius: 8, overflow: 'visible' }}>
      <style>{DOC_CSS}</style>
      {showToolbar && <div onMouseDown={e => { if ((e.target as HTMLElement).tagName === 'BUTTON') e.preventDefault() }} style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '9px 12px', borderBottom: '1px solid #EEECE6', background: '#FAF9F6', borderRadius: '8px 8px 0 0', position: 'relative' }}>
        <button type="button" style={tb} onClick={() => cmd('bold')}><b>B</b></button>
        <button type="button" style={tb} onClick={() => cmd('italic')}><i>I</i></button>
        <button type="button" style={tb} onClick={() => cmd('underline')}><u>U</u></button>
        <button type="button" style={tb} onClick={() => cmd('formatBlock', 'H1')}>Title</button>
        <button type="button" style={tb} onClick={() => cmd('formatBlock', 'H2')}>Heading</button>
        <button type="button" style={tb} onClick={() => cmd('formatBlock', 'P')}>Text</button>
        <button type="button" style={tb} onClick={() => cmd('insertUnorderedList')}>• List</button>
        <button type="button" style={tb} onClick={() => cmd('insertOrderedList')}>1. List</button>
        <button type="button" style={tb} onClick={() => cmd('justifyCenter')}>Centre</button>
        <button type="button" style={tb} onClick={() => cmd('insertHorizontalRule')}>Line</button>
        {mode === 'template' && <button type="button" style={{ ...tb, background: '#FBF1D3', borderColor: '#89CFF0', color: '#89CFF0' }} onClick={() => setBlankMenu(v => !v)}>+ Insert blank ▾</button>}
        {blankMenu && <div style={{ position: 'absolute', top: '100%', left: 12, zIndex: 40, width: 340, maxHeight: 420, overflowY: 'auto', background: '#fff', border: '1px solid #E3E1DB', borderRadius: 8, boxShadow: '0 12px 30px rgba(0,0,0,.14)', padding: 8, fontFamily: 'Figtree,Arial,sans-serif' }}>
          {groups.map(g => <div key={g} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: '#89CFF0', textTransform: 'uppercase', padding: '4px 6px' }}>{g}</div>
            {BLANKS.filter(b => b.group === g).map(b => <button type="button" key={b.key} onClick={() => insertBlank(`{${b.key}}`)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', border: 'none', background: 'none', padding: '5px 6px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 4, textAlign: 'left' }}><span>{b.label}</span><code style={{ fontSize: 11, color: '#8A877F' }}>{b.key}</code></button>)}
          </div>)}
          <div style={{ borderTop: '1px solid #EEE', paddingTop: 8, marginTop: 4 }}>
            <div style={{ fontSize: 11.5, color: '#676879', marginBottom: 4 }}>Your own blank — a name, or a choice like <code>package:Option A|Option B</code></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. parking_space" style={{ flex: 1, padding: '5px 8px', border: '1px solid #E3E1DB', borderRadius: 4, fontSize: 13 }} />
              <button type="button" style={tb} onClick={() => { const [k, ...o] = custom.split(':'); const key = k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); if (!/^[a-z]/.test(key)) return; insertBlank(`{${key}${o.length ? ':' + o.join(':').trim() : ''}}`); setCustom('') }}>Add</button>
            </div>
          </div>
        </div>}
      </div>}
      {lockedDoc && !readOnly && <div style={{ padding: '8px 14px', borderBottom: '1px solid #EEECE6', background: '#FAF9F6', fontSize: 12.5, color: '#676879', fontFamily: 'Figtree,Arial,sans-serif', borderRadius: '8px 8px 0 0' }}>This template is locked — click a highlighted blank to fill it in.</div>}
      <div ref={ref} className={'doc-sheet' + (readOnly ? ' doc-read' : '')} contentEditable={!readOnly && !lockedDoc} suppressContentEditableWarning
        onInput={emit} onBlur={emit}
        onKeyDown={e => { if (lockedDoc && e.key === 'Enter') e.preventDefault() }}
        style={{ padding: '38px 46px', minHeight, maxWidth: 820, margin: '0 auto' }} />
    </div>
  )
}
