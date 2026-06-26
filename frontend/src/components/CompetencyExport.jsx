import { jsPDF } from 'jspdf'

const REQS = { Restorative:20, Periodontics:15, Endodontics:10, Prosthodontics:8, 'Oral Surgery':6, Orthodontics:5 }

export function exportCompetencyPDF(competency, userName, year) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const margin = 20
  let y = margin

  // ── Header ──
  doc.setFillColor(4, 33, 42)
  doc.rect(0, 0, W, 42, 'F')
  doc.setTextColor(123, 224, 214)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('ENAMEL CLINICAL STUDIO', margin, 14)
  doc.setTextColor(234, 246, 246)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Competency Portfolio', margin, 26)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 210)
  doc.text(`${userName || 'Student'} · DDS Candidate ${year || 'Y3'} · Generated ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, margin, 35)
  y = 56

  // ── Summary table ──
  doc.setTextColor(123, 224, 214)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPETENCY SUMMARY', margin, y)
  y += 6

  const colX = [margin, 90, 120, 150, 170]
  doc.setTextColor(150, 180, 180)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  ;['Category', 'Required', 'Completed', 'Remaining', 'Progress'].forEach((h, i) => doc.text(h, colX[i], y))
  y += 2
  doc.setDrawColor(50, 80, 90)
  doc.line(margin, y, W - margin, y)
  y += 5

  ;(competency.summary || []).forEach(s => {
    const remaining = Math.max(0, s.required - s.completed)
    const pct = Math.min(100, s.pct || 0)
    const complete = pct >= 100
    doc.setTextColor(complete ? 100 : 234, complete ? 200 : 200, complete ? 120 : 200)
    doc.setFont('helvetica', complete ? 'bold' : 'normal')
    doc.text(s.category, colX[0], y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 200, 200)
    doc.text(String(s.required), colX[1], y)
    doc.setTextColor(complete ? 100 : 234, complete ? 200 : 234, complete ? 120 : 180)
    doc.text(String(s.completed), colX[2], y)
    doc.setTextColor(remaining > 0 ? 220 : 100, remaining > 0 ? 150 : 200, remaining > 0 ? 100 : 120)
    doc.text(remaining > 0 ? String(remaining) : '✓', colX[3], y)
    // Mini progress bar
    doc.setFillColor(30, 60, 70)
    doc.roundedRect(colX[4], y - 3.5, 22, 4, 1, 1, 'F')
    doc.setFillColor(complete ? 100 : 123, complete ? 200 : 224, complete ? 120 : 214)
    doc.roundedRect(colX[4], y - 3.5, 22 * (pct / 100), 4, 1, 1, 'F')
    y += 8
    if (y > H - 40) { doc.addPage(); y = margin + 10 }
  })

  y += 6

  // ── Procedure log ──
  doc.setTextColor(123, 224, 214)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PROCEDURE LOG', margin, y)
  y += 6

  const logCols = [margin, 50, 110, 160]
  doc.setTextColor(150, 180, 180)
  doc.setFont('helvetica', 'normal')
  ;['Date', 'Procedure', 'Patient', 'Category'].forEach((h, i) => doc.text(h, logCols[i], y))
  y += 2
  doc.line(margin, y, W - margin, y)
  y += 5

  ;(competency.entries || []).forEach((e, idx) => {
    const shade = idx % 2 === 0
    if (shade) {
      doc.setFillColor(8, 25, 32)
      doc.rect(margin - 2, y - 4, W - margin * 2 + 4, 7, 'F')
    }
    doc.setTextColor(180, 200, 200)
    doc.setFontSize(7.5)
    doc.text(e.date_str || '', logCols[0], y)
    doc.text((e.procedure_name || '').substring(0, 28), logCols[1], y)
    doc.text((e.patient_name || '').substring(0, 22), logCols[2], y)
    doc.setTextColor(123, 200, 190)
    doc.text((e.category || '').split(' ')[0], logCols[3], y)
    y += 7
    if (y > H - 20) { doc.addPage(); y = margin + 10 }
  })

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(4, 33, 42)
    doc.rect(0, H - 12, W, 12, 'F')
    doc.setTextColor(80, 120, 130)
    doc.setFontSize(7)
    doc.text('Enamel Clinical Studio — Confidential student record', margin, H - 5)
    doc.text(`Page ${i} of ${pageCount}`, W - margin - 15, H - 5)
  }

  doc.save(`competency-portfolio-${(userName || 'student').toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
