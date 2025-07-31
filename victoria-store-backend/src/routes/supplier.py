from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.user import db
from src.models.supplier import Supplier, PurchaseOrder, PurchaseOrderItem, SupplierPayment
from src.models.product import Product

supplier_bp = Blueprint('supplier', __name__)

# ===== إدارة الموزعين =====

@supplier_bp.route('/suppliers', methods=['GET'])
def get_suppliers():
    """الحصول على جميع الموزعين"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        query = Supplier.query
        
        # تصفية حسب الحالة
        if active_only:
            query = query.filter(Supplier.is_active == True)
        
        # البحث
        if search:
            query = query.filter(
                db.or_(
                    Supplier.name.contains(search),
                    Supplier.phone.contains(search)
                )
            )
        
        # ترتيب حسب الاسم
        query = query.order_by(Supplier.name)
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        suppliers = pagination.items
        
        suppliers_data = []
        for supplier in suppliers:
            supplier_dict = supplier.to_dict()
            # حساب الرصيد الحالي
            supplier_dict['balance'] = supplier.total_purchases - supplier.total_payments
            suppliers_data.append(supplier_dict)
        
        return jsonify({
            'success': True,
            'suppliers': suppliers_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_bp.route('/suppliers', methods=['POST'])
def create_supplier():
    """إنشاء موزع جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        if not data.get('name'):
            return jsonify({'success': False, 'error': 'اسم الموزع مطلوب'}), 400
        
        supplier = Supplier(
            name=data['name'],
            phone=data.get('phone'),  # اختياري
            notes=data.get('notes')
        )
        
        db.session.add(supplier)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الموزع بنجاح',
            'supplier': supplier.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_bp.route('/suppliers/<int:supplier_id>', methods=['GET'])
