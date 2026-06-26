import { useEffect, useRef } from 'react'
import PatientCard from './PatientCard.jsx'
import { STU_STATUS_BG, STU_STATUS_FG, TONE } from '../data.js'

function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return
    const els = [...ref.current.querySelectorAll('[data-reveal]')]
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          io.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' })
    els.forEach(el => io.observe(el))
    setTimeout(() => els.forEach(el => el.classList.add('visible')), 2200)
    return () => io.disconnect()
  })
}

export default function AdminView({ patients, flaggedMap, onOpenPatient, approvals, students, onApprove, onDeny }) {
  const rootRef = useRef()
  useReveal(rootRef)

  const pendingCount = approvals.length

  const adminStats = [
    { value: String(students.length).padStart(2,'0'),  label:'Student clinicians',  delta:'Clinic B rotation', tone:'var(--c2)' },
    { value: String(patients.length).padStart(3,'0'),  label:'Patients in system',  delta:'+12 this month',    tone:'#a8c7f7'   },
    { value: String(pendingCount).padStart(2,'0'),     label:'Pending approvals',   delta:'needs review',      tone:'#f7c089'   },
    { value:'82%',                                      label:'Chair utilization',   delta:'this week',         tone:'#bfe9a8'   },
  ]

  const studentsWithTone = students.map((s, i) => ({
    ...s,
    tone: TONE[i % TONE.length],
    statusBg: STU_STATUS_BG[s.status] || STU_STATUS_BG['On track'],
    statusFg: STU_STATUS_FG[s.status] || STU_STATUS_FG['On track'],
  }))

  return (
    <div ref={rootRef}>
      <section id="sec-overview" style={{ padding:'58px 56px 28px' }}>
        <p data-reveal="" style={{ letterSpacing:'.34em',textTransform:'uppercase',fontSize:'11.5px',color:'var(--c1)',margin:'0 0 20px' }}>Faculty Command</p>
        <h1 data-reveal="" style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'72px',lineHeight:1.0,margin:0 }}>
          Clinic <span style={{ fontStyle:'italic',color:'var(--c2)' }}>overview.</span>
        </h1>
        <p data-reveal="" style={{ maxWidth:'560px',color:'rgba(234,246,246,.66)',fontSize:'17px',lineHeight:1.62,margin:'22px 0 0' }}>
          Supervising {students.length} student clinicians across Clinic B. {pendingCount} items are awaiting your approval, and chair utilization is holding at 82% this week.
        </p>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'18px',marginTop:'40px' }}>
          {adminStats.map(s => (
            <div key={s.label} data-reveal="" style={{ padding:'24px',borderRadius:'20px',background:'linear-gradient(140deg,rgba(255,255,255,.08),rgba(255,255,255,.02))',backdropFilter:'blur(22px) saturate(140%)',WebkitBackdropFilter:'blur(22px) saturate(140%)',border:'1px solid rgba(255,255,255,.12)',boxShadow:'0 8px 36px rgba(0,18,26,.3)' }}>
              <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'46px',lineHeight:1,color:'#dffbfa' }}>{s.value}</div>
              <div style={{ marginTop:'10px',fontSize:'13px',color:'rgba(234,246,246,.6)' }}>{s.label}</div>
              <div style={{ marginTop:'8px',fontSize:'11.5px',color:s.tone }}>{s.delta}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="sec-approvals" style={{ padding:'32px 56px' }}>
        <div style={{ display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'22px' }}>
          <h2 data-reveal="" style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'32px',margin:0 }}>Approvals queue</h2>
          <span data-reveal="" style={{ fontSize:'13px',color:'var(--c1)' }}>{pendingCount} pending</span>
        </div>
        {approvals.length > 0 ? (
          <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
            {approvals.map(ap => (
              <div key={ap.id} data-reveal="" style={{ display:'flex',alignItems:'center',gap:'20px',padding:'18px 22px',borderRadius:'18px',background:'linear-gradient(140deg,rgba(255,255,255,.07),rgba(255,255,255,.02))',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',border:'1px solid rgba(255,255,255,.12)' }}>
                <span style={{ fontSize:'10.5px',letterSpacing:'.12em',textTransform:'uppercase',padding:'6px 12px',borderRadius:'20px',background:'color-mix(in srgb,var(--c1) 16%,transparent)',color:'var(--c1)',flexShrink:0 }}>{ap.type}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'15px',fontWeight:600 }}>{ap.item}</div>
                  <div style={{ fontSize:'12.5px',color:'rgba(234,246,246,.55)',marginTop:'3px' }}>Requested by {ap.student}</div>
                </div>
                <button
                  onClick={() => onDeny(ap.id)}
                  style={{ padding:'9px 16px',borderRadius:'11px',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',background:'transparent',border:'1px solid rgba(255,255,255,.16)',color:'rgba(234,246,246,.7)',transition:'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,90,90,.14)'; e.currentTarget.style.borderColor='rgba(255,90,90,.4)'; e.currentTarget.style.color='#ff9b9b' }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(255,255,255,.16)'; e.currentTarget.style.color='rgba(234,246,246,.7)' }}
                >Deny</button>
                <button
                  onClick={() => onApprove(ap.id)}
                  style={{ padding:'9px 18px',borderRadius:'11px',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:600,color:'#04212a',background:'linear-gradient(140deg,var(--c2),var(--c3))',border:'none',transition:'transform .2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform='none'}
                >Approve</button>
              </div>
            ))}
          </div>
        ) : (
          <div data-reveal="" style={{ padding:'30px',textAlign:'center',borderRadius:'18px',background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.14)',color:'rgba(234,246,246,.5)',fontSize:'14px' }}>
            All caught up — no pending approvals.
          </div>
        )}
      </section>

      <section id="sec-students" style={{ padding:'32px 56px' }}>
        <h2 data-reveal="" style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'32px',margin:'0 0 22px' }}>Student clinicians</h2>
        <div data-reveal="" style={{ borderRadius:'22px',overflow:'hidden',background:'linear-gradient(140deg,rgba(255,255,255,.06),rgba(255,255,255,.015))',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.12)' }}>
          <div style={{ display:'grid',gridTemplateColumns:'1.6fr .6fr .8fr 1.4fr .9fr',gap:'14px',padding:'16px 26px',fontSize:'11px',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(234,246,246,.45)',borderBottom:'1px solid rgba(255,255,255,.1)' }}>
            <span>Student</span><span>Year</span><span>Cases</span><span>Requirements</span><span>Status</span>
          </div>
          {studentsWithTone.map(st => (
            <div key={st.name} style={{ display:'grid',gridTemplateColumns:'1.6fr .6fr .8fr 1.4fr .9fr',gap:'14px',padding:'16px 26px',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'34px',height:'34px',borderRadius:'10px',background:st.tone,flexShrink:0 }} />
                <span style={{ fontSize:'14.5px',fontWeight:500 }}>{st.name}</span>
              </div>
              <span style={{ fontSize:'13.5px',color:'rgba(234,246,246,.7)' }}>{st.year}</span>
              <span style={{ fontSize:'13.5px',color:'rgba(234,246,246,.7)',fontVariantNumeric:'tabular-nums' }}>{st.cases}</span>
              <div style={{ display:'flex',alignItems:'center',gap:'11px' }}>
                <div style={{ flex:1,height:'6px',borderRadius:'6px',background:'rgba(255,255,255,.12)',overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${st.pct}%`,borderRadius:'6px',background:'linear-gradient(90deg,var(--c2),var(--c3))' }} />
                </div>
                <span style={{ fontSize:'12px',color:'rgba(255,255,255,.55)',width:'34px' }}>{st.pct}%</span>
              </div>
              <span style={{ justifySelf:'start',fontSize:'10.5px',letterSpacing:'.08em',textTransform:'uppercase',padding:'5px 11px',borderRadius:'20px',background:st.statusBg,color:st.statusFg }}>{st.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="sec-patients" style={{ padding:'32px 56px 90px' }}>
        <h2 data-reveal="" style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'32px',margin:'0 0 22px' }}>Patients in system</h2>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'18px' }}>
          {patients.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              flaggedCount={(flaggedMap[p.id] || []).length}
              onOpen={() => onOpenPatient(p.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
