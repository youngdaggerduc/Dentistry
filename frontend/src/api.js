const BASE = '/api'

let _token = null

export function setToken(t) { _token = t }
export function getToken()  { return _token }
export function clearToken() { _token = null }

async function req(method, path, body) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) { clearToken(); window.dispatchEvent(new Event('auth:expired')); throw new Error('401') }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

async function upload(path, formData) {
  const headers = {}
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  const res = await fetch(BASE + path, { method: 'POST', headers, body: formData })
  if (res.status === 401) { clearToken(); window.dispatchEvent(new Event('auth:expired')); throw new Error('401') }
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  auth: {
    login: (email, password) => req('POST', '/auth/login', { email, password }),
    me:    ()                 => req('GET',  '/auth/me'),
  },
  patients: {
    list:        ()              => req('GET',    '/patients'),
    get:         (id)            => req('GET',    `/patients/${id}`),
    create:      (data)          => req('POST',   '/patients', data),
    update:      (id, data)      => req('PUT',    `/patients/${id}`, data),
    delete:      (id)            => req('DELETE', `/patients/${id}`),
    flagTooth:   (id, toothId)                => req('POST',   `/patients/${id}/teeth/${toothId}`),
    unflagTooth: (id, toothId)                => req('DELETE', `/patients/${id}/teeth/${toothId}`),
    updateTooth: (id, toothId, note, severity) => req('PATCH',  `/patients/${id}/teeth/${toothId}?note=${encodeURIComponent(note)}&severity=${encodeURIComponent(severity)}`),
  },
  appointments: {
    list:      ()        => req('GET',   '/appointments'),
    today:     ()        => req('GET',   '/appointments/today'),
    week:      ()        => req('GET',   '/appointments/week'),
    create:    (data)    => req('POST',  '/appointments', data),
    update:    (id, data)=> req('PUT',   `/appointments/${id}`, data),
    setStatus: (id, s)   => req('PATCH', `/appointments/${id}/status?status=${encodeURIComponent(s)}`),
    reminderText: (id, channel='sms') => req('GET', `/appointments/${id}/reminder-text?channel=${channel}`),
    delete:    (id)      => req('DELETE',`/appointments/${id}`),
  },
  visits: {
    list:   (patientId)      => req('GET',  `/patients/${patientId}/visits`),
    create: (data)           => req('POST', '/visits', data),
    get:    (id)             => req('GET',  `/visits/${id}`),
    note:   (visitId, data)  => req('PUT',  `/visits/${visitId}/note`, data),
    selfEval: (id, data)     => req('PATCH', `/visits/${id}/self-eval`, data),
    delete: (id)             => req('DELETE',`/visits/${id}`),
  },
  plans: {
    list:       (patientId)         => req('GET',    `/patients/${patientId}/plans`),
    create:     (data)              => req('POST',   '/plans', data),
    update:     (id, data)          => req('PUT',    `/plans/${id}`, data),
    addStep:    (planId, data)      => req('POST',   `/plans/${planId}/steps`, data),
    updateStep: (planId, stepId, s) => req('PATCH',  `/plans/${planId}/steps/${stepId}?status=${encodeURIComponent(s)}`),
    editStep:   (planId, stepId, d) => req('PUT',    `/plans/${planId}/steps/${stepId}`, d),
    deleteStep: (planId, stepId)    => req('DELETE', `/plans/${planId}/steps/${stepId}`),
    delete:     (id)                => req('DELETE', `/plans/${id}`),
  },
  reminders: {
    list:    ()   => req('GET',   '/reminders'),
    create:  (d)  => req('POST',  '/reminders', d),
    dismiss: (id) => req('PATCH', `/reminders/${id}/dismiss`),
    delete:  (id) => req('DELETE',`/reminders/${id}`),
  },
  competency: {
    get:    ()   => req('GET',   '/competency'),
    add:    (d)  => req('POST',  '/competency', d),
    delete: (id) => req('DELETE',`/competency/${id}`),
  },
  prospects: {
    list:   ()           => req('GET',   '/prospects'),
    create: (d)          => req('POST',  '/prospects', d),
    update: (id, d)      => req('PUT',   `/prospects/${id}`, d),
    stage:  (id, stage)  => req('PATCH', `/prospects/${id}/stage?stage=${encodeURIComponent(stage)}`),
    delete: (id)         => req('DELETE',`/prospects/${id}`),
  },
  perio: {
    list:       (patientId)        => req('GET',    `/patients/${patientId}/perio`),
    createExam: (data)             => req('POST',   '/perio', data),
    saveTooth:  (examId, data)     => req('PUT',    `/perio/${examId}/tooth`, data),
    deleteExam: (examId)           => req('DELETE', `/perio/${examId}`),
  },
  images: {
    list:   (patientId)            => req('GET',    `/patients/${patientId}/images`),
    upload: (patientId, formData)  => upload(`/patients/${patientId}/images`, formData),
    delete: (imageId)              => req('DELETE', `/images/${imageId}`),
  },
  ai: {
    soap:         (visitId, data)  => req('POST', `/ai/visits/${visitId}/soap`, data),
    differential: (data)           => req('POST', '/ai/differential', data),
  },
  search: (q) => req('GET', `/search?q=${encodeURIComponent(q)}`),
  analytics: () => req('GET', '/analytics'),
  seed: () => req('POST', '/seed'),
}
