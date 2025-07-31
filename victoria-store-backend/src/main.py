import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.product import Product
from src.models.invoice import Invoice, InvoiceItem
from src.models.reminder import Reminder
from src.models.admin import Admin
from src.models.customer import Customer
from src.models.supplier import Supplier, PurchaseOrder, PurchaseOrderItem, SupplierPayment
from src.models.supplier_transaction import SupplierTransaction
from src.models.wastage import Wastage, WastageReason
from src.models.category import Category
from src.models.settings import Settings  # إضافة نموذج الإعدادات
from src.routes.user import user_bp
from src.routes.product import product_bp
from src.routes.invoice import invoice_bp
from src.routes.customer import customer_bp
from src.routes.wastage import wastage_bp
from src.routes.supplier import supplier_bp
from src.routes.supplier_transaction import supplier_transaction_bp
from src.routes.category import category_bp
from src.routes.auth import auth_bp
from src.routes.settings import settings_bp  # إضافة routes الإعدادات

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'victoria_store_secret_key_2024'

# تمكين CORS للسماح بالوصول من الواجهة الأمامية
CORS(app, 
     origins="*",
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

# تسجيل جميع الطرق
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(product_bp, url_prefix='/api')
app.register_blueprint(invoice_bp, url_prefix='/api')
app.register_blueprint(customer_bp, url_prefix='/api')
app.register_blueprint(supplier_bp, url_prefix='/api')
app.register_blueprint(supplier_transaction_bp, url_prefix='/api')
app.register_blueprint(wastage_bp, url_prefix='/api')
app.register_blueprint(category_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(settings_bp, url_prefix='/api')  # إضافة routes الإعدادات

# إعداد قاعدة البيانات
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()
    # إنشاء حساب إدارة افتراضي
    Admin.create_default_admin()
    
    # إنشاء الإعدادات الافتراضية
    Settings.create_default_settings()
    
    # إضافة فئات افتراضية إذا لم تكن موجودة
    if Category.query.count() == 0:
        default_categories = [
            {'name': 'منتجات العناية الشخصية', 'description': 'شامبو، صابون، كريمات، معجون أسنان'},
            {'name': 'المشروبات', 'description': 'شاي، قهوة، عصائر، مياه'},
            {'name': 'المواد الغذائية', 'description': 'أرز، سكر، زيت، توابل'},
            {'name': 'منتجات التنظيف', 'description': 'منظفات، مطهرات، أدوات تنظيف'},
            {'name': 'أدوات منزلية', 'description': 'أطباق، أكواب، أدوات مطبخ'}
        ]
        
        for cat_data in default_categories:
            category = Category(
                name=cat_data['name'],
                description=cat_data['description'],
                is_active=True
            )
            db.session.add(category)
        
        db.session.commit()
        print("تم إضافة الفئات الافتراضية")
    
    # إضافة منتجات تجريبية إذا لم تكن موجودة
    if Product.query.count() == 0:
        # الحصول على الفئات لربطها بالمنتجات
        personal_care_cat = Category.query.filter_by(name='منتجات العناية الشخصية').first()
        beverages_cat = Category.query.filter_by(name='المشروبات').first()
        
        sample_products = [
            {
                'name': 'شامبو هيد آند شولدرز',
                'serial_number': 'HS001',
                'purchase_price': 45.0,
                'selling_price': 65.0,
                'quantity': 20,
                'category_id': personal_care_cat.id if personal_care_cat else None
            },
            {
                'name': 'صابون لوكس',
                'serial_number': 'LX002',
                'purchase_price': 8.0,
                'selling_price': 12.0,
                'quantity': 50,
                'category_id': personal_care_cat.id if personal_care_cat else None
            },
            {
                'name': 'معجون أسنان كولجيت',
                'serial_number': 'TP003',
                'purchase_price': 25.0,
                'selling_price': 35.0,
                'quantity': 15,
                'category_id': personal_care_cat.id if personal_care_cat else None
            },
            {
                'name': 'كريم نيفيا',
                'serial_number': 'NV004',
                'purchase_price': 30.0,
                'selling_price': 45.0,
                'quantity': 8,
                'category_id': personal_care_cat.id if personal_care_cat else None
            },
            {
                'name': 'شاي ليبتون',
                'serial_number': 'LT005',
                'purchase_price': 15.0,
                'selling_price': 22.0,
                'quantity': 25,
                'category_id': beverages_cat.id if beverages_cat else None
            }
        ]
        
        for product_data in sample_products:
            product = Product(
                name=product_data['name'],
                serial_number=product_data['serial_number'],
                purchase_price=product_data['purchase_price'],
                selling_price=product_data['selling_price'],
                quantity=product_data['quantity'],
                category_id=product_data['category_id']
            )
            db.session.add(product)
        
        db.session.commit()
        print("تم إضافة المنتجات التجريبية")
    
    print("تم إنشاء قاعدة البيانات وحساب الإدارة الافتراضي")

@app.route('/api/telegram/test', methods=['POST'])
def test_telegram():
    """اختبار اتصال تليجرام"""
    from flask import request, jsonify
    from src.services.telegram_service import telegram_service
    
    try:
        # إعادة تحميل الإعدادات
        telegram_service.bot_token = None
        telegram_service.chat_id = None
        
        # إرسال رسالة اختبار
        success = telegram_service.send_test_message()
        
        if success:
            return jsonify({'success': True, 'message': 'تم إرسال رسالة الاختبار بنجاح'})
        else:
            return jsonify({'success': False, 'error': 'فشل في إرسال رسالة الاختبار'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/telegram/check-low-stock', methods=['POST'])
def check_low_stock():
    """فحص المنتجات ناقصة المخزون وإرسال إشعار"""
    from flask import request, jsonify
    from src.services.telegram_service import telegram_service
    
    try:
        data = request.get_json()
        threshold = data.get('threshold', 3)
        
        # جلب المنتجات ناقصة المخزون
        low_stock_products = Product.get_low_stock_products(threshold)
        
        if low_stock_products:
            # تحويل المنتجات إلى قاموس
            products_data = [product.to_dict() for product in low_stock_products]
            
            # إرسال إشعار تليجرام
            success = telegram_service.send_low_stock_notification(products_data)
            
            if success:
                return jsonify({
                    'success': True, 
                    'message': f'تم إرسال إشعار لـ {len(products_data)} منتج ناقص المخزون',
                    'products_count': len(products_data)
                })
            else:
                return jsonify({'success': False, 'error': 'فشل في إرسال إشعار التليجرام'}), 400
        else:
            return jsonify({
                'success': True, 
                'message': 'لا توجد منتجات ناقصة المخزون',
                'products_count': 0
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # إضافة أسباب الهوالك الافتراضية
        from src.routes.wastage import init_default_wastage_reasons
        init_default_wastage_reasons()
    app.run(host='0.0.0.0', port=5000, debug=True)

