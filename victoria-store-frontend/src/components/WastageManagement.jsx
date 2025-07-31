import { useState, useEffect } from 'react'
import { buildApiUrl } from '../config'

const WastageManagement = ({ currentUser }) => {
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

  // حالات البحث عن المنتجات في النموذج
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

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
      
      const response = await fetch(buildApiUrl(`/wastages?${params}`))
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

  // البحث عن المنتجات في النموذج
  const handleProductSearch = (searchValue) => {
    setProductSearchTerm(searchValue)
    
    if (searchValue.length > 0) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (product.barcode && product.barcode.includes(searchValue)) ||
        (product.serial_number && product.serial_number.includes(searchValue))
      )
      setFilteredProducts(filtered)
      setShowProductSuggestions(true)
    } else {
      setFilteredProducts([])
      setShowProductSuggestions(false)
    }
  }

  // اختيار منتج من القائمة المقترحة
  const selectProduct = (product) => {
    setSelectedProduct(product)
    setProductSearchTerm(product.name)
    setFormData({...formData, product_id: product.id, cost_per_unit: product.purchase_price || product.cost_price || 0})
    setShowProductSuggestions(false)
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
        resetForm()
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
      const response = await fetch(buildApiUrl(`/wastages/${wastageId}`), {
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

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFormData({
      product_id: '',
      quantity: '',
      reason: '',
      cost_per_unit: '',
      notes: '',
      recorded_by: 'الإدارة'
    })
    // إعادة تعيين حالات البحث عن المنتجات
    setProductSearchTerm('')
    setFilteredProducts([])
    setShowProductSuggestions(false)
    setSelectedProduct(null)
  }

  // إلغاء النموذج
  const cancelForm = () => {
    resetForm()
    setShowAddForm(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
        إدارة الهوالك والهادر
      </h1>

      {/* الإحصائيات */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              إجمالي الهوالك (30 يوم)
            </h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {statistics.total_wastages}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              إجمالي الخسائر
            </h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {statistics.total_cost?.toFixed(2)} جنيه
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              إجمالي الكميات المهدرة
            </h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {statistics.total_quantity}
            </p>
          </div>
        </div>
      )}

      {/* شريط البحث والإضافة */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            البحث والتصفية
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 whitespace-nowrap"
          >
            تسجيل هوالك جديد
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              البحث في المنتجات
            </label>
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              سبب الهوالك
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">جميع الأسباب</option>
              {reasons.map(reason => (
                <option key={reason.id} value={reason.name}>
                  {reason.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              من تاريخ
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* نموذج إضافة هوالك جديد */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            تسجيل هوالك جديد
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المنتج *
                </label>
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  placeholder="ابحث عن منتج بالاسم أو الباركود..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
                
                {/* قائمة المنتجات المقترحة */}
                {showProductSuggestions && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="font-medium text-gray-800 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          الباركود: {product.barcode} | السعر: {product.selling_price} جنيه
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الكمية *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  placeholder="أدخل الكمية"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  السبب *
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">اختر السبب</option>
                  {reasons.map(reason => (
                    <option key={reason.id} value={reason.name}>
                      {reason.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تكلفة الوحدة
                </label>
                <input
                  type="number"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({...formData, cost_per_unit: e.target.value})}
                  placeholder="تكلفة الوحدة"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المسجل بواسطة
                </label>
                <input
                  type="text"
                  value={formData.recorded_by}
                  onChange={(e) => setFormData({...formData, recorded_by: e.target.value})}
                  placeholder="اسم المسجل"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="أدخل أي ملاحظات إضافية"
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* جدول الهوالك */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            سجلات الهوالك ({wastages.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            جاري التحميل...
          </div>
        ) : wastages.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            لا توجد سجلات هوالك
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">المنتج</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الباركود</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الكمية</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">السبب</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">التكلفة</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">المسجل بواسطة</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {wastages.map(wastage => (
                  <tr key={wastage.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-800 dark:text-white">
                      {new Date(wastage.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-white font-medium">
                      {wastage.product_name}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {wastage.product_barcode}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {wastage.quantity}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {wastage.reason}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-medium">
                      {wastage.total_cost?.toFixed(2)} جنيه
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {wastage.recorded_by}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(wastage.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* التنقل بين الصفحات */}
        {totalPages > 1 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WastageManagement

