from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.product import Product
from src.services.telegram_service import telegram_service

product_bp = Blueprint('product', __name__)

@product_bp.route('/products', methods=['GET'])
def get_products():
    """الحصول على جميع المنتجات مع إمكانية البحث"""
    try:
        search_query = request.args.get('search', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        if search_query:
            products = Product.search(search_query)
        else:
            products = Product.query.paginate(
                page=page, per_page=per_page, error_out=False
            ).items
        
        return jsonify({
            'success': True,
            'products': [product.to_dict() for product in products],
            'total': len(products)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products/last-updated', methods=['GET'])
def get_products_last_updated():
    """Get the timestamp of the last product list update"""
    try:
        # Get the most recent product update time
        latest_product = Product.query.order_by(Product.updated_at.desc()).first()
        if latest_product:
            last_updated = latest_product.updated_at.isoformat()
        else:
            last_updated = None
        
        return jsonify({
            'success': True,
            'last_updated': last_updated,
            'total_products': Product.query.count()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """الحصول على منتج محدد"""
    try:
        product = Product.query.get_or_404(product_id)
        return jsonify({
            'success': True,
            'product': product.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products', methods=['POST'])
def create_product():
    """إنشاء منتج جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'purchase_price', 'selling_price', 'quantity']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'حقل {field} مطلوب'}), 400
        
        # معالجة حقل الباركود (يمكن أن يأتي كـ barcode أو serial_number)
        barcode_value = data.get('barcode') or data.get('serial_number')
        
        # التحقق من عدم تكرار الباركود
        if barcode_value:
            existing_product = Product.query.filter_by(serial_number=barcode_value).first()
            if existing_product:
                return jsonify({'success': False, 'error': 'الباركود موجود مسبقاً'}), 400
        
        product = Product(
            name=data['name'],
            purchase_price=float(data['purchase_price']),
            selling_price=float(data['selling_price']),
            quantity=int(data['quantity']),
            serial_number=barcode_value,
            category_id=data.get('category_id') if data.get('category_id') else None
        )
        
        db.session.add(product)
        db.session.commit()
        
        # إرسال إشعار تليجرام للمنتج الجديد
        try:
            product_data = product.to_dict()
            telegram_service.send_product_added_notification(product_data)
        except Exception as e:
            print(f"خطأ في إرسال إشعار التليجرام: {e}")
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء المنتج بنجاح',
            'product': product.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """تحديث منتج موجود"""
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        # معالجة حقل الباركود (يمكن أن يأتي كـ barcode أو serial_number)
        barcode_value = data.get('barcode') or data.get('serial_number')
        
        # التحقق من عدم تكرار الباركود
        if barcode_value and barcode_value != product.serial_number:
            existing_product = Product.query.filter_by(serial_number=barcode_value).first()
            if existing_product:
                return jsonify({'success': False, 'error': 'الباركود موجود مسبقاً'}), 400
        
        # تتبع التغييرات للإشعار
        changes = {}
        
        # تحديث البيانات
        if 'name' in data and data['name'] != product.name:
            changes['name'] = (product.name, data['name'])
            product.name = data['name']
        if 'purchase_price' in data and float(data['purchase_price']) != product.purchase_price:
            changes['purchase_price'] = (product.purchase_price, float(data['purchase_price']))
            product.purchase_price = float(data['purchase_price'])
        if 'selling_price' in data and float(data['selling_price']) != product.selling_price:
            changes['selling_price'] = (product.selling_price, float(data['selling_price']))
            product.selling_price = float(data['selling_price'])
        if 'quantity' in data and int(data['quantity']) != product.quantity:
            changes['quantity'] = (product.quantity, int(data['quantity']))
            product.set_quantity(int(data['quantity']))
        if barcode_value and barcode_value != (product.barcode or product.serial_number):
            changes['barcode'] = (product.barcode or product.serial_number, barcode_value)
            product.barcode = barcode_value
            product.serial_number = barcode_value
        if 'category_id' in data:
            new_category_id = data['category_id'] if data['category_id'] else None
            if new_category_id != product.category_id:
                changes['category_id'] = (product.category_id, new_category_id)
                product.category_id = new_category_id
        
        db.session.commit()
        
        # إرسال إشعار تليجرام للتحديث إذا كان هناك تغييرات
        if changes:
            try:
                product_data = product.to_dict()
                telegram_service.send_product_updated_notification(product_data, changes)
            except Exception as e:
                print(f"خطأ في إرسال إشعار التليجرام: {e}")
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث المنتج بنجاح',
            'product': product.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """حذف منتج"""
    try:
        product = Product.query.get_or_404(product_id)
        
        # التحقق من عدم وجود فواتير مرتبطة
        if product.invoice_items:
            return jsonify({
                'success': False, 
                'error': 'لا يمكن حذف المنتج لوجود فواتير مرتبطة به'
            }), 400
        
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم حذف المنتج بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products/<int:product_id>/quantity', methods=['PATCH'])
def update_product_quantity(product_id):
    """تحديث كمية المنتج (إضافة أو طرح)"""
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        if 'quantity_change' in data:
            product.update_quantity(int(data['quantity_change']))
        elif 'new_quantity' in data:
            product.set_quantity(int(data['new_quantity']))
        else:
            return jsonify({'success': False, 'error': 'quantity_change أو new_quantity مطلوب'}), 400
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث الكمية بنجاح',
            'product': product.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products/low-stock', methods=['GET'])
def get_low_stock_products():
    """الحصول على المنتجات ذات الكمية المنخفضة"""
    try:
        threshold = request.args.get('threshold', 3, type=int)
        products = Product.get_low_stock_products(threshold)
        
        return jsonify({
            'success': True,
            'products': [product.to_dict() for product in products],
            'total': len(products)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products/search/<string:query>', methods=['GET'])
def search_products(query):
    """البحث في المنتجات"""
    try:
        products = Product.search(query)
        return jsonify({
            'success': True,
            'products': [product.to_dict() for product in products],
            'total': len(products)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@product_bp.route('/products/barcode/<string:serial>', methods=['GET'])
def get_product_by_barcode(serial):
    """الحصول على منتج بالباركود/السيريال"""
    try:
        product = Product.query.filter_by(serial_number=serial).first()
        if not product:
            return jsonify({'success': False, 'error': 'المنتج غير موجود'}), 404
        
        return jsonify({
            'success': True,
            'product': product.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@product_bp.route('/products/statistics', methods=['GET'])
def get_product_statistics():
    """الحصول على إحصائيات المنتجات"""
    try:
        total_products = Product.query.count()
        active_products = Product.query.filter(Product.is_active == True).count()
        inactive_products = total_products - active_products
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_products': total_products,
                'active_products': active_products,
                'inactive_products': inactive_products
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500