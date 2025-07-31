import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config';

const TelegramSettings = ({ currentUser }) => {
  const [settings, setSettings] = useState({
    bot_token: '',
    chat_id: '',
    notifications_enabled: true,
    invoice_notifications: true,
    product_notifications: true,
    wastage_notifications: true,
    low_stock_notifications: true,
    low_stock_threshold: 3
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // في التطبيق الحقيقي، سيتم جلب الإعدادات من الخادم
      // هنا سنستخدم localStorage كمثال
      const savedSettings = localStorage.getItem('telegram_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('خطأ في تحميل الإعدادات:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // في التطبيق الحقيقي، سيتم إرسال الإعدادات للخادم
      localStorage.setItem('telegram_settings', JSON.stringify(settings));
      setMessage('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('خطأ في حفظ الإعدادات');
      console.error('خطأ في حفظ الإعدادات:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!settings.bot_token || !settings.chat_id) {
      setTestMessage('يرجى إدخال رمز البوت ومعرف المجموعة أولاً');
      return;
    }

    setLoading(true);
    try {
      // محاولة إرسال رسالة اختبار
      const response = await fetch(buildApiUrl('/telegram/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_token: settings.bot_token,
          chat_id: settings.chat_id
        }),
      });

      if (response.ok) {
        setTestMessage('✅ تم إرسال رسالة الاختبار بنجاح!');
      } else {
        setTestMessage('❌ فشل في إرسال رسالة الاختبار');
      }
    } catch (error) {
      setTestMessage('❌ خطأ في الاتصال');
      console.error('خطأ في اختبار الاتصال:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setTestMessage(''), 5000);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📱</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">إعدادات تليجرام</h1>
          </div>

          {message && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {message}
            </div>
          )}

          {testMessage && (
            <div className={`mb-4 p-3 rounded ${
              testMessage.includes('✅') 
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {testMessage}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* إعدادات الاتصال */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
                إعدادات الاتصال
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رمز البوت (Bot Token)
                </label>
                <input
                  type="password"
                  value={settings.bot_token}
                  onChange={(e) => handleInputChange('bot_token', e.target.value)}
                  placeholder="1234567890:AAHdqTcvbXorOHM_A1-sl3BXPd28JJMWzPM"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  احصل على رمز البوت من @BotFather في تليجرام
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  معرف المجموعة (Chat ID)
                </label>
                <input
                  type="text"
                  value={settings.chat_id}
                  onChange={(e) => handleInputChange('chat_id', e.target.value)}
                  placeholder="-1001234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  معرف المجموعة أو القناة التي ستستقبل الإشعارات
                </p>
              </div>

              <button
                onClick={testConnection}
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'جاري الاختبار...' : 'اختبار الاتصال'}
              </button>
            </div>

            {/* إعدادات الإشعارات */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
                إعدادات الإشعارات
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications_enabled}
                    onChange={(e) => handleInputChange('notifications_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    تفعيل الإشعارات
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.invoice_notifications}
                    onChange={(e) => handleInputChange('invoice_notifications', e.target.checked)}
                    disabled={!settings.notifications_enabled}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    إشعارات الفواتير الجديدة
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.product_notifications}
                    onChange={(e) => handleInputChange('product_notifications', e.target.checked)}
                    disabled={!settings.notifications_enabled}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    إشعارات إضافة/تعديل المنتجات
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.wastage_notifications}
                    onChange={(e) => handleInputChange('wastage_notifications', e.target.checked)}
                    disabled={!settings.notifications_enabled}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    إشعارات الهوالك
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.low_stock_notifications}
                    onChange={(e) => handleInputChange('low_stock_notifications', e.target.checked)}
                    disabled={!settings.notifications_enabled}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    إشعارات نقص المخزون
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    حد التنبيه لنقص المخزون
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.low_stock_threshold}
                    onChange={(e) => handleInputChange('low_stock_threshold', parseInt(e.target.value))}
                    disabled={!settings.notifications_enabled || !settings.low_stock_notifications}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    سيتم إرسال تنبيه عندما تصل كمية المنتج لهذا الحد أو أقل
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              كيفية إعداد البوت:
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>ابحث عن @BotFather في تليجرام وابدأ محادثة معه</li>
              <li>أرسل الأمر /newbot لإنشاء بوت جديد</li>
              <li>اتبع التعليمات واختر اسماً للبوت</li>
              <li>انسخ رمز البوت (Bot Token) والصقه في الحقل أعلاه</li>
              <li>أضف البوت إلى المجموعة التي تريد استقبال الإشعارات فيها</li>
              <li>احصل على معرف المجموعة باستخدام @userinfobot</li>
            </ol>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={loading}
              className="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSettings;

