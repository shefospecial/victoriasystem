import { useState, useEffect } from 'react'
import { buildApiUrl } from './config'
import PointOfSale from './components/PointOfSale'
import SupplierManagement from './components/SupplierManagement'
import WastageManagement from './components/WastageManagement'
import TelegramSettings from './components/TelegramSettings'
import AdminDashboard from './components/AdminDashboard'
import ProductManagement from './components/ProductManagementNew'
import CategoryManagement from './components/CategoryManagement'
import InvoiceManagement from './components/InvoiceManagement'
import LoginForm from './components/LoginForm'
import './App.css'

// مكونات UI بسيطة
const Button = ({ children, variant = 'default', size = 'default', onClick, className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background'

  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
  }

  const sizes = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
    lg: 'h-11 px-8 rounded-md'
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

const Card = ({ children, className = '', ...props }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
)

const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
)

const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
)

const CardContent = ({ children, className = '', ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
)

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [darkMode, setDarkMode] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('token')
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser))
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
    setIsLoggedIn(false)
    setActiveTab('dashboard')
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch(buildApiUrl('/products'))
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('خطأ في جلب المنتجات:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  return (
    <div className={`min-h-screen bg-background ${darkMode ? 'dark' : ''}`}>
      {!isLoggedIn ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <div className="app-container">
          <header className="bg-primary text-primary-foreground p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold">فيكتوريا ستور - نظام الكاشير</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm">مرحباً، {user?.username}</span>
                <Button onClick={toggleDarkMode} variant="secondary" size="sm">
                  {darkMode ? '☀️' : '🌙'}
                </Button>
                <Button onClick={handleLogout} variant="secondary" size="sm">
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </header>

          <nav className="bg-secondary/10 border-b p-4">
            <div className="container mx-auto flex gap-2 justify-center flex-wrap">
              <Button variant={activeTab === 'dashboard' ? 'default' : 'outline'} onClick={() => setActiveTab('dashboard')}>🏠 الرئيسية</Button>
              <Button variant={activeTab === 'products' ? 'default' : 'outline'} onClick={() => setActiveTab('products')}>📦 المنتجات</Button>
              <Button variant={activeTab === 'categories' ? 'default' : 'outline'} onClick={() => setActiveTab('categories')}>🏷️ الفئات</Button>
              <Button variant={activeTab === 'sales' ? 'default' : 'outline'} onClick={() => setActiveTab('sales')}>🛒 نقطة البيع</Button>
              <Button variant={activeTab === 'invoices' ? 'default' : 'outline'} onClick={() => setActiveTab('invoices')}>🧾 الفواتير</Button>
              <Button variant={activeTab === 'suppliers' ? 'default' : 'outline'} onClick={() => setActiveTab('suppliers')}>🏭 الموزعين</Button>
              {user?.role === 'admin' && (
                <>
                  <Button variant={activeTab === 'wastage' ? 'default' : 'outline'} onClick={() => setActiveTab('wastage')}>🗑️ الهوالك</Button>
                  <Button variant={activeTab === 'telegram' ? 'default' : 'outline'} onClick={() => setActiveTab('telegram')}>📱 تليجرام</Button>
                  <Button variant={activeTab === 'admin' ? 'default' : 'outline'} onClick={() => setActiveTab('admin')}>📊 الإدارة</Button>
                </>
              )}
            </div>
          </nav>

          <main className="container mx-auto p-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-center">مرحباً بك في نظام فيكتوريا ستور</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader><CardTitle>إجمالي المنتجات</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-primary">{products.length}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>المبيعات اليوم</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-primary">0</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>الأرباح</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-primary">0 جنيه</p></CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'products' && <ProductManagement />}
            {activeTab === 'categories' && <CategoryManagement currentUser={user} />}
            {activeTab === 'invoices' && <InvoiceManagement />}

            <div style={{ display: activeTab === 'sales' ? 'block' : 'none' }}>
  <PointOfSale />
</div>

            {activeTab === 'suppliers' && <SupplierManagement />}
            {activeTab === 'wastage' && user?.role === 'admin' && <WastageManagement currentUser={user} />}
            {activeTab === 'telegram' && user?.role === 'admin' && <TelegramSettings currentUser={user} />}
            {activeTab === 'admin' && user?.role === 'admin' && <AdminDashboard currentUser={user} />}
          </main>
        </div>
      )}
    </div>
  )
}

export default App
