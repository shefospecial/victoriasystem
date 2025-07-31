import React from 'react'
import './Receipt.css'

const Receipt = ({ invoiceData, storePhoneNumber, storeLogo }) => {
  if (!invoiceData) return null

  const handlePrint = () => {
  const receiptText = `
                    فيكتوريا ستور
                   01234567890
    ═══════════════════════════════════════
    التاريخ: ${new Date().toLocaleDateString('ar-EG')}
    الوقت: ${new Date().toLocaleTimeString('ar-EG')}
    رقم الفاتورة: ${invoiceData.invoiceNumber}
    ═══════════════════════════════════════
    المنتج              الكمية    السعر
    ───────────────────────────────────────
${invoiceData.items.map(item => 
    `${item.name.padEnd(20)} ${item.quantity.toString().padStart(3)} ${item.total.toFixed(2).padStart(8)}`
).join('\n')}
    ───────────────────────────────────────
    الإجمالي:                ${invoiceData.total.toFixed(2)} جنيه
    ═══════════════════════════════════════
                شكراً لزيارتكم!
              نتمنى لكم يوماً سعيداً
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>فاتورة البيع</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 10px;
          line-height: 1.2;
          color: black;
          background: white;
          margin: 0;
          padding: 5mm;
          white-space: pre;
        }
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body { font-size: 8px; padding: 2mm; }
        }
      </style>
    </head>
    <body>${receiptText}</body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 1000);
};

  return (
    <div>
      <div className="receipt-container">
        <div id="receipt-print-content">
          {/* Header */}
          <div className="center" style={{ marginBottom: '3mm' }}>
            <div className="bold" style={{ fontSize: '10px' }}>
              {invoiceData.storeName || 'فيكتوريا ستور'}
            </div>
            {storePhoneNumber && (
              <div style={{ fontSize: '7px', marginTop: '1mm' }}>
                {storePhoneNumber}
              </div>
            )}
          </div>

          {/* Invoice Info */}
          <div className="dashed-border">
            <div className="flex-row">
              <span>التاريخ:</span>
              <span>{new Date(invoiceData.date).toLocaleDateString('ar-EG')}</span>
            </div>
            <div className="flex-row">
              <span>الوقت:</span>
              <span>{new Date(invoiceData.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex-row">
              <span>رقم الفاتورة:</span>
              <span>{invoiceData.invoiceNumber}</span>
            </div>
            {invoiceData.customerName && (
              <div className="flex-row">
                <span>العميل:</span>
                <span style={{ fontSize: '7px' }}>
                  {invoiceData.customerName.length > 15 
                    ? invoiceData.customerName.substring(0, 15) + '...' 
                    : invoiceData.customerName}
                </span>
              </div>
            )}
          </div>

          {/* Items Header */}
          <div className="dashed-border">
            <div className="flex-row bold" style={{ marginBottom: '1mm' }}>
              <span style={{ width: '60%', textAlign: 'right' }}>المنتج</span>
              <span style={{ width: '15%', textAlign: 'center' }}>الكمية</span>
              <span style={{ width: '25%', textAlign: 'left' }}>السعر</span>
            </div>
            
            {/* Items */}
            {invoiceData.items.map((item, index) => (
              <div key={index} style={{ marginBottom: '1mm' }}>
                <div className="flex-row">
                  <span style={{ width: '60%', textAlign: 'right', fontSize: '7px' }}>
                    {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
                  </span>
                  <span style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ width: '25%', textAlign: 'left' }}>{item.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="dashed-border">
            <div className="flex-row bold" style={{ fontSize: '9px' }}>
              <span>الإجمالي:</span>
              <span>{invoiceData.total.toFixed(2)} جنيه</span>
            </div>
            {invoiceData.discount > 0 && (
              <div className="flex-row" style={{ fontSize: '7px' }}>
                <span>الخصم:</span>
                <span>-{invoiceData.discount.toFixed(2)} جنيه</span>
              </div>
            )}
            {invoiceData.tax > 0 && (
              <div className="flex-row" style={{ fontSize: '7px' }}>
                <span>الضريبة:</span>
                <span>{invoiceData.tax.toFixed(2)} جنيه</span>
              </div>
            )}
            {(invoiceData.discount > 0 || invoiceData.tax > 0) && (
              <div className="flex-row bold" style={{ fontSize: '9px', borderTop: '1px solid #000', paddingTop: '1mm', marginTop: '1mm' }}>
                <span>المبلغ النهائي:</span>
                <span>{(invoiceData.total - invoiceData.discount + invoiceData.tax).toFixed(2)} جنيه</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="dashed-border center">
            <div style={{ fontSize: '7px' }}>شكراً لزيارتكم!</div>
            <div style={{ fontSize: '6px', color: '#666', marginTop: '1mm' }}>
              نتمنى لكم يوماً سعيداً
            </div>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <button
          onClick={handlePrint}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          طباعة الفاتورة
        </button>
      </div>
    </div>
  )
}

export default Receipt

