#!/usr/bin/env python3
"""
سكريبت إعداد جدول الإعدادات لنظام فيكتوريا ستور
"""

import os
import sys
import sqlite3

def setup_settings_table():
    """إنشاء جدول الإعدادات وإضافة البيانات الافتراضية"""
    
    # مسار قاعدة البيانات
    db_path = "victoria-store-backend/src/database/app.db"
    
    if not os.path.exists(db_path):
        print("❌ قاعدة البيانات غير موجودة!")
        print("تأكد من تشغيل الخادم الخلفي أولاً لإنشاء قاعدة البيانات")
        return False
    
    try:
        # الاتصال بقاعدة البيانات
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # إنشاء جدول الإعدادات
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key VARCHAR(100) UNIQUE NOT NULL,
                value TEXT,
                description VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # إضافة الإعدادات الافتراضية
        default_settings = [
            ('telegram_bot_token', '8113580303:AAGdyjZ4b5hQpGDLynm7Fj2YkmoQq-ZgIAk', 'رمز بوت التليجرام'),
            ('telegram_chat_id', '-4508452489', 'معرف مجموعة التليجرام'),
            ('store_name', 'فيكتوريا ستور', 'اسم المتجر'),
            ('low_stock_threshold', '5', 'حد تنبيه نقص المخزون')
        ]
        
        for key, value, description in default_settings:
            cursor.execute("""
                INSERT OR IGNORE INTO settings (key, value, description)
                VALUES (?, ?, ?)
            """, (key, value, description))
        
        # حفظ التغييرات
        conn.commit()
        
        # التحقق من النتائج
        cursor.execute("SELECT COUNT(*) FROM settings")
        count = cursor.fetchone()[0]
        
        print(f"✅ تم إنشاء جدول الإعدادات بنجاح!")
        print(f"📊 عدد الإعدادات المضافة: {count}")
        
        # عرض الإعدادات
        cursor.execute("SELECT key, value, description FROM settings")
        settings = cursor.fetchall()
        
        print("\n📋 الإعدادات المضافة:")
        for key, value, description in settings:
            # إخفاء جزء من التوكن للأمان
            display_value = value
            if key == 'telegram_bot_token' and len(value) > 10:
                display_value = value[:10] + "..." + value[-5:]
            
            print(f"  • {key}: {display_value} ({description})")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ خطأ في إنشاء جدول الإعدادات: {e}")
        return False

def main():
    print("🚀 بدء إعداد جدول الإعدادات...")
    print("=" * 50)
    
    if setup_settings_table():
        print("\n" + "=" * 50)
        print("✅ تم الإعداد بنجاح!")
        print("\n📝 الخطوات التالية:")
        print("1. أعد تشغيل الخادم الخلفي")
        print("2. استبدل الملفات المرفقة")
        print("3. جرب إرسال رسالة اختبار")
    else:
        print("\n❌ فشل في الإعداد!")
        print("تأكد من وجود قاعدة البيانات وأعد المحاولة")

if __name__ == "__main__":
    main()

