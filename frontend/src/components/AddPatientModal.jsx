import { useRef, useState } from 'react'

const iStyle = { width:'100%',padding:'11px 13px',borderRadius:'11px',background:'rgba(0,0,0,.25)',border:'1px solid rgba(255,255,255,.12)',color:'#eaf6f6',fontSize:'14px',outline:'none',boxSizing:'border-box',fontFamily:'inherit' }
const lStyle = { display:'block',fontSize:'10.5px',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(234,246,246,.5)',marginBottom:'6px',marginTop:'14px' }

export default function AddPatientModal({ onClose, onSubmit }) {
  const [tab, setTab] = useState('basic')

  const refs = {
    name:       useRef(), age:        useRef(), phone:  useRef(),
    email:      useRef(), dob:        useRef(), faculty: useRef(),
    status:     useRef(), procedure:  useRef(), referred_by: useRef(),
    allergies:  useRef(), medications: useRef(),
    medical_conditions: useRef(), chief_complaint: useRef(),
  }

  const handleSubmit = () => {
    onSubmit({
      name:               refs.name.current?.value.trim()   || 'New Patient',
      age:                refs.age.current?.value.trim()    || null,
      phone:              refs.phone.current?.value.trim()  || null,
      email:              refs.email.current?.value.trim()  || null,
      dob:                refs.dob.current?.value.trim()    || null,
      faculty:            refs.faculty.current?.value       || 'Dr. Lin',
      status:             refs.status.current?.value        || 'New',
      procedure:          refs.procedure.current?.value.trim() || 'Initial exam & charting',
      referred_by:        refs.referred_by.current?.value.trim() || null,
      allergies:          refs.allergies.current?.value.trim() || null,
      medications:        refs.medications.current?.value.trim() || null,
      medical_conditions: refs.medical_conditions.current?.value.trim() || null,
      chief_complaint:    refs.chief_complaint.current?.value.trim() || null,
    })
  }

  const tabs = [{ id:'basic', label:'Basic info' }, { id:'medical', label:'Medical history' }]

  return (
    <div style={{ position:'absolute',top:0,right:0,bottom:0,width:'540px',maxWidth:'92vw',zIndex:43,background:'linear-gradient(160deg,rgba(16,38,44,.94),rgba(6,16,21,.97))',backdropFilter:'blur(34px) saturate(150%)',WebkitBackdropFilter:'blur(34px) saturate(150%)',borderLeft:'1px solid color-mix(in srgb,var(--c1) 20%,transparent)',boxShadow:'-30px 0 80px rgba(0,0,0,.5)',overflowY:'auto',padding:'34px' }}>

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px' }}>
        <div>
          <span style={{ fontSize:'10.5px',letterSpacing:'.18em',textTransform:'uppercase',color:'var(--c1)' }}>New record</span>
          <h2 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'32px',margin:'8px 0 0' }}>Add a patient</h2>
        </div>
        <button onClick={onClose} style={{ width:'40px',height:'40px',borderRadius:'12px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.14)',color:'#fff',fontSize:'18px',cursor:'pointer' }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:'4px',marginBottom:'22px',padding:'4px',borderRadius:'12px',background:'rgba(0,0,0,.2)',border:'1px solid rgba(255,255,255,.08)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1,padding:'9px',border:'none',borderRadius:'9px',cursor:'pointer',fontSize:'13px',fontWeight:500,fontFamily:'inherit',color:'#eaf6f6',transition:'all .2s',background:tab===t.id?'linear-gradient(140deg,var(--c2),var(--c3))':'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'basic' && (
        <>
          <label style={lStyle}>Full name *</label>
          <input ref={refs.name} placeholder="Jordan Avery" style={iStyle} />

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' }}>
            <div>
              <label style={lStyle}>Age</label>
              <input ref={refs.age} type="number" placeholder="34" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Date of birth</label>
              <input ref={refs.dob} type="date" style={iStyle} />
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' }}>
            <div>
              <label style={lStyle}>Phone</label>
              <input ref={refs.phone} placeholder="(868) 555-0100" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Email</label>
              <input ref={refs.email} type="email" placeholder="patient@email.com" style={iStyle} />
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' }}>
            <div>
              <label style={lStyle}>Status</label>
              <select ref={refs.status} style={iStyle}>
                <option>New</option><option>Active</option><option>Recall</option>
              </select>
            </div>
            <div>
              <label style={lStyle}>Faculty supervisor</label>
              <select ref={refs.faculty} style={iStyle}>
                <option>Dr. Lin</option><option>Dr. Okada</option><option>Dr. Bell</option>
              </select>
            </div>
          </div>

          <label style={lStyle}>Planned / current procedure</label>
          <input ref={refs.procedure} placeholder="Initial exam & charting" style={iStyle} />

          <label style={lStyle}>Referred by</label>
          <input ref={refs.referred_by} placeholder="Campus screening, Faculty referral, Walk-in…" style={iStyle} />
        </>
      )}

      {tab === 'medical' && (
        <>
          <label style={lStyle}>Chief complaint</label>
          <textarea ref={refs.chief_complaint} placeholder="Why is the patient here? What are their main concerns?" rows={3} style={{ ...iStyle,resize:'vertical' }} />

          <label style={lStyle}>Allergies</label>
          <input ref={refs.allergies} placeholder="Penicillin, Latex, None…" style={iStyle} />

          <label style={lStyle}>Current medications</label>
          <textarea ref={refs.medications} placeholder="Metformin 500mg, Lisinopril 10mg…" rows={2} style={{ ...iStyle,resize:'vertical' }} />

          <label style={lStyle}>Medical conditions</label>
          <textarea ref={refs.medical_conditions} placeholder="Type 2 Diabetes, Hypertension…" rows={2} style={{ ...iStyle,resize:'vertical' }} />
        </>
      )}

      <button
        onClick={handleSubmit}
        style={{ marginTop:'28px',width:'100%',padding:'15px',border:'none',borderRadius:'14px',cursor:'pointer',fontSize:'15px',fontWeight:600,color:'#04212a',background:'linear-gradient(140deg,var(--c2),var(--c3))',boxShadow:'0 12px 34px color-mix(in srgb,var(--c1) 40%,transparent)',transition:'transform .2s' }}
        onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform='none'}
      >
        Add to patient list
      </button>
    </div>
  )
}
