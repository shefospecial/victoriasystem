from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.supplier_transaction import SupplierTransaction
from src.models.supplier import Supplier
from src.models.user import db

supplier_transaction_bp = Blueprint('supplier_transaction', __name__)

@supplier_transaction_bp.route('/supplier-transactions', methods=['POST'])
def create_transaction():
    """إضافة معاملة جديدة (شراء أو دفعة)"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['supplier_id', 'transaction_type', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        # التحقق من وجود الموزع
        supplier = Supplier.query.get(data['supplier_id'])
        if not supplier:
            return jsonify({'success': False, 'error': 'الموزع غير موجود'}), 404
        
        # التحقق من نوع المعاملة
        if data['transaction_type'] not in ['purchase', 'payment']:
            return jsonify({'success': False, 'error': 'نوع المعاملة غير صحيح'}), 400
        
        # إنشاء المعاملة الجديدة
        transaction = SupplierTransaction(
            supplier_id=data['supplier_id'],
            transaction_type=data['transaction_type'],
            amount=float(data['amount']),
            description=data.get('description', ''),
            reference_number=data.get('reference_number', ''),
            created_by=data.get('created_by', 'الإدارة')
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        # حساب الرصيد الجديد
        new_balance = SupplierTransaction.get_supplier_balance(data['supplier_id'])
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة المعاملة بنجاح',
            'transaction': transaction.to_dict(),
            'new_balance': new_balance
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_transaction_bp.route('/supplier-transactions/<int:supplier_id>', methods=['GET'])
def get_supplier_transactions(supplier_id):
    """الحصول على معاملات موزع معين"""
    try:
        # التحقق من وجود الموزع
        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            return jsonify({'success': False, 'error': 'الموزع غير موجود'}), 404
        
        # الحصول على المعاملات مع التصفية
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = SupplierTransaction.query.filter_by(supplier_id=supplier_id)
        
        # تطبيق فلاتر التاريخ
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(SupplierTransaction.created_at >= date_from_obj)
            except ValueError:
                return jsonify({'success': False, 'error': 'تاريخ البداية غير صحيح'}), 400
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                # إضافة 23:59:59 لتشمل اليوم كاملاً
                date_to_obj = date_to_obj.replace(hour=23, minute=59, second=59)
                query = query.filter(SupplierTransaction.created_at <= date_to_obj)
            except ValueError:
                return jsonify({'success': False, 'error': 'تاريخ النهاية غير صحيح'}), 400
        
        # ترتيب حسب التاريخ (الأحدث أولاً)
        query = query.order_by(SupplierTransaction.created_at.desc())
        
        # التصفح
        transactions_paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # حساب الرصيد الحالي
        current_balance = SupplierTransaction.get_supplier_balance(supplier_id)
        
        # حساب إجماليات الفترة المحددة
        period_purchases = db.session.query(db.func.sum(SupplierTransaction.amount)).filter(
            SupplierTransaction.supplier_id == supplier_id,
            SupplierTransaction.transaction_type == 'purchase'
        )
        period_payments = db.session.query(db.func.sum(SupplierTransaction.amount)).filter(
            SupplierTransaction.supplier_id == supplier_id,
            SupplierTransaction.transaction_type == 'payment'
        )
        
        if date_from:
            period_purchases = period_purchases.filter(SupplierTransaction.created_at >= date_from_obj)
            period_payments = period_payments.filter(SupplierTransaction.created_at >= date_from_obj)
        if date_to:
            period_purchases = period_purchases.filter(SupplierTransaction.created_at <= date_to_obj)
            period_payments = period_payments.filter(SupplierTransaction.created_at <= date_to_obj)
        
        period_purchases_total = period_purchases.scalar() or 0
        period_payments_total = period_payments.scalar() or 0
        
        return jsonify({
            'success': True,
            'transactions': [t.to_dict() for t in transactions_paginated.items],
            'pagination': {
                'page': page,
                'pages': transactions_paginated.pages,
                'per_page': per_page,
                'total': transactions_paginated.total
            },
            'supplier': supplier.to_dict(),
            'current_balance': current_balance,
            'period_summary': {
                'purchases': period_purchases_total,
                'payments': period_payments_total,
                'net': period_purchases_total - period_payments_total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_transaction_bp.route('/supplier-transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """حذف معاملة"""
    try:
        transaction = SupplierTransaction.query.get(transaction_id)
        if not transaction:
            return jsonify({'success': False, 'error': 'المعاملة غير موجودة'}), 404
        
        supplier_id = transaction.supplier_id
        db.session.delete(transaction)
        db.session.commit()
        
        # حساب الرصيد الجديد
        new_balance = SupplierTransaction.get_supplier_balance(supplier_id)
        
        return jsonify({
            'success': True,
            'message': 'تم حذف المعاملة بنجاح',
            'new_balance': new_balance
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@supplier_transaction_bp.route('/suppliers/<int:supplier_id>/balance', methods=['GET'])
def get_supplier_balance(supplier_id):
    """الحصول على رصيد موزع معين"""
    try:
        # التحقق من وجود الموزع
        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            return jsonify({'success': False, 'error': 'الموزع غير موجود'}), 404
        
        balance = SupplierTransaction.get_supplier_balance(supplier_id)
        
        # حساب إجماليات
        total_purchases = db.session.query(db.func.sum(SupplierTransaction.amount)).filter_by(
            supplier_id=supplier_id, 
            transaction_type='purchase'
        ).scalar() or 0
        
        total_payments = db.session.query(db.func.sum(SupplierTransaction.amount)).filter_by(
            supplier_id=supplier_id, 
            transaction_type='payment'
        ).scalar() or 0
        
        return jsonify({
            'success': True,
            'supplier': supplier.to_dict(),
            'balance': balance,
            'total_purchases': total_purchases,
            'total_payments': total_payments
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

