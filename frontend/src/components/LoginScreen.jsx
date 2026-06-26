import { useRef, useState } from 'react'

export default function LoginScreen({ paletteIdx, setPaletteIdx, palettes, onLogin }) {
  const emailRef = useRef()
  const passRef  = useRef()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    setErr(null)
    try {
      await onLogin(emailRef.current?.value || '', passRef.current?.value || '')
    } catch {
      setErr('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleLogin() }

  return (
    <div style={{ position:'absolute',inset:0,zIndex:30,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px' }}>
      <div style={{ width:'430px',maxWidth:'92vw',padding:'44px 40px',borderRadius:'30px',background:'linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.02))',backdropFilter:'blur(34px) saturate(150%)',WebkitBackdropFilter:'blur(34px) saturate(150%)',border:'1px solid rgba(255,255,255,.16)',boxShadow:'0 30px 90px rgba(0,15,22,.55),inset 0 1px 0 rgba(255,255,255,.22)' }}>

        <div style={{ display:'flex',alignItems:'center',gap:'13px',marginBottom:'30px' }}>
          <div style={{ width:'46px',height:'46px',borderRadius:'15px',background:'linear-gradient(140deg,var(--c2),var(--c3))',boxShadow:'0 8px 26px color-mix(in srgb,var(--c1) 45%,transparent)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <div style={{ width:'15px',height:'19px',borderRadius:'8px 8px 5px 5px',background:'#04212a' }} />
          </div>
          <div>
            <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'28px',lineHeight:1 }}>Enamel</div>
            <div style={{ fontSize:'10px',letterSpacing:'.28em',textTransform:'uppercase',color:'var(--c1)',marginTop:'3px' }}>Clinical Studio</div>
          </div>
        </div>

        <h1 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'34px',margin:'0 0 6px' }}>Welcome back.</h1>
        <p style={{ margin:'0 0 26px',fontSize:'14px',color:'rgba(234,246,246,.6)' }}>Sign in to your dental student workspace.</p>

        <label style={{ display:'block',fontSize:'11px',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(234,246,246,.5)',marginBottom:'8px' }}>Email</label>
        <input
          ref={emailRef}
          type="email"
          defaultValue="demo@enamel.app"
          onKeyDown={handleKey}
          style={{ width:'100%',padding:'13px 15px',marginBottom:'18px',borderRadius:'13px',background:'rgba(0,0,0,.25)',border:'1px solid rgba(255,255,255,.12)',color:'#eaf6f6',fontSize:'14.5px',outline:'none',boxSizing:'border-box' }}
        />

        <label style={{ display:'block',fontSize:'11px',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(234,246,246,.5)',marginBottom:'8px' }}>Password</label>
        <input
          ref={passRef}
          type="password"
          defaultValue="incisor"
          onKeyDown={handleKey}
          style={{ width:'100%',padding:'13px 15px',marginBottom:'24px',borderRadius:'13px',background:'rgba(0,0,0,.25)',border:'1px solid rgba(255,255,255,.12)',color:'#eaf6f6',fontSize:'14.5px',outline:'none',boxSizing:'border-box' }}
        />

        {err && <div style={{ marginBottom:'12px',fontSize:'13px',color:'#ff9b9b',textAlign:'center' }}>{err}</div>}

        <div style={{ fontSize:'11px',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(234,246,246,.5)',marginBottom:'10px' }}>Theme</div>
        <div style={{ display:'flex',gap:'10px',marginBottom:'28px' }}>
          {palettes.map((pal, i) => (
            <button
              key={pal.name}
              onClick={() => setPaletteIdx(i)}
              title={pal.name}
              style={{ width:'38px',height:'38px',borderRadius:'11px',cursor:'pointer',background:`linear-gradient(140deg,${pal.c2},${pal.c3})`,boxShadow:i===paletteIdx?`0 0 0 2px #04212a,0 0 0 4px ${pal.c1}`:'0 1px 4px rgba(0,0,0,.3)',border:'none',transition:'transform .2s' }}
            />
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width:'100%',padding:'15px',border:'none',borderRadius:'14px',cursor:loading?'default':'pointer',fontSize:'15px',fontWeight:600,color:'#04212a',background:'linear-gradient(140deg,var(--c2),var(--c3))',boxShadow:'0 12px 34px color-mix(in srgb,var(--c1) 40%,transparent)',transition:'transform .2s,opacity .2s',opacity:loading?.7:1 }}
        >
          {loading ? 'Signing in…' : 'Enter the studio →'}
        </button>

        <p style={{ margin:'18px 0 0',textAlign:'center',fontSize:'11.5px',color:'rgba(234,246,246,.4)' }}>demo@enamel.app · incisor</p>
      </div>
    </div>
  )
}
