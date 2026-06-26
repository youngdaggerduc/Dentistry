import { STATUS_BG, STATUS_FG } from '../data.js'

export default function PatientCard({ patient, flaggedCount, onOpen }) {
  const statusBg = STATUS_BG[patient.status] || STATUS_BG.Active
  const statusFg = STATUS_FG[patient.status] || STATUS_FG.Active

  return (
    <button
      onClick={onOpen}
      data-reveal=""
      style={{ textAlign:'left',cursor:'pointer',padding:'22px',borderRadius:'20px',display:'flex',flexDirection:'column',gap:'15px',background:'linear-gradient(140deg,rgba(255,255,255,.08),rgba(255,255,255,.02))',backdropFilter:'blur(20px) saturate(140%)',WebkitBackdropFilter:'blur(20px) saturate(140%)',border:'1px solid rgba(255,255,255,.12)',boxShadow:'0 8px 30px rgba(0,18,26,.28)',fontFamily:'inherit',color:'inherit',transition:'transform .35s cubic-bezier(.2,.8,.2,1),border-color .35s ease,box-shadow .35s ease',width:'100%' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.borderColor='color-mix(in srgb,var(--c1) 55%,transparent)'; e.currentTarget.style.boxShadow='0 20px 50px rgba(0,30,40,.45)' }}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor='rgba(255,255,255,.12)'; e.currentTarget.style.boxShadow='0 8px 30px rgba(0,18,26,.28)' }}
    >
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <div style={{ display:'flex',gap:'13px',alignItems:'center' }}>
          <div style={{ width:'44px',height:'44px',borderRadius:'13px',background:patient.tone,boxShadow:'inset 0 1px 2px rgba(255,255,255,.5)',flexShrink:0 }} />
          <div>
            <div style={{ fontSize:'16px',fontWeight:600 }}>{patient.name}</div>
            <div style={{ fontSize:'12.5px',color:'rgba(234,246,246,.55)',marginTop:'2px' }}>{patient.age} yrs · {patient.faculty}</div>
          </div>
        </div>
        <span style={{ fontSize:'10.5px',letterSpacing:'.1em',textTransform:'uppercase',padding:'5px 10px',borderRadius:'20px',background:statusBg,color:statusFg,flexShrink:0 }}>{patient.status}</span>
      </div>

      <div style={{ height:'1px',background:'rgba(255,255,255,.1)' }} />

      <div style={{ fontSize:'13.5px',color:'rgba(234,246,246,.7)' }}>{patient.procedure}</div>

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <span style={{ display:'inline-flex',alignItems:'center',gap:'7px',fontSize:'12px',color:'#ff9b9b' }}>
          <span style={{ width:'8px',height:'8px',borderRadius:'50%',background:'#ff5a5a',boxShadow:'0 0 10px #ff5a5a',display:'inline-block' }} />
          {flaggedCount} flagged
        </span>
        <span style={{ fontSize:'12.5px',color:'rgba(255,255,255,.5)' }}>Next · {patient.next}</span>
      </div>
    </button>
  )
}
