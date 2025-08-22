import { useState, useEffect, useRef } from 'react'
import { buildApiUrl } from '../config'

function InvoiceManagement() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredInvoices, setFilteredInvoices] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  })

  // جلب الفواتير من الخادم
  const fetchInvoices = async (page = 1) => {
    setLoading(true)
    try {
      let url = `/invoices?page=${page}&per_page=50`
      
      // إضافة فلاتر التاريخ إذا كانت موجودة
      if (dateFilter.startDate) {
        url += `&start_date=${dateFilter.startDate}T00:00:00`
      }
      if (dateFilter.endDate) {
        url += `&end_date=${dateFilter.endDate}T23:59:59`
      }

      const response = await fetch(buildApiUrl(url))
      const data = await response.json()
      
      if (data.success) {
        setInvoices(data.invoices || [])
        setFilteredInvoices(data.invoices || [])
        setTotalPages(data.pages || 1)
        setCurrentPage(page)
      } else {
        console.error('فشل في جلب الفواتير:', data.error)
        setInvoices([])
        setFilteredInvoices([])
      }
    } catch (error) {
      console.error('خطأ في جلب الفواتير:', error)
      setInvoices([])
      setFilteredInvoices([])
    } finally {
      setLoading(false)
    }
  }

  // تصفية الفواتير حسب البحث
  const searchInvoices = async () => {
    if (!searchTerm.trim()) {
      fetchInvoices(1)
      return
    }

    setLoading(true)
    try {
      let url = `/invoices/search?q=${encodeURIComponent(searchTerm)}&page=1&per_page=50`
      
      // إضافة فلاتر التاريخ إذا كانت موجودة
      if (dateFilter.startDate) {
        url += `&start_date=${dateFilter.startDate}T00:00:00`
      }
      if (dateFilter.endDate) {
        url += `&end_date=${dateFilter.endDate}T23:59:59`
      }

      const response = await fetch(buildApiUrl(url))
      const data = await response.json()
      
      if (data.success) {
        setInvoices(data.invoices || [])
        setFilteredInvoices(data.invoices || [])
        setTotalPages(data.pages || 1)
        setCurrentPage(1)
      } else {
        console.error('فشل في البحث في الفواتير:', data.error)
        setInvoices([])
        setFilteredInvoices([])
      }
    } catch (error) {
      console.error('خطأ في البحث في الفواتير:', error)
      setInvoices([])
      setFilteredInvoices([])
    } finally {
      setLoading(false)
    }
  }

  // معالج البحث عند الضغط على Enter
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchInvoices()
    }
  }

  // مسح البحث والعودة لجلب جميع الفواتير
  const clearSearch = () => {
    setSearchTerm('')
    fetchInvoices(1)
  }

  // جلب الفواتير عند تحميل المكون
  useEffect(() => {
    fetchInvoices()
  }, [])

  // تطبيق فلتر التاريخ
  const applyDateFilter = () => {
    fetchInvoices(1)
  }

  // مسح فلتر التاريخ
  const clearDateFilter = () => {
    setDateFilter({ startDate: '', endDate: '' })
    setTimeout(() => fetchInvoices(1), 100)
  }

  // طباعة الفاتورة مع نفس نظام نقطة البيع
  const printInvoice = async (invoice) => {
    try {
      // جلب تفاصيل الفاتورة الكاملة
      const response = await fetch(buildApiUrl(`/invoices/${invoice.id}`))
      const data = await response.json()
      
      if (data.success) {
        const invoiceData = data.invoice
        
        // إنشاء محتوى الطباعة
        const printContent = generatePrintContent(invoiceData)
        
        // فتح نافذة طباعة جديدة
        const printWindow = window.open('', '_blank', 'width=400,height=600')
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      } else {
        alert('فشل في جلب تفاصيل الفاتورة')
      }
    } catch (error) {
      console.error('خطأ في جلب تفاصيل الفاتورة:', error)
      alert('خطأ في جلب تفاصيل الفاتورة')
    }
  }

  // توليد محتوى الطباعة بنفس تنسيق نقطة البيع
  const generatePrintContent = (invoice) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة ${invoice.invoice_number}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
            background: white;
          }
          
          .receipt {
            width: 100%;
          }
          
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .store-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .store-info {
            font-size: 10px;
            margin-bottom: 2px;
          }
          
          .invoice-info {
            margin-bottom: 15px;
          }
          
          .invoice-info div {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 11px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          
          .items-table th {
            border-bottom: 1px solid #000;
            padding: 3px;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
          }
          
          .items-table td {
            padding: 3px;
            text-align: center;
            font-size: 10px;
            border-bottom: 1px dotted #ccc;
          }
          
          .item-name {
            text-align: right !important;
            max-width: 120px;
            word-wrap: break-word;
          }
          
          .totals {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-bottom: 15px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 11px;
          }
          
          .final-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 5px 0;
          }
          
          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 15px;
          }
          
          .thank-you {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .dashed-line {
            border: none;
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 5px;
            }
            
            .receipt {
              width: 80mm;
            }
            
            @page {
              size: 80mm auto;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="store-name">متجرك</div>
            <div class="store-info">العنوان: شارع الرئيسي</div>
            <div class="store-info">التليفون: 123-456-789</div>
          </div>
          
          <div class="invoice-info">
            <div>
              <span>رقم الفاتورة:</span>
              <span>${invoice.invoice_number}</span>
            </div>
            <div>
              <span>التاريخ:</span>
              <span>${formatDate(invoice.created_at)}</span>
            </div>
            ${invoice.customer_name ? `
            <div>
              <span>العميل:</span>
              <span>${invoice.customer_name}</span>
            </div>
            ` : ''}
            ${invoice.customer_phone ? `
            <div>
              <span>الهاتف:</span>
              <span>${invoice.customer_phone}</span>
            </div>
            ` : ''}
            <div>
              <span>طريقة الدفع:</span>
              <span>${invoice.payment_method === 'cash' ? 'نقدي' : invoice.payment_method === 'card' ? 'كارت' : 'تحويل'}</span>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 45%">الصنف</th>
                <th style="width: 15%">الكمية</th>
                <th style="width: 20%">السعر</th>
                <th style="width: 20%">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map(item => `
                <tr>
                  <td class="item-name">${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td>${parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>المجموع الفرعي:</span>
              <span>${parseFloat(invoice.total_amount + invoice.discount_amount + invoice.tax_amount).toFixed(2)} جنيه</span>
            </div>
            ${invoice.discount_amount > 0 ? `
            <div class="total-row">
              <span>الخصم:</span>
              <span>-${parseFloat(invoice.discount_amount).toFixed(2)} جنيه</span>
            </div>
            ` : ''}
            ${invoice.tax_amount > 0 ? `
            <div class="total-row">
              <span>الضريبة:</span>
              <span>${parseFloat(invoice.tax_amount).toFixed(2)} جنيه</span>
            </div>
            ` : ''}
            <div class="total-row final-total">
              <span>الإجمالي النهائي:</span>
              <span>${parseFloat(invoice.total_amount).toFixed(2)} جنيه</span>
            </div>
          </div>
          
          <hr class="dashed-line">
          
          <div class="footer">
            <div class="thank-you">شكراً لتسوقكم معنا</div>
            <div>نتطلع لخدمتكم مرة أخرى</div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // عرض الفاتورة للمعاينة
  const viewInvoice = async (invoice) => {
    try {
      // جلب تفاصيل الفاتورة الكاملة
      const response = await fetch(buildApiUrl(`/invoices/${invoice.id}`))
      const data = await response.json()
      
      if (data.success) {
        setSelectedInvoice(data.invoice)
        setShowReceipt(true)
      } else {
        alert('فشل في جلب تفاصيل الفاتورة')
      }
    } catch (error) {
      console.error('خطأ في جلب تفاصيل الفاتورة:', error)
      alert('خطأ في جلب تفاصيل الفاتورة')
    }
  }

  // تنسيق التاريخ
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // تنسيق المبلغ
  const formatCurrency = (amount) => {
    return `${parseFloat(amount).toFixed(2)} جنيه`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة الفواتير</h2>
        <button
          onClick={() => fetchInvoices(currentPage)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          disabled={loading}
        >
          {loading ? 'جاري التحديث...' : 'تحديث'}
        </button>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* البحث */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البحث (رقم الفاتورة، اسم العميل، أو رقم الهاتف)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="ابحث في الفواتير..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={searchInvoices}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                disabled={loading}
              >
                بحث
              </button>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* فلتر التاريخ من */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              من تاريخ
            </label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* فلتر التاريخ إلى */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* أزرار الفلاتر */}
        <div className="flex gap-2">
          <button
            onClick={applyDateFilter}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
          >
            تطبيق فلتر التاريخ
          </button>
          <button
            onClick={clearDateFilter}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
          >
            مسح الفلاتر
          </button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">إجمالي الفواتير</h3>
          <p className="text-2xl font-bold text-blue-600">{filteredInvoices.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">إجمالي المبيعات</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0))}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">متوسط الفاتورة</h3>
          <p className="text-2xl font-bold text-purple-600">
            {filteredInvoices.length > 0 
              ? formatCurrency(filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) / filteredInvoices.length)
              : '0.00 جنيه'
            }
          </p>
        </div>
      </div>

      {/* جدول الفواتير */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ والوقت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الهاتف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ الإجمالي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عدد الأصناف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    جاري تحميل الفواتير...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    لا توجد فواتير
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.customer_name || 'عميل غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.customer_phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.items_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => viewInvoice(invoice)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm mr-2"
                      >
                        معاينة
                      </button>
                      <button
                        onClick={() => printInvoice(invoice)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        طباعة
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* التنقل بين الصفحات */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchInvoices(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => fetchInvoices(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  صفحة <span className="font-medium">{currentPage}</span> من{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => fetchInvoices(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => fetchInvoices(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    التالي
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* نافذة المعاينة */}
      {showReceipt && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">فاتورة رقم: {selectedInvoice.invoice_number}</h3>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            {/* معلومات الفاتورة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-semibold mb-2">معلومات الفاتورة</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>رقم الفاتورة:</strong> {selectedInvoice.invoice_number}</div>
                  <div><strong>التاريخ:</strong> {formatDate(selectedInvoice.created_at)}</div>
                  <div><strong>طريقة الدفع:</strong> {selectedInvoice.payment_method === 'cash' ? 'نقدي' : selectedInvoice.payment_method === 'card' ? 'كارت' : 'تحويل'}</div>
                  <div><strong>الحالة:</strong> {selectedInvoice.status === 'completed' ? 'مكتملة' : selectedInvoice.status === 'returned' ? 'مرتجعة' : 'ملغية'}</div>
                </div>
              </div>
              
              {(selectedInvoice.customer_name || selectedInvoice.customer_phone) && (
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">معلومات العميل</h4>
                  <div className="space-y-1 text-sm">
                    {selectedInvoice.customer_name && <div><strong>الاسم:</strong> {selectedInvoice.customer_name}</div>}
                    {selectedInvoice.customer_phone && <div><strong>الهاتف:</strong> {selectedInvoice.customer_phone}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* جدول الأصناف */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">أصناف الفاتورة</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r">
                        اسم الصنف
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r">
                        الكمية
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r">
                        سعر الوحدة
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r">
                        الخصم
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(selectedInvoice.items || []).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">
                          {item.product_name}
                          {item.product_serial && (
                            <div className="text-xs text-gray-500">كود: {item.product_serial}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-center border-r">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-center border-r">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-center border-r">
                          {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-center font-medium">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ملخص الفاتورة */}
            <div className="bg-gray-50 p-4 rounded mb-6">
              <h4 className="font-semibold mb-3">ملخص الفاتورة</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{formatCurrency((selectedInvoice.total_amount || 0) + (selectedInvoice.discount_amount || 0) - (selectedInvoice.tax_amount || 0))}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>الخصم:</span>
                      <span>-{formatCurrency(selectedInvoice.discount_amount)}</span>
                    </div>
                  )}
                  {selectedInvoice.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>الضريبة:</span>
                      <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>الإجمالي النهائي:</span>
                    <span className="text-green-600">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>إجمالي التكلفة:</span>
                    <span>{formatCurrency(selectedInvoice.total_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-blue-600 font-medium">
                    <span>الربح:</span>
                    <span>{formatCurrency(selectedInvoice.profit || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReceipt(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                إغلاق
              </button>
              <button
                onClick={() => printInvoice(selectedInvoice)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoiceManagement