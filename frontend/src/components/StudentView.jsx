import { useEffect, useRef, useState } from 'react'
import PatientCard from './PatientCard.jsx'


const KIND_COLOR = {
  'Recall':      { bg:'rgba(168,199,247,.18)', fg:'#a8c7f7' },
  'New':         { bg:'rgba(191,233,168,.18)', fg:'#bfe9a8' },
  'Restorative': { bg:'color-mix(in srgb,var(--c1) 18%,transparent)', fg:'var(--c1)' },
  'Periodontics':{ bg:'rgba(247,180,168,.18)', fg:'#f7b4a8' },
  'Endodontics': { bg:'rgba(240,184,200,.18)', fg:'#f0b8c8' },
  'Prosthodontics':{ bg:'rgba(200,184,240,.18)', fg:'#c8b8f0' },
}

const STAGE_ORDER = ['New lead','Contacted','Appointment booked','Converted']
const STAGE_COLOR = {
  'New lead':          '#bfe9a8',
  'Contacted':         '#a8c7f7',
  'Appointment booked':'var(--c1)',
  'Converted':         '#f7d9a8',
}

function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return
    const els = [...ref.current.querySelectorAll('[data-reveal]')]
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) } })
    }, { threshold: 0.06, rootMargin:'0px 0px -4% 0px' })
    els.forEach(el => io.observe(el))
    setTimeout(() => els.forEach(el => el.classList.add('visible')), 2200)
    return () => io.disconnect()
  })
}

