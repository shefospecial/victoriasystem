import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { buildApiUrl } from '../config'

function PointOfSale() {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })
  const [cartItems, setCartItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [duplicateProducts, setDuplicateProducts] = useState([])
  const [showDuplicates, setShowDuplicates] = useState(false)
  
  const barcodeInputRef = useRef(null)
  const searchInputRef = useRef(null)

  // جلب المنتجات عند تحميل المكون
  useEffect(() => {
    fetchProducts()
  }, [])

  // تركيز تلقائي على حقل الباركود
  useEffect(() => {
    const focusBarcode = () => {
      if (barcodeInputRef.current && !showDuplicates) {
        barcodeInputRef.current.focus()
      }
    }

    // تركيز فوري
    focusBarcode()

    // تركيز عند النقر في أي مكان
    const handleClick = () => {
      setTimeout(focusBarcode, 100)
    }

    // تركيز عند الضغط على أي مفتاح
    const handleKeyDown = (e) => {
      if (!showDuplicates && e.target !== searchInputRef.current) {
        focusBarcode()
      }
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDuplicates])

  // حساب الإجمالي عند تغيير العربة
  useEffect(() => {
    const newTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    setTotal(newTotal)
  }, [cartItems])

  const fetchProducts = async () => {
    try {
      const response = await fetch(buildApiUrl('/products'))
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('خطأ في جلب المنتجات:', error)
    }
  }

  const searchCustomers = async (query) => {
    if (!query.trim()) {
      setCustomers([])
      return
    }
    
    try {
      const response = await fetch(buildApiUrl(`/customers/search?q=${encodeURIComponent(query)}`))
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('خطأ في البحث عن العملاء:', error)
    }
  }

  const createCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('اسم العميل مطلوب')
      return
    }

    try {
      const response = await fetch(buildApiUrl('/customers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomer)
      })

      const data = await response.json()
      
      if (data.success) {
        setSelectedCustomer(data.customer)
        setShowCustomerForm(false)
        setNewCustomer({ name: '', phone: '' })
        setCustomerSearch('')
        alert('تم إنشاء العميل بنجاح')
      } else {
        alert(data.message || 'حدث خطأ في إنشاء العميل')
      }
    } catch (error) {
      console.error('خطأ في إنشاء العميل:', error)
      alert('حدث خطأ في إنشاء العميل')
    }
  }

  // البحث عن المنتج بالباركود
  const handleBarcodeInput = (e) => {
    const value = e.target.value
    setBarcodeInput(value)

    // البحث التلقائي عند إدخال الباركود
    if (value.length >= 3) {
      searchProductByBarcode(value)
    }
  }

  const searchProductByBarcode = (barcode) => {
    const foundProducts = products.filter(product => 
      (product.barcode && product.barcode.includes(barcode)) ||
      (product.serial_number && product.serial_number.includes(barcode))
    )

    if (foundProducts.length === 1) {
      // منتج واحد فقط - إضافة مباشرة
      addToCart(foundProducts[0])
      setBarcodeInput('')
    } else if (foundProducts.length > 1) {
      // عدة منتجات - عرض قائمة للاختيار
      setDuplicateProducts(foundProducts)
      setShowDuplicates(true)
    }
  }

  // البحث بالاسم
  const searchProducts = () => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm)) ||
      (product.serial_number && product.serial_number.includes(searchTerm))
    )
  }

  // إضافة منتج للعربة
  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id)
    
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCartItems([...cartItems, {
        id: product.id,
        name: product.name,
        price: product.selling_price,
        quantity: 1,
        barcode: product.barcode || product.serial_number
      }])
    }
  }

  // اختيار منتج من القائمة المكررة
  const selectDuplicateProduct = (product) => {
    addToCart(product)
    setShowDuplicates(false)
    setDuplicateProducts([])
    setBarcodeInput('')
  }

  // إزالة منتج من العربة
  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId))
  }

  // تحديث كمية المنتج
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCartItems(cartItems.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  // تحديث سعر المنتج في الفاتورة
  const updatePrice = (productId, newPrice) => {
    setCartItems(cartItems.map(item =>
      item.id === productId
        ? { ...item, price: parseFloat(newPrice) || 0 }
        : item
    ))
  }

  // إتمام البيع
  const completeSale = async () => {
    if (cartItems.length === 0) {
      alert('العربة فارغة!')
      return
    }

    setLoading(true)
    try {
      const invoice = {
        customer_id: selectedCustomer?.id || null,
        items: cartItems,
        total: total,
        date: new Date().toISOString()
      }

      const response = await fetch(buildApiUrl('/invoices'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoice)
      })

      const data = await response.json()

      if (data.success) {
        let message = 'تم إتمام البيع بنجاح!'
        
        // إضافة معلومات نقاط الولاء إذا كان هناك عميل
        if (selectedCustomer && data.loyalty_points_earned) {
          message += `\nتم إضافة ${data.loyalty_points_earned} نقطة ولاء للعميل`
        }
        
        alert(message)
        
        // إعادة تعيين النموذج
        setCartItems([])
        setBarcodeInput('')
        setSearchTerm('')
        setSelectedCustomer(null)
        setCustomerSearch('')
      } else {
        alert(data.message || 'حدث خطأ في إتمام البيع')
      }
    } catch (error) {
      console.error('خطأ في إتمام البيع:', error)
      alert('حدث خطأ في إتمام البيع')
    } finally {
      setLoading(false)
    }
  }

  // مسح العربة
  const clearCart = () => {
    setCartItems([])
    setBarcodeInput('')
  }

  const filteredProducts = searchProducts()

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">نقطة البيع</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* قسم البحث والمنتجات */}
        <div className="space-y-4">
          {/* قارئ الباركود */}
          <Card>
            <CardHeader>
              <CardTitle>قارئ الباركود</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                ref={barcodeInputRef}
                type="text"
                placeholder="امسح الباركود أو اكتب رقمه..."
                value={barcodeInput}
                onChange={handleBarcodeInput}
                className="text-lg"
                autoFocus
              />
              <p className="text-sm text-muted-foreground mt-2">
                قم بتوجيه قارئ الباركود للمنتج أو اكتب الرقم يدوياً
              </p>
            </CardContent>
          </Card>

          {/* قسم العملاء */}
          <Card>
            <CardHeader>
              <CardTitle>العميل</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-secondary/50 rounded">
                    <div>
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.phone || 'لا يوجد رقم هاتف'}
                      </p>
                      <p className="text-sm text-green-600">
                        نقاط الولاء: {selectedCustomer.loyalty_points || 0}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCustomerSearch('')
                      }}
                      variant="outline"
                      size="sm"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="ابحث عن عميل بالاسم أو الهاتف..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      searchCustomers(e.target.value)
                    }}
                  />
                  
                  {customers.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {customers.map(customer => (
                        <div
                          key={customer.id}
                          className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-secondary/50"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setCustomers([])
                            setCustomerSearch('')
                          }}
                        >
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.phone || 'لا يوجد رقم هاتف'}
                            </p>
                          </div>
                          <span className="text-xs text-green-600">
                            {customer.loyalty_points || 0} نقطة
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    onClick={() => setShowCustomerForm(true)}
                    variant="outline"
                    className="w-full"
                  >
                    إضافة عميل جديد
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* البحث السريع */}
          <Card>
            <CardHeader>
              <CardTitle>البحث السريع</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* نتائج البحث */}
          {searchTerm && (
            <Card>
              <CardHeader>
                <CardTitle>نتائج البحث</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-secondary/50"
                      onClick={() => addToCart(product)}
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.selling_price} جنيه - الكمية: {product.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          الرقم: {product.serial_number || product.barcode || 'غير محدد'}
                        </p>
                      </div>
                      <Button size="sm">إضافة</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* العربة والفاتورة */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الفاتورة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    العربة فارغة
                  </p>
                ) : (
                  cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.barcode}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                          className="w-16 h-8 text-xs"
                          min="1"
                        />
                        <span className="text-xs">×</span>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updatePrice(item.id, e.target.value)}
                          className="w-20 h-8 text-xs"
                          step="0.01"
                        />
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{(item.price * item.quantity).toFixed(2)}</p>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                          className="h-6 text-xs"
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>الإجمالي:</span>
                    <span>{total.toFixed(2)} جنيه</span>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={completeSale}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'جاري الحفظ...' : 'إتمام البيع'}
                    </Button>
                    <Button
                      onClick={clearCart}
                      variant="outline"
                    >
                      مسح الكل
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* نموذج إضافة عميل جديد */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>إضافة عميل جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">اسم العميل *</label>
                  <Input
                    type="text"
                    placeholder="أدخل اسم العميل"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                  <Input
                    type="text"
                    placeholder="أدخل رقم الهاتف (اختياري)"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={createCustomer}
                    className="flex-1"
                  >
                    إضافة العميل
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCustomerForm(false)
                      setNewCustomer({ name: '', phone: '' })
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* نافذة اختيار المنتجات المكررة */}
      {showDuplicates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>اختر المنتج</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">تم العثور على عدة منتجات بنفس الباركود:</p>
              <div className="space-y-2">
                {duplicateProducts.map(product => (
                  <div
                    key={product.id}
                    className="p-3 border rounded cursor-pointer hover:bg-secondary/50"
                    onClick={() => selectDuplicateProduct(product)}
                  >
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.selling_price} جنيه - الكمية: {product.quantity}
                    </p>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => {
                  setShowDuplicates(false)
                  setDuplicateProducts([])
                  setBarcodeInput('')
                }}
                variant="outline"
                className="w-full mt-4"
              >
                إلغاء
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default PointOfSale