def get_supplier(supplier_id):
    """الحصول على موزع محدد"""
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        return jsonify({
            'success': True,
            'supplier': supplier.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
        
@supplier_bp.route('/suppliers/recalculate-balances', methods=['POST'])
def recalculate_balances():
    """إعادة حساب أرصدة جميع الموردين"""
    try:
        suppliers = Supplier.query.all()
        for supplier in suppliers:
            # حساب من قاعدة البيانات مباشرة
            total_purchases = db.session.query(db.func.sum(PurchaseOrder.total_amount)).filter_by(supplier_id=supplier.id).scalar() or 0
            total_payments = db.session.query(db.func.sum(SupplierPayment.amount)).filter_by(supplier_id=supplier.id).scalar() or 0
            
            # تحديث البيانات
            supplier.total_purchases = float(total_purchases)
            supplier.total_payments = float(total_payments)
            supplier.balance = float(total_purchases) - float(total_payments)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إعادة حساب الأرصدة بنجاح'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
        
@supplier_bp.route('/suppliers/<int:supplier_id>', methods=['PUT'])
def update_supplier(supplier_id):
    """تحديث بيانات موزع"""
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        data = request.get_json()
        
        # تحديث البيانات
        if 'name' in data:
            supplier.name = data['name']
        if 'phone' in data:
            supplier.phone = data['phone']
        if 'notes' in data:
            supplier.notes = data['notes']
        if 'is_active' in data:
            supplier.is_active = data['is_active']
        
        supplier.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث بيانات الموزع بنجاح',
            'supplier': supplier.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== أوامر الشراء =====

@supplier_bp.route('/purchase-orders', methods=['GET'])
def get_purchase_orders():
    """الحصول على جميع أوامر الشراء"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        supplier_id = request.args.get('supplier_id', type=int)
        status = request.args.get('status')
        payment_status = request.args.get('payment_status')
        
        query = PurchaseOrder.query
        
        # تصفية حسب الموزع
        if supplier_id:
            query = query.filter(PurchaseOrder.supplier_id == supplier_id)
        
        # تصفية حسب الحالة
        if status:
            query = query.filter(PurchaseOrder.status == status)
        
        # تصفية حسب حالة الدفع
        if payment_status:
            query = query.filter(PurchaseOrder.payment_status == payment_status)
        
        # ترتيب حسب التاريخ (الأحدث أولاً)
        query = query.order_by(PurchaseOrder.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        orders = pagination.items
        
        return jsonify({
            'success': True,
            'purchase_orders': [order.to_dict() for order in orders],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_bp.route('/purchase-orders', methods=['POST'])
def create_purchase_order():
    """إنشاء أمر شراء جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        if not data.get('supplier_id'):
            return jsonify({'success': False, 'error': 'معرف الموزع مطلوب'}), 400
        
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({'success': False, 'error': 'يجب إضافة عنصر واحد على الأقل'}), 400
        
        # التحقق من وجود الموزع
        supplier = Supplier.query.get(data['supplier_id'])
        if not supplier:
            return jsonify({'success': False, 'error': 'الموزع غير موجود'}), 400
        
        # إنشاء أمر الشراء
        purchase_order = PurchaseOrder(
            order_number=PurchaseOrder.generate_order_number(),
            supplier_id=data['supplier_id'],
            order_date=datetime.fromisoformat(data['order_date']) if data.get('order_date') else datetime.utcnow(),
            delivery_date=datetime.fromisoformat(data['delivery_date']) if data.get('delivery_date') else None,
            notes=data.get('notes')
        )
        
        db.session.add(purchase_order)
        db.session.flush()  # للحصول على ID
        
        # إضافة عناصر أمر الشراء
        for item_data in data['items']:
            product = Product.query.get(item_data['product_id'])
            if not product:
                return jsonify({'success': False, 'error': f'المنتج {item_data["product_id"]} غير موجود'}), 400
            
            item = PurchaseOrderItem(
                purchase_order_id=purchase_order.id,
                product_id=item_data['product_id'],
                quantity=int(item_data['quantity']),
                unit_cost=float(item_data['unit_cost'])
            )
            item.calculate_total()
            
            # تحديث كمية المنتج
            product.update_quantity(item.quantity)
            
            db.session.add(item)
        
        # حساب إجماليات أمر الشراء
        purchase_order.calculate_totals()
        
        # تحديث رصيد الموزع
        supplier.total_purchases += purchase_order.total_amount
        supplier.balance = supplier.total_purchases - supplier.total_payments
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء أمر الشراء بنجاح',
            'purchase_order': purchase_order.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_bp.route('/purchase-orders/<int:order_id>', methods=['GET'])
def get_purchase_order(order_id):
    """الحصول على أمر شراء محدد"""
    try:
        order = PurchaseOrder.query.get_or_404(order_id)
        return jsonify({
            'success': True,
            'purchase_order': order.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== المدفوعات =====

@supplier_bp.route('/supplier-payments', methods=['GET'])
def get_supplier_payments():
    """الحصول على جميع مدفوعات الموزعين"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        supplier_id = request.args.get('supplier_id', type=int)
        
        query = SupplierPayment.query
        
        # تصفية حسب الموزع
        if supplier_id:
            query = query.filter(SupplierPayment.supplier_id == supplier_id)
        
        # ترتيب حسب التاريخ (الأحدث أولاً)
        query = query.order_by(SupplierPayment.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        payments = pagination.items
        
        return jsonify({
            'success': True,
            'payments': [payment.to_dict() for payment in payments],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_bp.route('/supplier-payments', methods=['POST'])
def create_supplier_payment():
    """إنشاء دفعة جديدة لموزع"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        if not data.get('supplier_id'):
            return jsonify({'success': False, 'error': 'معرف الموزع مطلوب'}), 400
        
        if not data.get('amount') or float(data['amount']) <= 0:
            return jsonify({'success': False, 'error': 'مبلغ الدفعة يجب أن يكون أكبر من صفر'}), 400
        
        # التحقق من وجود الموزع
        supplier = Supplier.query.get(data['supplier_id'])
        if not supplier:
            return jsonify({'success': False, 'error': 'الموزع غير موجود'}), 400
        
        # إنشاء الدفعة
        payment = SupplierPayment(
            supplier_id=data['supplier_id'],
            purchase_order_id=data.get('purchase_order_id'),
            amount=float(data['amount']),
            payment_method=data.get('payment_method', 'cash'),
            payment_date=datetime.fromisoformat(data['payment_date']) if data.get('payment_date') else datetime.utcnow(),
            reference_number=data.get('reference_number'),
            notes=data.get('notes')
        )
        
        db.session.add(payment)
        
        # تحديث رصيد الموزع
        supplier.total_payments += payment.amount
        supplier.balance = supplier.total_purchases - supplier.total_payments
        
        # تحديث أمر الشراء إذا كان محدداً
        if payment.purchase_order_id:
            purchase_order = PurchaseOrder.query.get(payment.purchase_order_id)
            if purchase_order:
                purchase_order.paid_amount += payment.amount
                purchase_order.calculate_totals()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل الدفعة بنجاح',
            'payment': payment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== كشف الحساب =====

@supplier_bp.route('/suppliers/<int:supplier_id>/statement', methods=['GET'])
def get_supplier_statement(supplier_id):
    """الحصول على كشف حساب موزع"""
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        
        # الحصول على أوامر الشراء
        purchase_orders = PurchaseOrder.query.filter_by(supplier_id=supplier_id).order_by(PurchaseOrder.created_at.desc()).all()
        
        # الحصول على المدفوعات
        payments = SupplierPayment.query.filter_by(supplier_id=supplier_id).order_by(SupplierPayment.created_at.desc()).all()
        
        # إنشاء كشف الحساب المدمج
        transactions = []
        
        # إضافة أوامر الشراء
        for order in purchase_orders:
            transactions.append({
                'type': 'purchase',
                'date': order.created_at.isoformat(),
                'description': f'أمر شراء رقم {order.order_number}',
                'debit': order.total_amount,  # مدين (زيادة في المديونية)
                'credit': 0,
                'balance': 0,  # سيتم حسابه لاحقاً
                'reference': order.order_number,
                'details': order.to_dict()
            })
        
        # إضافة المدفوعات
        for payment in payments:
            transactions.append({
                'type': 'payment',
                'date': payment.created_at.isoformat(),
                'description': f'دفعة - {payment.payment_method}',
                'debit': 0,
                'credit': payment.amount,  # دائن (تقليل في المديونية)
                'balance': 0,  # سيتم حسابه لاحقاً
                'reference': payment.reference_number or f'PAY-{payment.id}',
                'details': payment.to_dict()
            })
        
        # ترتيب المعاملات حسب التاريخ
        transactions.sort(key=lambda x: x['date'])
        
        # حساب الرصيد التراكمي
        running_balance = 0
        for transaction in transactions:
            running_balance += transaction['debit'] - transaction['credit']
            transaction['balance'] = running_balance
        
        return jsonify({
            'success': True,
            'supplier': supplier.to_dict(),
            'transactions': transactions,
            'summary': {
                'total_purchases': supplier.total_purchases,
                'total_payments': supplier.total_payments,
                'current_balance': supplier.balance,
                'transaction_count': len(transactions)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@supplier_bp.route('/suppliers/statistics', methods=['GET'])
def get_supplier_statistics():
    """الحصول على إحصائيات الموزعين"""
    try:
        total_suppliers = Supplier.query.count()
        active_suppliers = Supplier.query.filter(Supplier.is_active == True).count()
        
        # إجمالي المديونية
        total_balance = db.session.query(db.func.sum(Supplier.balance)).scalar() or 0
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_suppliers': total_suppliers,
                'active_suppliers': active_suppliers,
                'total_balance': float(total_balance)
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_bp.route('/suppliers/<int:supplier_id>/fix-balance', methods=['POST'])
def fix_supplier_balance(supplier_id):
    """إصلاح رصيد مورد محدد"""
    try:
        # تحديث مباشر في قاعدة البيانات
        db.session.execute("""
            UPDATE suppliers 
            SET 
                total_purchases = (
                    SELECT COALESCE(SUM(total_amount), 0) 
                    FROM purchase_orders 
                    WHERE supplier_id = :supplier_id
                ),
                total_payments = (
                    SELECT COALESCE(SUM(amount), 0) 
                    FROM supplier_payments 
                    WHERE supplier_id = :supplier_id
                )
            WHERE id = :supplier_id
        """, {'supplier_id': supplier_id})
        
        # تحديث الرصيد
        db.session.execute("""
            UPDATE suppliers 
            SET balance = total_purchases - total_payments 
            WHERE id = :supplier_id
        """, {'supplier_id': supplier_id})
        
        db.session.commit()
        
        # جلب البيانات المحدثة
        supplier = Supplier.query.get(supplier_id)
        
        return jsonify({
            'success': True,
            'message': 'تم إصلاح الرصيد بنجاح',
            'supplier': supplier.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
