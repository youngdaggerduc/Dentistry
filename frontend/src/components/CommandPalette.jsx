import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

const MATCH_LABEL = { patient: 'name', procedure: 'procedure', note: 'note' }

// Global Cmd/Ctrl+K command palette. Searches the student's patients, procedures
// and visit notes server-side; selecting a result opens that patient.
export default function CommandPalette({ open, onClose, onOpenPatient }) {
  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [active, setActive]   = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()
  const reqId    = useRef(0)

  // Focus the field and reset state whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQ(''); setResults([]); setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Debounced search.
  useEffect(() => {
    if (!open) return
    const term = q.trim()
    if (!term) { setResults([]); setLoading(false); return }
    setLoading(true)
    const id = ++reqId.current
    const t = setTimeout(async () => {
      try {
        const r = await api.search(term)
        if (id === reqId.current) { setResults(r); setActive(0) }
      } catch {
        if (id === reqId.current) setResults([])
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    }, 180)
    return () => clearTimeout(t)
  }, [q, open])

  if (!open) return null

  const choose = (r) => {
    if (!r) return
    onOpenPatient(r.patient_id)
    onClose()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape')      { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter')     { e.preventDefault(); choose(results[active]) }
  }

  const fmtNext = (s) => {
    if (!s) return null
    const dt = new Date(s)
    if (isNaN(dt)) return s
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:60,background:'rgba(2,8,11,.55)',backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)' }} />
      <div style={{ position:'fixed',top:'12vh',left:'50%',transform:'translateX(-50%)',width:'min(620px,94vw)',zIndex:61,borderRadius:'18px',overflow:'hidden',background:'linear-gradient(160deg,rgba(16,38,44,.97),rgba(6,16,21,.98))',backdropFilter:'blur(36px) saturate(150%)',WebkitBackdropFilter:'blur(36px) saturate(150%)',border:'1px solid color-mix(in srgb,var(--c1) 24%,transparent)',boxShadow:'0 30px 80px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,.08)' }}>
          <span style={{ fontSize:'16px',color:'rgba(255,255,255,.4)' }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search patients, procedures, notes…"
            style={{ flex:1,background:'transparent',border:'none',outline:'none',color:'#eaf6f6',fontSize:'15.5px',fontFamily:'inherit' }}
          />
          <kbd style={{ fontSize:'10.5px',color:'rgba(255,255,255,.4)',border:'1px solid rgba(255,255,255,.16)',borderRadius:'6px',padding:'2px 7px' }}>Esc</kbd>
        </div>

        <div style={{ maxHeight:'52vh',overflowY:'auto' }}>
          {q.trim() && !loading && results.length === 0 && (
            <div style={{ padding:'28px',textAlign:'center',color:'rgba(234,246,246,.4)',fontSize:'13.5px' }}>No matches for “{q.trim()}”.</div>
          )}
          {!q.trim() && (
            <div style={{ padding:'22px',textAlign:'center',color:'rgba(234,246,246,.35)',fontSize:'13px' }}>Type to search across your panel — names, procedures, and SOAP notes.</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.patient_id}
              onClick={() => choose(r)}
              onMouseEnter={() => setActive(i)}
              style={{ display:'flex',alignItems:'center',gap:'14px',width:'100%',textAlign:'left',padding:'13px 20px',border:'none',cursor:'pointer',fontFamily:'inherit',background:i===active?'rgba(255,255,255,.07)':'transparent',borderLeft:i===active?'2px solid var(--c1)':'2px solid transparent' }}
            >
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:'14.5px',color:'#eaf6f6' }}>{r.name}</div>
                <div style={{ fontSize:'12px',color:'rgba(234,246,246,.5)',marginTop:'2px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                  {r.last_procedure || 'No procedures yet'}
                  {r.next_appointment && <span style={{ color:'var(--c1)' }}> · next {fmtNext(r.next_appointment)}</span>}
                </div>
              </div>
              <div style={{ display:'flex',gap:'5px',flexShrink:0 }}>
                {(r.matched_on || []).map(m => (
                  <span key={m} style={{ fontSize:'9.5px',letterSpacing:'.06em',textTransform:'uppercase',padding:'2px 7px',borderRadius:'20px',background:'rgba(123,224,214,.12)',color:'var(--c1)' }}>{MATCH_LABEL[m] || m}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
