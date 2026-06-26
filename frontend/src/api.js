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
    flagTooth:   (id, toothId)   => req('POST',   `/patients/${id}/teeth/${toothId}`),
    unflagTooth: (id, toothId)   => req('DELETE', `/patients/${id}/teeth/${toothId}`),
  },
  appointments: {
    list:      ()        => req('GET',   '/appointments'),
    today:     ()        => req('GET',   '/appointments/today'),
    week:      ()        => req('GET',   '/appointments/week'),
    create:    (data)    => req('POST',  '/appointments', data),
    update:    (id, data)=> req('PUT',   `/appointments/${id}`, data),
    setStatus: (id, s)   => req('PATCH', `/appointments/${id}/status?status=${encodeURIComponent(s)}`),
    delete:    (id)      => req('DELETE',`/appointments/${id}`),
  },
  visits: {
    list:   (patientId)      => req('GET',  `/patients/${patientId}/visits`),
    create: (data)           => req('POST', '/visits', data),
    get:    (id)             => req('GET',  `/visits/${id}`),
    note:   (visitId, data)  => req('PUT',  `/visits/${visitId}/note`, data),
    delete: (id)             => req('DELETE',`/visits/${id}`),
  },
  plans: {
    list:       (patientId)         => req('GET',    `/patients/${patientId}/plans`),
    create:     (data)              => req('POST',   '/plans', data),
    update:     (id, data)          => req('PUT',    `/plans/${id}`, data),
    addStep:    (planId, data)      => req('POST',   `/plans/${planId}/steps`, data),
    updateStep: (planId, stepId, s) => req('PATCH',  `/plans/${planId}/steps/${stepId}?status=${encodeURIComponent(s)}`),
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
  seed: () => req('POST', '/seed'),
}
