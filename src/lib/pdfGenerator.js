/**
 * PDF Generator utility for Quotes and Invoices
 * Uses jsPDF and jsPDF-autotable to output highly professional branded documents.
 */
export const generateDocumentPdf = async (documentData, logoPreview) => {
  const jsPDFModule = await import('jspdf');
  const JsPDF = jsPDFModule.default || jsPDFModule;
  await import('jspdf-autotable');

  const doc = new JsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const isQuote = documentData.type === 'quote';
  const primaryColor = documentData.primaryColor || '#6366f1';
  
  // Helper to parse hex colors to RGB arrays for autotable
  const hexToRgb = (hex) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
  };

  const primaryRgb = hexToRgb(primaryColor);

  // Add logo if available
  if (logoPreview) {
    try {
      doc.addImage(logoPreview, 'PNG', 14, 10, 30, 30);
    } catch (error) {
      console.warn('[PDF Generator] Failed to add logo', error);
    }
  }

  // Company header
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.setFont(undefined, 'bold');
  doc.text(documentData.companyName || 'Hustle Studio Workspace', logoPreview ? 50 : 14, 20);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  const companyAddress = documentData.companyAddress || '';
  const companyLines = companyAddress.split('\n').filter(Boolean);
  companyLines.forEach((line, i) => {
    doc.text(line, logoPreview ? 50 : 14, 26 + (i * 4));
  });
  
  const offset = 26 + (companyLines.length * 4);
  if (documentData.companyEmail) {
    doc.text(documentData.companyEmail, logoPreview ? 50 : 14, offset);
    if (documentData.companyPhone) {
      doc.text(documentData.companyPhone, logoPreview ? 50 : 14, offset + 4);
    }
  } else if (documentData.companyPhone) {
    doc.text(documentData.companyPhone, logoPreview ? 50 : 14, offset);
  }

  // Document title and identifier
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(primaryColor);
  const docTitle = isQuote ? 'QUOTE' : 'INVOICE';
  doc.text(docTitle, pageWidth - 14, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  const docNum = documentData.invoiceNumber || documentData.quoteNumber || '';
  doc.text(docNum, pageWidth - 14, 26, { align: 'right' });
  
  const createdDate = documentData.createdAt 
    ? new Date(documentData.createdAt).toLocaleDateString() 
    : new Date().toLocaleDateString();
  doc.text(`Date: ${createdDate}`, pageWidth - 14, 31, { align: 'right' });
  
  if (isQuote && documentData.validUntil) {
    const validUntilDate = new Date(documentData.validUntil).toLocaleDateString();
    doc.text(`Valid Until: ${validUntilDate}`, pageWidth - 14, 36, { align: 'right' });
  } else if (!isQuote && documentData.dueDate) {
    const dueDateVal = new Date(documentData.dueDate).toLocaleDateString();
    doc.text(`Due Date: ${dueDateVal}`, pageWidth - 14, 36, { align: 'right' });
  }

  // Divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, 48, pageWidth - 14, 48);

  // Client details
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.setFont(undefined, 'bold');
  doc.text(isQuote ? 'PREPARED FOR' : 'BILL TO', 14, 55);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(documentData.clientName || 'Valued Client', 14, 61);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  let clientY = 66;
  if (documentData.clientEmail) {
    doc.text(documentData.clientEmail, 14, clientY);
    clientY += 5;
  }
  if (documentData.clientAddress) {
    doc.text(documentData.clientAddress, 14, clientY);
  }

  // Table of Items
  const currency = documentData.currency || 'R';
  doc.autoTable({
    startY: 80,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: (documentData.lineItems || []).map((item) => [
      item.description,
      item.quantity,
      `${currency}${Number(item.price).toFixed(2)}`,
      `${currency}${(Number(item.quantity) * Number(item.price)).toFixed(2)}`,
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: primaryRgb,
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  });

  // Totals Section
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 14;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  doc.text(`Subtotal:`, totalsX - 50, finalY);
  doc.text(`${currency}${Number(documentData.subtotal || 0).toFixed(2)}`, totalsX, finalY, { align: 'right' });
  
  doc.text(`Tax (${documentData.taxRate || 0}%):`, totalsX - 50, finalY + 6);
  doc.text(`${currency}${Number(documentData.tax || 0).toFixed(2)}`, totalsX, finalY + 6, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Total:`, totalsX - 50, finalY + 14);
  doc.text(`${currency}${Number(documentData.total || 0).toFixed(2)}`, totalsX, finalY + 14, { align: 'right' });

  // Paid Badge / Payment details for Paid Invoices
  let paymentOffset = 0;
  if (!isQuote && documentData.paymentStatus === 'paid') {
    doc.saveState();
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.6);
    
    // Draw PAID border and text
    doc.roundedRect(14, finalY + 2, 35, 9, 1, 1, 'S');
    doc.text('PAID RECEIPT', 16, finalY + 8);
    doc.restoreState();

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    
    let payText = `Payment Mode: ${documentData.paymentMethod || 'N/A'}`;
    if (documentData.paymentDate) {
      payText += ` on ${new Date(documentData.paymentDate).toLocaleDateString()}`;
    }
    doc.text(payText, 14, finalY + 17);
    
    if (documentData.paymentReference) {
      doc.text(`Reference: ${documentData.paymentReference}`, 14, finalY + 22);
    }
    paymentOffset = 18;
  }

  // Terms and Notes Section
  const notesStr = documentData.notes || '';
  if (notesStr.trim()) {
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(isQuote ? 'Terms & Validity:' : 'Notes:', 14, finalY + 28 + paymentOffset);
    const splitNotes = doc.splitTextToSize(notesStr, pageWidth - 28);
    doc.text(splitNotes, 14, finalY + 33 + paymentOffset);
  }

  // Footer Message
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  const footerText = isQuote ? 'Thank you for considering our proposal!' : 'Thank you for your business!';
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });

  // Download trigger
  const filePrefix = isQuote ? 'quote' : 'invoice';
  const finalDocNum = docNum.replace(/\s+/g, '-');
  const clientNameSanitized = (documentData.clientName || 'client').replace(/\s+/g, '-').toLowerCase();
  doc.save(`${filePrefix}-${finalDocNum}-${clientNameSanitized}.pdf`);
};