function Section({ id, title, right, children, pad = '32px 56px' }) {
  return (
    <section id={id} style={{ padding:pad }}>
      {title && (
        <div style={{ display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'22px' }}>
          <h2 data-reveal="" style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'32px',margin:0 }}>{title}</h2>
          {right && <div data-reveal="">{right}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

function Card({ children, style }) {
  return (
    <div data-reveal="" style={{ padding:'24px',borderRadius:'20px',background:'linear-gradient(140deg,rgba(255,255,255,.08),rgba(255,255,255,.02))',backdropFilter:'blur(22px) saturate(140%)',WebkitBackdropFilter:'blur(22px) saturate(140%)',border:'1px solid rgba(255,255,255,.12)',boxShadow:'0 8px 36px rgba(0,18,26,.3)',...style }}>
      {children}
    </div>
  )
}

export default function StudentView({
  user, patients, flaggedMap, todayAppts, weekAppts, allAppts,
  prospects, reminders, competency,
  onOpenPatient, onAdvanceProspect, onAddProspect,
  onCreateAppointment, onUpdateAppointment, onCancelAppointment,
  onDismissReminder, onScrollTo, showToast, reloadCompetency,
}) {
  const rootRef = useRef()
  useReveal(rootRef)

  // Patient search & filter state
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [addProspectOpen, setAddProspectOpen] = useState(false)
  const [newProspect, setNewProspect] = useState({ name:'', interest:'', source:'' })

  const filteredPatients = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        (p.faculty||'').toLowerCase().includes(search.toLowerCase()) ||
                        (p.procedure||'').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const overduePcts = competency.summary.filter(s => s.pct < 50).length
  const stats = [
    { value: String(patients.length).padStart(2,'0'), label:'Active patients',   delta:`${patients.filter(p=>p.status==='Active').length} active`, tone:'var(--c2)' },
    { value: String(todayAppts.length).padStart(2,'0'),label:'Cases today',       delta:'Clinic B',            tone:'#bfe9a8' },
    { value: String(prospects.filter(p=>p.stage!=='Converted').length).padStart(2,'0'), label:'Active leads', delta:`${prospects.filter(p=>p.stage==='New lead').length} new`, tone:'#a8c7f7' },
    { value: String(competency.summary.reduce((s,e)=>s+e.completed,0)), label:'Procedures logged', delta:overduePcts>0?`${overduePcts} categories need attention`:'All categories on track', tone:'#f7c6a8' },
  ]

  const handleAddProspect = async () => {
    if (!newProspect.name.trim()) return
    await onAddProspect({ name: newProspect.name, interest: newProspect.interest || 'General consult', source: newProspect.source || 'Walk-in', stage: 'New lead' })
    setNewProspect({ name:'', interest:'', source:'' })
    setAddProspectOpen(false)
  }

  return (
    <div ref={rootRef}>

      {/* ── Overview ── */}
      <Section id="overview" pad="58px 56px 28px">
        <p data-reveal="" style={{ letterSpacing:'.34em',textTransform:'uppercase',fontSize:'11.5px',color:'var(--c1)',margin:'0 0 20px' }}>Student Clinical Workspace</p>
        <h1 data-reveal="" style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'clamp(48px,6vw,72px)',lineHeight:1.0,margin:0 }}>
          Good morning,<br /><span style={{ fontStyle:'italic',color:'var(--c2)' }}>{user?.name?.split(' ')[0] || 'Sana'}.</span>
        </h1>
        <p data-reveal="" style={{ maxWidth:'540px',color:'rgba(234,246,246,.66)',fontSize:'17px',lineHeight:1.62,margin:'22px 0 0' }}>
          {todayAppts.length > 0 ? `${todayAppts.length} case${todayAppts.length>1?'s':''} on the chair today.` : 'No appointments scheduled for today.'}{' '}
          {reminders.length > 0 ? `${reminders.length} reminder${reminders.length>1?'s':''} need your attention.` : 'All caught up on reminders.'}
        </p>

        {reminders.length > 0 && (
          <div data-reveal="" style={{ marginTop:'22px',padding:'16px 20px',borderRadius:'16px',background:'rgba(247,198,168,.08)',border:'1px solid rgba(247,198,168,.2)' }}>
            <div style={{ fontSize:'11px',letterSpacing:'.14em',textTransform:'uppercase',color:'#f7c6a8',marginBottom:'10px' }}>Action required</div>
            <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
              {reminders.slice(0,3).map(r => (
                <div key={r.id} style={{ display:'flex',alignItems:'center',gap:'12px',fontSize:'13.5px' }}>
                  <span style={{ width:'7px',height:'7px',borderRadius:'50%',background:'#f7c6a8',flexShrink:0 }} />
                  <span style={{ flex:1,color:'rgba(234,246,246,.85)' }}>{r.message}</span>
                  <button onClick={() => onDismissReminder(r.id)} style={{ background:'transparent',border:'none',color:'rgba(255,255,255,.35)',cursor:'pointer',fontSize:'14px' }}>✕</button>
                </div>
              ))}
              {reminders.length > 3 && (
                <button onClick={() => onScrollTo('reminders')} style={{ background:'transparent',border:'none',color:'var(--c1)',cursor:'pointer',fontSize:'12.5px',textAlign:'left',padding:0 }}>
                  +{reminders.length-3} more — view all →
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'18px',marginTop:'32px' }}>
          {stats.map(s => (
            <Card key={s.label}>
              <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'46px',lineHeight:1,color:'#dffbfa' }}>{s.value}</div>
              <div style={{ marginTop:'10px',fontSize:'13px',color:'rgba(234,246,246,.6)' }}>{s.label}</div>
              <div style={{ marginTop:'8px',fontSize:'11.5px',color:s.tone }}>{s.delta}</div>
            </Card>
          ))}
        </div>

        {/* Today on the chair */}
        {todayAppts.length > 0 && (
          <div style={{ marginTop:'28px' }}>
            <div style={{ fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'var(--c1)',marginBottom:'14px' }}>Today on the chair</div>
            <div style={{ display:'flex',gap:'14px',overflowX:'auto',paddingBottom:'8px' }}>
              {todayAppts.map((a, i) => {
                const colors = KIND_COLOR[a.procedure?.split(' ')[0]] || { bg:'rgba(255,255,255,.1)',fg:'rgba(255,255,255,.6)' }
                const time = a.datetime_str?.split('T')[1]?.slice(0,5) || a.datetime_str
                return (
                  <div key={a.id} data-reveal="" style={{ minWidth:'240px',padding:'20px',borderRadius:'18px',background:'linear-gradient(140deg,rgba(255,255,255,.085),rgba(255,255,255,.02))',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.12)',flexShrink:0 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                      <span style={{ fontFamily:"'Instrument Serif',serif",fontSize:'24px' }}>{time}</span>
                      <span style={{ fontSize:'10px',letterSpacing:'.12em',textTransform:'uppercase',padding:'4px 9px',borderRadius:'20px',background:colors.bg,color:colors.fg }}>{a.status}</span>
                    </div>
                    <div style={{ marginTop:'14px',fontSize:'15px',fontWeight:600 }}>{a.patient_name}</div>
                    <div style={{ marginTop:'4px',fontSize:'12.5px',color:'rgba(234,246,246,.6)' }}>{a.procedure}</div>
                    <div style={{ marginTop:'12px',fontSize:'11.5px',color:'rgba(255,255,255,.45)' }}>{a.room} · {a.faculty}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ── Patients ── */}
      <Section id="patients" title="Your patients" right={<span style={{ fontSize:'13px',color:'rgba(255,255,255,.5)' }}>{filteredPatients.length} shown</span>}>
        {/* Search + filters */}
        <div data-reveal="" style={{ display:'flex',gap:'12px',marginBottom:'20px',alignItems:'center' }}>
          <div style={{ flex:1,position:'relative' }}>
            <span style={{ position:'absolute',left:'13px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',color:'rgba(255,255,255,.35)',pointerEvents:'none' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, faculty, procedure…"
              style={{ width:'100%',padding:'11px 13px 11px 36px',borderRadius:'12px',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',color:'#eaf6f6',fontSize:'13.5px',outline:'none',boxSizing:'border-box',fontFamily:'inherit' }}
            />
          </div>
          {['All','Active','New','Recall'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding:'9px 16px',borderRadius:'20px',border:'1px solid',cursor:'pointer',fontSize:'12.5px',fontFamily:'inherit',fontWeight:500,transition:'all .2s',background:filterStatus===s?'linear-gradient(140deg,var(--c2),var(--c3))':'transparent',borderColor:filterStatus===s?'transparent':'rgba(255,255,255,.18)',color:filterStatus===s?'#04212a':'rgba(234,246,246,.7)' }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'18px' }}>
          {filteredPatients.map(p => (
            <PatientCard key={p.id} patient={p} flaggedCount={(flaggedMap[p.id]||[]).length} onOpen={() => onOpenPatient(p.id)} />
          ))}
          {filteredPatients.length === 0 && (
            <div style={{ gridColumn:'1/-1',padding:'40px',textAlign:'center',borderRadius:'18px',background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.12)',color:'rgba(234,246,246,.45)',fontSize:'14px' }}>
              No patients match your search.
            </div>
          )}
        </div>
      </Section>

      {/* ── Calendar ── */}
      <Section id="calendar" title="Calendar" right={<span style={{ fontSize:'13px',color:'var(--c1)' }}>{weekAppts.length} upcoming this week</span>}>
        <div data-reveal="" style={{ borderRadius:'20px',overflow:'hidden',background:'linear-gradient(140deg,rgba(255,255,255,.06),rgba(255,255,255,.015))',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.12)' }}>
          <div style={{ display:'grid',gridTemplateColumns:'80px 90px 1fr 1fr 100px 90px',gap:'12px',padding:'14px 22px',fontSize:'10.5px',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(234,246,246,.4)',borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            <span>Date</span><span>Time</span><span>Patient</span><span>Procedure</span><span>Room</span><span>Status</span>
          </div>
          {weekAppts.length === 0 && (
            <div style={{ padding:'28px',textAlign:'center',color:'rgba(234,246,246,.4)',fontSize:'14px' }}>No appointments this week.</div>
          )}
          {weekAppts.map((a, i) => {
            const dt = new Date(a.datetime_str)
            const dayStr = dt.toLocaleDateString('en-US',{weekday:'short'})
            const timeStr = dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})
            const status = a.status
            const statusColor = { scheduled:'rgba(168,199,247,.7)', confirmed:'#bfe9a8', completed:'rgba(255,255,255,.35)', cancelled:'rgba(255,100,100,.6)', no_show:'#f7c6a8' }
            return (
              <div key={a.id} style={{ display:'grid',gridTemplateColumns:'80px 90px 1fr 1fr 100px 90px',gap:'12px',padding:'14px 22px',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,.05)',opacity:status==='cancelled'?.45:1 }}>
                <span style={{ fontSize:'13px',color:'var(--c2)',fontFamily:"'Instrument Serif',serif" }}>{dayStr}</span>
                <span style={{ fontSize:'13px',color:'rgba(255,255,255,.65)',fontVariantNumeric:'tabular-nums' }}>{timeStr}</span>
                <span style={{ fontSize:'14px',fontWeight:500 }}>{a.patient_name}</span>
                <span style={{ fontSize:'13px',color:'rgba(234,246,246,.65)' }}>{a.procedure}</span>
                <span style={{ fontSize:'12px',color:'rgba(255,255,255,.45)' }}>{a.room}</span>
                <span style={{ fontSize:'10.5px',letterSpacing:'.06em',textTransform:'capitalize',color:statusColor[status]||'rgba(255,255,255,.5)' }}>{status}</span>
              </div>
            )
          })}
        </div>

        {/* Upcoming bookings (beyond this week) — from weekData static for now */}
        <div data-reveal="" style={{ marginTop:'18px',padding:'24px',borderRadius:'20px',background:'linear-gradient(140deg,rgba(255,255,255,.05),rgba(255,255,255,.01))',border:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize:'11px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)',marginBottom:'14px' }}>All upcoming</div>
          {allAppts.filter(a=>['scheduled','confirmed'].includes(a.status)).slice(0,8).map(a => {
            const dt = new Date(a.datetime_str)
            return (
              <div key={a.id} style={{ display:'flex',alignItems:'center',gap:'16px',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                <div style={{ width:'52px',fontFamily:"'Instrument Serif',serif",fontSize:'15px',color:'var(--c2)',flexShrink:0 }}>{dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                <div style={{ width:'60px',fontSize:'12.5px',color:'rgba(255,255,255,.5)',fontVariantNumeric:'tabular-nums',flexShrink:0 }}>{dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}</div>
                <div style={{ flex:1,fontSize:'13.5px' }}>{a.patient_name}</div>
                <div style={{ fontSize:'12.5px',color:'rgba(234,246,246,.55)' }}>{a.procedure}</div>
                <div style={{ fontSize:'11.5px',color:'var(--c1)',width:'56px',textAlign:'right' }}>{a.room}</div>
              </div>
            )
          })}
          {allAppts.filter(a=>['scheduled','confirmed'].includes(a.status)).length === 0 && (
            <div style={{ color:'rgba(234,246,246,.4)',fontSize:'13.5px' }}>No upcoming appointments.</div>
          )}
        </div>
      </Section>

      {/* ── Prospects ── */}
      <Section id="prospects" title="Prospect pipeline" right={
        <button onClick={() => setAddProspectOpen(v=>!v)} style={{ padding:'8px 16px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.18)',background:'transparent',color:'var(--c1)',cursor:'pointer',fontSize:'12.5px',fontFamily:'inherit' }}>+ Add lead</button>
      }>
        {addProspectOpen && (
          <div data-reveal="" style={{ marginBottom:'18px',padding:'18px',borderRadius:'16px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'flex-end' }}>
            {[['Name','name','e.g. Jordan Avery'],['Interest','interest','Whitening, Ortho…'],['Source','source','Walk-in, Referral…']].map(([lbl,key,ph]) => (
              <div key={key} style={{ flex:1,minWidth:'140px' }}>
                <div style={{ fontSize:'10.5px',letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(234,246,246,.5)',marginBottom:'6px' }}>{lbl}</div>
                <input value={newProspect[key]} onChange={e=>setNewProspect(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{ width:'100%',padding:'9px 11px',borderRadius:'9px',background:'rgba(0,0,0,.25)',border:'1px solid rgba(255,255,255,.12)',color:'#eaf6f6',fontSize:'13.5px',outline:'none',boxSizing:'border-box',fontFamily:'inherit' }} />
              </div>
            ))}
            <button onClick={handleAddProspect} style={{ padding:'9px 18px',borderRadius:'10px',border:'none',background:'linear-gradient(140deg,var(--c2),var(--c3))',color:'#04212a',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Add</button>
          </div>
        )}

        {STAGE_ORDER.map(stage => {
          const group = prospects.filter(p => p.stage === stage)
          if (group.length === 0 && stage === 'Converted') return null
          return (
            <div key={stage} data-reveal="" style={{ marginBottom:'18px' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px' }}>
                <span style={{ fontSize:'11px',letterSpacing:'.14em',textTransform:'uppercase',color:STAGE_COLOR[stage] }}>{stage}</span>
                <span style={{ fontSize:'11px',color:'rgba(255,255,255,.3)',padding:'2px 8px',borderRadius:'20px',background:'rgba(255,255,255,.06)' }}>{group.length}</span>
              </div>
              {group.length === 0 ? (
                <div style={{ padding:'16px',borderRadius:'14px',border:'1px dashed rgba(255,255,255,.08)',color:'rgba(234,246,246,.3)',fontSize:'13px',textAlign:'center' }}>No leads in this stage</div>
              ) : (
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'12px' }}>
                  {group.map(p => {
                    const idx = STAGE_ORDER.indexOf(stage)
                    const nextStage = STAGE_ORDER[idx+1]
                    return (
                      <div key={p.id} style={{ padding:'18px',borderRadius:'16px',background:'linear-gradient(140deg,rgba(255,255,255,.06),rgba(255,255,255,.015))',border:`1px solid color-mix(in srgb,${STAGE_COLOR[stage]} 25%,transparent)`,backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)' }}>
                        <div style={{ fontSize:'15px',fontWeight:600 }}>{p.name}</div>
                        <div style={{ fontSize:'12.5px',color:'rgba(234,246,246,.6)',marginTop:'4px' }}>{p.interest}</div>
                        <div style={{ marginTop:'12px',display:'flex',alignItems:'center',gap:'8px',fontSize:'11.5px',color:'rgba(255,255,255,.4)' }}>
                          <span style={{ width:'5px',height:'5px',borderRadius:'50%',background:'var(--c1)',display:'inline-block' }} />
                          {p.source}
                        </div>
                        {nextStage && (
                          <button
                            onClick={() => onAdvanceProspect(p.id, nextStage)}
                            style={{ marginTop:'14px',width:'100%',padding:'7px',borderRadius:'9px',border:`1px solid color-mix(in srgb,${STAGE_COLOR[nextStage]} 30%,transparent)`,background:'transparent',color:STAGE_COLOR[nextStage],cursor:'pointer',fontSize:'11.5px',fontFamily:'inherit',transition:'all .2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background=`color-mix(in srgb,${STAGE_COLOR[nextStage]} 12%,transparent)` }}
                            onMouseLeave={e => { e.currentTarget.style.background='transparent' }}
                          >
                            Move to {nextStage} →
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </Section>

      {/* ── Competency ── */}
      <Section id="competency" title="Competency requirements">
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:'18px' }}>
          {/* Summary bars */}
          <Card>
            <div style={{ fontSize:'11px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)',marginBottom:'20px' }}>Progress overview</div>
            <div style={{ display:'flex',flexDirection:'column',gap:'16px' }}>
              {competency.summary.map(s => (
                <div key={s.category}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:'13.5px',marginBottom:'8px' }}>
                    <span>{s.category}</span>
                    <span style={{ color:'rgba(255,255,255,.5)' }}>{s.completed}/{s.required}</span>
                  </div>
                  <div style={{ height:'7px',borderRadius:'7px',background:'rgba(255,255,255,.1)',overflow:'hidden' }}>
                    <div style={{ height:'100%',width:`${s.pct}%`,borderRadius:'7px',background:s.pct>=100?'linear-gradient(90deg,#bfe9a8,#7be0d6)':'linear-gradient(90deg,var(--c2),var(--c3))',transition:'width 1.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Log table */}
          <div data-reveal="" style={{ borderRadius:'20px',overflow:'hidden',background:'linear-gradient(140deg,rgba(255,255,255,.06),rgba(255,255,255,.015))',border:'1px solid rgba(255,255,255,.12)' }}>
            <div style={{ padding:'18px 20px',borderBottom:'1px solid rgba(255,255,255,.08)' }}>
              <span style={{ fontSize:'11px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)' }}>Procedure log</span>
            </div>
            <div style={{ maxHeight:'320px',overflowY:'auto' }}>
              {competency.entries.slice(0,20).map(e => (
                <div key={e.id} style={{ display:'grid',gridTemplateColumns:'100px 1fr 90px',gap:'10px',padding:'12px 20px',borderBottom:'1px solid rgba(255,255,255,.05)',alignItems:'center' }}>
                  <span style={{ fontSize:'11px',color:'rgba(255,255,255,.45)',fontVariantNumeric:'tabular-nums' }}>{e.date_str}</span>
                  <div>
                    <div style={{ fontSize:'13.5px' }}>{e.procedure_name}</div>
                    <div style={{ fontSize:'11.5px',color:'rgba(255,255,255,.45)',marginTop:'2px' }}>{e.patient_name}</div>
                  </div>
                  <span style={{ fontSize:'10.5px',letterSpacing:'.06em',textTransform:'uppercase',padding:'3px 8px',borderRadius:'20px',background:'rgba(123,224,214,.12)',color:'var(--c1)',justifySelf:'end' }}>{e.category?.split(' ')[0]}</span>
                </div>
              ))}
              {competency.entries.length === 0 && (
                <div style={{ padding:'28px',textAlign:'center',color:'rgba(234,246,246,.4)',fontSize:'13.5px' }}>No procedures logged yet.</div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Reminders ── */}
      <Section id="reminders" title="Reminders" pad="32px 56px 90px">
        {reminders.length === 0 ? (
          <div data-reveal="" style={{ padding:'36px',textAlign:'center',borderRadius:'18px',background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.12)',color:'rgba(234,246,246,.45)',fontSize:'14px' }}>
            All caught up — no active reminders.
          </div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
            {reminders.map(r => {
              const typeColors = { recall:'#f7c6a8', followup:'#a8c7f7', outreach:'#bfe9a8', custom:'var(--c1)' }
              return (
                <div key={r.id} data-reveal="" style={{ display:'flex',alignItems:'center',gap:'16px',padding:'18px 22px',borderRadius:'18px',background:'linear-gradient(140deg,rgba(255,255,255,.07),rgba(255,255,255,.02))',border:'1px solid rgba(255,255,255,.1)' }}>
                  <span style={{ width:'9px',height:'9px',borderRadius:'50%',background:typeColors[r.type]||'var(--c1)',flexShrink:0 }} />
                  <span style={{ fontSize:'10px',letterSpacing:'.12em',textTransform:'uppercase',color:typeColors[r.type]||'var(--c1)',flexShrink:0,width:'70px' }}>{r.type}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14.5px' }}>{r.message}</div>
                    {r.patient_name && <div style={{ fontSize:'12px',color:'rgba(255,255,255,.45)',marginTop:'3px' }}>{r.patient_name}</div>}
                  </div>
                  <span style={{ fontSize:'11.5px',color:'rgba(255,255,255,.35)',flexShrink:0 }}>{r.due_date_str}</span>
                  <button
                    onClick={() => onDismissReminder(r.id)}
                    style={{ background:'transparent',border:'1px solid rgba(255,255,255,.14)',color:'rgba(234,246,246,.6)',fontFamily:'inherit',fontSize:'12px',padding:'6px 12px',borderRadius:'20px',cursor:'pointer',flexShrink:0 }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.08)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >Dismiss</button>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
