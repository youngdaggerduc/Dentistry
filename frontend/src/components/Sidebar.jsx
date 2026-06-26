export default function Sidebar({ user, palettes, paletteIdx, setPaletteIdx, nav, active, scrollTo, onOpenAdd, onLogout, onBell, reminderCount }) {
  return (
    <aside style={{ width:'252px',flexShrink:0,padding:'28px 20px',display:'flex',flexDirection:'column',gap:'20px',background:'linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.015))',backdropFilter:'blur(26px) saturate(150%)',WebkitBackdropFilter:'blur(26px) saturate(150%)',borderRight:'1px solid rgba(255,255,255,.1)',overflowY:'auto' }}>

      {/* Logo + bell */}
      <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
        <div style={{ width:'40px',height:'40px',borderRadius:'13px',background:'linear-gradient(140deg,var(--c2),var(--c3))',boxShadow:'0 6px 22px color-mix(in srgb,var(--c1) 45%,transparent)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <div style={{ width:'13px',height:'17px',borderRadius:'7px 7px 5px 5px',background:'#04212a' }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'24px',lineHeight:1 }}>Enamel</div>
          <div style={{ fontSize:'10px',letterSpacing:'.26em',textTransform:'uppercase',color:'var(--c1)',marginTop:'3px' }}>Clinical Studio</div>
        </div>
        <button
          onClick={onBell}
          style={{ position:'relative',width:'36px',height:'36px',borderRadius:'10px',background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.12)',color:'rgba(234,246,246,.8)',cursor:'pointer',fontSize:'16px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}
          title="Reminders"
        >
          🔔
          {reminderCount > 0 && (
            <span style={{ position:'absolute',top:'-5px',right:'-5px',width:'18px',height:'18px',borderRadius:'50%',background:'linear-gradient(140deg,var(--c2),var(--c3))',color:'#04212a',fontSize:'10px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>
              {reminderCount > 9 ? '9+' : reminderCount}
            </span>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ display:'flex',flexDirection:'column',gap:'2px' }}>
        {nav.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              style={{ display:'flex',alignItems:'center',gap:'13px',width:'100%',border:'none',color:isActive?'#fff':'rgba(234,246,246,.72)',padding:'11px 14px',borderRadius:'12px',fontFamily:'inherit',fontSize:'14.5px',fontWeight:isActive?600:500,cursor:'pointer',textAlign:'left',transition:'all .25s ease',background:isActive?'rgba(255,255,255,.12)':'transparent' }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background='rgba(255,255,255,.08)'; e.currentTarget.style.color='#fff' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(234,246,246,.72)' } }}
            >
              <span style={{ fontSize:'11px',fontVariantNumeric:'tabular-nums',opacity:.45,width:'14px' }}>{item.num}</span>
              <span>{item.label}</span>
              {item.id === 'reminders' && reminderCount > 0 && (
                <span style={{ marginLeft:'auto',fontSize:'10px',padding:'2px 7px',borderRadius:'20px',background:'color-mix(in srgb,var(--c1) 20%,transparent)',color:'var(--c1)' }}>{reminderCount}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* New patient */}
      <button
        onClick={onOpenAdd}
        style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'9px',width:'100%',padding:'13px',borderRadius:'13px',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:600,color:'#04212a',background:'linear-gradient(140deg,var(--c2),var(--c3))',boxShadow:'0 8px 24px color-mix(in srgb,var(--c1) 35%,transparent)',border:'none',transition:'transform .2s' }}
        onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform='none'}
      >
        <span style={{ fontSize:'18px',lineHeight:1 }}>+</span> New patient
      </button>

      <div style={{ marginTop:'auto',display:'flex',flexDirection:'column',gap:'16px' }}>
        <div>
          <div style={{ fontSize:'10.5px',letterSpacing:'.16em',textTransform:'uppercase',color:'rgba(234,246,246,.5)',marginBottom:'11px' }}>Theme</div>
          <div style={{ display:'flex',gap:'9px',flexWrap:'wrap' }}>
            {palettes.map((pal, i) => (
              <button
                key={pal.name}
                onClick={() => setPaletteIdx(i)}
                title={pal.name}
                style={{ width:'32px',height:'32px',borderRadius:'9px',cursor:'pointer',background:`linear-gradient(140deg,${pal.c2},${pal.c3})`,boxShadow:i===paletteIdx?`0 0 0 2px #04212a,0 0 0 4px ${pal.c1}`:'0 1px 4px rgba(0,0,0,.3)',border:'none',transition:'transform .2s' }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.12)'}
                onMouseLeave={e => e.currentTarget.style.transform='none'}
              />
            ))}
          </div>
        </div>

        <div style={{ display:'flex',alignItems:'center',gap:'11px',paddingTop:'16px',borderTop:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ width:'36px',height:'36px',borderRadius:'11px',background:'linear-gradient(140deg,#f7d9c4,#d99f86)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,color:'#4a2010' }}>
            {user?.name?.[0] || 'S'}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:'14px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user?.name || 'Student'}</div>
            <div style={{ fontSize:'11px',color:'rgba(255,255,255,.5)' }}>DDS Candidate · {user?.year || 'Y3'}</div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            style={{ background:'transparent',border:'1px solid rgba(255,255,255,.14)',color:'rgba(234,246,246,.65)',width:'32px',height:'32px',borderRadius:'9px',cursor:'pointer',fontSize:'14px',flexShrink:0 }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.1)'; e.currentTarget.style.color='#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(234,246,246,.65)' }}
          >⎋</button>
        </div>
      </div>
    </aside>
  )
}
