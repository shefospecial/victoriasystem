import requests
import json
from datetime import datetime
import os

class TelegramService:
    def __init__(self):
        self.bot_token = None
        self.chat_id = None
        self.base_url = None
        
    def _load_settings(self):
        """جلب إعدادات التليجرام من قاعدة البيانات"""
        if self.bot_token and self.chat_id:
            return  # الإعدادات محملة بالفعل
            
        try:
            from src.models.settings import Settings
            
            # جلب إعدادات التليجرام من قاعدة البيانات
            self.bot_token = Settings.get_value("telegram_bot_token")
            self.chat_id = Settings.get_value("telegram_chat_id")
            
            if self.bot_token:
                self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
            else:
                self.base_url = None
                    
        except Exception as e:
            print(f"خطأ في جلب إعدادات التليجرام: {e}")
            self.bot_token = None
            self.chat_id = None
            self.base_url = None

    def send_message(self, message, parse_mode="HTML"):
        """إرسال رسالة للجروب"""
        self._load_settings()  # جلب الإعدادات عند الحاجة
        
        if not self.bot_token or not self.chat_id:
            print("إعدادات التليجرام غير مكتملة")
            return False
            
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                "chat_id": self.chat_id,
                "text": message,
                "parse_mode": parse_mode
            }
            
            response = requests.post(url, data=data, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"خطأ في إرسال رسالة التليجرام: {e}")
            return False
    
    def send_invoice_notification(self, invoice_data, username=None):
        """إشعار بفاتورة جديدة"""
        self._load_settings()
        
        if not self.bot_token or not self.chat_id:
            return False
            
        try:
            customer_info = ""
            if invoice_data.get("customer_name") and invoice_data["customer_name"] != "عميل":
                customer_info = f"\n👤 العميل: {invoice_data['customer_name']}"
                if invoice_data.get("customer_phone"):
                    customer_info += f"\n📱 الهاتف: {invoice_data['customer_phone']}"
            
            items_text = ""
            for item in invoice_data.get("items", []):
                items_text += f"\n• {item.get('product_name', 'منتج')} × {item['quantity']} = {item['total_price']} ج.م"
            
            user_info = f"\n\n✨ بواسطة: {username}" if username else ""

            message = f"""
🧾 <b>فاتورة جديدة - فيكتوريا ستور</b>

📅 التاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}
🆔 رقم الفاتورة: #{invoice_data.get("invoice_number", "غير محدد")}{customer_info}

📦 <b>المنتجات:</b>{items_text}

💰 <b>الإجمالي:</b> {invoice_data.get("total_amount", 0)} ج.م
💵 <b>طريقة الدفع:</b> {invoice_data.get("payment_method", "نقدي")}{user_info}

✅ تم إتمام البيع بنجاح
            """
            
            return self.send_message(message.strip())
        except Exception as e:
            print(f"خطأ في إرسال إشعار الفاتورة: {e}")
            return False
    
    def send_product_added_notification(self, product_data, username=None):
        """إشعار بإضافة منتج جديد"""
        self._load_settings()
        
        if not self.bot_token or not self.chat_id:
            return False
            
        try:
            user_info = f"\n\n✨ بواسطة: {username}" if username else ""
            message = f"""
📦 <b>منتج جديد - فيكتوريا ستور</b>

📅 التاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}

🏷️ <b>اسم المنتج:</b> {product_data.get("name", "غير محدد")}
🔢 <b>السيريال:</b> {product_data.get("serial_number", "غير محدد")}
💰 <b>سعر الشراء:</b> {product_data.get("purchase_price", 0)} ج.م
💵 <b>سعر البيع:</b> {product_data.get("selling_price", 0)} ج.م
📊 <b>الكمية:</b> {product_data.get("quantity", 0)} قطعة{user_info}

✅ تم إضافة المنتج بنجاح
            """
            
            return self.send_message(message.strip())
        except Exception as e:
            print(f"خطأ في إرسال إشعار المنتج الجديد: {e}")
            return False
    
    def send_product_updated_notification(self, product_data, changes, username=None):
        """إشعار بتعديل منتج"""
        self._load_settings()
        
        if not self.bot_token or not self.chat_id:
            return False
            
        try:
            changes_text = ""
            for field, (old_value, new_value) in changes.items():
                field_names = {
                    "name": "الاسم",
                    "serial_number": "السيريال",
                    "purchase_price": "سعر الشراء",
                    "selling_price": "سعر البيع",
                    "quantity": "الكمية"
                }
                field_name = field_names.get(field, field)
                changes_text += f"\n• {field_name}: {old_value} ← {new_value}"
            
            user_info = f"\n\n✨ بواسطة: {username}" if username else ""
            message = f"""
✏️ <b>تعديل منتج - فيكتوريا ستور</b>

📅 التاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}

🏷️ <b>المنتج:</b> {product_data.get("name", "غير محدد")}
🔢 <b>السيريال:</b> {product_data.get("serial_number", "غير محدد")}

📝 <b>التغييرات:</b>{changes_text}{user_info}

✅ تم تحديث المنتج بنجاح
            """
            
            return self.send_message(message.strip())
        except Exception as e:
            print(f"خطأ في إرسال إشعار تعديل المنتج: {e}")
            return False
    
    def send_low_stock_notification(self, products, username=None):
        """إشعار بالمنتجات الناقصة"""
        self._load_settings()
        
        if not self.bot_token or not self.chat_id:
            return False
            
        try:
            if not products:
                return True
                
            products_text = ""
            for product in products:
                products_text += f"\n• {product.get('name', 'غير محدد')} - متبقي: {product.get('quantity', 0)} قطعة"
            
            user_info = f"\n\n✨ بواسطة: {username}" if username else ""
            message = f"""
⚠️ <b>تنبيه مخزون - فيكتوريا ستور</b>

📅 التاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}

🔻 <b>منتجات تحتاج إعادة تموين:</b>{products_text}{user_info}

⚡ يرجى إعادة تموين هذه المنتجات قريباً
            """
            
            return self.send_message(message.strip())
        except Exception as e:
            print(f"خطأ في إرسال إشعار المخزون المنخفض: {e}")
            return False
    
    def send_waste_notification(self, waste_data, username=None):
        """إشعار بالهوالك"""
        self._load_settings()
        
        if not self.bot_token or not self.chat_id:
            return False
            
        try:
            user_info = f"\n\n✨ بواسطة: {username}" if username else ""
            message = f"""
🗑️ <b>هوالك - فيكتوريا ستور</b>

📅 التاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}

🏷️ <b>المنتج:</b> {waste_data.get("product_name", "غير محدد")}
📊 <b>الكمية المهدرة:</b> {waste_data.get("quantity", 0)} قطعة
📝 <b>السبب:</b> {waste_data.get("reason", "غير محدد")}{user_info}

⚠️ تم خصم الكمية من المخزون
            """
            
            return self.send_message(message.strip())
        except Exception as e:
            print(f"خطأ في إرسال إشعار الهوالك: {e}")
            return False

    def send_test_message(self):
        """إرسال رسالة اختبار"""
        self._load_settings()
        
        if not self.bot_token or not self.chat_id:
            print("إعدادات التليجرام غير مكتملة")
            return False
            
        try:
            message = f"""
🧪 <b>رسالة اختبار - فيكتوريا ستور</b>

📅 التاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}

✅ تم الاتصال بنجاح مع بوت التليجرام
🤖 البوت يعمل بشكل صحيح
📱 الإشعارات مفعلة

💡 يمكنك الآن استقبال إشعارات:
• الفواتير الجديدة
• إضافة المنتجات
• تحديث المخزون
• الهوالك والخسائر
            """
            
            return self.send_message(message.strip())
        except Exception as e:
            print(f"خطأ في إرسال رسالة الاختبار: {e}")
            return False

# إنشاء مثيل واحد للاستخدام
telegram_service = TelegramService()