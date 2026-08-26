import type { ParentDashboardData, StudentProfile } from '../types/domain'
import { filterVerifiedAchievements } from './proof'

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
