export default function NotificationPanel({ reminders, onDismiss, onClose }) {
  const typeColors = { recall:'#f7c6a8', followup:'#a8c7f7', outreach:'#bfe9a8', custom:'var(--c1)' }

  return (
    <div style={{ position:'absolute',top:'76px',right:'18px',width:'380px',maxWidth:'94vw',zIndex:45,background:'linear-gradient(160deg,rgba(14,36,42,.96),rgba(5,14,19,.98))',backdropFilter:'blur(40px) saturate(160%)',WebkitBackdropFilter:'blur(40px) saturate(160%)',borderRadius:'24px',border:'1px solid rgba(255,255,255,.14)',boxShadow:'0 24px 70px rgba(0,0,0,.6)',overflow:'hidden' }}>

      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,.09)' }}>
        <div>
          <div style={{ fontSize:'15px',fontWeight:600 }}>Reminders</div>
          <div style={{ fontSize:'11.5px',color:'rgba(234,246,246,.5)',marginTop:'2px' }}>{reminders.length} pending action{reminders.length!==1?'s':''}</div>
        </div>
        <button onClick={onClose} style={{ width:'32px',height:'32px',borderRadius:'9px',background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.12)',color:'rgba(234,246,246,.8)',cursor:'pointer',fontSize:'14px' }}>✕</button>
      </div>

      <div style={{ maxHeight:'440px',overflowY:'auto' }}>
        {reminders.length === 0 ? (
          <div style={{ padding:'36px',textAlign:'center',color:'rgba(234,246,246,.4)',fontSize:'14px' }}>
            <div style={{ fontSize:'24px',marginBottom:'10px' }}>🎉</div>
            All caught up!
          </div>
        ) : (
          reminders.map(r => (
            <div key={r.id} style={{ display:'flex',gap:'14px',padding:'16px 22px',borderBottom:'1px solid rgba(255,255,255,.06)',alignItems:'flex-start' }}>
              <span style={{ width:'9px',height:'9px',borderRadius:'50%',background:typeColors[r.type]||'var(--c1)',flexShrink:0,marginTop:'5px' }} />
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:'13.5px',lineHeight:1.4 }}>{r.message}</div>
                {r.patient_name && (
                  <div style={{ fontSize:'11.5px',color:'rgba(255,255,255,.45)',marginTop:'3px' }}>{r.patient_name}</div>
                )}
                {r.due_date_str && (
                  <div style={{ fontSize:'11px',color:'rgba(255,255,255,.3)',marginTop:'3px' }}>Due {r.due_date_str}</div>
                )}
              </div>
              <button
                onClick={() => onDismiss(r.id)}
                style={{ padding:'5px 11px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.14)',background:'transparent',color:'rgba(234,246,246,.6)',cursor:'pointer',fontSize:'11.5px',fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >Dismiss</button>
            </div>
          ))
        )}
      </div>

      {reminders.length > 0 && (
        <div style={{ padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.09)' }}>
          <button
            onClick={() => { reminders.forEach(r => onDismiss(r.id)); onClose() }}
            style={{ width:'100%',padding:'10px',borderRadius:'12px',border:'none',background:'rgba(255,255,255,.07)',color:'rgba(234,246,246,.7)',cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.12)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.07)'}
          >Dismiss all</button>
        </div>
      )}
    </div>
  )
}
