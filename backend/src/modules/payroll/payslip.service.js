'use strict';

/**
 * payslip.service.js
 *
 * PDF generation using PDFKit (via pdfGenerator.service).
 * Works reliably on all platforms including Windows.
 */

const { prisma } = require('../../config/database');
const pdfGeneratorService = require('../reports/pdfGenerator.service');
const payslipTemplateService = require('./payslipTemplate.service');

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate PDF buffer from a payroll ID (used by the download endpoint).
 */
exports.generatePayslipPdf = async (payrollId, organizationId) => {
    const payroll = await prisma.processedPayroll.findUnique({
        where: { id: payrollId },
        include: { employee: { include: { user: true } } }
    });
    if (!payroll) throw new Error('Processed Payroll not found');

    const orgSettings = await prisma.orgSettings.findUnique({ where: { organizationId: organizationId || payroll.organizationId } });
    const settings = orgSettings ? orgSettings.data : {};

    // 1. Get the template
    let template;
    if (payroll.payslipTemplateId) {
        template = await prisma.payslipTemplate.findUnique({ where: { id: payroll.payslipTemplateId } });
    }
    if (!template) {
        template = await payslipTemplateService.getDefaultTemplate(payroll.organizationId);
    }

    // 2. Determine HTML and Background
    let templateHtml = template?.htmlContent;
    if (template?.layoutType) {
        templateHtml = payslipTemplateService.getHtmlForLayout(template.layoutType);
    }
    if (!templateHtml) {
        // Fallback to default
        templateHtml = payslipTemplateService.getHtmlForLayout();
    }

    // 3. Render HTML
    const templateData = payslipTemplateService.prepareDataForTemplate(payroll, settings);
    const html = payslipTemplateService.renderTemplate(templateHtml, templateData, template?.backgroundImageUrl);

    // 3. Generate PDF from HTML
    return pdfGeneratorService.generatePayslipBuffer(payroll, settings, html);
};

/**
 * Generate PDF buffer directly from a payroll object (used by the email service).
 */
exports.generatePayslipBuffer = async (payroll, organizationId) => {
    const orgSettings = await prisma.orgSettings.findUnique({ where: { organizationId: organizationId || payroll.organizationId } });
    const settings = orgSettings ? orgSettings.data : {};

    let template;
    if (payroll.payslipTemplateId) {
        template = await prisma.payslipTemplate.findUnique({ where: { id: payroll.payslipTemplateId } });
    }
    if (!template) {
        template = await payslipTemplateService.getDefaultTemplate(payroll.organizationId);
    }

    let templateHtml = template?.htmlContent;
    if (template?.layoutType) {
        templateHtml = payslipTemplateService.getHtmlForLayout(template.layoutType);
    }
    if (!templateHtml) {
        templateHtml = payslipTemplateService.getHtmlForLayout();
    }

    const templateData = payslipTemplateService.prepareDataForTemplate(payroll, settings);
    const html = payslipTemplateService.renderTemplate(templateHtml, templateData, template?.backgroundImageUrl);

    return pdfGeneratorService.generatePayslipBuffer(payroll, settings, html);
};

/**
 * Internal helper for unified HTML generation.
 * (Keeping it for backward compatibility if needed, though we primarily use PDFKit now)
 */
exports._generateHtmlInternal = (payroll, settings) => {
    const { getEnterprisePayslipHtml } = require('./payslip.template');
    return getEnterprisePayslipHtml(payroll, settings);
};
