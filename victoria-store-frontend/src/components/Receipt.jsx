import React, { forwardRef, useImperativeHandle } from 'react'

const Receipt = forwardRef(({ invoiceData, storePhoneNumber, storeLogo }, ref) => {
  if (!invoiceData) return null

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
      return;
    }
    
    // Prepare the receipt content
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>فاتورة البيع</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: black;
            background: white;
            margin: 0;
            padding: 10px;
            direction: rtl;
            text-align: center;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .store-phone {
            font-size: 10px;
            margin-bottom: 5px;
          }
          .invoice-info {
            margin: 10px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: 10px;
          }
          .items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            border-bottom: 1px solid #000;
            padding: 3px 0;
            margin: 5px 0;
            font-size: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: 9px;
          }
          .total-section {
            margin-top: 10px;
            border-top: 2px solid #000;
            padding-top: 5px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 12px;
            margin: 3px 0;
          }
          .footer {
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 5px;
            text-align: center;
            font-size: 9px;
          }
          @media print {
            @page { 
              size: 58mm auto; 
              margin: 0; 
            }
            body { 
              font-size: 10px; 
              padding: 5px; 
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${invoiceData.storeName || 'فيكتوريا ستور'}</div>
          ${storePhoneNumber ? `<div class="store-phone">${storePhoneNumber}</div>` : ''}
        </div>

        <div class="invoice-info">
          <div class="info-row">
            <span>التاريخ:</span>
            <span>${new Date(invoiceData.created_at || invoiceData.date).toLocaleDateString('ar-EG')}</span>
          </div>
          <div class="info-row">
            <span>الوقت:</span>
            <span>${new Date(invoiceData.created_at || invoiceData.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="info-row">
            <span>رقم الفاتورة:</span>
            <span>${invoiceData.invoice_number || invoiceData.invoiceNumber}</span>
          </div>
          ${invoiceData.customerName ? `
          <div class="info-row">
            <span>العميل:</span>
            <span>${invoiceData.customerName.length > 15 ? invoiceData.customerName.substring(0, 15) + '...' : invoiceData.customerName}</span>
          </div>
          ` : ''}
        </div>

        <div class="items-header">
          <span style="width: 50%; text-align: right;">المنتج</span>
          <span style="width: 20%; text-align: center;">الكمية</span>
          <span style="width: 30%; text-align: left;">السعر</span>
        </div>

        ${invoiceData.items.map(item => `
          <div class="item-row">
            <span style="width: 50%; text-align: right;">${(item.product_name || item.name).length > 15 ? (item.product_name || item.name).substring(0, 15) + '...' : (item.product_name || item.name)}</span>
            <span style="width: 20%; text-align: center;">${item.quantity}</span>
            <span style="width: 30%; text-align: left;">${((item.unit_price || item.selling_price || item.price) * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}

        <div class="total-section">
          <div class="total-row">
            <span>الإجمالي:</span>
            <span>${(invoiceData.total_amount || invoiceData.total).toFixed(2)} جنيه</span>
          </div>
          ${invoiceData.discount && invoiceData.discount > 0 ? `
          <div class="total-row" style="font-size: 10px;">
            <span>الخصم:</span>
            <span>-${invoiceData.discount.toFixed(2)} جنيه</span>
          </div>
          ` : ''}
          ${invoiceData.tax && invoiceData.tax > 0 ? `
          <div class="total-row" style="font-size: 10px;">
            <span>الضريبة:</span>
            <span>${invoiceData.tax.toFixed(2)} جنيه</span>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <div>شكراً لزيارتكم!</div>
          <div style="margin-top: 3px;">نتمنى لكم يوماً سعيداً</div>
        </div>
      </body>
      </html>
    `;
    
    try {
      // Write content to the new window
      printWindow.document.open();
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      
      // Multiple approaches to ensure printing works
      const doPrint = () => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.error('Print error:', error);
        }
      };
      
      // Try immediate print
      setTimeout(doPrint, 100);
      
      // Backup print attempts
      setTimeout(doPrint, 500);
      setTimeout(doPrint, 1000);
      
      // Handle onload event
      printWindow.onload = doPrint;
      
      // Handle after print to close window
      printWindow.onafterprint = () => {
        setTimeout(() => {
          printWindow.close();
        }, 100);
      };
      
      // Fallback close after 5 seconds
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.close();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Print window error:', error);
      printWindow.close();
      
      // Fallback: Direct print using current window
      const originalContent = document.body.innerHTML;
      const originalTitle = document.title;
      
      // Add print styles to head
      const printStyles = document.createElement('style');
      printStyles.innerHTML = `
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body { font-size: 10px; padding: 5px; font-family: 'Courier New', monospace; }
          * { color: black !important; background: white !important; }
        }
      `;
      document.head.appendChild(printStyles);
      
      // Replace body content
      document.body.innerHTML = receiptContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];
      document.title = 'فاتورة البيع';
      
      // Print
      window.print();
      
      // Restore original content
      setTimeout(() => {
        document.body.innerHTML = originalContent;
        document.title = originalTitle;
        document.head.removeChild(printStyles);
      }, 100);
    }
  };

  // Expose the handlePrint function to parent components
  useImperativeHandle(ref, () => ({
    handlePrint
  }));

  return (
    <div style={{ 
      fontFamily: 'Courier New, monospace', 
      fontSize: '12px', 
      lineHeight: '1.4', 
      color: 'black', 
      background: 'white', 
      padding: '10px',
      direction: 'rtl',
      textAlign: 'center',
      border: '1px solid #ccc',
      maxWidth: '300px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '10px', 
        borderBottom: '2px solid #000', 
        paddingBottom: '5px' 
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
          {invoiceData.storeName || 'فيكتوريا ستور'}
        </div>
        {storePhoneNumber && (
          <div style={{ fontSize: '10px', marginBottom: '5px' }}>
            {storePhoneNumber}
          </div>
        )}
      </div>

      {/* Invoice Info */}
      <div style={{ 
        margin: '10px 0', 
        borderBottom: '1px dashed #000', 
        paddingBottom: '5px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
          <span>التاريخ:</span>
          <span>{new Date(invoiceData.created_at || invoiceData.date).toLocaleDateString('ar-EG')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
          <span>الوقت:</span>
          <span>{new Date(invoiceData.created_at || invoiceData.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
          <span>رقم الفاتورة:</span>
          <span>{invoiceData.invoice_number || invoiceData.invoiceNumber}</span>
        </div>
        {invoiceData.customerName && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
            <span>العميل:</span>
            <span>
              {invoiceData.customerName.length > 15 
                ? invoiceData.customerName.substring(0, 15) + '...' 
                : invoiceData.customerName}
            </span>
          </div>
        )}
      </div>

      {/* Items Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontWeight: 'bold', 
        borderBottom: '1px solid #000', 
        padding: '3px 0', 
        margin: '5px 0', 
        fontSize: '10px' 
      }}>
        <span style={{ width: '50%', textAlign: 'right' }}>المنتج</span>
        <span style={{ width: '20%', textAlign: 'center' }}>الكمية</span>
        <span style={{ width: '30%', textAlign: 'left' }}>السعر</span>
      </div>
      
      {/* Items */}
      {invoiceData.items.map((item, index) => (
        <div key={index} style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          margin: '2px 0', 
          fontSize: '9px' 
        }}>
          <span style={{ width: '50%', textAlign: 'right' }}>
            {(item.product_name || item.name).length > 15 
              ? (item.product_name || item.name).substring(0, 15) + '...' 
              : (item.product_name || item.name)}
          </span>
          <span style={{ width: '20%', textAlign: 'center' }}>{item.quantity}</span>
          <span style={{ width: '30%', textAlign: 'left' }}>
            {((item.unit_price || item.selling_price || item.price) * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}

      {/* Total */}
      <div style={{ 
        marginTop: '10px', 
        borderTop: '2px solid #000', 
        paddingTop: '5px' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontWeight: 'bold', 
          fontSize: '12px', 
          margin: '3px 0' 
        }}>
          <span>الإجمالي:</span>
          <span>{(invoiceData.total_amount || invoiceData.total).toFixed(2)} جنيه</span>
        </div>
        {invoiceData.discount && invoiceData.discount > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '10px', 
            margin: '3px 0' 
          }}>
            <span>الخصم:</span>
            <span>-{invoiceData.discount.toFixed(2)} جنيه</span>
          </div>
        )}
        {invoiceData.tax && invoiceData.tax > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '10px', 
            margin: '3px 0' 
          }}>
            <span>الضريبة:</span>
            <span>{invoiceData.tax.toFixed(2)} جنيه</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ 
        marginTop: '10px', 
        borderTop: '1px dashed #000', 
        paddingTop: '5px', 
        textAlign: 'center', 
        fontSize: '9px' 
      }}>
        <div>شكراً لزيارتكم!</div>
        <div style={{ marginTop: '3px' }}>نتمنى لكم يوماً سعيداً</div>
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
})

Receipt.displayName = 'Receipt'

export default Receipt