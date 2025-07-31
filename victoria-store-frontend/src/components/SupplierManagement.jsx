import { useState, useEffect } from 'react'
import { buildApiUrl } from '../config'

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // بيانات النموذج
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: ''
  })

  // بيانات المعاملة
  const [transactionData, setTransactionData] = useState({
    transaction_type: 'purchase',
    amount: '',
    description: '',
    reference_number: ''
  })

  // فلاتر كشف الحساب
  const [statementFilters, setStatementFilters] = useState({
    date_from: '',
    date_to: ''
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  // جلب الموزعين
  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const response = await fetch(buildApiUrl('/suppliers'))
      const data = await response.json()
      
      if (data.success) {
        setSuppliers(data.suppliers)
      }
    } catch (error) {
      console.error('خطأ في جلب الموزعين:', error)
    } finally {
      setLoading(false)
    }
  }

  // إضافة موزع جديد
  const handleAddSupplier = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('اسم الموزع مطلوب')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl('/suppliers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('تم إضافة الموزع بنجاح')
        fetchSuppliers()
        resetForm()
        setShowAddForm(false)
      } else {
        alert(data.error || 'حدث خطأ أثناء إضافة الموزع')
      }
    } catch (error) {
      console.error('خطأ في إضافة الموزع:', error)
      alert('حدث خطأ أثناء إضافة الموزع')
    } finally {
      setLoading(false)
    }
  }

  // تعديل موزع
  const handleEditSupplier = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('اسم الموزع مطلوب')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl(`/suppliers/${selectedSupplier.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('تم تحديث الموزع بنجاح')
        fetchSuppliers()
        resetForm()
        setShowEditForm(false)
        setSelectedSupplier(null)
      } else {
        alert(data.error || 'حدث خطأ أثناء تحديث الموزع')
      }
    } catch (error) {
      console.error('خطأ في تحديث الموزع:', error)
      alert('حدث خطأ أثناء تحديث الموزع')
    } finally {
      setLoading(false)
    }
  }

  // إضافة معاملة جديدة
  const handleAddTransaction = async (e) => {
    e.preventDefault()
    
    if (!transactionData.amount || !selectedSupplier) {
      alert('المبلغ مطلوب')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl('/supplier-transactions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...transactionData,
          supplier_id: selectedSupplier.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('تم إضافة المعاملة بنجاح')
        fetchSupplierTransactions(selectedSupplier.id)
        fetchSuppliers() // لتحديث الأرصدة
        resetTransactionForm()
        setShowTransactionModal(false) // إغلاق النافذة
        setSelectedSupplier(null) // إلغاء تحديد المورد
      } else {
        alert(data.error || 'حدث خطأ أثناء إضافة المعاملة')
      }
    } catch (error) {
      console.error('خطأ في إضافة المعاملة:', error)
      alert('حدث خطأ أثناء إضافة المعاملة')
    } finally {
      setLoading(false)
    }
  }

  // جلب معاملات موزع معين
  const fetchSupplierTransactions = async (supplierId, filters = {}) => {
    try {
      setLoading(true)
      let url = `/supplier-transactions/${supplierId}?`
      
      if (filters.date_from) url += `date_from=${filters.date_from}&`
      if (filters.date_to) url += `date_to=${filters.date_to}&`
      
      const response = await fetch(buildApiUrl(url))
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.transactions)
        setSelectedSupplier({
          ...selectedSupplier,
          current_balance: data.current_balance,
          period_summary: data.period_summary
        })
      }
    } catch (error) {
      console.error('خطأ في جلب المعاملات:', error)
    } finally {
      setLoading(false)
    }
  }

  // حذف معاملة
  const handleDeleteTransaction = async (transactionId) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعاملة؟')) return

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl(`/supplier-transactions/${transactionId}`), {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('تم حذف المعاملة بنجاح')
        fetchSupplierTransactions(selectedSupplier.id, statementFilters)
        fetchSuppliers()
      } else {
        alert(data.error || 'حدث خطأ أثناء حذف المعاملة')
      }
    } catch (error) {
      console.error('خطأ في حذف المعاملة:', error)
      alert('حدث خطأ أثناء حذف المعاملة')
    } finally {
      setLoading(false)
    }
  }

  // فتح نافذة المعاملات
  const openTransactionModal = (supplier) => {
    setSelectedSupplier(supplier)
    setShowTransactionModal(true)
    resetTransactionForm()
  }

  // فتح كشف الحساب
  const openStatementModal = (supplier) => {
    setSelectedSupplier(supplier)
    setShowStatementModal(true)
    setStatementFilters({ date_from: '', date_to: '' })
    fetchSupplierTransactions(supplier.id)
  }

  // فتح نموذج التعديل
  const openEditForm = (supplier) => {
    setSelectedSupplier(supplier)
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      notes: supplier.notes || ''
    })
    setShowEditForm(true)
  }

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      notes: ''
    })
  }

  // إعادة تعيين نموذج المعاملة
  const resetTransactionForm = () => {
    setTransactionData({
      transaction_type: 'purchase',
      amount: '',
      description: '',
      reference_number: ''
    })
  }

  // تطبيق فلاتر كشف الحساب
  const applyStatementFilters = () => {
    fetchSupplierTransactions(selectedSupplier.id, statementFilters)
  }

  // تصفية الموزعين
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.phone && supplier.phone.includes(searchTerm))
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
        إدارة الموزعين
      </h1>

      {/* شريط البحث والإضافة */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="البحث في الموزعين..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 whitespace-nowrap"
        >
          إضافة موزع جديد
        </button>
      </div>

      {/* نموذج إضافة موزع جديد */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            إضافة موزع جديد
          </h2>
          
          <form onSubmit={handleAddSupplier} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم الموزع *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="أدخل اسم الموزع"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="أدخل رقم الهاتف"
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
                onClick={() => {
                  setShowAddForm(false)
                  resetForm()
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* نموذج تعديل موزع */}
      {showEditForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            تعديل الموزع: {selectedSupplier?.name}
          </h2>
          
          <form onSubmit={handleEditSupplier} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم الموزع *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="أدخل اسم الموزع"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="أدخل رقم الهاتف"
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
                {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false)
                  setSelectedSupplier(null)
                  resetForm()
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* جدول الموزعين */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            قائمة الموزعين ({filteredSuppliers.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            جاري التحميل...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            لا توجد موزعين
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الهاتف</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الرصيد</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-800 dark:text-white font-medium">
                      {supplier.name}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {supplier.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${
                        (supplier.balance || 0) > 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {(supplier.balance || 0).toFixed(2)} جنيه
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => openEditForm(supplier)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => openTransactionModal(supplier)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        >
                          معاملة
                        </button>
                        <button
                          onClick={() => openStatementModal(supplier)}
                          className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                        >
                          كشف حساب
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة إضافة معاملة */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              إضافة معاملة - {selectedSupplier?.name}
            </h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع المعاملة *
                </label>
                <select
                  value={transactionData.transaction_type}
                  onChange={(e) => setTransactionData({...transactionData, transaction_type: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="purchase">شراء (مديونية)</option>
                  <option value="payment">دفعة (سداد)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المبلغ *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionData.amount}
                  onChange={(e) => setTransactionData({...transactionData, amount: e.target.value})}
                  placeholder="أدخل المبلغ"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الرقم المرجعي
                </label>
                <input
                  type="text"
                  value={transactionData.reference_number}
                  onChange={(e) => setTransactionData({...transactionData, reference_number: e.target.value})}
                  placeholder="رقم الفاتورة أو الإيصال"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الوصف
                </label>
                <textarea
                  value={transactionData.description}
                  onChange={(e) => setTransactionData({...transactionData, description: e.target.value})}
                  placeholder="وصف المعاملة"
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
                  onClick={() => {
                    setShowTransactionModal(false)
                    setSelectedSupplier(null)
                    resetTransactionForm()
                  }}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة كشف الحساب */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                كشف حساب - {selectedSupplier?.name}
              </h2>
              <button
                onClick={() => {
                  setShowStatementModal(false)
                  setSelectedSupplier(null)
                  setTransactions([])
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* فلاتر التاريخ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={statementFilters.date_from}
                  onChange={(e) => setStatementFilters({...statementFilters, date_from: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={statementFilters.date_to}
                  onChange={(e) => setStatementFilters({...statementFilters, date_to: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={applyStatementFilters}
                  className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600"
                >
                  تطبيق الفلتر
                </button>
              </div>
            </div>

            {/* ملخص الرصيد */}
            {selectedSupplier && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">الرصيد الحالي</h3>
                  <p className={`text-2xl font-bold ${
                    (selectedSupplier.current_balance || 0) > 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {(selectedSupplier.current_balance || 0).toFixed(2)} جنيه
                  </p>
                </div>
                <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">إجمالي المشتريات</h3>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(selectedSupplier.period_summary?.purchases || 0).toFixed(2)} جنيه
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">إجمالي المدفوعات</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(selectedSupplier.period_summary?.payments || 0).toFixed(2)} جنيه
                  </p>
                </div>
              </div>
            )}

            {/* جدول المعاملات */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">النوع</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الرقم المرجعي</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        لا توجد معاملات
                      </td>
                    </tr>
                  ) : (
                    transactions.map(transaction => (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-gray-800 dark:text-white">
                          {new Date(transaction.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-sm ${
                            transaction.transaction_type === 'purchase'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {transaction.transaction_type_ar}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          <span className={
                            transaction.transaction_type === 'purchase'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }>
                            {transaction.amount.toFixed(2)} جنيه
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                          {transaction.reference_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                          {transaction.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierManagement

