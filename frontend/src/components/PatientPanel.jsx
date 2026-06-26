import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

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
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function crownGeo(w, h, d, r) {
  const g = new THREE.ExtrudeGeometry(roundRect(w, h - r * 0.4, r), {
    depth: d, bevelEnabled: true,
    bevelThickness: r * 0.9, bevelSize: r * 0.85,
    bevelSegments: 5, curveSegments: 12, steps: 1,
  })
  g.center()
  g.computeVertexNormals()
  return g
}

const DIM = {
  central:  [0.46, 0.78, 0.42, 0.15],
  lateral:  [0.39, 0.68, 0.40, 0.14],
  canine:   [0.41, 0.86, 0.48, 0.18],
  premolar: [0.50, 0.62, 0.56, 0.17],
  molar:    [0.68, 0.58, 0.70, 0.19],
}

export default function PatientPanel({ patient, flaggedIds, onToggle, onClear, onClose }) {
  const canvasRef = useRef(null)
  const tipRef    = useRef(null)
  const stateRef  = useRef(null)

  const flaggedTeeth = [...flaggedIds].sort().map(id => ({
    id,
    tooth: '#' + id.slice(1) + (id[0] === 'U' ? ' ↑' : ' ↓'),
    label: toothLabel(id),
    note: 'caries',
  }))

  const setMeshBad = (id, bad) => {
    if (!stateRef.current) return
    const m = stateRef.current.meshes.find(x => x.userData.id === id)
    if (!m) return
    m.userData.bad = bad
    const tc = bad ? { r: 1, g: 0.3, b: 0.3 } : { r: 0.953, g: 0.957, b: 0.933 }
    const ec = bad ? { r: 0.29, g: 0.04, b: 0.04 } : { r: 0, g: 0, b: 0 }
    gsap.to(m.material.color, { ...tc, duration: 0.4 })
    gsap.to(m.material.emissive, { ...ec, duration: 0.4 })
    const b = m.userData.baseScale
    gsap.fromTo(m.scale,
      { x: b[0] * 1.22, y: b[1] * 1.22, z: b[2] * 1.22 },
      { x: b[0], y: b[1], z: b[2], duration: 0.55, ease: 'elastic.out(1,0.5)' }
    )
  }

  const handleClear = () => {
    if (stateRef.current) {
      stateRef.current.meshes.forEach(m => {
        if (m.userData.bad) setMeshBad(m.userData.id, false)
      })
    }
    onClear()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = canvas.clientWidth || 560
    const H = canvas.clientHeight || 360

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(2, devicePixelRatio))
    renderer.setSize(W, H, false)
    try { renderer.outputColorSpace = THREE.SRGBColorSpace } catch (e) {}

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(34, W / H, 0.1, 100)
    cam.position.set(0, 0.1, 9.6)

    // Environment for glossy enamel
    try {
      const cv = document.createElement('canvas'); cv.width = 8; cv.height = 128
      const cx = cv.getContext('2d')
      const grad = cx.createLinearGradient(0, 0, 0, 128)
      grad.addColorStop(0, '#eaffff'); grad.addColorStop(0.45, '#9fc7d4'); grad.addColorStop(1, '#16323d')
      cx.fillStyle = grad; cx.fillRect(0, 0, 8, 128)
      const tex = new THREE.CanvasTexture(cv)
      tex.mapping = THREE.EquirectangularReflectionMapping
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromEquirectangular(tex).texture
      tex.dispose()
    } catch (e) {}

    scene.add(new THREE.AmbientLight(0xcfeeff, 0.32))
    const key = new THREE.DirectionalLight(0xffffff, 0.78); key.position.set(4, 8, 7); scene.add(key)
    const rim = new THREE.DirectionalLight(0x8fe6ff, 0.5); rim.position.set(-6, -3, -4); scene.add(rim)
    const fill = new THREE.PointLight(0xbfe9ff, 0.28, 40); fill.position.set(0, 2, 8); scene.add(fill)
    const under = new THREE.DirectionalLight(0x2a4a55, 0.35); under.position.set(0, -6, 2); scene.add(under)

    const group = new THREE.Group(); group.rotation.x = 0.1; scene.add(group)

    const cuspGeo = new THREE.SphereGeometry(0.13, 16, 12)
    const geoByType = {}
    Object.keys(DIM).forEach(k => {
      const d = DIM[k]; geoByType[k] = crownGeo(d[0], d[1], d[2], d[3])
    })

    const flaggedSet = new Set(flaggedIds)
    const meshes = []
    const N = 14; const GAP = 0.16

    const enamel = (bad) => new THREE.MeshPhysicalMaterial({
      color: bad ? 0xff3838 : 0xe9e7db,
      roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.16,
      metalness: 0, envMapIntensity: 0.65,
      emissive: bad ? 0x5a0a0a : 0x000000,
    })

    const buildArch = (upper) => {
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1); const a = (t - 0.5) * 2.42
        const x = Math.sin(a) * 2.92; const z = Math.cos(a) * 2.28
        const type = toothType(i, N); const d = DIM[type]; const h = d[1]
        const id = (upper ? 'U' : 'L') + (i + 1)
        const bad = flaggedSet.has(id)
        const cy = upper ? (GAP + h / 2) : -(GAP + h / 2)

        const pivot = new THREE.Group()
        pivot.position.set(x, cy, z); pivot.rotation.y = -a

        const mat = enamel(bad)
        const mesh = new THREE.Mesh(geoByType[type], mat)
        mesh.rotation.x = upper ? Math.PI : 0
        pivot.add(mesh)

        if (type === 'molar' || type === 'premolar') {
          const n = type === 'molar' ? 4 : 2
          for (let c = 0; c < n; c++) {
            const cu = new THREE.Mesh(cuspGeo, mat)
            const col = (c % 2) ? 1 : -1; const row = (c < 2 || n === 2) ? 1 : -1
            cu.position.set(col * d[0] * 0.24, h / 2 * 0.78, (n === 2 ? 0 : row) * d[2] * 0.24)
            cu.scale.set(1, 0.6, 1)
            mesh.add(cu)
          }
        }

        mesh.userData = { id, bad, type, baseScale: [1, 1, 1] }
        meshes.push(mesh)
        group.add(pivot)
      }
    }
    buildArch(true); buildArch(false)

    // Gums
    const gumMat = new THREE.MeshStandardMaterial({ color: 0xc8707c, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.96 })
    ;[{ y: 0.95, up: 1 }, { y: -0.95, up: 0 }].forEach(o => {
      const tg = new THREE.Mesh(new THREE.TorusGeometry(2.92, 0.32, 16, 52, Math.PI * 1.5), gumMat)
      tg.position.set(0, o.y, 0.35); tg.rotation.x = Math.PI / 2
      tg.rotation.z = o.up ? -Math.PI * 0.25 : Math.PI * 1.25
      group.add(tg)
    })

    stateRef.current = { renderer, scene, cam, group, meshes, canvas }

    // Interaction
    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2()
    const tip = tipRef.current
    let drag = false, moved = 0, px = 0, py = 0, vel = 0, hover = null
    let dragged = false

    const setHover = (m) => {
      if (hover === m) return
      if (hover) {
        const b = hover.userData.baseScale
        gsap.to(hover.scale, { x: b[0], y: b[1], z: b[2], duration: 0.25 })
      }
      hover = m
      if (m) {
        const b = m.userData.baseScale
        gsap.to(m.scale, { x: b[0] * 1.14, y: b[1] * 1.14, z: b[2] * 1.14, duration: 0.25 })
      }
      canvas.style.cursor = m ? 'pointer' : 'grab'
    }

    const pick = (cx, cy) => {
      const rect = canvas.getBoundingClientRect()
      ndc.x = ((cx - rect.left) / rect.width) * 2 - 1
      ndc.y = -((cy - rect.top) / rect.height) * 2 + 1
      ray.setFromCamera(ndc, cam)
      return ray.intersectObjects(meshes)[0]
    }

    const onDown = (e) => {
      drag = true; moved = 0; dragged = false
      const c = e.touches ? e.touches[0] : e
      px = c.clientX; py = c.clientY
      canvas.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      const c = e.touches ? e.touches[0] : e
      if (drag) {
        const dx = c.clientX - px, dy = c.clientY - py
        moved += Math.abs(dx) + Math.abs(dy)
        if (moved > 6) dragged = true
        group.rotation.y += dx * 0.008
        group.rotation.x = Math.max(-0.5, Math.min(0.6, group.rotation.x + dy * 0.005))
        vel = dx * 0.008; px = c.clientX; py = c.clientY
      } else {
        const hit = pick(c.clientX, c.clientY)
        setHover(hit ? hit.object : null)
        if (hit && tip) {
          const rect = canvas.getBoundingClientRect()
          tip.style.left = (c.clientX - rect.left) + 'px'
          tip.style.top = (c.clientY - rect.top) + 'px'
          tip.style.opacity = '1'
          const ud = hit.object.userData
          tip.textContent = '#' + ud.id.slice(1) + (ud.id[0] === 'U' ? ' upper · ' : ' lower · ') + ud.type + (ud.bad ? ' · flagged' : '')
        } else if (tip) {
          tip.style.opacity = '0'
        }
      }
    }
    const onUp = (e) => {
      canvas.style.cursor = hover ? 'pointer' : 'grab'
      if (drag && moved < 6) {
        const c = e.changedTouches ? e.changedTouches[0] : e
        const hit = pick(c.clientX, c.clientY)
        if (hit) {
          const id = hit.object.userData.id
          const bad = !hit.object.userData.bad
          setMeshBad(id, bad)
          onToggle(id)
        }
      }
      drag = false
    }
    const onLeave = () => { if (tip) tip.style.opacity = '0'; setHover(null) }

    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('touchstart', onDown, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)

    let raf
    const loop = () => {
      if (!stateRef.current) return
      raf = requestAnimationFrame(loop)
      if (!drag) {
        if (dragged) { group.rotation.y += vel; vel *= 0.93 }
        else { group.rotation.y = Math.sin(performance.now() * 0.00033) * 0.3; group.rotation.x = 0.1 + Math.sin(performance.now() * 0.0005) * 0.04 }
      }
      renderer.render(scene, cam)
    }
    loop()

    const handleResize = () => {
      const ww = canvas.clientWidth || 560, hh = canvas.clientHeight || 360
      renderer.setSize(ww, hh, false)
      cam.aspect = ww / hh; cam.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('touchstart', onDown)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('resize', handleResize)
      try { renderer.dispose() } catch (e) {}
      stateRef.current = null
    }
  }, [])

  const nextShort = (patient.next.split('·')[1] || patient.next).trim()

  return (
    <div
      id="en-panel"
      style={{ position:'absolute',top:0,right:0,bottom:0,width:'640px',maxWidth:'92vw',zIndex:41,background:'linear-gradient(160deg,rgba(16,38,44,.92),rgba(6,16,21,.96))',backdropFilter:'blur(34px) saturate(150%)',WebkitBackdropFilter:'blur(34px) saturate(150%)',borderLeft:'1px solid color-mix(in srgb,var(--c1) 20%,transparent)',boxShadow:'-30px 0 80px rgba(0,0,0,.5)',overflowY:'auto' }}
    >
      {/* Header */}
      <div style={{ padding:'30px 34px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <div>
          <span style={{ fontSize:'10.5px',letterSpacing:'.18em',textTransform:'uppercase',color:'var(--c1)' }}>Tooth chart</span>
          <h2 style={{ fontFamily:"'Instrument Serif',serif",fontWeight:400,fontSize:'38px',margin:'8px 0 4px' }}>{patient.name}</h2>
          <div style={{ fontSize:'13.5px',color:'rgba(234,246,246,.6)' }}>{patient.age} yrs · {patient.faculty}</div>
        </div>
        <button
          onClick={onClose}
          style={{ width:'40px',height:'40px',borderRadius:'12px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.14)',color:'#fff',fontSize:'18px',cursor:'pointer',lineHeight:1,flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.16)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.08)'}
        >✕</button>
      </div>

      {/* 3D Canvas */}
      <div style={{ margin:'22px 24px 0',borderRadius:'20px',overflow:'hidden',background:'radial-gradient(120% 120% at 50% 0%,color-mix(in srgb,var(--c1) 12%,transparent),rgba(0,0,0,.3))',border:'1px solid rgba(255,255,255,.1)',position:'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ width:'100%',height:'360px',display:'block',cursor:'grab' }}
        />
        <div
          ref={tipRef}
          style={{ position:'absolute',left:0,top:0,pointerEvents:'none',opacity:0,transform:'translate(-50%,-135%)',padding:'6px 11px',borderRadius:'9px',background:'rgba(6,16,20,.92)',border:'1px solid color-mix(in srgb,var(--c1) 30%,transparent)',fontSize:'12px',whiteSpace:'nowrap',zIndex:6,transition:'opacity .15s',boxShadow:'0 6px 18px rgba(0,0,0,.4)' }}
        />
        <div style={{ position:'absolute',bottom:'12px',left:0,right:0,textAlign:'center',fontSize:'11.5px',letterSpacing:'.06em',color:'rgba(234,246,246,.55)',pointerEvents:'none' }}>
          Click a tooth to flag · drag to rotate
        </div>
      </div>

      {/* Stats + findings */}
      <div style={{ padding:'24px 34px' }}>
        <div style={{ display:'flex',gap:'14px',marginBottom:'24px' }}>
          <div style={{ flex:1,padding:'16px',borderRadius:'16px',background:'rgba(255,90,90,.1)',border:'1px solid rgba(255,90,90,.25)' }}>
            <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'34px',color:'#ff8f8f' }}>{String(flaggedIds.length).padStart(2,'0')}</div>
            <div style={{ fontSize:'12px',color:'rgba(255,180,180,.8)',marginTop:'2px' }}>Flagged teeth</div>
          </div>
          <div style={{ flex:1,padding:'16px',borderRadius:'16px',background:'color-mix(in srgb,var(--c1) 10%,transparent)',border:'1px solid color-mix(in srgb,var(--c1) 22%,transparent)' }}>
            <div style={{ fontFamily:"'Instrument Serif',serif",fontSize:'34px',color:'var(--c2)' }}>{nextShort}</div>
            <div style={{ fontSize:'12px',color:'var(--c1)',marginTop:'2px' }}>Next appointment</div>
          </div>
        </div>

        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px' }}>
          <div style={{ fontSize:'12px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--c1)' }}>Charted findings</div>
          <button
            onClick={handleClear}
            style={{ background:'transparent',border:'1px solid rgba(255,255,255,.16)',color:'rgba(234,246,246,.7)',fontFamily:'inherit',fontSize:'12px',padding:'6px 12px',borderRadius:'20px',cursor:'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.08)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >Clear all</button>
        </div>

        {flaggedTeeth.length > 0 ? (
          <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
            {flaggedTeeth.map(f => (
              <div key={f.id} style={{ display:'flex',alignItems:'center',gap:'14px',padding:'13px 16px',borderRadius:'14px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,90,90,.22)' }}>
                <span style={{ width:'9px',height:'9px',borderRadius:'50%',background:'#ff5a5a',boxShadow:'0 0 10px #ff5a5a',display:'inline-block',flexShrink:0 }} />
                <span style={{ fontFamily:"'Instrument Serif',serif",fontSize:'19px',width:'60px',flexShrink:0 }}>{f.tooth}</span>
                <span style={{ flex:1,fontSize:'14px',color:'rgba(234,246,246,.85)' }}>{f.label}</span>
                <span style={{ fontSize:'12px',color:'rgba(255,255,255,.4)' }}>{f.note}</span>
                <button
                  onClick={() => { setMeshBad(f.id, false); onToggle(f.id) }}
                  style={{ background:'transparent',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:'15px' }}
                  onMouseEnter={e => e.currentTarget.style.color='#fff'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,.4)'}
                >✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding:'26px',textAlign:'center',borderRadius:'16px',background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.14)',color:'rgba(234,246,246,.5)',fontSize:'14px' }}>
            No findings charted. Click any tooth to flag pathology.
          </div>
        )}
      </div>
    </div>
  )
}
