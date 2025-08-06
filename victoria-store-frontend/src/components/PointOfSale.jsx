import { useState, useEffect, useRef } from 'react'
import { buildApiUrl } from '../config'
import Receipt from './Receipt'

function PointOfSale() {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })
  const [cartItems, setCartItems] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showReceipt, setShowReceipt] = useState(false)
  const [currentInvoice, setCurrentInvoice] = useState(null)
  const [lastProductUpdate, setLastProductUpdate] = useState(null)
  const [productCount, setProductCount] = useState(0)
  const [showRefreshHint, setShowRefreshHint] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const searchInputRef = useRef(null)
  const receiptRef = useRef(null)

  const searchCustomers = async (query) => {
    if (query.trim() === "") {
      setCustomers([]);
      return;
    }
    try {
      const response = await fetch(buildApiUrl(`/customers/search?q=${query}`));
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      } else {
        console.error("فشل في جلب العملاء:", data.message);
        setCustomers([]);
      }
    } catch (error) {
      console.error("خطأ أثناء جلب العملاء:", error);
      setCustomers([]);
    }
  };

  useEffect(() => {
    fetchProducts()
  }, [])

  // Check for product updates using backend polling
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch(buildApiUrl('/products/last-updated'))
        const data = await response.json()
        
        if (data.success) {
          if (lastProductUpdate === null) {
            setLastProductUpdate(data.last_updated)
            setProductCount(data.total_products)
          } else {
            if (data.last_updated !== lastProductUpdate || data.total_products !== productCount) {
              console.log('Product list updated, refreshing...')
              fetchProducts()
              setLastProductUpdate(data.last_updated)
              setProductCount(data.total_products)
              setShowRefreshHint(false)
              setLastRefresh(Date.now())
            }
          }
        }
      } catch (error) {
        console.error('Error checking for product updates:', error)
      }
    }

    checkForUpdates()
    const interval = setInterval(checkForUpdates, 3000)
    return () => clearInterval(interval)
  }, [lastProductUpdate, productCount])

  // Show refresh hint after 30 seconds of no updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRefreshHint(true)
    }, 30000)
    return () => clearTimeout(timer)
  }, [lastRefresh])

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchProducts()
      setLastRefresh(Date.now())
      setShowRefreshHint(false)
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    const savedCart = localStorage.getItem('cartItems')
    if (savedCart) {
      setCartItems(JSON.parse(savedCart))
    }
  }, [])

  const createCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert('من فضلك املأ الاسم ورقم الهاتف');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/customers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });

      const data = await response.json();

      if (data.success) {
        setCustomers(prev => [...prev, data.customer]);
        setShowCustomerForm(false);
        setNewCustomer({ name: '', phone: '' });
        setSelectedCustomer(data.customer);
        alert('تم حفظ العميل بنجاح');
      } else {
        alert(`فشل في حفظ العميل: ${data.message || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error('خطأ أثناء حفظ العميل:', err);
      alert('حدث خطأ أثناء حفظ العميل');
    }
  }

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    const focusSearch = () => {
      if (searchInputRef.current && !showSearchResults && !showCustomerForm) {
        searchInputRef.current.focus()
      }
    }

    focusSearch()

    const handleClick = (e) => {
      if (!e.target.closest('button, input, select, textarea')) {
        setTimeout(focusSearch, 100)
      }
    }

    const handleKeyDown = (e) => {
      if (!showSearchResults && !showCustomerForm && e.target === document.body) {
        focusSearch()
      }
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSearchResults, showCustomerForm])

  useEffect(() => {
    const newTotal = cartItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0)
    setTotal(newTotal)
  }, [cartItems])

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...')
      
      let response = await fetch(buildApiUrl('/products?per_page=1000'))
      let data = await response.json()
      
      if (data.success) {
        console.log(`Successfully loaded ${data.products?.length || 0} products from API`)
        setProducts(data.products || [])
        
        if (data.total > data.products?.length) {
          console.log(`Pagination detected. Total: ${data.total}, Retrieved: ${data.products?.length}`)
          
          response = await fetch(buildApiUrl('/products?per_page=0'))
          data = await response.json()
          
          if (data.success && data.products?.length > 0) {
            console.log(`Loaded all ${data.products.length} products without pagination`)
            setProducts(data.products)
          }
        }
      } else {
        console.error('Failed to fetch products:', data.error)
      }
    } catch (error) {
      console.error('خطأ في جلب المنتجات:', error)
    }
  }

  const handleManualRefresh = () => {
    fetchProducts()
    setLastRefresh(Date.now())
    setShowRefreshHint(false)
  }

  const clearCart = () => {
    setCartItems([])
    setSelectedCustomer(null)
    setCustomerSearch('')
    setShowReceipt(false)
    setCurrentInvoice(null)
    localStorage.removeItem('cartItems')
  }

  // Modified processPayment function with print option
  const processPayment = async (shouldPrint = true) => {
    if (cartItems.length === 0) {
      alert('العربة فارغة')
      return
    }

    setLoading(true)
    try {
      const invoice = {
        customer_id: selectedCustomer?.id || null,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price
        })),
        total: total,
        date: new Date().toISOString(),
        print_receipt: shouldPrint
      }

      console.log('Sending invoice data:', invoice)

      const response = await fetch(buildApiUrl('/invoices'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoice)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers.get('content-type'))
      
      const responseText = await response.text()
      console.log('Response text:', responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        throw new Error('الخادم أرجع استجابة غير صالحة')
      }
      
      console.log('Parsed data:', data)

      if (data.success) {
        const invoiceData = {
          invoice_number: data.invoice.invoice_number || data.invoice.id,
          created_at: new Date().toISOString(),
          total_amount: total,
          customerName: selectedCustomer?.name || null,
          items: cartItems.map(item => ({
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.selling_price
          }))
        }
        
        setCurrentInvoice(invoiceData)
        
        if (shouldPrint) {
          setShowReceipt(true)
          alert(`تم إنشاء الفاتورة وطباعتها بنجاح! رقم الفاتورة: ${invoiceData.invoice_number}`)
        } else {
          alert(`تم إنشاء الفاتورة بنجاح بدون طباعة! رقم الفاتورة: ${invoiceData.invoice_number}`)
        }
        
        clearCart()
      } else {
        console.error('Invoice API error:', data)
        alert(`فشل في إنشاء الفاتورة: ${data.error || 'خطأ غير معروف'}`)
      }
    } catch (error) {
      console.error('خطأ في معالجة الدفع:', error)
      alert(`خطأ في معالجة الدفع: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchInputChange = (e) => {
  const value = e.target.value;
  setSearchInput(value);

  if (value.trim() === '') {
    setShowSearchResults(false);
    setSelectedIndex(-1);
    setSearchResults([]);
    return;
  }

  const results = products.filter(product =>
    product.name.toLowerCase().includes(value.toLowerCase()) ||
    (product.barcode && product.barcode.toLowerCase().includes(value.toLowerCase()))
  );

  setSearchResults(results);
  setShowSearchResults(true);

  // الكشف عن الباركود الفريد
  if (value.length >= 8) { // يمكنك تغيير الرقم حسب الحد الأدنى لطول الباركود
    const exactMatch = products.find(
      p => p.barcode && p.barcode.toLowerCase() === value.toLowerCase()
    );
    
    if (exactMatch) {
      selectProductFromResults(exactMatch);
    }
  }
};

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      selectProductFromResults(searchResults[0])
    }
  }

  const selectProductFromResults = (product) => {
    // إلغاء نتائج البحث لمنع الإضافة المزدوجة
  setSearchInput('');
  setSearchResults([]);
  setShowSearchResults(false);
  setSelectedIndex(-1);
    const existingItem = cartItems.find(item => item.id === product.id)
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }])
    }

    setSearchInput('')
    setSearchResults([])
    setShowSearchResults(false)
    setSelectedIndex(-1)
  }

  const updatePrice = (productId, price) => {
    if (isNaN(price) || price <= 0) return;
    setCartItems(cartItems.map(item =>
      item.id === productId ? { ...item, selling_price: price } : item
    ));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCartItems(cartItems.map(item =>
      item.id === productId ? { ...item, quantity } : item
    ))
  }

  const handleSearchKeyDown = (e) => {
    if (!showSearchResults || searchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIndex = (selectedIndex + 1) % searchResults.length
      setSelectedIndex(newIndex)

      // Scroll to the selected item
      setTimeout(() => {
        const selectedElement = document.querySelector(`[data-search-index="${newIndex}"]`)
        if (selectedElement) {
          selectedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
          })
        }
      }, 0)
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIndex = (selectedIndex - 1 + searchResults.length) % searchResults.length
      setSelectedIndex(newIndex)

      // Scroll to the selected item
      setTimeout(() => {
        const selectedElement = document.querySelector(`[data-search-index="${newIndex}"]`)
        if (selectedElement) {
          selectedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
          })
        }
      }, 0)
    }

    if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      selectProductFromResults(searchResults[selectedIndex])
    }
  }

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
        نقطة البيع
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قسم البحث والإدخال */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                البحث عن المنتجات
              </h2>
              <div className="flex items-center space-x-2">
                {showRefreshHint && (
                  <span className="text-sm text-orange-600 dark:text-orange-400">
                    قد تحتاج لتحديث القائمة
                  </span>
                )}
                <button
                  onClick={handleManualRefresh}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm"
                  title="تحديث قائمة المنتجات"
                >
                  تحديث المنتجات
                </button>
              </div>
            </div>
            
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
                onKeyDown={handleSearchKeyDown}
                placeholder="امسح الباركود أو ابحث عن منتج بالاسم..."
                className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoComplete="off"
              />
              
              {/* نتائج البحث */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 shadow-lg z-10 max-h-60 overflow-y-auto">
                  {searchResults.map((product, index) => (
                    <div
                      key={product.id}
                      data-search-index={index}  // إضافة هذا السطر
                      onClick={() => selectProductFromResults(product)}
                      className={`p-3 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0 
                        ${index === selectedIndex ? 'bg-blue-100 dark:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                    >
                      <div className="font-medium text-gray-800 dark:text-white">{product.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        السعر: {product.selling_price} جنيه - المخزون: {product.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              إجمالي المنتجات: {products.length}
            </div>
          </div>

          {/* جدول المنتجات في العربة */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                عربة التسوق ({cartItems.length} منتج)
              </h2>
            </div>
                      
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">المنتج</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">السعر</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الكمية</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">الإجمالي</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        العربة فارغة - ابحث عن منتج أو امسح الباركود لإضافته
                      </td>
                    </tr>
                  ) : (
                    cartItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-gray-800 dark:text-white font-medium">
                          {item.name}
                        </td>
                    
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                          <input
                            type="number"
                            className="w-20 px-2 py-1 text-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                            value={item.selling_price}
                            onChange={(e) => updatePrice(item.id, parseFloat(e.target.value))}
                          />
                          <span className="ml-1">جنيه</span>
                        </td>
                    
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="mx-3 font-medium text-gray-800 dark:text-white min-w-[2rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </td>
                    
                        <td className="px-4 py-3 text-center font-medium text-gray-800 dark:text-white">
                          {(item.selling_price * item.quantity).toFixed(2)} جنيه
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
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

        {/* قسم العميل والدفع */}
        <div className="space-y-6">
          {/* اختيار العميل */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              العميل
            </h2>
            
            {selectedCustomer ? (
              <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-700">
                <div className="font-medium text-green-800 dark:text-green-200">
                  {selectedCustomer.name}
                </div>
                {selectedCustomer.phone && (
                  <div className="text-sm text-green-600 dark:text-green-300">
                    {selectedCustomer.phone}
                  </div>
                )}
                <div className="text-sm text-green-600 dark:text-green-300">
                  النقاط: {selectedCustomer.loyalty_points || 0}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  إلغاء اختيار العميل
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    searchCustomers(e.target.value)
                  }}
                  placeholder="ابحث عن عميل بالاسم أو الهاتف..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                
                {customers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                    {customers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setCustomerSearch('')
                          setCustomers([])
                        }}
                        className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="font-medium text-gray-800 dark:text-white">
                          {customer.name}
                        </div>
                        {customer.phone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {customer.phone}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          النقاط: {customer.loyalty_points || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => setShowCustomerForm(true)}
                  className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                >
                  إضافة عميل جديد
                </button>
              </div>
            )}
          </div>

          {/* نموذج إضافة عميل جديد */}
          {showCustomerForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                إضافة عميل جديد
              </h3>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  placeholder="اسم العميل"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  placeholder="رقم الهاتف"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                
                <div className="flex space-x-2">
                  <button
                    onClick={createCustomer}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomerForm(false)
                      setNewCustomer({ name: '', phone: '' })
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ملخص الفاتورة */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              ملخص الفاتورة
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-gray-600 dark:text-gray-400">عدد المنتجات:</span>
                <span className="font-medium text-gray-800 dark:text-white">{cartItems.length}</span>
              </div>
              
              <div className="flex justify-between text-lg">
                <span className="text-gray-600 dark:text-gray-400">إجمالي الكمية:</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span className="text-gray-800 dark:text-white">الإجمالي:</span>
                  <span className="text-green-600 dark:text-green-400">{total.toFixed(2)} جنيه</span>
                </div>
              </div>
            </div>
            
            {/* Modified payment buttons section */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => processPayment(true)}
                disabled={cartItems.length === 0 || loading}
                className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
              >
                {loading ? 'جاري المعالجة...' : 'إتمام الدفع مع الطباعة'}
              </button>
              
              <button
                onClick={() => processPayment(false)}
                disabled={cartItems.length === 0 || loading}
                className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
              >
                {loading ? 'جاري المعالجة...' : 'إتمام الدفع بدون طباعة'}
              </button>
              
              <button
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                مسح العربة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* عرض الفاتورة */}
      {showReceipt && currentInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <Receipt ref={receiptRef} invoiceData={currentInvoice} />
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => {
                  if (receiptRef.current) {
                    receiptRef.current.handlePrint();
                  }
                }}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                طباعة
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PointOfSale