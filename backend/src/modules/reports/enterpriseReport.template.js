'use strict';

/**
 * Modern HTML template for the Enterprise Workforce Report
 * Rendered via Puppeteer for high-fidelity PDF output
 */
const getEnterpriseReportTemplate = (data, options) => {
    const { stats, projectData, leaveData, weeklyTrend, employeeData, deptStats, complianceStats } = data;
    const { from, to, now } = options;

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const dateRange = `${formatDate(from)} — ${formatDate(to || now)}`;
    const generatedAt = new Date(now).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const complianceRate = complianceStats.total > 0 
        ? ((complianceStats.approved / complianceStats.total) * 100).toFixed(0) 
        : 0;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --primary: #4f46e5;
            --primary-light: #e0e7ff;
            --success: #22c55e;
            --warning: #f59e0b;
            --danger: #ef4444;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --bg: #f8fafc;
            --surface: #ffffff;
            --border: #e2e8f0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.5;
            padding: 0;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            background: white;
            position: relative;
        }

        header {
            background-color: var(--primary);
            color: white;
            padding: 30px 40px;
            margin: -20mm -20mm 40px -20mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header-title h1 {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.025em;
        }

        .header-date {
            font-size: 14px;
            font-weight: 500;
            opacity: 0.9;
        }

        .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 12px;
            color: var(--text-muted);
            border-bottom: 1px solid var(--border);
            padding-bottom: 10px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: var(--surface);
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid var(--primary);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            background: linear-gradient(to right, #eff6ff, white);
        }

        .stat-value {
            font-size: 32px;
            font-weight: 800;
            color: var(--primary);
            margin-bottom: 4px;
        }

        .stat-label {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .section-header {
            margin-bottom: 20px;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .section-header h2 {
            font-size: 18px;
            font-weight: 800;
            color: var(--text-main);
        }

        .compliance-bar {
            height: 12px;
            background: #e2e8f0;
            border-radius: 999px;
            display: flex;
            overflow: hidden;
            margin-bottom: 15px;
        }

        .compliance-segment { height: 100%; }

        .legend {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 30px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
        }

        .dot { width: 12px; height: 12px; border-radius: 3px; }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }

        th {
            background-color: var(--primary);
            color: white;
            text-align: left;
            padding: 12px 15px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }

        td {
            padding: 12px 15px;
            font-size: 13px;
            border-bottom: 1px solid var(--border);
        }

        tr:nth-child(even) { background-color: #f8fafc; }

        .footer {
            position: absolute;
            bottom: 20mm;
            left: 20mm;
            right: 20mm;
            border-top: 1px solid var(--border);
            padding-top: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: var(--text-muted);
        }

        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .text-primary { color: var(--primary); }

        @media print {
            .page { margin: 0; border: none; box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="page">
        <header>
            <div class="header-title">
                <h1>Project & Department Breakdown</h1>
            </div>
            <div class="header-date">
                ${dateRange}
            </div>
        </header>

        <div class="meta-row">
            <div>Generated: ${generatedAt}</div>
            <div>CALTIMS Enterprise Intelligence</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalHours.toLocaleString()}</div>
                <div class="stat-label">Total Hours</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.uniqueEmployees.length}</div>
                <div class="stat-label">Employees</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalTimesheets}</div>
                <div class="stat-label">Timesheets</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${complianceRate}%</div>
                <div class="stat-label">Compliance Rate</div>
            </div>
        </div>

        <div class="section-header">
            <h2>Compliance Overview</h2>
        </div>
        
        <div class="compliance-bar">
            <div class="compliance-segment" style="width: ${(complianceStats.approved / complianceStats.total * 100) || 0}%; background-color: var(--success);"></div>
            <div class="compliance-segment" style="width: ${(complianceStats.submitted / complianceStats.total * 100) || 0}%; background-color: var(--warning);"></div>
            <div class="compliance-segment" style="width: ${(complianceStats.rejected / complianceStats.total * 100) || 0}%; background-color: var(--danger);"></div>
            <div class="compliance-segment" style="width: ${(complianceStats.draft / complianceStats.total * 100) || 0}%; background-color: var(--text-muted);"></div>
        </div>

        <div class="legend">
            <div class="legend-item"><div class="dot" style="background-color: var(--success);"></div> Approved ${complianceStats.approved} (${((complianceStats.approved / complianceStats.total * 100) || 0).toFixed(0)}%)</div>
            <div class="legend-item"><div class="dot" style="background-color: var(--warning);"></div> Submitted ${complianceStats.submitted} (${((complianceStats.submitted / complianceStats.total * 100) || 0).toFixed(0)}%)</div>
            <div class="legend-item"><div class="dot" style="background-color: var(--danger);"></div> Rejected ${complianceStats.rejected} (${((complianceStats.rejected / complianceStats.total * 100) || 0).toFixed(0)}%)</div>
            <div class="legend-item"><div class="dot" style="background-color: var(--text-muted);"></div> Draft ${complianceStats.draft} (${((complianceStats.draft / complianceStats.total * 100) || 0).toFixed(0)}%)</div>
        </div>

        <div class="section-header">
            <h2>Top Employee Contributors</h2>
        </div>
        <table>
            <thead>
                <tr>
                    <th width="50">#</th>
                    <th>Employee</th>
                    <th>Emp. ID</th>
                    <th>Department</th>
                    <th class="text-right">Hours</th>
                </tr>
            </thead>
            <tbody>
                ${employeeData.map((emp, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td class="font-bold">${emp.user?.name || 'Unknown'}</td>
                        <td>${emp.user?.employeeId || '-'}</td>
                        <td>${emp.user?.department || '-'}</td>
                        <td class="text-right font-bold text-primary">${emp.totalHours.toFixed(1)} hrs</td>
                    </tr>
                `).join('')}
                ${employeeData.length === 0 ? '<tr><td colspan="5" style="text-align:center">No data available for this period</td></tr>' : ''}
            </tbody>
        </table>

        <div class="section-header">
            <h2>Project Utilization</h2>
        </div>
        <table>
            <thead>
                <tr>
                    <th width="50">#</th>
                    <th>Project</th>
                    <th>Code</th>
                    <th class="text-right">Budget</th>
                    <th class="text-right">Logged</th>
                    <th class="text-right">Util %</th>
                </tr>
            </thead>
            <tbody>
                ${projectData.map((proj, index) => {
                    const budget = proj.project?.budgetHours || 0;
                    const util = budget > 0 ? (proj.totalHours / budget * 100).toFixed(1) : '-';
                    return `
                        <tr>
                            <td>${index + 1}</td>
                            <td class="font-bold">${proj.project?.name || 'Unknown'}</td>
                            <td>${proj.project?.code || '-'}</td>
                            <td class="text-right">${budget > 0 ? budget + 'h' : '—'}</td>
                            <td class="text-right font-bold">${proj.totalHours.toFixed(1)}h</td>
                            <td class="text-right">${util}${util !== '-' ? '%' : ''}</td>
                        </tr>
                    `;
                }).join('')}
                ${projectData.length === 0 ? '<tr><td colspan="6" style="text-align:center">No data available for this period</td></tr>' : ''}
            </tbody>
        </table>

        <div class="footer">
            <div>CALTIMS Enterprise Intelligence · Confidential</div>
            <div>Page 1 of 1</div>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = { getEnterpriseReportTemplate };
