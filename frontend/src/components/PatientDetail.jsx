import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { api } from '../api.js'
import { STATUS_BG, STATUS_FG } from '../data.js'

// ── Tooth chart helpers (carried from PatientPanel) ─────────────────────────
function toothType(i, N) {
  const d = Math.abs(i - (N - 1) / 2)
  return d < 1.2 ? 'central' : d < 2.2 ? 'lateral' : d < 3.2 ? 'canine' : d < 5.2 ? 'premolar' : 'molar'
}
function toothLabel(id) {
  const n = parseInt(id.slice(1))
  const d = Math.abs((n - 1) - 6.5)
  const type = d < 1.2 ? 'central incisor' : d < 2.2 ? 'lateral incisor' : d < 3.2 ? 'canine' : d < 5.2 ? 'premolar' : 'molar'
  return (id[0] === 'U' ? 'Maxillary ' : 'Mandibular ') + type
}
function roundRect(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}
function crownGeo(w, h, d, r) {
  const g = new THREE.ExtrudeGeometry(roundRect(w, h - r * 0.4, r), { depth: d, bevelEnabled: true, bevelThickness: r * 0.9, bevelSize: r * 0.85, bevelSegments: 5, curveSegments: 12, steps: 1 })
  g.center(); g.computeVertexNormals(); return g
}
const DIM = { central:[0.46,0.78,0.42,0.15], lateral:[0.39,0.68,0.40,0.14], canine:[0.41,0.86,0.48,0.18], premolar:[0.50,0.62,0.56,0.17], molar:[0.68,0.58,0.70,0.19] }

// ── Input style helpers ──────────────────────────────────────────────────────
const iS = { width:'100%',padding:'10px 12px',borderRadius:'10px',background:'rgba(0,0,0,.25)',border:'1px solid rgba(255,255,255,.12)',color:'#eaf6f6',fontSize:'13.5px',outline:'none',boxSizing:'border-box',fontFamily:'inherit' }
const lS = { display:'block',fontSize:'10px',letterSpacing:'.13em',textTransform:'uppercase',color:'rgba(234,246,246,.5)',marginBottom:'5px',marginTop:'12px' }

const CONDITIONS = ['caries','fracture','crown needed','missing','root canal','restored','abrasion','other']
const SEVERITIES = ['mild','moderate','severe']
const COND_COLOR = { caries:'#ff8f8f', fracture:'#ffcf7a', 'crown needed':'#a8c7f7', missing:'rgba(255,255,255,.5)', 'root canal':'#f0b8c8', restored:'#bfe9a8', abrasion:'#f7d9a8', other:'var(--c1)' }

