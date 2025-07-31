import { useState, useEffect } from 'react'
import { buildApiUrl } from '../config'

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [statement, setStatement] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // بيانات النموذج
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: ''
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
        resetForm()
        setShowAddForm(false)
        fetchSuppliers()
      } else {
        alert('خطأ: ' + data.error)
      }
    } catch (error) {
      console.error('خطأ في إضافة الموزع:', error)
      alert('حدث خطأ في إضافة الموزع')
    }
  }

  // تحديث موزع
  const handleUpdateSupplier = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('اسم الموزع مطلوب')
      return
    }
    
    try {
      const response = await fetch(buildApiUrl(`/suppliers/${selectedSupplier.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('تم تحديث بيانات الموزع بنجاح')
        resetForm()
        setShowEditForm(false)
        setSelectedSupplier(null)
        fetchSuppliers()
      } else {
        alert('خطأ: ' + data.error)
      }
    } catch (error) {
      console.error('خطأ في تحديث الموزع:', error)
      alert('حدث خطأ في تحديث الموزع')
    }
  }

  // إعداد النموذج للتعديل
  const startEdit = (supplier) => {
    setSelectedSupplier(supplier)
    setFormData({
      name: supplier.name || '',
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

  // إلغاء النموذج
  const cancelForm = () => {
    resetForm()
    setShowAddForm(false)
    setShowEditForm(false)
    setSelectedSupplier(null)
  }

  // عرض كشف الحساب
  const showSupplierStatement = async (supplier) => {
    try {
      setLoading(true)
      const response = await fetch(buildApiUrl(`/suppliers/${supplier.id}/statement`))
      const data = await response.json()
      
      if (data.success) {
        setSelectedSupplier(supplier)
        setStatement(data)
        setShowStatementModal(true)
      } else {
        alert('خطأ في جلب كشف الحساب: ' + data.error)
      }
    } catch (error) {
      console.error('خطأ في جلب كشف الحساب:', error)
      alert('حدث خطأ في جلب كشف الحساب')
    } finally {
      setLoading(false)
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن موزع بالاسم أو الهاتف..."
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
      </div>

      {/* نموذج إضافة/تعديل موزع */}
      {(showAddForm || showEditForm) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            {showEditForm ? 'تعديل بيانات الموزع' : 'إضافة موزع جديد'}
          </h2>
          
          <form onSubmit={showEditForm ? handleUpdateSupplier : handleAddSupplier} className="space-y-4">
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
                  رقم الهاتف (اختياري)
                </label>
                <input
                  type="text"
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
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
              >
                {showEditForm ? 'تحديث' : 'إضافة'}
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

      {/* قائمة الموزعين */}
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
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجمالي المشتريات</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجمالي المدفوعات</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الرصيد</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-800 dark:text-white font-medium">
                      {supplier.name}
                      {supplier.notes && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {supplier.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {supplier.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {supplier.total_purchases?.toFixed(2) || '0.00'} جنيه
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {supplier.total_payments?.toFixed(2) || '0.00'} جنيه
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${
                        (supplier.balance || 0) > 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : (supplier.balance || 0) < 0 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {supplier.balance?.toFixed(2) || '0.00'} جنيه
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => startEdit(supplier)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => showSupplierStatement(supplier)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        >
                          كشف الحساب
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

      {/* نافذة كشف الحساب */}
      {showStatementModal && statement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  كشف حساب - {selectedSupplier?.name}
                </h2>
                <button
                  onClick={() => setShowStatementModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* ملخص الحساب */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 dark:text-blue-300">إجمالي المشتريات</div>
                  <div className="text-xl font-bold text-blue-800 dark:text-blue-200">
                    {statement.summary?.total_purchases?.toFixed(2) || '0.00'} جنيه
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <div className="text-sm text-green-600 dark:text-green-300">إجمالي المدفوعات</div>
                  <div className="text-xl font-bold text-green-800 dark:text-green-200">
                    {statement.summary?.total_payments?.toFixed(2) || '0.00'} جنيه
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-300">الرصيد الحالي</div>
                  <div className={`text-xl font-bold ${
                    (statement.summary?.current_balance || 0) > 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : (statement.summary?.current_balance || 0) < 0 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {statement.summary?.current_balance?.toFixed(2) || '0.00'} جنيه
                  </div>
                </div>
              </div>

              {/* تاريخ المعاملات */}
              {statement.transactions && statement.transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 dark:border-gray-600">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-300 border-b">التاريخ</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-300 border-b">الوصف</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border-b">مدين</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border-b">دائن</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border-b">الرصيد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.transactions.map((transaction, index) => (
                        <tr key={index} className="border-b border-gray-200 dark:border-gray-600">
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(transaction.date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-800 dark:text-white">
                            {transaction.description}
                          </td>
                          <td className="px-4 py-2 text-center text-sm text-red-600 dark:text-red-400">
                            {transaction.debit > 0 ? transaction.debit.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-2 text-center text-sm text-green-600 dark:text-green-400">
                            {transaction.credit > 0 ? transaction.credit.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-2 text-center text-sm font-medium text-gray-800 dark:text-white">
                            {transaction.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  لا توجد معاملات
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierManagement

