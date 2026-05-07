'use strict';

const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const puppeteer = require('puppeteer');
const payslipTemplateService = require('../payroll/payslipTemplate.service');

/**
 * Service to generate PDF payslips matching the Statement Preview design
 * Premium enterprise payslip with modern styling rendered via Puppeteer
 */
class PDFGeneratorService {
    constructor() {
        this.browser = null;
    }

    /**
     * Launch or reuse a puppeteer browser instance
     */
    async _getBrowser() {
        if (!this.browser || !this.browser.connected) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-zygote',
                    '--single-process',
                    '--font-render-hinting=none'
                ]
            });
        }
        return this.browser;
    }

    /**
     * Renders payroll data to a PDF buffer using Puppeteer
     */
    async _renderHtmlToPdf(payroll, settings = {}, customHtml = null) {
        const browser = await this._getBrowser();
        const page = await browser.newPage();
        
        try {
            let html = '';
            if (customHtml) {
                html = customHtml;
            } else {
                // Determine which template to use
                const template = await payslipTemplateService.getDefaultTemplate(payroll.companyId);
                const templateData = payslipTemplateService.prepareDataForTemplate(payroll, settings);
                html = payslipTemplateService.renderTemplate(template.htmlContent, templateData, template.backgroundImageUrl);
            }
            
            // Set content and wait for basic load to ensure core structure is ready
            await page.setContent(html, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });

            // Add global print-specific tweaks if needed
            await page.addStyleTag({
                content: `
                    @page { size: A4; margin: 0; }
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        background-color: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .payslip-container {
                        margin: 0 !important;
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        max-width: none !important;
                        width: 100% !important;
                        min-height: 297mm; /* Full A4 height */
                    }
                    .no-print { display: none !important; }
                `
            });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' },
                preferCSSPageSize: true
            });

            return pdfBuffer;
        } finally {
            await page.close();
        }
    }
    /**
     * Generates a premium payslip PDF matching the Statement Preview component
     * @param {Object} res - Express response object
     * @param {Object} payroll - Processed payroll data
     */
    async generatePayslip(res, payroll, settings = {}) {
        try {
            const pdfBuffer = await this._renderHtmlToPdf(payroll, settings);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Content-Disposition', `attachment; filename="Payslip-${payroll.employeeInfo.employeeId}-${payroll.month}-${payroll.year}.pdf"`);
            
            return res.send(pdfBuffer);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            if (!res.headersSent) {
                res.status(500).json({ status: 'error', message: 'Failed to generate PDF' });
            }
        }
    }

    /**
     * Generates payslip as buffer for email attachments
     * @param {Object} payroll - Processed payroll data
     * @returns {Promise<Buffer>}
     */
    async generatePayslipBuffer(payroll, settings = {}) {
        return this._renderHtmlToPdf(payroll, settings);
    }

    /**
     * Cleanup browser on process exit
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Generates a premium enterprise workforce report using PDFKit (Robust Version)
     */
    async generateEnterpriseWorkforceReport(res, data, options) {
        return new Promise((resolve, reject) => {
            const { stats, projectData, employeeData, complianceStats } = data;
            const { from, to, now } = options;

            const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
            const colors = {
                primary: '#4f46e5', success: '#22c55e', warning: '#f59e0b',
                danger: '#ef4444', textMain: '#0f172a', textMuted: '#64748b',
                bg: '#f8fafc', border: '#e2e8f0'
            };

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Enterprise-Report-${format(now, 'yyyyMMdd')}.pdf"`);
            
            doc.pipe(res);
            res.on('error', (err) => {
                console.error('Streaming error:', err);
                reject(err);
            });
            doc.on('end', resolve);

            // --- Header ---
            doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('Project & Department Breakdown', 40, 50);
            
            const rangeStr = `${format(from, 'dd MMM yyyy')} - ${format(to || now, 'dd MMM yyyy')}`;
            doc.fontSize(12).font('Helvetica').text(rangeStr, 40, 85);

            // --- Meta ---
            doc.fillColor(colors.textMuted).fontSize(8).text(`Generated: ${format(now, 'dd MMM yyyy HH:mm')}`, 40, 130);
            doc.text('CALTIMS Enterprise Intelligence', 40, 142);

            // --- KPI Cards ---
            const cardWidth = (doc.page.width - 110) / 4;
            const cardY = 165;
            
            const drawCard = (x, label, value) => {
                doc.rect(x, cardY, cardWidth, 70).fill('#eff6ff');
                doc.rect(x, cardY, 4, 70).fill(colors.primary);
                doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(18).text(value, x + 15, cardY + 15);
                doc.fillColor(colors.textMuted).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), x + 15, cardY + 45);
            };

            const complianceRate = complianceStats.total > 0 ? ((complianceStats.approved / complianceStats.total) * 100).toFixed(0) : 0;
            drawCard(40, 'Total Hours', stats.totalHours.toLocaleString());
            drawCard(40 + cardWidth + 10, 'Employees', stats.uniqueEmployees.length.toString());
            drawCard(40 + (cardWidth + 10) * 2, 'Timesheets', stats.totalTimesheets.toString());
            drawCard(40 + (cardWidth + 10) * 3, 'Compliance', `${complianceRate}%`);

            // --- Compliance Bar ---
            doc.fillColor(colors.textMain).font('Helvetica-Bold').fontSize(12).text('Compliance Overview', 40, 260);
            const barY = 285;
            const barWidth = doc.page.width - 80;
            const barHeight = 15;
            
            doc.rect(40, barY, barWidth, barHeight).fill('#e2e8f0');
            
            const getWidth = (count) => (count / (complianceStats.total || 1)) * barWidth;
            let currentX = 40;
            
            if (complianceStats.approved > 0) {
                const w = getWidth(complianceStats.approved);
                doc.rect(currentX, barY, w, barHeight).fill(colors.success);
                currentX += w;
            }
            if (complianceStats.submitted > 0) {
                const w = getWidth(complianceStats.submitted);
                doc.rect(currentX, barY, w, barHeight).fill(colors.warning);
                currentX += w;
            }
            if (complianceStats.rejected > 0) {
                const w = getWidth(complianceStats.rejected);
                doc.rect(currentX, barY, w, barHeight).fill(colors.danger);
                currentX += w;
            }

            // Legend (Matching user image exactly)
            doc.fontSize(7).font('Helvetica-Bold');
            doc.fillColor(colors.success).rect(40, 310, 8, 8).fill();
            doc.fillColor(colors.textMain).text(`Approved ${complianceStats.approved} (${((complianceStats.approved / complianceStats.total * 100) || 0).toFixed(0)}%)`, 52, 311);
            
            doc.fillColor('#4f46e5').rect(130, 310, 8, 8).fill();
            doc.fillColor(colors.textMain).text(`Admin Resol. ${complianceStats.admin_filled || 0} (${((complianceStats.admin_filled / complianceStats.total * 100) || 0).toFixed(0)}%)`, 142, 311);
            
            doc.fillColor(colors.warning).rect(240, 310, 8, 8).fill();
            doc.fillColor(colors.textMain).text(`Submitted ${complianceStats.submitted} (${((complianceStats.submitted / complianceStats.total * 100) || 0).toFixed(0)}%)`, 252, 311);

            doc.fillColor(colors.textMuted).rect(350, 310, 8, 8).fill();
            doc.fillColor(colors.textMain).text(`Draft ${complianceStats.draft} (${((complianceStats.draft / complianceStats.total * 100) || 0).toFixed(0)}%)`, 362, 311);

            doc.fillColor(colors.danger).rect(460, 310, 8, 8).fill();
            doc.fillColor(colors.textMain).text(`Rejected ${complianceStats.rejected} (${((complianceStats.rejected / complianceStats.total * 100) || 0).toFixed(0)}%)`, 472, 311);

            // --- Top Contributors Table ---
            doc.fillColor(colors.textMain).font('Helvetica-Bold').fontSize(12).text('Top Employee Contributors', 40, 345);
            
            const tableTop = 370;
            const drawRow = (y, data, isHeader = false) => {
                if (isHeader) {
                    doc.rect(40, y, doc.page.width - 80, 20).fill(colors.primary);
                    doc.fillColor('#ffffff');
                } else {
                    doc.fillColor(colors.textMain);
                    doc.rect(40, y + 19, doc.page.width - 80, 1).fill(colors.border);
                }
                doc.fontSize(9).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
                doc.text(data[0], 50, y + 5);
                doc.text(data[1], 180, y + 5);
                doc.text(data[2], 350, y + 5);
                doc.text(data[3], 480, y + 5, { align: 'right', width: 60 });
            };

            drawRow(tableTop, ['Employee Name', 'Emp. ID', 'Department', 'Hours'], true);
            let rowY = tableTop + 20;
            const contributors = employeeData.slice(0, 5);
            contributors.forEach(emp => {
                drawRow(rowY, [
                    emp.user?.name || 'Unknown',
                    emp.user?.employeeId || '-',
                    emp.user?.department || '-',
                    `${(emp.totalHours || 0).toFixed(1)}h`
                ]);
                rowY += 20;
            });

            // --- Departmental Contribution (The Second Image/Chart) ---
            const deptTop = rowY + 30;
            doc.fillColor(colors.textMain).font('Helvetica-Bold').fontSize(12).text('Departmental Contribution', 40, deptTop);
            
            let dRowY = deptTop + 25;
            const deptList = data.deptStats || [];
            const totalHours = stats.totalHours || 1;
            
            deptList.slice(0, 5).forEach(dept => {
                const perc = (dept.totalHours / totalHours * 100);
                doc.fillColor(colors.textMain).font('Helvetica-Bold').fontSize(9).text(dept._id || 'Unassigned', 40, dRowY);
                
                // Draw bar
                const barWidthMax = 200;
                doc.rect(150, dRowY - 2, barWidthMax, 10).fill('#f1f5f9');
                doc.rect(150, dRowY - 2, (perc / 100) * barWidthMax, 10).fill(colors.primary);
                
                doc.fillColor(colors.textMuted).fontSize(8).text(`${perc.toFixed(1)}%`, 360, dRowY);
                doc.fillColor(colors.textMain).font('Helvetica-Bold').text(`${dept.totalHours.toFixed(1)}h`, 420, dRowY, { align: 'right', width: 100 });
                
                dRowY += 20;
            });

            // --- Project Utilization Table ---
            const projTableTop = dRowY + 30;
            if (projTableTop > doc.page.height - 100) doc.addPage();
            
            doc.fillColor(colors.textMain).font('Helvetica-Bold').fontSize(12).text('Project Utilization', 40, projTableTop);
            
            const pHeaderY = projTableTop + 20;
            drawRow(pHeaderY, ['Project Name', 'Code', 'Budget', 'Logged'], true);
            let pRowY = pHeaderY + 20;
            projectData.slice(0, 5).forEach(proj => {
                const budget = proj.project?.budgetHours || 0;
                drawRow(pRowY, [
                    proj.project?.name || 'Unknown',
                    proj.project?.code || '-',
                    budget > 0 ? `${budget}h` : '—',
                    `${(proj.totalHours || 0).toFixed(1)}h`
                ]);
                pRowY += 20;
            });

            this._addPageFooter(doc, 1, 1, colors, 'System Generated Enterprise Report');
            doc.end();
        });
    }

    /**
     * Page footer helper
     */
    _addPageFooter(doc, current, total, colors, extra = 'CALTIMS Enterprise Intelligence') {
        const pageHeight = doc.page.height;
        doc.moveTo(50, pageHeight - 60).lineTo(550, pageHeight - 60).strokeColor(colors.border).lineWidth(1).stroke();
        doc.fillColor(colors.textMuted).font('Helvetica').fontSize(8);
        doc.text(extra, 50, pageHeight - 45);
        doc.text(`Page ${current} of ${total}`, 50, pageHeight - 45, { align: 'right', width: 500 });
    }
}

module.exports = new PDFGeneratorService();