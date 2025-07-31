from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.customer import Customer, LoyaltyTransaction
from src.models.user import db

customer_bp = Blueprint('customer', __name__)

@customer_bp.route('/customers', methods=['GET'])
def get_customers():
    """الحصول على جميع العملاء"""
    try:
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        query = Customer.query
        
        if search:
            query = query.filter(
                db.or_(
                    Customer.name.contains(search),
                    Customer.phone.contains(search),
                    Customer.email.contains(search)
                )
            )
        
        customers = query.order_by(Customer.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'customers': [customer.to_dict() for customer in customers.items],
            'total': customers.total,
            'pages': customers.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/customers', methods=['POST'])
def create_customer():
    """إنشاء عميل جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'اسم العميل مطلوب'}), 400
        
        # التحقق من عدم تكرار رقم الهاتف
        if data.get('phone'):
            existing_customer = Customer.query.filter_by(phone=data['phone']).first()
            if existing_customer:
                return jsonify({'success': False, 'message': 'رقم الهاتف مستخدم بالفعل'}), 400
        
        # التحقق من عدم تكرار البريد الإلكتروني
        if data.get('email'):
            existing_customer = Customer.query.filter_by(email=data['email']).first()
            if existing_customer:
                return jsonify({'success': False, 'message': 'البريد الإلكتروني مستخدم بالفعل'}), 400
        
        customer = Customer(
            name=data['name'],
            phone=data.get('phone'),
            email=data.get('email'),
            address=data.get('address')
        )
        
        db.session.add(customer)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء العميل بنجاح',
            'customer': customer.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    """الحصول على عميل محدد"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        return jsonify({
            'success': True,
            'customer': customer.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """تحديث بيانات عميل"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.get_json()
        
        # التحقق من عدم تكرار رقم الهاتف
        if data.get('phone') and data['phone'] != customer.phone:
            existing_customer = Customer.query.filter_by(phone=data['phone']).first()
            if existing_customer:
                return jsonify({'success': False, 'message': 'رقم الهاتف مستخدم بالفعل'}), 400
        
        # التحقق من عدم تكرار البريد الإلكتروني
        if data.get('email') and data['email'] != customer.email:
            existing_customer = Customer.query.filter_by(email=data['email']).first()
            if existing_customer:
                return jsonify({'success': False, 'message': 'البريد الإلكتروني مستخدم بالفعل'}), 400
        
        # تحديث البيانات
        customer.name = data.get('name', customer.name)
        customer.phone = data.get('phone', customer.phone)
        customer.email = data.get('email', customer.email)
        customer.address = data.get('address', customer.address)
        customer.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث بيانات العميل بنجاح',
            'customer': customer.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """حذف عميل"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        
        # التحقق من عدم وجود فواتير مرتبطة
        if customer.invoices:
            return jsonify({
                'success': False, 
                'message': 'لا يمكن حذف العميل لوجود فواتير مرتبطة به'
            }), 400
        
        db.session.delete(customer)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم حذف العميل بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/customers/search', methods=['GET'])
def search_customers():
    """البحث عن العملاء"""
    try:
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'success': True, 'customers': []})
        
        customers = Customer.query.filter(
            db.or_(
                Customer.name.contains(query),
                Customer.phone.contains(query)
            )
        ).limit(10).all()
        
        return jsonify({
            'success': True,
            'customers': [customer.to_dict() for customer in customers]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>/loyalty', methods=['GET'])
def get_customer_loyalty(customer_id):
    """الحصول على تاريخ نقاط الولاء للعميل"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        
        transactions = LoyaltyTransaction.query.filter_by(
            customer_id=customer_id
        ).order_by(LoyaltyTransaction.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'customer': customer.to_dict(),
            'transactions': [transaction.to_dict() for transaction in transactions]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>/loyalty/redeem', methods=['POST'])
def redeem_loyalty_points(customer_id):
    """استخدام نقاط الولاء"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.get_json()
        
        points = data.get('points', 0)
        description = data.get('description', 'استخدام نقاط الولاء')
        
        if points <= 0:
            return jsonify({'success': False, 'message': 'عدد النقاط يجب أن يكون أكبر من صفر'}), 400
        
        if customer.loyalty_points < points:
            return jsonify({
                'success': False, 
                'message': f'النقاط المتاحة ({customer.loyalty_points}) أقل من المطلوب ({points})'
            }), 400
        
        # استخدام النقاط
        customer.redeem_points(points)
        
        # تسجيل المعاملة
        transaction = LoyaltyTransaction(
            customer_id=customer_id,
            points=-points,
            transaction_type='redeemed',
            description=description
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'تم استخدام {points} نقطة بنجاح',
            'customer': customer.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>/invoices', methods=['GET'])
def get_customer_invoices(customer_id):
    """الحصول على فواتير العميل"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        
        invoices = [invoice.to_dict() for invoice in customer.invoices]
        
        return jsonify({
            'success': True,
            'customer': customer.to_dict(),
            'invoices': invoices
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@customer_bp.route('/customers/statistics', methods=['GET'])
def get_customer_statistics():
    """الحصول على إحصائيات العملاء"""
    try:
        total_customers = Customer.query.count()
        active_customers = Customer.query.filter(Customer.is_active == True).count()
        
        # إجمالي نقاط الولاء
        total_loyalty_points = db.session.query(db.func.sum(Customer.loyalty_points)).scalar() or 0
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_customers': total_customers,
                'active_customers': active_customers,
                'total_loyalty_points': int(total_loyalty_points)
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

