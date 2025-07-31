import { useState, useEffect } from 'react'
import { buildApiUrl } from '../config'

const ProductManagement = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  
  // بيانات النموذج
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: '',
    purchase_price: '',
    selling_price: '',
    quantity: '',
    min_quantity: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // NEW: Function to notify other components about product list changes
  const notifyProductListUpdate = () => {
    // Trigger storage event for cross-tab communication
    localStorage.setItem('productListUpdated', Date.now().toString())
    
    // Trigger custom event for same-tab communication
    window.dispatchEvent(new CustomEvent('productListUpdated'))
  }

  // جلب المنتجات
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(buildApiUrl('/products'))
      const data = await response.json()
      
      if (data.success) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('خطأ في جلب المنتجات:', error)
    } finally {
      setLoading(false)
    }
  }

  // جلب الفئات
  const fetchCategories = async () => {
    try {
      const response = await fetch(buildApiUrl('/categories?active_only=true'))
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('خطأ في جلب الفئات:', error)
    }
  }

  // إضافة منتج جديد
  const handleAddProduct = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.barcode.trim()) {
      alert('اسم المنتج والباركود مطلوبان')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl('/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          purchase_price: parseFloat(formData.purchase_price) || 0,
          selling_price: parseFloat(formData.selling_price) || 0,
          quantity: parseInt(formData.quantity) || 0,
          min_quantity: parseInt(formData.min_quantity) || 0
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('تم إضافة المنتج بنجاح')
        fetchProducts()
        resetForm()
        setShowAddForm(false)
        
        // NEW: Notify other components about the product list update
        notifyProductListUpdate()
      } else {
        alert(data.error || 'حدث خطأ أثناء إضافة المنتج')
      }
    } catch (error) {
      console.error('خطأ في إضافة المنتج:', error)
      alert('حدث خطأ أثناء إضافة المنتج')
    } finally {
      setLoading(false)
    }
  }

  // تعديل منتج
  const handleEditProduct = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.barcode.trim()) {
      alert('اسم المنتج والباركود مطلوبان')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl(`/products/${selectedProduct.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          purchase_price: parseFloat(formData.purchase_price) || 0,
          selling_price: parseFloat(formData.selling_price) || 0,
          quantity: parseInt(formData.quantity) || 0,
          min_quantity: parseInt(formData.min_quantity) || 0
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('تم تحديث المنتج بنجاح')
        fetchProducts()
        resetForm()
        setShowEditForm(false)
        setSelectedProduct(null)
        
        // NEW: Notify other components about the product list update
        notifyProductListUpdate()
      } else {
        alert(data.error || 'حدث خطأ أثناء تحديث المنتج')
      }
    } catch (error) {
      console.error('خطأ في تحديث المنتج:', error)
      alert('حدث خطأ أثناء تحديث المنتج')
    } finally {
      setLoading(false)
    }
  }

  // حذف منتج
  const handleDeleteProduct = async (productId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return

    try {
      setLoading(true)
      const response = await fetch(buildApiUrl(`/products/${productId}`), {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('تم حذف المنتج بنجاح')
        fetchProducts()
        
        // NEW: Notify other components about the product list update
        notifyProductListUpdate()
      } else {
        alert(data.error || 'حدث خطأ أثناء حذف المنتج')
      }
    } catch (error) {
      console.error('خطأ في حذف المنتج:', error)
      alert('حدث خطأ أثناء حذف المنتج')
    } finally {
      setLoading(false)
    }
  }

  // فتح نموذج التعديل
  const openEditForm = (product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      barcode: product.barcode,
      category_id: product.category_id || '',
      purchase_price: product.purchase_price || '',
      selling_price: product.selling_price || '',
      quantity: product.quantity || '',
      min_quantity: product.min_quantity || '',
      description: product.description || '',
      is_active: product.is_active !== false
    })
    setShowEditForm(true)
  }

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      category_id: '',
      purchase_price: '',
      selling_price: '',
      quantity: '',
      min_quantity: '',
      description: '',
      is_active: true
    })
  }

  // تصفية المنتجات
  const filteredProducts = products.filter(product => {
    const categoryName = product.category ? product.category.name : ''
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm) ||
                         categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !categoryFilter || product.category_id?.toString() === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  // دالة للحصول على اسم الفئة
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : '-'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
        إدارة المنتجات
      </h1>

      {/* شريط البحث والفلاتر */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="البحث في المنتجات (الاسم، الباركود، الفئة)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">جميع الفئات</option>
            {categories.map(category => (
              <option key={category.id} value={category.id.toString()}>{category.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 whitespace-nowrap"
        >
          إضافة منتج جديد
        </button>
      </div>

      {/* نموذج إضافة منتج جديد */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            إضافة منتج جديد
          </h2>
          
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="أدخل اسم المنتج"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الباركود *
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  placeholder="أدخل الباركود"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الفئة
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">اختر الفئة</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سعر الشراء
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سعر البيع *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الكمية
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  placeholder="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الحد الأدنى للكمية
                </label>
                <input
                  type="number"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                  placeholder="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الحالة
                </label>
                <select
                  value={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="true">نشط</option>
                  <option value="false">غير نشط</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="أدخل وصف المنتج"
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

      {/* نموذج تعديل منتج */}
      {showEditForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            تعديل المنتج: {selectedProduct?.name}
          </h2>
          
          <form onSubmit={handleEditProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="أدخل اسم المنتج"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الباركود *
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  placeholder="أدخل الباركود"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الفئة
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">اختر الفئة</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سعر الشراء
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سعر البيع *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الكمية
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  placeholder="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الحد الأدنى للكمية
                </label>
                <input
                  type="number"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                  placeholder="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الحالة
                </label>
                <select
                  value={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="true">نشط</option>
                  <option value="false">غير نشط</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="أدخل وصف المنتج"
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
                {loading ? 'جاري التحديث...' : 'تحديث'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false)
                  setSelectedProduct(null)
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

      {/* جدول المنتجات */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            قائمة المنتجات ({filteredProducts.length} منتج)
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">اسم المنتج</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الباركود</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الفئة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">سعر الشراء</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">سعر البيع</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الكمية</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {loading ? 'جاري تحميل المنتجات...' : 'لا توجد منتجات'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-800 dark:text-white font-medium">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {product.barcode || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {getCategoryName(product.category_id)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {product.purchase_price ? `${product.purchase_price} جنيه` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {product.selling_price} جنيه
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        product.quantity < (product.min_quantity || 3)
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        product.is_active !== false
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {product.is_active !== false ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => openEditForm(product)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ProductManagement

