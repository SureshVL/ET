import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInvoicePDF = (order: any) => {
  const doc = new jsPDF() as any;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(139, 69, 19); // Brand color (approx)
  doc.text('Devaragudi', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Premium Ethnic Threads from Haridwar', 105, 28, { align: 'center' });
  doc.text('Devbhumi Uttarakhand, India', 105, 34, { align: 'center' });

  // Invoice Info
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('INVOICE', 20, 50);
  
  doc.setFontSize(10);
  doc.text(`Order ID: #${order.id.toUpperCase()}`, 20, 60);
  doc.text(`Date: ${order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}`, 20, 66);
  doc.text(`Payment Status: ${order.paymentStatus?.toUpperCase() || 'PAID'}`, 20, 72);

  // Shipping Address
  doc.setFontSize(12);
  doc.text('Shipping Address:', 120, 50);
  doc.setFontSize(10);
  const splitAddress = doc.splitTextToSize(order.shippingAddress || 'N/A', 70);
  doc.text(splitAddress, 120, 58);

  // Table
  const tableData = order.items.map((item: any) => [
    item.name + (item.size ? ` (${item.size})` : ''),
    item.quantity,
    `INR ${item.price.toLocaleString()}`,
    `INR ${(item.price * item.quantity).toLocaleString()}`
  ]);

  doc.autoTable({
    startY: 90,
    head: [['Product', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [139, 69, 19] },
    margin: { top: 90 }
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text(`Total Amount: INR ${order.totalAmount.toLocaleString()}`, 190, finalY, { align: 'right' });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('Thank you for shopping with Devaragudi!', 105, 280, { align: 'center' });
  doc.text('For support, contact: support@devaragudi.com', 105, 286, { align: 'center' });

  return doc;
};

export const downloadInvoice = (order: any) => {
  const doc = generateInvoicePDF(order);
  doc.save(`invoice-${order.id.slice(-6).toUpperCase()}.pdf`);
};
