const PDFDocument = require('pdfkit');

/**
 * Generate a GDPR Deletion/Anonymization Certificate PDF
 * @param {Object} cert - Certificate data from partner_admin_deletion_certificate
 * @param {string} partnerName - Partner brand name
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateCertificatePdf(cert, partnerName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: {
          Title: `GDPR Certificate - ${cert.certificate_code}`,
          Author: partnerName || 'Partner Admin',
          Subject: 'GDPR Compliance Certificate',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const isHardDelete = cert.deletion_type === 'hard_delete';
      const certTypeLabel = isHardDelete ? 'Data Deletion' : 'Data Anonymization';
      const accentColor = isHardDelete ? '#DC2626' : '#2563EB';

      // ── Header border ──
      doc.rect(doc.page.margins.left - 10, doc.page.margins.top - 10,
        pageWidth + 20, doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 20)
        .lineWidth(2).strokeColor(accentColor).stroke();

      // Inner border
      doc.rect(doc.page.margins.left - 5, doc.page.margins.top - 5,
        pageWidth + 10, doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 10)
        .lineWidth(0.5).strokeColor('#CBD5E1').stroke();

      let y = doc.page.margins.top + 10;

      // ── Partner Name ──
      doc.fontSize(11).fillColor('#64748B').font('Helvetica')
        .text(partnerName || 'Partner Admin', doc.page.margins.left, y, { align: 'center', width: pageWidth });
      y += 25;

      // ── Title ──
      doc.fontSize(22).fillColor(accentColor).font('Helvetica-Bold')
        .text('GDPR COMPLIANCE CERTIFICATE', doc.page.margins.left, y, { align: 'center', width: pageWidth });
      y += 35;

      // ── Certificate Type ──
      doc.fontSize(14).fillColor('#1E293B').font('Helvetica')
        .text(certTypeLabel, doc.page.margins.left, y, { align: 'center', width: pageWidth });
      y += 30;

      // ── Horizontal divider ──
      doc.moveTo(doc.page.margins.left + 40, y)
        .lineTo(doc.page.margins.left + pageWidth - 40, y)
        .lineWidth(1).strokeColor(accentColor).stroke();
      y += 25;

      // ── Certificate Code ──
      doc.fontSize(13).fillColor('#0F172A').font('Helvetica-Bold')
        .text(`Certificate No: ${cert.certificate_code}`, doc.page.margins.left, y, { align: 'center', width: pageWidth });
      y += 35;

      // ── Details Grid ──
      const labelX = doc.page.margins.left + 20;
      const valueX = doc.page.margins.left + 200;
      const lineHeight = 24;

      const details = [
        ['Certificate Type', certTypeLabel],
        ['Account Holder', cert.account_holder_name || 'N/A'],
        ['Account Email', cert.account_holder_email || 'N/A'],
        ['Account Code', cert.account_code || 'N/A'],
        ['Profile ID', cert.profile_id ? String(cert.profile_id) : 'N/A'],
        ['Reason Type', formatReasonType(cert.deletion_reason_type)],
        ['Performed By', cert.deleted_by || 'N/A'],
        ['Performed At', formatDate(cert.deleted_at)],
        ['Legal Basis', cert.legal_basis || 'GDPR Art. 17 - Right to Erasure'],
        ['Certificate Status', (cert.certificate_status || 'issued').toUpperCase()],
      ];

      for (const [label, value] of details) {
        doc.fontSize(10).fillColor('#64748B').font('Helvetica')
          .text(label, labelX, y);
        doc.fontSize(10).fillColor('#0F172A').font('Helvetica-Bold')
          .text(value, valueX, y, { width: pageWidth - 220 });
        y += lineHeight;
      }

      y += 10;

      // ── Reason Notes ──
      if (cert.deletion_reason_notes) {
        doc.moveTo(labelX, y).lineTo(labelX + pageWidth - 40, y)
          .lineWidth(0.5).strokeColor('#E2E8F0').stroke();
        y += 12;
        doc.fontSize(10).fillColor('#64748B').font('Helvetica')
          .text('Reason / Notes', labelX, y);
        y += 16;
        doc.fontSize(9).fillColor('#334155').font('Helvetica')
          .text(cert.deletion_reason_notes, labelX + 10, y, { width: pageWidth - 70 });
        y += doc.heightOfString(cert.deletion_reason_notes, { width: pageWidth - 70, fontSize: 9 }) + 15;
      }

      // ── Data Categories ──
      if (cert.data_categories) {
        doc.moveTo(labelX, y).lineTo(labelX + pageWidth - 40, y)
          .lineWidth(0.5).strokeColor('#E2E8F0').stroke();
        y += 12;
        doc.fontSize(10).fillColor('#64748B').font('Helvetica')
          .text('Data Categories Affected', labelX, y);
        y += 16;
        doc.fontSize(9).fillColor('#334155').font('Helvetica')
          .text(cert.data_categories, labelX + 10, y, { width: pageWidth - 70 });
        y += doc.heightOfString(cert.data_categories, { width: pageWidth - 70, fontSize: 9 }) + 15;
      }

      // ── Tables Deleted ──
      if (cert.tables_deleted) {
        doc.moveTo(labelX, y).lineTo(labelX + pageWidth - 40, y)
          .lineWidth(0.5).strokeColor('#E2E8F0').stroke();
        y += 12;
        doc.fontSize(10).fillColor('#64748B').font('Helvetica')
          .text('Tables / Records Affected', labelX, y);
        y += 16;
        doc.fontSize(8).fillColor('#475569').font('Helvetica')
          .text(cert.tables_deleted, labelX + 10, y, { width: pageWidth - 70 });
        y += doc.heightOfString(cert.tables_deleted, { width: pageWidth - 70, fontSize: 8 }) + 15;
      }

      // ── Compliance Statement ──
      const statementY = Math.max(y + 10, doc.page.height - doc.page.margins.bottom - 140);

      doc.moveTo(doc.page.margins.left + 20, statementY)
        .lineTo(doc.page.margins.left + pageWidth - 20, statementY)
        .lineWidth(1).strokeColor(accentColor).stroke();

      const statement = isHardDelete
        ? 'This certificate confirms that all personal data associated with the above account has been permanently and irreversibly deleted from all systems in compliance with the General Data Protection Regulation (GDPR) Article 17 — Right to Erasure.'
        : 'This certificate confirms that all personally identifiable information (PII) associated with the above account has been anonymized and is no longer attributable to any individual, in compliance with the General Data Protection Regulation (GDPR).';

      doc.fontSize(9).fillColor('#334155').font('Helvetica')
        .text(statement, doc.page.margins.left + 20, statementY + 12, {
          width: pageWidth - 40,
          align: 'justify',
        });

      // ── Footer ──
      const footerY = doc.page.height - doc.page.margins.bottom - 25;
      doc.fontSize(8).fillColor('#94A3B8').font('Helvetica')
        .text(
          `Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })} | ${partnerName || 'Partner Admin'} | Confidential`,
          doc.page.margins.left, footerY,
          { align: 'center', width: pageWidth }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function formatReasonType(type) {
  if (!type) return 'N/A';
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

module.exports = { generateCertificatePdf };
