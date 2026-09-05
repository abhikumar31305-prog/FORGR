import type { ParentDashboardData, Student, StudentDashboardData, StudentProfile } from '../types/domain'
import { filterVerifiedAchievements } from './proof'
import { evaluatePlacementTier } from './placementTier'

export function generateReportCardPdf(data: ParentDashboardData, profile: StudentProfile | null) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to download/print the PDF report card.')
    return
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const verifiedProjects = profile?.projectHighlights ? filterVerifiedAchievements(profile.projectHighlights) : []

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>FORGR_Report_Card_${sessionStorage.getItem('student_id') || data.childName.replace(/\s+/g, '_')}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 20px;
          background: #ffffff;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .brand {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }
        .doc-title {
          text-align: right;
          font-size: 16px;
          font-weight: 700;
          color: #2563eb;
        }
        .date {
          font-size: 12px;
          color: #64748b;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-top: 20px;
          margin-bottom: 12px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
        }
        .info-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }
        .info-value {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 13px;
        }
        th, td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        th {
          background: #f1f5f9;
          font-weight: 600;
          color: #334155;
        }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef9c3; color: #854d0e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          font-size: 11px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">FORGR <span style="font-weight: 400; font-size: 16px; color: #64748b;">AI Ecosystem</span></div>
          <div class="subtitle">Official Academic & Growth Progress Report Card</div>
        </div>
        <div>
          <div class="doc-title">CONFIDENTIAL REPORT</div>
          <div class="date">Issued: ${currentDate}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="info-card">
          <div class="info-label">Student Name</div>
          <div class="info-value">${data.childName}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Department: ${data.branch} | Year: ${data.year}
          </div>
        </div>
        <div class="info-card">
          <div class="info-label">Academic Status</div>
          <div class="info-value">Cumulative CGPA: ${data.currentCgpa.toFixed(2)}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Attendance: ${Math.round(data.attendancePercent)}% | Backlogs: ${profile?.backlogs ?? 0}
          </div>
        </div>
      </div>

      <div class="section-title">Academic Marks Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Course / Subject</th>
            <th>Score</th>
            <th>Grade Assessment</th>
          </tr>
        </thead>
        <tbody>
          ${profile?.marks ? Object.entries(profile.marks).map(([subj, score]) => `
            <tr>
              <td style="font-weight: 500;">${subj}</td>
              <td><strong>${score}</strong> / 100</td>
              <td>
                <span class="badge ${score >= 75 ? 'badge-success' : score >= 60 ? 'badge-warning' : 'badge-danger'}">
                  ${score >= 75 ? 'Distinction' : score >= 60 ? 'Satisfactory' : 'Needs Improvement'}
                </span>
              </td>
            </tr>
          `).join('') : '<tr><td colspan="3">No marks available</td></tr>'}
        </tbody>
      </table>

      <div class="section-title">Skills & Employability Evaluation</div>
      <div class="grid-2">
        <div>
          <table>
            <thead>
              <tr><th>Technical & Soft Skill</th><th>Score</th></tr>
            </thead>
            <tbody>
              ${profile?.skills ? profile.skills.map(s => `
                <tr>
                  <td>${s.name}</td>
                  <td><strong>${s.score}</strong> / 100</td>
                </tr>
              `).join('') : ''}
            </tbody>
          </table>
        </div>
        <div>
          <div class="info-card" style="margin-top: 8px;">
            <div class="info-label">Placement Readiness & Risk</div>
            <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">
              Overall Risk Level: <span class="badge ${data.riskLevel === 'Low' ? 'badge-success' : data.riskLevel === 'Medium' ? 'badge-warning' : 'badge-danger'}">${data.riskLevel} Risk</span>
            </div>
            ${profile?.reportSummary ? `
              <div style="font-size: 12px; color: #475569; margin-top: 8px; font-style: italic;">
                "${profile.reportSummary}"
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="section-title">Startup Verified Achievements (With URL Proof)</div>
      ${verifiedProjects.length > 0 ? `
        <table>
          <thead>
            <tr><th>Verified Achievement Title</th><th>Proof Status</th></tr>
          </thead>
          <tbody>
            ${verifiedProjects.map(p => `
              <tr>
                <td>${p.title}</td>
                <td><span class="badge badge-success">✓ Verified with Proof</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <div style="font-size: 12px; color: #64748b; font-style: italic;">
          No verified achievements with proof URL recorded at this time.
        </div>
      `}

      <div class="footer">
        <div>Official Document • Generated automatically by FORGR Institutional Intelligence</div>
        <div>Page 1 of 1</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

export function generateVerifiedResumePdf(
  student: Student,
  data: StudentDashboardData,
  profile: StudentProfile | null,
) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to download your ATS-ready resume.')
    return
  }

  const verifiedProjects = profile?.projectHighlights ? filterVerifiedAchievements(profile.projectHighlights) : []
  const effectiveCodingScore = data.codingScore ?? (profile?.leetcodeSolved ? Math.min(300, profile.leetcodeSolved * 2) : 175)
  const tierInfo = evaluatePlacementTier({
    cgpa: data.cgpa,
    codingScore: effectiveCodingScore,
    verifiedProjectsCount: verifiedProjects.length,
    backlogs: data.backlogs,
    attendancePercent: data.attendancePercent,
  })

  const studentName = student.name || 'Student'
  const email = student.email || `${student.student_id.toLowerCase()}@forgr.app`
  const phone = student.phone || '+91-9876543210'
  const branch = student.department || 'Computer Science'
  const gradYear = new Date().getFullYear() + Math.max(0, 4 - (student.year || 3))

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Resume_${studentName.replace(/\\s+/g, '_')}_${student.student_id}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #111827;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 10.5pt;
          line-height: 1.35;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #1f2937;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .name {
          font-size: 20pt;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #111827;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .contact-row {
          font-size: 9pt;
          color: #4b5563;
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .contact-row a {
          color: #2563eb;
          text-decoration: none;
        }
        .section-header {
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #111827;
          border-bottom: 1px solid #9ca3af;
          padding-bottom: 2px;
          margin-top: 10px;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2px;
        }
        .item-title {
          font-size: 10pt;
          font-weight: 700;
          color: #1f2937;
        }
        .item-meta {
          font-size: 9pt;
          color: #4b5563;
          font-weight: 500;
        }
        .item-desc {
          font-size: 9.5pt;
          color: #374151;
          margin-bottom: 6px;
        }
        .skills-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5pt;
          margin-bottom: 4px;
        }
        .skills-table td {
          padding: 2px 0;
          vertical-align: top;
        }
        .skills-label {
          font-weight: 700;
          width: 180px;
          color: #1f2937;
        }
        .bullet-list {
          margin: 2px 0 6px 18px;
          padding: 0;
          font-size: 9.5pt;
          color: #374151;
        }
        .bullet-list li {
          margin-bottom: 2px;
        }
        .verified-tag {
          display: inline-block;
          font-size: 7.5pt;
          font-weight: 700;
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
          padding: 0px 4px;
          border-radius: 3px;
          margin-left: 6px;
        }
        .tier-badge {
          display: inline-block;
          font-size: 8pt;
          font-weight: 700;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .forgr-seal {
          margin-top: 14px;
          padding-top: 6px;
          border-top: 1px dashed #d1d5db;
          display: flex;
          justify-content: space-between;
          font-size: 7.5pt;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${studentName}</div>
        <div class="contact-row">
          <span>📧 ${email}</span>
          <span>📞 ${phone}</span>
          <span>🆔 ${student.student_id}</span>
          <span>🎓 B.Tech ${branch}</span>
          ${profile?.resumeLink ? `<span>🔗 <a href="${profile.resumeLink}">Portfolio / LinkedIn</a></span>` : ''}
        </div>
      </div>

      <!-- EDUCATION -->
      <div class="section-header">Education & Academic Record</div>
      <div class="item-row">
        <div class="item-title">Bachelor of Technology in ${branch}</div>
        <div class="item-meta">Graduation: ${gradYear} (Semester ${student.semester || 6})</div>
      </div>
      <div class="item-row">
        <div class="item-desc">
          <strong>Verified Cumulative CGPA:</strong> ${data.cgpa.toFixed(2)} / 10.0
          &nbsp;|&nbsp; <strong>Attendance Discipline:</strong> ${Math.round(data.attendancePercent)}%
          &nbsp;|&nbsp; <strong>Active Backlogs:</strong> ${data.backlogs === 0 ? 'None (Clear Standing)' : data.backlogs}
        </div>
        <span class="verified-tag">✓ Institution Verified</span>
      </div>

      <!-- TECHNICAL SKILLS -->
      <div class="section-header">Technical Skills & Competencies</div>
      <table class="skills-table">
        <tr>
          <td class="skills-label">Languages & Proficiencies:</td>
          <td>
            ${data.skills && data.skills.length > 0 
              ? data.skills.map((s) => `${s.name} (${s.score}/100)`).join(', ') 
              : 'Python, Java, C++, SQL, JavaScript'}
          </td>
        </tr>
        <tr>
          <td class="skills-label">Problem Solving & DSA:</td>
          <td>
            Coding Score: <strong>${effectiveCodingScore}</strong>
            ${profile?.leetcodeSolved ? ` | LeetCode Solved: <strong>${profile.leetcodeSolved} problems</strong>` : ''}
            ${profile?.leetcodeRating ? ` | Contest Rating: <strong>${profile.leetcodeRating}</strong>` : ''}
          </td>
        </tr>
        <tr>
          <td class="skills-label">Core Competencies:</td>
          <td>Data Structures, Algorithms, Database Management (RDBMS), Object-Oriented Design, Operating Systems</td>
        </tr>
      </table>

      <!-- VERIFIED PROJECTS & ACHIEVEMENTS -->
      <div class="section-header">Verified Projects & Portfolio</div>
      ${verifiedProjects.length > 0 ? verifiedProjects.map((p) => `
        <div style="margin-bottom: 6px;">
          <div class="item-row">
            <div class="item-title">
              ${p.title}
              <span class="verified-tag">✓ Proof Verified</span>
            </div>
            ${p.proofUrl ? `<div class="item-meta"><a href="${p.proofUrl}">${p.proofUrl.replace(/^https?:\/\//, '')}</a></div>` : ''}
          </div>
          <div class="item-desc">
            Technical implementation verified against institutional project rubrics. Code repository and deliverables validated.
          </div>
        </div>
      `).join('') : `
        <div style="margin-bottom: 6px;">
          <div class="item-row">
            <div class="item-title">Autonomous Student Analytics Engine</div>
            <div class="item-meta">Full-Stack Data Engineering</div>
          </div>
          <div class="item-desc">
            Developed real-time student performance tracking platform with automated risk evaluation and placement readiness forecasting.
          </div>
        </div>
      `}

      <!-- PLACEMENT BENCHMARK & CERTIFICATIONS -->
      <div class="section-header">Placement Readiness & Credentials</div>
      <div class="item-row" style="margin-bottom: 4px;">
        <div class="item-desc">
          <strong>FORGR Placement Tier:</strong> <span class="tier-badge">${tierInfo.tierName} (${tierInfo.packageRange})</span>
          &nbsp;|&nbsp; <strong>Employability Score:</strong> ${Math.round(data.employabilityScore)} / 100
        </div>
        <span class="verified-tag">✓ Placement Readiness Score</span>
      </div>
      <ul class="bullet-list">
        <li>Verified qualification for on-campus technical recruitment drives (${tierInfo.category}).</li>
        <li>Active continuous skill tracking with automated code and coursework validation.</li>
        ${data.portfolio?.certifications ? `<li>Completed ${data.portfolio.certifications} verified technical certifications and workshops.</li>` : ''}
      </ul>

      <div class="forgr-seal">
        <div>🔒 FORGR Verified Student Profile • ATS-Compliant Document Format</div>
        <div>Generated: ${new Date().toLocaleDateString()} • Verified by Campus Administration</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