// ── ToothChart sub-component ─────────────────────────────────────────────────
function ToothChart({ flaggedTeeth: flaggedTeethProp, onToggle, onClear, onUpdateTooth }) {
  const canvasRef  = useRef()
  const tipRef     = useRef()
  const stateRef   = useRef()
  const [editing, setEditing] = useState(null) // tooth id being edited

  const flaggedIds  = (flaggedTeethProp || []).map(t => t.id || t)
  const flaggedTeeth = [...flaggedIds].sort().map(id => {
    const detail = (flaggedTeethProp || []).find(t => (t.id || t) === id) || {}
    return { id, tooth:'#'+id.slice(1)+(id[0]==='U'?' ↑':' ↓'), label:toothLabel(id), note:detail.note||'caries', severity:detail.severity||'moderate' }
  })

  const setMeshBad = (id, bad) => {
    if (!stateRef.current) return
    const m = stateRef.current.meshes.find(x => x.userData.id === id)
    if (!m) return
    m.userData.bad = bad
    const tc = bad ? {r:1,g:0.3,b:0.3} : {r:0.953,g:0.957,b:0.933}
    const ec = bad ? {r:0.29,g:0.04,b:0.04} : {r:0,g:0,b:0}
    gsap.to(m.material.color, {...tc, duration:.4})
    gsap.to(m.material.emissive, {...ec, duration:.4})
    const b = m.userData.baseScale
    gsap.fromTo(m.scale, {x:b[0]*1.22,y:b[1]*1.22,z:b[2]*1.22}, {x:b[0],y:b[1],z:b[2],duration:.55,ease:'elastic.out(1,0.5)'})
  }

  const handleClear = () => {
    if (stateRef.current) stateRef.current.meshes.forEach(m => { if (m.userData.bad) setMeshBad(m.userData.id,false) })
    onClear()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.clientWidth||560, H = canvas.clientHeight||340
    const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true})
    renderer.setPixelRatio(Math.min(2,devicePixelRatio)); renderer.setSize(W,H,false)
    try { renderer.outputColorSpace = THREE.SRGBColorSpace } catch(e){}
    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(34,W/H,.1,100); cam.position.set(0,.1,9.6)
    try {
      const cv = document.createElement('canvas'); cv.width=8; cv.height=128
      const cx = cv.getContext('2d'); const g = cx.createLinearGradient(0,0,0,128)
      g.addColorStop(0,'#eaffff'); g.addColorStop(.45,'#9fc7d4'); g.addColorStop(1,'#16323d')
      cx.fillStyle=g; cx.fillRect(0,0,8,128)
      const tex = new THREE.CanvasTexture(cv); tex.mapping=THREE.EquirectangularReflectionMapping
      const pmrem = new THREE.PMREMGenerator(renderer); scene.environment=pmrem.fromEquirectangular(tex).texture; tex.dispose()
    } catch(e){}
    scene.add(new THREE.AmbientLight(0xcfeeff,.32))
    const key=new THREE.DirectionalLight(0xffffff,.78); key.position.set(4,8,7); scene.add(key)
    const rim=new THREE.DirectionalLight(0x8fe6ff,.5); rim.position.set(-6,-3,-4); scene.add(rim)
    const fill=new THREE.PointLight(0xbfe9ff,.28,40); fill.position.set(0,2,8); scene.add(fill)
    scene.add(Object.assign(new THREE.DirectionalLight(0x2a4a55,.35),{position:{set:(function(){const l=new THREE.DirectionalLight(0x2a4a55,.35); l.position.set(0,-6,2); scene.add(l); return ()=>{}})()} }))
    const extra = new THREE.DirectionalLight(0x2a4a55,.35); extra.position.set(0,-6,2); scene.add(extra)
    const group = new THREE.Group(); group.rotation.x=.1; scene.add(group)
    const cuspGeo = new THREE.SphereGeometry(.13,16,12)
    const geoByType = {}; Object.keys(DIM).forEach(k=>{const d=DIM[k];geoByType[k]=crownGeo(d[0],d[1],d[2],d[3])})
    const flaggedSet = new Set(flaggedIds)
    const meshes = []; const N=14; const GAP=.16
    const enamel=(bad)=>new THREE.MeshPhysicalMaterial({color:bad?0xff3838:0xe9e7db,roughness:.28,clearcoat:1,clearcoatRoughness:.16,metalness:0,envMapIntensity:.65,emissive:bad?0x5a0a0a:0x000000})
    const buildArch=(upper)=>{
      for(let i=0;i<N;i++){
        const t=i/(N-1); const a=(t-.5)*2.42
        const x=Math.sin(a)*2.92; const z=Math.cos(a)*2.28
        const type=toothType(i,N); const d=DIM[type]; const h=d[1]
        const id=(upper?'U':'L')+(i+1); const bad=flaggedSet.has(id)
        const cy=upper?(GAP+h/2):-(GAP+h/2)
        const pivot=new THREE.Group(); pivot.position.set(x,cy,z); pivot.rotation.y=-a
        const mat=enamel(bad); const mesh=new THREE.Mesh(geoByType[type],mat)
        mesh.rotation.x=upper?Math.PI:0; pivot.add(mesh)
        if(type==='molar'||type==='premolar'){const n=type==='molar'?4:2;for(let c=0;c<n;c++){const cu=new THREE.Mesh(cuspGeo,mat);const col=(c%2)?1:-1;const row=(c<2||n===2)?1:-1;cu.position.set(col*d[0]*.24,h/2*.78,(n===2?0:row)*d[2]*.24);cu.scale.set(1,.6,1);mesh.add(cu)}}
        mesh.userData={id,bad,type,baseScale:[1,1,1]}; meshes.push(mesh); group.add(pivot)
      }
    }
    buildArch(true); buildArch(false)
    const gumMat=new THREE.MeshStandardMaterial({color:0xc8707c,roughness:.55,metalness:0,transparent:true,opacity:.96})
    ;[{y:.95,up:1},{y:-.95,up:0}].forEach(o=>{const tg=new THREE.Mesh(new THREE.TorusGeometry(2.92,.32,16,52,Math.PI*1.5),gumMat);tg.position.set(0,o.y,.35);tg.rotation.x=Math.PI/2;tg.rotation.z=o.up?-Math.PI*.25:Math.PI*1.25;group.add(tg)})
    stateRef.current={renderer,scene,cam,group,meshes,canvas}
    const ray=new THREE.Raycaster(); const ndc=new THREE.Vector2()
    const tip=tipRef.current
    let drag=false,moved=0,px=0,py=0,vel=0,hover=null,dragged=false
    const setHover=(m)=>{if(hover===m)return;if(hover){const b=hover.userData.baseScale;gsap.to(hover.scale,{x:b[0],y:b[1],z:b[2],duration:.25})};hover=m;if(m){const b=m.userData.baseScale;gsap.to(m.scale,{x:b[0]*1.14,y:b[1]*1.14,z:b[2]*1.14,duration:.25})};canvas.style.cursor=m?'pointer':'grab'}
    const pick=(cx,cy)=>{const rect=canvas.getBoundingClientRect();ndc.x=((cx-rect.left)/rect.width)*2-1;ndc.y=-((cy-rect.top)/rect.height)*2+1;ray.setFromCamera(ndc,cam);return ray.intersectObjects(meshes)[0]}
    const onDown=(e)=>{drag=true;moved=0;dragged=false;const c=e.touches?e.touches[0]:e;px=c.clientX;py=c.clientY;canvas.style.cursor='grabbing'}
    const onMove=(e)=>{const c=e.touches?e.touches[0]:e;if(drag){const dx=c.clientX-px,dy=c.clientY-py;moved+=Math.abs(dx)+Math.abs(dy);if(moved>6)dragged=true;group.rotation.y+=dx*.008;group.rotation.x=Math.max(-.5,Math.min(.6,group.rotation.x+dy*.005));vel=dx*.008;px=c.clientX;py=c.clientY}else{const hit=pick(c.clientX,c.clientY);setHover(hit?hit.object:null);if(hit&&tip){const rect=canvas.getBoundingClientRect();tip.style.left=(c.clientX-rect.left)+'px';tip.style.top=(c.clientY-rect.top)+'px';tip.style.opacity='1';const ud=hit.object.userData;tip.textContent='#'+ud.id.slice(1)+(ud.id[0]==='U'?' upper · ':' lower · ')+ud.type+(ud.bad?' · flagged':'')}else if(tip)tip.style.opacity='0'}}
    const onUp=(e)=>{canvas.style.cursor=hover?'pointer':'grab';if(drag&&moved<6){const c=e.changedTouches?e.changedTouches[0]:e;const hit=pick(c.clientX,c.clientY);if(hit){const id=hit.object.userData.id;const bad=!hit.object.userData.bad;setMeshBad(id,bad);onToggle(id)}};drag=false}
    const onLeave=()=>{if(tip)tip.style.opacity='0';setHover(null)}
    canvas.addEventListener('mousedown',onDown); window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp); canvas.addEventListener('mouseleave',onLeave)
    let raf
    const loop=()=>{if(!stateRef.current)return;raf=requestAnimationFrame(loop);if(!drag){if(dragged){group.rotation.y+=vel;vel*=.93}else{group.rotation.y=Math.sin(performance.now()*.00033)*.3;group.rotation.x=.1+Math.sin(performance.now()*.0005)*.04}};renderer.render(scene,cam)}
    loop()
    const handleResize=()=>{const ww=canvas.clientWidth||560,hh=canvas.clientHeight||340;renderer.setSize(ww,hh,false);cam.aspect=ww/hh;cam.updateProjectionMatrix()}
    window.addEventListener('resize',handleResize)
    return ()=>{cancelAnimationFrame(raf);canvas.removeEventListener('mousedown',onDown);window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);canvas.removeEventListener('mouseleave',onLeave);window.removeEventListener('resize',handleResize);try{renderer.dispose()}catch(e){};stateRef.current=null}
  }, [])

  return (
    <div>
      <div style={{ borderRadius:'20px',overflow:'hidden',background:'radial-gradient(120% 120% at 50% 0%,color-mix(in srgb,var(--c1) 12%,transparent),rgba(0,0,0,.3))',border:'1px solid rgba(255,255,255,.1)',position:'relative',marginBottom:'20px' }}>
        <canvas ref={canvasRef} style={{ width:'100%',height:'340px',display:'block',cursor:'grab' }} />
        <div ref={tipRef} style={{ position:'absolute',left:0,top:0,pointerEvents:'none',opacity:0,transform:'translate(-50%,-135%)',padding:'6px 11px',borderRadius:'9px',background:'rgba(6,16,20,.92)',border:'1px solid color-mix(in srgb,var(--c1) 30%,transparent)',fontSize:'12px',whiteSpace:'nowrap',zIndex:6,transition:'opacity .15s',boxShadow:'0 6px 18px rgba(0,0,0,.4)' }} />
        <div style={{ position:'absolute',bottom:'12px',left:0,right:0,textAlign:'center',fontSize:'11.5px',letterSpacing:'.06em',color:'rgba(234,246,246,.55)',pointerEvents:'none' }}>Click a tooth to flag · drag to rotate</div>
      </div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
        <div style={{ fontSize:'12px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)' }}>Charted findings ({flaggedTeeth.length})</div>
        <button onClick={handleClear} style={{ background:'transparent',border:'1px solid rgba(255,255,255,.16)',color:'rgba(234,246,246,.7)',fontFamily:'inherit',fontSize:'12px',padding:'6px 12px',borderRadius:'20px',cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Clear all</button>
      </div>
      {flaggedTeeth.length>0 ? (
        <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
          {flaggedTeeth.map(f=>{
            const condColor = COND_COLOR[f.note] || 'var(--c1)'
            const isEditing = editing === f.id
            return (
              <div key={f.id} style={{ borderRadius:'14px',background:'rgba(255,255,255,.04)',border:`1px solid color-mix(in srgb,${condColor} 30%,transparent)`,overflow:'hidden' }}>
                <div style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px' }}>
                  <span style={{ width:'9px',height:'9px',borderRadius:'50%',background:condColor,boxShadow:`0 0 8px ${condColor}`,display:'inline-block',flexShrink:0 }} />
                  <span style={{ fontFamily:"'Instrument Serif',serif",fontSize:'18px',width:'52px',flexShrink:0 }}>{f.tooth}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:'13.5px',color:'rgba(234,246,246,.85)' }}>{f.label}</div>
                    <div style={{ display:'flex',gap:'8px',marginTop:'3px',flexWrap:'wrap' }}>
                      <span style={{ fontSize:'10.5px',padding:'2px 8px',borderRadius:'20px',background:`color-mix(in srgb,${condColor} 15%,transparent)`,color:condColor }}>{f.note}</span>
                      <span style={{ fontSize:'10.5px',color:'rgba(255,255,255,.35)' }}>{f.severity}</span>
                    </div>
                  </div>
                  <button onClick={()=>setEditing(isEditing?null:f.id)} style={{ padding:'5px 10px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.16)',background:isEditing?'rgba(255,255,255,.1)':'transparent',color:'rgba(234,246,246,.65)',cursor:'pointer',fontSize:'11.5px',fontFamily:'inherit' }}>Edit</button>
                  <button onClick={()=>onToggle(f.id)} style={{ background:'transparent',border:'none',color:'rgba(255,255,255,.35)',cursor:'pointer',fontSize:'14px' }} onMouseEnter={e=>e.currentTarget.style.color='#fff'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.35)'}>✕</button>
                </div>
                {isEditing && (
                  <ToothEditForm
                    tooth={f}
                    onSave={(note,severity)=>{ onUpdateTooth(f.id,note,severity); setEditing(null) }}
                    onCancel={()=>setEditing(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding:'24px',textAlign:'center',borderRadius:'16px',background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.14)',color:'rgba(234,246,246,.5)',fontSize:'14px' }}>No findings charted. Click any tooth to flag pathology.</div>
      )}
    </div>
  )
}

// ── ToothEditForm ─────────────────────────────────────────────────────────────
function ToothEditForm({ tooth, onSave, onCancel }) {
  const [note,     setNote]     = useState(tooth.note     || 'caries')
  const [severity, setSeverity] = useState(tooth.severity || 'moderate')
  const condColor = COND_COLOR[note] || 'var(--c1)'
  return (
    <div style={{ padding:'12px 16px 16px',borderTop:'1px solid rgba(255,255,255,.08)',display:'flex',flexDirection:'column',gap:'12px' }}>
      <div>
        <div style={{ fontSize:'10px',letterSpacing:'.13em',textTransform:'uppercase',color:'rgba(234,246,246,.45)',marginBottom:'8px' }}>Condition</div>
        <div style={{ display:'flex',gap:'6px',flexWrap:'wrap' }}>
          {CONDITIONS.map(c => (
            <button key={c} onClick={()=>setNote(c)} style={{ padding:'5px 11px',borderRadius:'20px',border:`1px solid color-mix(in srgb,${COND_COLOR[c]||'var(--c1)'} 35%,transparent)`,background:note===c?`color-mix(in srgb,${COND_COLOR[c]||'var(--c1)'} 20%,transparent)`:'transparent',color:note===c?(COND_COLOR[c]||'var(--c1)'):'rgba(234,246,246,.55)',cursor:'pointer',fontSize:'12px',fontFamily:'inherit',transition:'all .15s' }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize:'10px',letterSpacing:'.13em',textTransform:'uppercase',color:'rgba(234,246,246,.45)',marginBottom:'8px' }}>Severity</div>
        <div style={{ display:'flex',gap:'6px' }}>
          {SEVERITIES.map(s => (
            <button key={s} onClick={()=>setSeverity(s)} style={{ padding:'5px 13px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.18)',background:severity===s?'rgba(255,255,255,.12)':'transparent',color:severity===s?'#fff':'rgba(234,246,246,.55)',cursor:'pointer',fontSize:'12px',fontFamily:'inherit',transition:'all .15s' }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex',gap:'8px' }}>
        <button onClick={()=>onSave(note,severity)} style={{ padding:'7px 18px',borderRadius:'10px',border:'none',background:`linear-gradient(140deg,${condColor},color-mix(in srgb,${condColor} 70%,var(--c3)))`,color:'#04212a',fontWeight:600,cursor:'pointer',fontSize:'12.5px',fontFamily:'inherit' }}>Save</button>
        <button onClick={onCancel} style={{ padding:'7px 13px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(234,246,246,.65)',cursor:'pointer',fontSize:'12.5px',fontFamily:'inherit' }}>Cancel</button>
      </div>
    </div>
  )
}

// ── VisitsTab ────────────────────────────────────────────────────────────────
function VisitsTab({ patientId, showToast }) {
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editNote, setEditNote] = useState(null) // {visitId, soap}
  const [newVisit, setNewVisit] = useState({ date_str:'', procedure:'', procedure_category:'', duration_mins:'', faculty_supervisor:'Dr. Lin', status:'completed' })

  useEffect(() => { api.visits.list(patientId).then(v => { setVisits(v); setLoading(false) }).catch(()=>setLoading(false)) }, [patientId])

  const addVisit = async () => {
    try {
      const v = await api.visits.create({ patient_id: patientId, ...newVisit, duration_mins: Number(newVisit.duration_mins)||45 })
      setVisits(prev => [v, ...prev]); setAddOpen(false); setNewVisit({date_str:'',procedure:'',procedure_category:'',duration_mins:'',faculty_supervisor:'Dr. Lin',status:'completed'}); showToast('Visit logged')
    } catch { showToast('Failed to log visit') }
  }

  const saveNote = async (visitId, soap) => {
    try {
      await api.visits.note(visitId, soap)
      setVisits(prev => prev.map(v => v.id===visitId ? {...v, note:soap} : v))
      setEditNote(null); showToast('SOAP note saved')
    } catch { showToast('Failed to save note') }
  }

  const categories = ['Restorative','Periodontics','Endodontics','Prosthodontics','Oral Surgery','Orthodontics']

  if (loading) return <div style={{ textAlign:'center',color:'rgba(255,255,255,.4)',padding:'32px',fontSize:'13.5px' }}>Loading visits…</div>

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)' }}>Visit history ({visits.length})</div>
        <button onClick={()=>setAddOpen(v=>!v)} style={{ padding:'7px 14px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.18)',background:'transparent',color:'var(--c1)',cursor:'pointer',fontSize:'12px',fontFamily:'inherit' }}>+ Log visit</button>
      </div>
      {addOpen && (
        <div style={{ marginBottom:'16px',padding:'18px',borderRadius:'16px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)' }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
            <div><label style={lS}>Date</label><input value={newVisit.date_str} onChange={e=>setNewVisit(p=>({...p,date_str:e.target.value}))} type="date" style={iS} /></div>
            <div><label style={lS}>Duration (mins)</label><input value={newVisit.duration_mins} onChange={e=>setNewVisit(p=>({...p,duration_mins:e.target.value}))} type="number" placeholder="45" style={iS} /></div>
          </div>
          <label style={lS}>Procedure</label>
          <input value={newVisit.procedure} onChange={e=>setNewVisit(p=>({...p,procedure:e.target.value}))} placeholder="Composite restoration #14" style={iS} />
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
            <div>
              <label style={lS}>Competency category</label>
              <select value={newVisit.procedure_category} onChange={e=>setNewVisit(p=>({...p,procedure_category:e.target.value}))} style={iS}>
                <option value="">— none —</option>
                {categories.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lS}>Faculty</label>
              <select value={newVisit.faculty_supervisor} onChange={e=>setNewVisit(p=>({...p,faculty_supervisor:e.target.value}))} style={iS}>
                <option>Dr. Lin</option><option>Dr. Okada</option><option>Dr. Bell</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop:'12px',display:'flex',gap:'10px' }}>
            <button onClick={addVisit} style={{ padding:'9px 18px',borderRadius:'10px',border:'none',background:'linear-gradient(140deg,var(--c2),var(--c3))',color:'#04212a',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Save visit</button>
            <button onClick={()=>setAddOpen(false)} style={{ padding:'9px 14px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(234,246,246,.7)',cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Cancel</button>
          </div>
        </div>
      )}
      {visits.length===0 ? (
        <div style={{ padding:'28px',textAlign:'center',borderRadius:'16px',background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.12)',color:'rgba(234,246,246,.4)',fontSize:'13.5px' }}>No visits recorded yet.</div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
          {visits.map(v=>(
            <div key={v.id} style={{ borderRadius:'16px',overflow:'hidden',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'14px',padding:'14px 18px',borderBottom:editNote?.visitId===v.id?'1px solid rgba(255,255,255,.08)':'none' }}>
                <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'18px',color:'var(--c2)',width:'80px',flexShrink:0 }}>{v.date_str}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px',fontWeight:500 }}>{v.procedure}</div>
                  <div style={{ fontSize:'12px',color:'rgba(255,255,255,.45)',marginTop:'2px' }}>{v.faculty_supervisor}{v.duration_mins?` · ${v.duration_mins} min`:''}{v.procedure_category?` · ${v.procedure_category}`:''}</div>
                </div>
                <span style={{ fontSize:'10px',letterSpacing:'.1em',textTransform:'uppercase',padding:'4px 9px',borderRadius:'20px',background:'rgba(123,224,214,.12)',color:'var(--c1)',flexShrink:0 }}>{v.status}</span>
                <button onClick={()=>setEditNote(editNote?.visitId===v.id?null:{visitId:v.id,soap:v.note||{subjective:'',objective:'',assessment:'',plan:''}})} style={{ padding:'6px 12px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.16)',background:'transparent',color:'rgba(234,246,246,.7)',cursor:'pointer',fontSize:'12px',fontFamily:'inherit',flexShrink:0 }}>
                  {v.note?'Edit note':'Add SOAP'}
                </button>
              </div>
              {editNote?.visitId===v.id && (
                <SOAPEditor soap={editNote.soap} onChange={soap=>setEditNote(p=>({...p,soap}))} onSave={()=>saveNote(v.id,editNote.soap)} onCancel={()=>setEditNote(null)} />
              )}
              {v.note && editNote?.visitId!==v.id && (
                <div style={{ padding:'12px 18px',fontSize:'12.5px' }}>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px' }}>
                    {[['S',v.note.subjective],['O',v.note.objective],['A',v.note.assessment],['P',v.note.plan]].map(([k,val])=>val&&(
                      <div key={k} style={{ padding:'8px 12px',borderRadius:'10px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)' }}>
                        <span style={{ fontSize:'10px',letterSpacing:'.14em',textTransform:'uppercase',color:'var(--c1)',marginRight:'8px' }}>{k}</span>
                        <span style={{ color:'rgba(234,246,246,.7)' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SOAPEditor({ soap, onChange, onSave, onCancel }) {
  return (
    <div style={{ padding:'14px 18px',display:'flex',flexDirection:'column',gap:'10px' }}>
      {[['subjective','S — Subjective','What the patient reports'],['objective','O — Objective','Clinical findings'],['assessment','A — Assessment','Diagnosis / impression'],['plan','P — Plan','Treatment plan, next steps']].map(([k,label,ph])=>(
        <div key={k}>
          <div style={{ fontSize:'10px',letterSpacing:'.13em',textTransform:'uppercase',color:'var(--c1)',marginBottom:'5px' }}>{label}</div>
          <textarea value={soap[k]||''} onChange={e=>onChange({...soap,[k]:e.target.value})} placeholder={ph} rows={2} style={{ ...iS,resize:'vertical' }} />
        </div>
      ))}
      <div style={{ display:'flex',gap:'10px',marginTop:'4px' }}>
        <button onClick={onSave} style={{ padding:'8px 18px',borderRadius:'10px',border:'none',background:'linear-gradient(140deg,var(--c2),var(--c3))',color:'#04212a',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Save SOAP note</button>
        <button onClick={onCancel} style={{ padding:'8px 14px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(234,246,246,.7)',cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Cancel</button>
      </div>
    </div>
  )
}

// ── TreatmentPlanTab ─────────────────────────────────────────────────────────
function TreatmentPlanTab({ patientId, showToast }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [addPlanOpen, setAddPlanOpen] = useState(false)
  const [newPlanTitle, setNewPlanTitle] = useState('')
  const [addStepPlanId, setAddStepPlanId] = useState(null)
  const [newStep, setNewStep] = useState('')

  useEffect(() => { api.plans.list(patientId).then(p=>{setPlans(p);setLoading(false)}).catch(()=>setLoading(false)) }, [patientId])

  const addPlan = async () => {
    if (!newPlanTitle.trim()) return
    try {
      const p = await api.plans.create({ patient_id:patientId, title:newPlanTitle, status:'active' })
      setPlans(prev=>[...prev,{...p,steps:[]}]); setNewPlanTitle(''); setAddPlanOpen(false); showToast('Plan created')
    } catch { showToast('Failed to create plan') }
  }

  const addStep = async (planId) => {
    if (!newStep.trim()) return
    try {
      const s = await api.plans.addStep(planId, { description:newStep, order:100 })
      setPlans(prev=>prev.map(p=>p.id===planId?{...p,steps:[...p.steps,s]}:p)); setNewStep(''); setAddStepPlanId(null); showToast('Step added')
    } catch { showToast('Failed to add step') }
  }

  const toggleStep = async (planId, stepId, currentStatus) => {
    const next = currentStatus==='completed'?'pending':'completed'
    setPlans(prev=>prev.map(p=>p.id===planId?{...p,steps:p.steps.map(s=>s.id===stepId?{...s,status:next}:s)}:p))
    try { await api.plans.updateStep(planId, stepId, next) } catch { showToast('Failed to update step') }
  }

  if (loading) return <div style={{ textAlign:'center',color:'rgba(255,255,255,.4)',padding:'32px',fontSize:'13.5px' }}>Loading plans…</div>

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)' }}>Treatment plans</div>
        <button onClick={()=>setAddPlanOpen(v=>!v)} style={{ padding:'7px 14px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.18)',background:'transparent',color:'var(--c1)',cursor:'pointer',fontSize:'12px',fontFamily:'inherit' }}>+ New plan</button>
      </div>
      {addPlanOpen && (
        <div style={{ marginBottom:'16px',padding:'16px',borderRadius:'14px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',display:'flex',gap:'10px' }}>
          <input value={newPlanTitle} onChange={e=>setNewPlanTitle(e.target.value)} placeholder="e.g. Phase 1 — Restorative" style={{ ...iS,flex:1,margin:0 }} onKeyDown={e=>e.key==='Enter'&&addPlan()} />
          <button onClick={addPlan} style={{ padding:'9px 16px',borderRadius:'10px',border:'none',background:'linear-gradient(140deg,var(--c2),var(--c3))',color:'#04212a',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Create</button>
        </div>
      )}
      {plans.length===0 ? (
        <div style={{ padding:'28px',textAlign:'center',borderRadius:'16px',background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.12)',color:'rgba(234,246,246,.4)',fontSize:'13.5px' }}>No treatment plans yet.</div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:'14px' }}>
          {plans.map(plan=>{
            const done = plan.steps.filter(s=>s.status==='completed').length
            const total = plan.steps.length
            const pct = total>0?Math.round(done/total*100):0
            return (
              <div key={plan.id} style={{ padding:'18px',borderRadius:'18px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px' }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'20px' }}>{plan.title}</div>
                  <span style={{ fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:'rgba(123,224,214,.1)',color:'var(--c1)' }}>{done}/{total}</span>
                </div>
                {total>0 && (
                  <div style={{ marginBottom:'14px' }}>
                    <div style={{ height:'5px',borderRadius:'5px',background:'rgba(255,255,255,.1)',overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${pct}%`,borderRadius:'5px',background:pct===100?'#bfe9a8':'linear-gradient(90deg,var(--c2),var(--c3))',transition:'width .8s ease' }} />
                    </div>
                  </div>
                )}
                <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                  {plan.steps.map(step=>(
                    <div key={step.id} onClick={()=>toggleStep(plan.id,step.id,step.status)} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'10px 13px',borderRadius:'11px',background:'rgba(255,255,255,.04)',cursor:'pointer',transition:'background .2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'}>
                      <div style={{ width:'18px',height:'18px',borderRadius:'5px',flexShrink:0,border:step.status==='completed'?'none':'1px solid rgba(255,255,255,.3)',background:step.status==='completed'?'linear-gradient(140deg,var(--c2),var(--c3))':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',color:'#04212a' }}>
                        {step.status==='completed'&&'✓'}
                      </div>
                      <span style={{ fontSize:'13.5px',textDecoration:step.status==='completed'?'line-through':'none',color:step.status==='completed'?'rgba(234,246,246,.45)':'#eaf6f6',flex:1 }}>{step.description}</span>
                    </div>
                  ))}
                </div>
                {addStepPlanId===plan.id ? (
                  <div style={{ marginTop:'10px',display:'flex',gap:'8px' }}>
                    <input value={newStep} onChange={e=>setNewStep(e.target.value)} placeholder="Describe the step…" style={{ ...iS,flex:1,margin:0 }} onKeyDown={e=>e.key==='Enter'&&addStep(plan.id)} autoFocus />
                    <button onClick={()=>addStep(plan.id)} style={{ padding:'8px 14px',borderRadius:'10px',border:'none',background:'linear-gradient(140deg,var(--c2),var(--c3))',color:'#04212a',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Add</button>
                    <button onClick={()=>setAddStepPlanId(null)} style={{ padding:'8px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(234,246,246,.7)',cursor:'pointer',fontSize:'13px' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={()=>setAddStepPlanId(plan.id)} style={{ marginTop:'10px',width:'100%',padding:'8px',borderRadius:'10px',border:'1px dashed rgba(255,255,255,.2)',background:'transparent',color:'rgba(234,246,246,.5)',cursor:'pointer',fontSize:'12.5px',fontFamily:'inherit' }}>+ Add step</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── AppointmentsTab ──────────────────────────────────────────────────────────
function AppointmentsTab({ patient, allAppts, onCreateAppointment, onUpdateAppointment, onCancelAppointment, showToast }) {
  const [addOpen, setAddOpen] = useState(false)
  const [newAppt, setNewAppt] = useState({ datetime_str:'', room:'Bay 1', procedure:'', faculty:'Dr. Lin', notes:'' })

  const bookAppt = async () => {
    if (!newAppt.datetime_str || !newAppt.procedure) { showToast('Date and procedure required'); return }
    await onCreateAppointment({ patient_id:patient.id, ...newAppt })
    setNewAppt({ datetime_str:'', room:'Bay 1', procedure:'', faculty:'Dr. Lin', notes:'' }); setAddOpen(false)
  }

  const upcoming = allAppts.filter(a=>['scheduled','confirmed'].includes(a.status)).sort((a,b)=>a.datetime_str>b.datetime_str?1:-1)
  const past = allAppts.filter(a=>['completed','cancelled','no_show'].includes(a.status)).sort((a,b)=>a.datetime_str<b.datetime_str?1:-1)

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)' }}>Appointments</div>
        <button onClick={()=>setAddOpen(v=>!v)} style={{ padding:'7px 14px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.18)',background:'transparent',color:'var(--c1)',cursor:'pointer',fontSize:'12px',fontFamily:'inherit' }}>+ Book</button>
      </div>
      {addOpen && (
        <div style={{ marginBottom:'16px',padding:'18px',borderRadius:'16px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)' }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
            <div><label style={lS}>Date & time</label><input value={newAppt.datetime_str} onChange={e=>setNewAppt(p=>({...p,datetime_str:e.target.value}))} type="datetime-local" style={iS} /></div>
            <div><label style={lS}>Room</label><select value={newAppt.room} onChange={e=>setNewAppt(p=>({...p,room:e.target.value}))} style={iS}><option>Bay 1</option><option>Bay 2</option><option>Bay 3</option><option>Bay 4</option></select></div>
          </div>
          <label style={lS}>Procedure</label>
          <input value={newAppt.procedure} onChange={e=>setNewAppt(p=>({...p,procedure:e.target.value}))} placeholder="Composite restoration #14" style={iS} />
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
            <div><label style={lS}>Faculty</label><select value={newAppt.faculty} onChange={e=>setNewAppt(p=>({...p,faculty:e.target.value}))} style={iS}><option>Dr. Lin</option><option>Dr. Okada</option><option>Dr. Bell</option></select></div>
            <div><label style={lS}>Notes</label><input value={newAppt.notes} onChange={e=>setNewAppt(p=>({...p,notes:e.target.value}))} placeholder="Optional notes" style={iS} /></div>
          </div>
          <div style={{ marginTop:'12px',display:'flex',gap:'10px' }}>
            <button onClick={bookAppt} style={{ padding:'9px 18px',borderRadius:'10px',border:'none',background:'linear-gradient(140deg,var(--c2),var(--c3))',color:'#04212a',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Book</button>
            <button onClick={()=>setAddOpen(false)} style={{ padding:'9px 14px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(234,246,246,.7)',cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Cancel</button>
          </div>
        </div>
      )}
      {upcoming.length===0&&past.length===0 && (
        <div style={{ padding:'28px',textAlign:'center',borderRadius:'16px',background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.12)',color:'rgba(234,246,246,.4)',fontSize:'13.5px' }}>No appointments scheduled.</div>
      )}
      {upcoming.length>0 && (
        <>
          <div style={{ fontSize:'10.5px',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(255,255,255,.45)',marginBottom:'10px' }}>Upcoming</div>
          <div style={{ display:'flex',flexDirection:'column',gap:'10px',marginBottom:'18px' }}>
            {upcoming.map(a=>{
              const dt=new Date(a.datetime_str)
              return (
                <div key={a.id} style={{ display:'flex',alignItems:'center',gap:'14px',padding:'14px 18px',borderRadius:'14px',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)' }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'16px',color:'var(--c2)',flexShrink:0,width:'60px' }}>{dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px',fontWeight:500 }}>{a.procedure}</div>
                    <div style={{ fontSize:'12px',color:'rgba(255,255,255,.45)',marginTop:'2px' }}>{dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})} · {a.room} · {a.faculty}</div>
                  </div>
                  <button onClick={()=>onCancelAppointment(a.id)} style={{ padding:'5px 11px',borderRadius:'20px',border:'1px solid rgba(255,100,100,.3)',background:'transparent',color:'rgba(255,150,150,.7)',cursor:'pointer',fontSize:'11.5px',fontFamily:'inherit' }}>Cancel</button>
                </div>
              )
            })}
          </div>
        </>
      )}
      {past.length>0 && (
        <>
          <div style={{ fontSize:'10.5px',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(255,255,255,.35)',marginBottom:'10px' }}>Past</div>
          <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
            {past.slice(0,6).map(a=>{
              const dt=new Date(a.datetime_str)
              return (
                <div key={a.id} style={{ display:'flex',alignItems:'center',gap:'14px',padding:'12px 18px',borderRadius:'14px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',opacity:.7 }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'15px',color:'rgba(255,255,255,.5)',flexShrink:0,width:'60px' }}>{dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13.5px' }}>{a.procedure}</div>
                    <div style={{ fontSize:'11.5px',color:'rgba(255,255,255,.35)',marginTop:'2px' }}>{a.room}</div>
                  </div>
                  <span style={{ fontSize:'10.5px',textTransform:'uppercase',letterSpacing:'.08em',color:a.status==='completed'?'#bfe9a8':a.status==='cancelled'?'rgba(255,150,150,.6)':'rgba(255,255,255,.4)' }}>{a.status}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── IntakeTab ────────────────────────────────────────────────────────────────
function IntakeTab({ patient, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone:patient.phone||'', email:patient.email||'', dob:patient.dob||'', allergies:patient.allergies||'', medications:patient.medications||'', medical_conditions:patient.medical_conditions||'', chief_complaint:patient.chief_complaint||'', referred_by:patient.referred_by||'' })

  const save = async () => { await onUpdate(patient.id, form); setEditing(false) }

  const fields = [
    {key:'phone',label:'Phone',ph:'(868) 555-0100'},{key:'email',label:'Email',ph:'patient@email.com'},
    {key:'dob',label:'Date of birth',ph:'YYYY-MM-DD'},{key:'referred_by',label:'Referred by',ph:'Walk-in, Faculty…'},
    {key:'allergies',label:'Allergies',ph:'Penicillin, Latex, None…'},{key:'medications',label:'Medications',ph:'List current medications'},
    {key:'medical_conditions',label:'Medical conditions',ph:'Diabetes, Hypertension…'},{key:'chief_complaint',label:'Chief complaint',ph:'Main reason for visit'},
  ]

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)' }}>Medical intake</div>
        <button onClick={()=>editing?save():setEditing(true)} style={{ padding:'7px 14px',borderRadius:'20px',border:'1px solid rgba(255,255,255,.18)',background:editing?'linear-gradient(140deg,var(--c2),var(--c3))':'transparent',color:editing?'#04212a':'var(--c1)',cursor:'pointer',fontSize:'12px',fontFamily:'inherit',fontWeight:editing?600:400 }}>
          {editing?'Save changes':'Edit'}
        </button>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        {fields.map(({key,label,ph})=>(
          <div key={key} style={{ gridColumn:['chief_complaint','medical_conditions','medications'].includes(key)?'1/-1':undefined }}>
            <div style={{ fontSize:'10px',letterSpacing:'.13em',textTransform:'uppercase',color:'rgba(234,246,246,.5)',marginBottom:'6px' }}>{label}</div>
            {editing ? (
              ['chief_complaint','medical_conditions','medications'].includes(key) ? (
                <textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={2} style={{ ...iS,resize:'vertical' }} />
              ) : (
                <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={iS} />
              )
            ) : (
              <div style={{ padding:'10px 12px',borderRadius:'10px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',fontSize:'13.5px',color:form[key]?'rgba(234,246,246,.85)':'rgba(234,246,246,.3)',minHeight:'38px' }}>
                {form[key]||<em>Not recorded</em>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main PatientDetail panel ─────────────────────────────────────────────────
export default function PatientDetail({ patient, flaggedTeeth, onToggle, onClear, onUpdateTooth, onClose, onUpdate, onDelete, onCreateAppointment, onUpdateAppointment, onCancelAppointment, allAppts, showToast }) {
  const [tab, setTab] = useState('overview')

  const tabs = [
    { id:'overview', label:'Overview' },
    { id:'chart',    label:'Tooth Chart' },
    { id:'visits',   label:'Visits' },
    { id:'plan',     label:'Treatment Plan' },
    { id:'appts',    label:'Appointments' },
    { id:'intake',   label:'Intake' },
  ]

  const statusBg = STATUS_BG[patient.status] || STATUS_BG.Active
  const statusFg = STATUS_FG[patient.status] || STATUS_FG.Active
  const nextShort = (patient.next||'—').split('·').slice(1).join('·').trim() || patient.next || '—'

  return (
    <div style={{ position:'absolute',top:0,right:0,bottom:0,width:'680px',maxWidth:'96vw',zIndex:41,background:'linear-gradient(160deg,rgba(16,38,44,.94),rgba(6,16,21,.97))',backdropFilter:'blur(36px) saturate(150%)',WebkitBackdropFilter:'blur(36px) saturate(150%)',borderLeft:'1px solid color-mix(in srgb,var(--c1) 22%,transparent)',boxShadow:'-30px 0 80px rgba(0,0,0,.55)',display:'flex',flexDirection:'column',overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'26px 30px 0',flexShrink:0 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px' }}>
          <div style={{ display:'flex',gap:'15px',alignItems:'flex-start' }}>
            <div style={{ width:'52px',height:'52px',borderRadius:'16px',background:patient.tone,boxShadow:'inset 0 1px 2px rgba(255,255,255,.5)',flexShrink:0 }} />
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px' }}>
                <h2 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'32px',margin:0 }}>{patient.name}</h2>
                <span style={{ fontSize:'10.5px',letterSpacing:'.1em',textTransform:'uppercase',padding:'4px 9px',borderRadius:'20px',background:statusBg,color:statusFg }}>{patient.status}</span>
              </div>
              <div style={{ fontSize:'13.5px',color:'rgba(234,246,246,.55)' }}>{patient.age} yrs · {patient.faculty}</div>
            </div>
          </div>
          <div style={{ display:'flex',gap:'8px',alignItems:'center' }}>
            <button onClick={()=>{ if(confirm(`Remove ${patient.name} from your patient list?`)) onDelete(patient.id) }} style={{ padding:'7px 12px',borderRadius:'10px',border:'1px solid rgba(255,100,100,.25)',background:'transparent',color:'rgba(255,150,150,.7)',cursor:'pointer',fontSize:'12px' }}>Remove</button>
            <button onClick={onClose} style={{ width:'38px',height:'38px',borderRadius:'11px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.14)',color:'#fff',fontSize:'17px',cursor:'pointer' }}>✕</button>
          </div>
        </div>

        {/* Info strip */}
        <div style={{ display:'flex',gap:'16px',marginBottom:'18px',flexWrap:'wrap' }}>
          {[[patient.procedure,'Procedure'],[nextShort,'Next appt'],[(patient.phone||'—'),'Phone'],[(patient.email||'—'),'Email']].map(([val,lbl])=>(
            <div key={lbl} style={{ padding:'9px 14px',borderRadius:'12px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',minWidth:'110px' }}>
              <div style={{ fontSize:'9.5px',letterSpacing:'.14em',textTransform:'uppercase',color:'var(--c1)',marginBottom:'3px' }}>{lbl}</div>
              <div style={{ fontSize:'13px',color:'rgba(234,246,246,.85)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'140px' }}>{val||'—'}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:'2px',padding:'4px',borderRadius:'14px',background:'rgba(0,0,0,.2)',border:'1px solid rgba(255,255,255,.08)',overflowX:'auto' }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:'0 0 auto',padding:'8px 14px',border:'none',borderRadius:'10px',cursor:'pointer',fontSize:'12.5px',fontWeight:500,fontFamily:'inherit',color:'#eaf6f6',transition:'all .2s',background:tab===t.id?'linear-gradient(140deg,var(--c2),var(--c3))':tab===t.id?undefined:'transparent',color:tab===t.id?'#04212a':'rgba(234,246,246,.7)',whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex:1,overflowY:'auto',padding:'22px 30px 36px' }}>
        {tab==='overview' && (
          <div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'20px' }}>
              {[[(flaggedTeeth||[]).length,'Flagged teeth','#ff8f8f','rgba(255,90,90,.1)','rgba(255,90,90,.25)'],[allAppts.filter(a=>a.status==='completed').length,'Completed visits','var(--c2)','color-mix(in srgb,var(--c1) 10%,transparent)','color-mix(in srgb,var(--c1) 22%,transparent)']].map(([val,lbl,fg,bg,border])=>(
                <div key={lbl} style={{ padding:'18px',borderRadius:'16px',background:bg,border:`1px solid ${border}` }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'38px',color:fg }}>{String(val).padStart(2,'0')}</div>
                  <div style={{ fontSize:'12px',color:'rgba(255,255,255,.6)',marginTop:'4px' }}>{lbl}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:'18px',borderRadius:'16px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)' }}>
              <div style={{ fontSize:'11px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)',marginBottom:'14px' }}>Patient overview</div>
              {[['Status',patient.status],['Procedure',patient.procedure],['Faculty',patient.faculty],['Chief complaint',patient.chief_complaint||'—'],['Allergies',patient.allergies||'None reported'],['Medical conditions',patient.medical_conditions||'None reported']].map(([k,v])=>(
                <div key={k} style={{ display:'flex',gap:'14px',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ fontSize:'11.5px',color:'rgba(255,255,255,.4)',width:'140px',flexShrink:0 }}>{k}</span>
                  <span style={{ fontSize:'13.5px',flex:1 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='chart' && <ToothChart flaggedTeeth={flaggedTeeth} onToggle={onToggle} onClear={onClear} onUpdateTooth={onUpdateTooth} />}
        {tab==='visits' && <VisitsTab patientId={patient.id} showToast={showToast} />}
        {tab==='plan' && <TreatmentPlanTab patientId={patient.id} showToast={showToast} />}
        {tab==='appts' && <AppointmentsTab patient={patient} allAppts={allAppts} onCreateAppointment={onCreateAppointment} onUpdateAppointment={onUpdateAppointment} onCancelAppointment={onCancelAppointment} showToast={showToast} />}
        {tab==='intake' && <IntakeTab patient={patient} onUpdate={onUpdate} />}
      </div>
    </div>
  )
}
