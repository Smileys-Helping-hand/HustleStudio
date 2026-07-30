/**
 * PDF Generator utility for Quotes and Invoices
 * Uses jsPDF and jsPDF-autotable to output highly professional branded documents.
 */
export const generateDocumentPdf = async (documentData, logoPreview) => {
  try {
    const jsPDFModule = await import('jspdf');
    const JsPDF = jsPDFModule.default || jsPDFModule;
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default || autoTableModule;

    const doc = new JsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const isQuote = documentData.type === 'quote';
    const primaryColor = documentData.primaryColor || '#8b5cf6';
    
    // Helper to parse hex colors to RGB arrays for autotable
    const hexToRgb = (hex) => {
      if (!hex || typeof hex !== 'string') return [139, 92, 246];
      const cleanHex = hex.replace('#', '');
      if (cleanHex.length !== 6) return [139, 92, 246];
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return [isNaN(r) ? 139 : r, isNaN(g) ? 92 : g, isNaN(b) ? 246 : b];
    };

    const primaryRgb = hexToRgb(primaryColor);

    // Header Accent Line
    if (doc.setFillColor) {
      doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.rect(0, 0, pageWidth, 4, 'F');
    }

    // Add logo if available
    let hasLogo = false;
    if (logoPreview && typeof logoPreview === 'string') {
      try {
        const format = logoPreview.includes('png') ? 'PNG' : logoPreview.includes('jpeg') || logoPreview.includes('jpg') ? 'JPEG' : 'PNG';
        doc.addImage(logoPreview, format, 14, 10, 28, 28);
        hasLogo = true;
      } catch (error) {
        console.warn('[PDF Generator] Could not insert image logo, continuing with text brand header:', error);
      }
    }

    const brandX = hasLogo ? 48 : 14;

    // Company header
    doc.setFontSize(18);
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.setFont(undefined, 'bold');
    doc.text(documentData.companyName || 'Hustle Studio Workspace', brandX, 16);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(90, 90, 90);
    
    let currentHeaderY = 22;
    const companyAddress = documentData.companyAddress || '';
    const companyLines = companyAddress.split('\n').filter(Boolean);
    companyLines.forEach((line) => {
      doc.text(line, brandX, currentHeaderY);
      currentHeaderY += 4;
    });
    
    if (documentData.companyEmail) {
      doc.text(documentData.companyEmail, brandX, currentHeaderY);
      currentHeaderY += 4;
    }
    if (documentData.companyPhone) {
      doc.text(documentData.companyPhone, brandX, currentHeaderY);
      currentHeaderY += 4;
    }

    // Document title and identifier
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    const docTitle = isQuote ? 'QUOTE' : 'INVOICE';
    doc.text(docTitle, pageWidth - 14, 18, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    const docNum = documentData.quoteNumber || documentData.invoiceNumber || documentData.id || `DOC-${Date.now().toString().slice(-6)}`;
    doc.text(docNum, pageWidth - 14, 25, { align: 'right' });
    
    const createdDate = documentData.createdAt 
      ? (documentData.createdAt instanceof Date ? documentData.createdAt : new Date(documentData.createdAt)).toLocaleDateString() 
      : new Date().toLocaleDateString();
    doc.text(`Date: ${createdDate}`, pageWidth - 14, 30, { align: 'right' });
    
    if (isQuote && documentData.validUntil) {
      const validUntilDate = (documentData.validUntil instanceof Date ? documentData.validUntil : new Date(documentData.validUntil)).toLocaleDateString();
      doc.text(`Valid Until: ${validUntilDate}`, pageWidth - 14, 35, { align: 'right' });
    } else if (!isQuote && documentData.dueDate) {
      const dueDateVal = (documentData.dueDate instanceof Date ? documentData.dueDate : new Date(documentData.dueDate)).toLocaleDateString();
      doc.text(`Due Date: ${dueDateVal}`, pageWidth - 14, 35, { align: 'right' });
    }

    // Divider line
    const dividerY = Math.max(currentHeaderY + 2, 42);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, dividerY, pageWidth - 14, dividerY);

    // Client details
    let clientY = dividerY + 7;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont(undefined, 'bold');
    doc.text(isQuote ? 'PREPARED FOR' : 'BILL TO', 14, clientY);
    
    clientY += 6;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(documentData.clientName || 'Valued Client', 14, clientY);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    clientY += 5;
    
    if (documentData.clientEmail) {
      doc.text(documentData.clientEmail, 14, clientY);
      clientY += 4.5;
    }
    if (documentData.clientAddress) {
      const addrLines = documentData.clientAddress.split('\n').filter(Boolean);
      addrLines.forEach((line) => {
        doc.text(line, 14, clientY);
        clientY += 4.5;
      });
    }

    // Draw Project Scope / Notes above the table if provided
    let tableStartY = clientY + 4;
    const notesStr = documentData.notes || '';
    if (notesStr.trim()) {
      const headerY = clientY + 4;
      const bodyY = clientY + 9;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(isQuote ? 'PROJECT SCOPE / TERMS' : 'PROJECT DETAILS & NOTES', 14, headerY);
      
      const splitNotes = doc.splitTextToSize(notesStr, pageWidth - 36);
      const notesHeight = splitNotes.length * 4.2;
      
      // Draw a premium light slate panel background
      if (doc.saveGraphicsState) doc.saveGraphicsState();
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, bodyY, pageWidth - 28, notesHeight + 6, 1.5, 1.5, 'F');
      
      // Draw brand accent left border
      doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.rect(14, bodyY, 1.5, notesHeight + 6, 'F');
      if (doc.restoreGraphicsState) doc.restoreGraphicsState();
      
      // Write text inside callout box
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(splitNotes, 18, bodyY + 5);
      
      tableStartY = bodyY + notesHeight + 10;
    }

    // Table of Items
    const currency = documentData.currency || 'R';
    const rawLineItems = Array.isArray(documentData.lineItems) ? documentData.lineItems : [];
    
    autoTable(doc, {
      startY: tableStartY,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: rawLineItems.map((item) => [
        item.description || 'Service/Item',
        item.quantity || 1,
        `${currency}${Number(item.price || 0).toFixed(2)}`,
        `${currency}${(Number(item.quantity || 1) * Number(item.price || 0)).toFixed(2)}`,
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: primaryRgb,
        textColor: 255,
        fontSize: 9.5,
        fontStyle: 'bold',
        cellPadding: 4,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });

    // Totals Section
    let finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : tableStartY + 30) + 8;
    
    // Check if totals section exceeds page height
    if (finalY + 45 > pageHeight) {
      doc.addPage();
      finalY = 20;
    }

    const totalsX = pageWidth - 14;
    
    // Calculate subtotal and tax if not explicitly provided
    const calculatedSubtotal = rawLineItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );
    const subtotal = documentData.subtotal !== undefined ? Number(documentData.subtotal) : calculatedSubtotal;
    const taxRate = Number(documentData.taxRate || 0);
    const vatRate = Number(documentData.vatRate || 0);
    const activeTaxRate = taxRate || vatRate;
    const showTax = (documentData.includeTax || documentData.vat !== undefined) && activeTaxRate > 0;
    const tax = documentData.tax !== undefined ? Number(documentData.tax) : (documentData.vat !== undefined ? Number(documentData.vat) : (showTax ? (subtotal * activeTaxRate) / 100 : 0));
    const total = documentData.total !== undefined ? Number(documentData.total) : (subtotal + tax);

    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139); // slate-500
    
    let currentY = finalY;
    doc.text(`Subtotal:`, totalsX - 55, currentY);
    doc.text(`${currency}${subtotal.toFixed(2)}`, totalsX, currentY, { align: 'right' });
    
    if (showTax) {
      currentY += 5.5;
      doc.text(`VAT / Tax (${activeTaxRate}%):`, totalsX - 55, currentY);
      doc.text(`${currency}${tax.toFixed(2)}`, totalsX, currentY, { align: 'right' });
    }

    currentY += 7;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(totalsX - 60, currentY - 3, totalsX, currentY - 3);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Total:`, totalsX - 55, currentY + 2);
    doc.text(`${currency}${total.toFixed(2)}`, totalsX, currentY + 2, { align: 'right' });

    // Paid Badge / Payment details for Paid Invoices
    if (!isQuote && documentData.paymentStatus === 'paid') {
      if (doc.saveGraphicsState) doc.saveGraphicsState();
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.6);
      
      doc.roundedRect(14, finalY, 32, 8, 1, 1, 'S');
      doc.text('PAID', 22, finalY + 5.5, { align: 'center' });
      if (doc.restoreGraphicsState) doc.restoreGraphicsState();

      doc.setFontSize(8.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(71, 85, 105);
      
      let payText = `Payment Method: ${documentData.paymentMethod || 'EFT / Card'}`;
      if (documentData.paymentDate) {
        payText += ` on ${new Date(documentData.paymentDate).toLocaleDateString()}`;
      }
      doc.text(payText, 14, finalY + 13);
    }

    // Add Page Numbers & Footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Bottom border line
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.4);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(148, 163, 184);
      const footerMsg = isQuote ? 'Thank you for considering our proposal!' : 'Thank you for your business!';
      doc.text(footerMsg, 14, pageHeight - 8);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    }

    // Download trigger with fallback
    const filePrefix = isQuote ? 'quote' : 'invoice';
    const sanitizedDocNum = docNum.toString().replace(/[^a-zA-Z0-9_-]/g, '-');
    const clientNameSanitized = (documentData.clientName || 'client').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const fileName = `${filePrefix}-${sanitizedDocNum}-${clientNameSanitized}.pdf`;

    try {
      doc.save(fileName);
    } catch (saveErr) {
      console.warn('[PDF Generator] doc.save failed, falling back to Blob download:', saveErr);
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }
  } catch (err) {
    console.error('[PDF Generator] Critical PDF generation error:', err);
    throw err;
  }
};
