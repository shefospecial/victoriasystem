import { buildApiUrl } from '../config'
import { useState, useEffect } from 'react'

const WastageManagement = () => {
  const [wastages, setWastages] = useState([])
  const [products, setProducts] = useState([])
  const [reasons, setReasons] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReason, setSelectedReason] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // بيانات النموذج
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    reason: '',
    cost_per_unit: '',
    notes: '',
    recorded_by: 'الإدارة'
  })

  // جلب البيانات عند تحميل المكون
  useEffect(() => {
    fetchWastages()
    fetchProducts()
    fetchReasons()
    fetchStatistics()
  }, [currentPage, searchTerm, selectedReason, dateFrom, dateTo])

  // جلب الهوالك
  const fetchWastages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage,
        per_page: 10,
        search: searchTerm,
        reason: selectedReason,
        date_from: dateFrom,
        date_to: dateTo
      })
      
      const response = await fetch(`http://localhost:5000/api/wastages?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setWastages(data.wastages)
        setTotalPages(data.pages)
      }
    } catch (error) {
      console.error('خطأ في جلب الهوالك:', error)
    } finally {
      setLoading(false)
    }
  }

  // جلب المنتجات
  const fetchProducts = async () => {
    try {
      const response = await fetch(buildApiUrl('/products'))
      const data = await response.json()
      if (data.success) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('خطأ في جلب المنتجات:', error)
    }
  }

  // جلب أسباب الهوالك
  const fetchReasons = async () => {
    try {
      const response = await fetch(buildApiUrl('/wastage-reasons'))
      const data = await response.json()
      if (data.success) {
        setReasons(data.reasons)
      }
    } catch (error) {
      console.error('خطأ في جلب أسباب الهوالك:', error)
    }
  }

  // جلب الإحصائيات
  const fetchStatistics = async () => {
    try {
      const response = await fetch(buildApiUrl('/wastages/statistics?days=30'))
      const data = await response.json()
      if (data.success) {
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error)
    }
  }

  // إضافة هوالك جديد
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.product_id || !formData.quantity || !formData.reason) {
      alert('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl('/wastages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (data.success) {
        alert('تم تسجيل الهوالك بنجاح')
        setShowAddForm(false)
        setFormData({
          product_id: '',
          quantity: '',
          reason: '',
          cost_per_unit: '',
          notes: '',
          recorded_by: 'الإدارة'
        })
        fetchWastages()
        fetchStatistics()
      } else {
        alert(data.error || 'حدث خطأ في تسجيل الهوالك')
      }
    } catch (error) {
      console.error('خطأ في إضافة الهوالك:', error)
      alert('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  // حذف هوالك
  const handleDelete = async (wastageId) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟ سيتم إرجاع الكمية للمخزون.')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/wastages/${wastageId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        alert('تم حذف السجل بنجاح')
        fetchWastages()
        fetchStatistics()
      } else {
        alert(data.error || 'حدث خطأ في حذف السجل')
      }
    } catch (error) {
      console.error('خطأ في حذف الهوالك:', error)
      alert('حدث خطأ في الاتصال')
    }
  }

  // تحديث المنتج المحدد
  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === parseInt(productId))
    setFormData({
      ...formData,
      product_id: productId,
      cost_per_unit: product ? product.purchase_price : ''
    })
  }

  return (
    <div className="wastage-management">
      <div className="header">
        <h2>إدارة الهوالك والهادر</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          تسجيل هوالك جديد
        </button>
      </div>

      {/* الإحصائيات */}
      {statistics && (
        <div className="statistics-grid">
          <div className="stat-card">
            <h3>إجمالي الهوالك (30 يوم)</h3>
            <p className="stat-number">{statistics.total_wastages}</p>
          </div>
          <div className="stat-card">
            <h3>إجمالي الخسائر</h3>
            <p className="stat-number">{statistics.total_cost.toFixed(2)} جنيه</p>
          </div>
          <div className="stat-card">
            <h3>إجمالي الكميات المهدرة</h3>
            <p className="stat-number">{statistics.total_quantity}</p>
          </div>
        </div>
      )}

      {/* فلاتر البحث */}
      <div className="filters">
        <input
          type="text"
          placeholder="البحث في المنتجات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
          className="filter-select"
        >
          <option value="">جميع الأسباب</option>
          {reasons.map(reason => (
            <option key={reason.id} value={reason.name}>
              {reason.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="date-input"
          placeholder="من تاريخ"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="date-input"
          placeholder="إلى تاريخ"
        />
      </div>

      {/* جدول الهوالك */}
      <div className="wastages-table">
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المنتج</th>
              <th>الباركود</th>
              <th>الكمية</th>
              <th>السبب</th>
              <th>التكلفة</th>
              <th>المسجل بواسطة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center">جاري التحميل...</td>
              </tr>
            ) : wastages.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">لا توجد سجلات هوالك</td>
              </tr>
            ) : (
              wastages.map(wastage => (
                <tr key={wastage.id}>
                  <td>{new Date(wastage.created_at).toLocaleDateString('ar-EG')}</td>
                  <td>{wastage.product_name}</td>
                  <td>{wastage.product_barcode}</td>
                  <td>{wastage.quantity}</td>
                  <td>{wastage.reason}</td>
                  <td>{wastage.total_cost.toFixed(2)} جنيه</td>
                  <td>{wastage.recorded_by}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(wastage.id)}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* التصفح */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary"
            >
              السابق
            </button>
            <span>صفحة {currentPage} من {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {/* نموذج إضافة هوالك */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>تسجيل هوالك جديد</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>المنتج *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">اختر المنتج</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.serial_number} (متوفر: {product.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>الكمية *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                  min="1"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>سبب الهوالك *</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  required
                  className="form-control"
                >
                  <option value="">اختر السبب</option>
                  {reasons.map(reason => (
                    <option key={reason.id} value={reason.name}>
                      {reason.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>تكلفة الوحدة</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({...formData, cost_per_unit: e.target.value})}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="form-control"
                  rows="3"
                ></textarea>
              </div>

              <div className="form-group">
                <label>المسجل بواسطة</label>
                <input
                  type="text"
                  value={formData.recorded_by}
                  onChange={(e) => setFormData({...formData, recorded_by: e.target.value})}
                  className="form-control"
                />
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'جاري التسجيل...' : 'تسجيل الهوالك'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default WastageManagement

