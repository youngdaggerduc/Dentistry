import { useState, useEffect, useRef } from 'react'
import './App.css'

import { palettes, TONE } from './data.js'
import { api, setToken, clearToken } from './api.js'
import BgCanvas        from './components/BgCanvas.jsx'
import LoginScreen     from './components/LoginScreen.jsx'
import Sidebar         from './components/Sidebar.jsx'
import StudentView     from './components/StudentView.jsx'
import PatientDetail   from './components/PatientDetail.jsx'
import AddPatientModal from './components/AddPatientModal.jsx'
import NotificationPanel from './components/NotificationPanel.jsx'

export default function App() {
  const [screen,     setScreen]     = useState('login')
  const [user,       setUser]       = useState(null)
  const [paletteIdx, setPaletteIdx] = useState(0)

  // Core data
  const [patients,   setPatients]   = useState([])
  const [flaggedMap, setFlaggedMap] = useState({})
  const [todayAppts, setTodayAppts] = useState([])
  const [weekAppts,  setWeekAppts]  = useState([])
  const [allAppts,   setAllAppts]   = useState([])
  const [prospects,  setProspects]  = useState([])
  const [reminders,  setReminders]  = useState([])
  const [competency, setCompetency] = useState({ summary: [], entries: [] })

  // UI state
  const [selectedId,    setSelectedId]    = useState(null)
  const [addOpen,       setAddOpen]       = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [toast,         setToast]         = useState(null)
  const [activeSection, setActiveSection] = useState('overview')

  const palette  = palettes[paletteIdx]
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const orb1Ref  = useRef()
  const orb2Ref  = useRef()

  useEffect(() => {
    document.documentElement.style.setProperty('--c1', palette.c1)
    document.documentElement.style.setProperty('--c2', palette.c2)
    document.documentElement.style.setProperty('--c3', palette.c3)
  }, [palette])

  useEffect(() => {
    const onMove = (e) => {
      const nx = e.clientX / innerWidth
      const ny = e.clientY / innerHeight
      mouseRef.current = { x: nx, y: 1 - ny }
      if (orb1Ref.current) orb1Ref.current.style.transform = `translate(${(nx-.5)*34}px,${(ny-.5)*34}px)`
      if (orb2Ref.current) orb2Ref.current.style.transform = `translate(${(nx-.5)*22}px,${(ny-.5)*22}px)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    const onExpiry = () => { clearToken(); setScreen('login'); setUser(null) }
    window.addEventListener('auth:expired', onExpiry)
    return () => window.removeEventListener('auth:expired', onExpiry)
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [pts, today, week, all, prpts, rems, comp] = await Promise.all([
        api.patients.list(),
        api.appointments.today(),
        api.appointments.week(),
        api.appointments.list(),
        api.prospects.list(),
        api.reminders.list(),
        api.competency.get(),
      ])
      applyPatients(pts)
      setTodayAppts(today)
      setWeekAppts(week)
      setAllAppts(all)
      setProspects(prpts)
      setReminders(rems)
      setCompetency(comp)
    } catch (e) {
      setError('Could not load clinic data.')
    } finally {
      setLoading(false)
    }
  }

  function applyPatients(pts) {
    setPatients(pts.map((p, i) => ({ ...p, tone: TONE[i % TONE.length] })))
    setFlaggedMap(Object.fromEntries(pts.map(p => [p.id, (p.badTeeth || []).map(t => t.id || t)])))
  }

  function showToast(msg, duration = 2800) {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }

  const login = async (email, password) => {
    try {
      const { token, user: u } = await api.auth.login(email, password)
      setToken(token)
      setUser(u)
      setScreen('app')
      await loadAll()
    } catch {
      showToast('Invalid credentials')
    }
  }

  const logout = () => {
    clearToken()
    setUser(null)
    setSelectedId(null)
    setAddOpen(false)
    setNotifOpen(false)
    setScreen('login')
  }

  const toggleTooth = async (toothId) => {
    const isFlagged = (flaggedMap[selectedId] || []).includes(toothId)
    setFlaggedMap(prev => {
      const cur = (prev[selectedId] || []).slice()
      const i = cur.indexOf(toothId)
      if (i >= 0) cur.splice(i, 1); else cur.push(toothId)
      return { ...prev, [selectedId]: cur }
    })
    try {
      if (isFlagged) await api.patients.unflagTooth(selectedId, toothId)
      else           await api.patients.flagTooth(selectedId, toothId)
    } catch {
      setFlaggedMap(prev => {
        const cur = (prev[selectedId] || []).slice()
        if (isFlagged) { if (!cur.includes(toothId)) cur.push(toothId) }
        else { const i = cur.indexOf(toothId); if (i >= 0) cur.splice(i, 1) }
        return { ...prev, [selectedId]: cur }
      })
    }
  }

  const clearTeeth = async () => {
    const teeth = (flaggedMap[selectedId] || []).slice()
    setFlaggedMap(prev => ({ ...prev, [selectedId]: [] }))
    try {
      await Promise.all(teeth.map(t => api.patients.unflagTooth(selectedId, t)))
    } catch {
      setFlaggedMap(prev => ({ ...prev, [selectedId]: teeth }))
    }
  }

  const submitAdd = async (data) => {
    try {
      const p = await api.patients.create(data)
      const tone = TONE[Math.floor(Math.random() * TONE.length)]
      setPatients(prev => [{ ...p, tone }, ...prev])
      setFlaggedMap(prev => ({ ...prev, [p.id]: [] }))
      setAddOpen(false)
      showToast('Patient added')
    } catch {
      showToast('Failed to add patient')
    }
  }

  const updatePatient = async (id, data) => {
    try {
      const updated = await api.patients.update(id, data)
      setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updated, tone: p.tone } : p))
      showToast('Patient updated')
      return updated
    } catch {
      showToast('Failed to update patient')
    }
  }

  const deletePatient = async (id) => {
    try {
      await api.patients.delete(id)
      setPatients(prev => prev.filter(p => p.id !== id))
      setFlaggedMap(prev => { const m = { ...prev }; delete m[id]; return m })
      setSelectedId(null)
      showToast('Patient removed')
    } catch {
      showToast('Failed to remove patient')
    }
  }

  const createAppointment = async (data) => {
    try {
      const a = await api.appointments.create(data)
      setAllAppts(prev => [...prev, a])
      // Refresh today/week
      const [today, week] = await Promise.all([api.appointments.today(), api.appointments.week()])
      setTodayAppts(today)
      setWeekAppts(week)
      // Refresh patient to update "next" appointment display
      const updated = await api.patients.get(data.patient_id)
      setPatients(prev => prev.map(p => p.id === data.patient_id ? { ...p, ...updated } : p))
      showToast('Appointment booked')
      return a
    } catch {
      showToast('Failed to book appointment')
    }
  }

  const updateAppointment = async (id, data) => {
    try {
      const a = await api.appointments.update(id, data)
      setAllAppts(prev => prev.map(x => x.id === id ? a : x))
      const [today, week] = await Promise.all([api.appointments.today(), api.appointments.week()])
      setTodayAppts(today)
      setWeekAppts(week)
      showToast('Appointment updated')
      return a
    } catch {
      showToast('Failed to update appointment')
    }
  }

  const cancelAppointment = async (id) => {
    try {
      await api.appointments.setStatus(id, 'cancelled')
      setAllAppts(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
      const [today, week] = await Promise.all([api.appointments.today(), api.appointments.week()])
      setTodayAppts(today)
      setWeekAppts(week)
      showToast('Appointment cancelled')
    } catch {
      showToast('Failed to cancel appointment')
    }
  }

  const advanceProspect = async (id, stage) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, stage } : p))
    try {
      await api.prospects.stage(id, stage)
    } catch {
      // revert
      const orig = await api.prospects.list()
      setProspects(orig)
    }
  }

  const addProspect = async (data) => {
    try {
      const p = await api.prospects.create(data)
      setProspects(prev => [...prev, p])
      showToast('Prospect added')
    } catch {
      showToast('Failed to add prospect')
    }
  }

  const dismissReminder = async (id) => {
    setReminders(prev => prev.filter(r => r.id !== id))
    try { await api.reminders.dismiss(id) } catch {}
  }

  const scrollTo = (sectionId) => {
    setActiveSection(sectionId)
    const el = document.getElementById(sectionId)
    const sc = document.getElementById('en-scroller')
    if (el && sc) sc.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' })
  }

  const nav = [
    { num:'01', label:'Overview',    id:'overview'   },
    { num:'02', label:'Patients',    id:'patients'   },
    { num:'03', label:'Calendar',    id:'calendar'   },
    { num:'04', label:'Prospects',   id:'prospects'  },
    { num:'05', label:'Competency',  id:'competency' },
    { num:'06', label:'Reminders',   id:'reminders'  },
  ]

  const selectedPatient = patients.find(p => p.id === selectedId)
  const pendingReminders = reminders.filter(r => !r.dismissed)

  return (
    <div id="en-root" style={{ position:'fixed',inset:0,overflow:'hidden',fontFamily:"'Space Grotesk',system-ui,sans-serif",color:'#eaf6f6',background:'radial-gradient(120% 90% at 80% 10%,#0a2128 0%,#061117 45%,#03080b 100%)' }}>
      <BgCanvas palette={palette} mouseRef={mouseRef} />
      <div style={{ position:'absolute',inset:0,zIndex:1,pointerEvents:'none',background:'radial-gradient(120% 120% at 50% -10%,transparent 55%,rgba(0,0,0,.55) 100%)',mixBlendMode:'multiply' }} />
      <div ref={orb1Ref} style={{ position:'absolute',top:'-120px',right:'-80px',width:'520px',height:'520px',borderRadius:'50%',zIndex:1,pointerEvents:'none',background:'radial-gradient(circle,color-mix(in srgb,var(--c1) 22%,transparent),transparent 65%)',filter:'blur(20px)',animation:'enFloat 11s ease-in-out infinite' }} />
      <div ref={orb2Ref} style={{ position:'absolute',bottom:'-160px',left:'18%',width:'460px',height:'460px',borderRadius:'50%',zIndex:1,pointerEvents:'none',background:'radial-gradient(circle,color-mix(in srgb,var(--c3) 30%,transparent),transparent 65%)',filter:'blur(20px)',animation:'enFloat 14s ease-in-out infinite reverse' }} />

      {screen === 'login' && (
        <LoginScreen
          paletteIdx={paletteIdx}
          setPaletteIdx={setPaletteIdx}
          palettes={palettes}
          onLogin={login}
        />
      )}

      {screen === 'app' && (
        <div style={{ position:'relative',zIndex:2,display:'flex',height:'100%' }}>
          <Sidebar
            user={user}
            palettes={palettes}
            paletteIdx={paletteIdx}
            setPaletteIdx={setPaletteIdx}
            nav={nav}
            active={activeSection}
            scrollTo={scrollTo}
            onOpenAdd={() => setAddOpen(true)}
            onLogout={logout}
            onBell={() => setNotifOpen(v => !v)}
            reminderCount={pendingReminders.length}
          />

          <main id="en-scroller" style={{ flex:1,overflowY:'auto',overflowX:'hidden',position:'relative' }}>
            {loading && (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:'16px' }}>
                <div style={{ width:'40px',height:'40px',borderRadius:'50%',border:'3px solid rgba(255,255,255,.1)',borderTopColor:'var(--c1)',animation:'enSpin 0.8s linear infinite' }} />
                <span style={{ fontSize:'13px',color:'rgba(255,255,255,.4)' }}>Loading clinic data…</span>
              </div>
            )}
            {error && !loading && (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%' }}>
                <div style={{ padding:'28px 36px',borderRadius:'20px',background:'rgba(255,60,60,.08)',border:'1px solid rgba(255,60,60,.2)',maxWidth:'420px',textAlign:'center' }}>
                  <div style={{ fontSize:'15px',color:'#ff9b9b',marginBottom:'8px' }}>Connection error</div>
                  <div style={{ fontSize:'13px',color:'rgba(255,255,255,.5)' }}>{error}</div>
                  <button onClick={loadAll} style={{ marginTop:'16px',padding:'9px 20px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.2)',background:'transparent',color:'var(--c1)',cursor:'pointer',fontSize:'13px',fontFamily:'inherit' }}>Retry</button>
                </div>
              </div>
            )}
            {!loading && !error && (
              <StudentView
                user={user}
                patients={patients}
                flaggedMap={flaggedMap}
                todayAppts={todayAppts}
                weekAppts={weekAppts}
                allAppts={allAppts}
                prospects={prospects}
                reminders={pendingReminders}
                competency={competency}
                onOpenPatient={(id) => setSelectedId(id)}
                onAdvanceProspect={advanceProspect}
                onAddProspect={addProspect}
                onCreateAppointment={createAppointment}
                onUpdateAppointment={updateAppointment}
                onCancelAppointment={cancelAppointment}
                onDismissReminder={dismissReminder}
                onScrollTo={scrollTo}
                showToast={showToast}
                reloadCompetency={async () => { const c = await api.competency.get(); setCompetency(c) }}
              />
            )}
          </main>
        </div>
      )}

      {selectedId && selectedPatient && (
        <>
          <div onClick={() => setSelectedId(null)} style={{ position:'absolute',inset:0,zIndex:40,background:'rgba(2,8,11,.55)',backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)' }} />
          <PatientDetail
            key={selectedId}
            patient={selectedPatient}
            flaggedIds={flaggedMap[selectedId] || []}
            onToggle={toggleTooth}
            onClear={clearTeeth}
            onClose={() => setSelectedId(null)}
            onUpdate={updatePatient}
            onDelete={deletePatient}
            onCreateAppointment={createAppointment}
            onUpdateAppointment={updateAppointment}
            onCancelAppointment={cancelAppointment}
            allAppts={allAppts.filter(a => a.patient_id === selectedId)}
            showToast={showToast}
          />
        </>
      )}

      {addOpen && (
        <>
          <div onClick={() => setAddOpen(false)} style={{ position:'absolute',inset:0,zIndex:42,background:'rgba(2,8,11,.55)',backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)' }} />
          <AddPatientModal onClose={() => setAddOpen(false)} onSubmit={submitAdd} />
        </>
      )}

      {notifOpen && (
        <>
          <div onClick={() => setNotifOpen(false)} style={{ position:'absolute',inset:0,zIndex:44,background:'rgba(2,8,11,.4)',backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)' }} />
          <NotificationPanel
            reminders={pendingReminders}
            onDismiss={dismissReminder}
            onClose={() => setNotifOpen(false)}
          />
        </>
      )}

      {toast && (
        <div style={{ position:'fixed',bottom:'28px',left:'50%',transform:'translateX(-50%)',zIndex:99,padding:'10px 22px',borderRadius:'20px',background:'rgba(10,30,38,.92)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.15)',fontSize:'13.5px',color:'var(--c2)',boxShadow:'0 8px 30px rgba(0,0,0,.5)',pointerEvents:'none',whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
