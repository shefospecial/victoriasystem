import { useState, useEffect } from 'react'
import { buildApiUrl } from '../config'

const AdminDashboard = ({ currentUser }) => {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30') // 30 days default

  useEffect(() => {
    fetchDashboardData()
  }, [selectedPeriod])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch multiple data sources
      const [
        salesResponse,
        productsResponse,
        customersResponse,
        suppliersResponse,
        wastageResponse,
        lowStockResponse
      ] = await Promise.all([
        fetch(buildApiUrl(`/invoices/statistics?days=${selectedPeriod}`)),
        fetch(buildApiUrl('/products/statistics')),
        fetch(buildApiUrl('/customers/statistics')),
        fetch(buildApiUrl('/suppliers/statistics')),
        fetch(buildApiUrl(`/wastages/statistics?days=${selectedPeriod}`)),
        fetch(buildApiUrl('/products/low-stock'))
      ])

      const [
        salesData,
        productsData,
        customersData,
        suppliersData,
        wastageData,
        lowStockData
      ] = await Promise.all([
        salesResponse.json(),
        productsResponse.json(),
        customersResponse.json(),
        suppliersResponse.json(),
        wastageResponse.json(),
        lowStockResponse.json()
      ])

      setDashboardData({
        sales: salesData.success ? salesData.statistics : {},
        products: productsData.success ? productsData.statistics : {},
        customers: customersData.success ? customersData.statistics : {},
        suppliers: suppliersData.success ? suppliersData.statistics : {},
        wastage: wastageData.success ? wastageData.statistics : {},
        lowStock: lowStockData.success ? lowStockData.products : []
      })

    } catch (error) {
      console.error('خطأ في جلب بيانات لوحة الإدارة:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="text-xl text-gray-600 dark:text-gray-400">جاري تحميل لوحة الإدارة...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          لوحة الإدارة
        </h1>
        
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            فترة التقرير:
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="7">آخر 7 أيام</option>
            <option value="30">آخر 30 يوم</option>
            <option value="90">آخر 3 شهور</option>
            <option value="365">آخر سنة</option>
          </select>
        </div>
      </div>

      {/* إحصائيات المبيعات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {dashboardData?.sales?.total_sales?.toFixed(2) || '0.00'} جنيه
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">عدد الفواتير</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {dashboardData?.sales?.total_invoices || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">متوسط الفاتورة</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {dashboardData?.sales?.average_invoice?.toFixed(2) || '0.00'} جنيه
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">نقاط الولاء المستخدمة</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {dashboardData?.sales?.loyalty_points_used || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">المنتجات</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إجمالي المنتجات</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {dashboardData?.products?.total_products || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">منتجات نشطة</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {dashboardData?.products?.active_products || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">منتجات غير نشطة</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {dashboardData?.products?.inactive_products || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">العملاء</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إجمالي العملاء</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {dashboardData?.customers?.total_customers || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">عملاء نشطون</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {dashboardData?.customers?.active_customers || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إجمالي نقاط الولاء</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {dashboardData?.customers?.total_loyalty_points || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">الموزعين</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إجمالي الموزعين</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {dashboardData?.suppliers?.total_suppliers || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">موزعين نشطون</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {dashboardData?.suppliers?.active_suppliers || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إجمالي المديونية</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {dashboardData?.suppliers?.total_balance?.toFixed(2) || '0.00'} جنيه
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* الهوالك والمنتجات ناقصة المخزون */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* إحصائيات الهوالك */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">الهوالك والخسائر</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إجمالي الهوالك</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {dashboardData?.wastage?.total_wastages || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إجمالي الكميات المهدرة</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {dashboardData?.wastage?.total_quantity || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إجمالي الخسائر</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {dashboardData?.wastage?.total_cost?.toFixed(2) || '0.00'} جنيه
              </span>
            </div>
          </div>
        </div>

        {/* المنتجات ناقصة المخزون */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            تنبيهات المخزون ({dashboardData?.lowStock?.length || 0})
          </h3>
          <div className="max-h-48 overflow-y-auto">
            {dashboardData?.lowStock?.length > 0 ? (
              <div className="space-y-2">
                {dashboardData.lowStock.slice(0, 5).map(product => (
                  <div key={product.id} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900 rounded">
                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                      {product.name}
                    </span>
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {product.stock_quantity} متبقي
                    </span>
                  </div>
                ))}
                {dashboardData.lowStock.length > 5 && (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                    و {dashboardData.lowStock.length - 5} منتجات أخرى
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                لا توجد تنبيهات مخزون
              </div>
            )}
          </div>
        </div>
      </div>

      {/* أزرار الإجراءات السريعة */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">الإجراءات السريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.reload()}
            className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm">تحديث البيانات</span>
            </div>
          </button>
          
          <button
            onClick={() => fetchDashboardData()}
            className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm">تقرير مفصل</span>
            </div>
          </button>
          
          <button
            onClick={() => alert('سيتم إضافة هذه الميزة قريباً')}
            className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">تصدير البيانات</span>
            </div>
          </button>
          
          <button
            onClick={() => alert('سيتم إضافة هذه الميزة قريباً')}
            className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm">الإعدادات</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

