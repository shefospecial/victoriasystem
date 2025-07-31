from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.wastage import Wastage, WastageReason
from src.models.product import Product
from src.services.telegram_service import telegram_service
from datetime import datetime, timedelta
from sqlalchemy import func, desc

wastage_bp = Blueprint('wastage', __name__)

@wastage_bp.route('/wastages', methods=['GET'])
def get_wastages():
    """جلب جميع الهوالك مع التصفية والبحث"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        reason_filter = request.args.get('reason', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        
        query = Wastage.query
        
        # البحث في اسم المنتج أو الباركود
        if search:
            query = query.join(Product).filter(
                db.or_(
                    Product.name.contains(search),
                    Product.serial_number.contains(search),
                    Wastage.recorded_by.contains(search)
                )
            )
        
        # تصفية حسب السبب
        if reason_filter:
            query = query.filter(Wastage.reason == reason_filter)
        
        # تصفية حسب التاريخ
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(Wastage.created_at >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(Wastage.created_at < to_date)
            except ValueError:
                pass
        
        # ترتيب حسب التاريخ (الأحدث أولاً)
        query = query.order_by(desc(Wastage.created_at))
        
        # التصفح
        wastages = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'wastages': [wastage.to_dict() for wastage in wastages.items],
            'total': wastages.total,
            'pages': wastages.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wastage_bp.route('/wastages', methods=['POST'])
def create_wastage():
    """إنشاء هوالك جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['product_id', 'quantity', 'reason', 'recorded_by']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'حقل {field} مطلوب'}), 400
        
        # التحقق من وجود المنتج
        product = Product.query.get(data['product_id'])
        if not product:
            return jsonify({'success': False, 'error': 'المنتج غير موجود'}), 404
        
        # التحقق من توفر الكمية
        if product.quantity < data['quantity']:
            return jsonify({
                'success': False, 
                'error': f'الكمية المطلوبة ({data["quantity"]}) أكبر من المتوفر ({product.quantity})'
            }), 400
        
        # حساب التكلفة
        cost_per_unit = data.get('cost_per_unit', product.purchase_price)
        total_cost = cost_per_unit * data['quantity']
        
        # إنشاء سجل الهوالك
        wastage = Wastage(
            product_id=data['product_id'],
            quantity=data['quantity'],
            reason=data['reason'],
            cost_per_unit=cost_per_unit,
            total_cost=total_cost,
            notes=data.get('notes', ''),
            recorded_by=data['recorded_by']
        )
        
        # خصم الكمية من المخزون
        product.quantity -= data['quantity']
        
        db.session.add(wastage)
        db.session.commit()
        
        # إرسال إشعار تليجرام للهوالك
        try:
            waste_data = wastage.to_dict()
            waste_data['product_name'] = product.name
            telegram_service.send_waste_notification(waste_data)
        except Exception as e:
            print(f"خطأ في إرسال إشعار التليجرام: {e}")
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل الهوالك بنجاح',
            'wastage': wastage.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@wastage_bp.route('/wastages/<int:wastage_id>', methods=['DELETE'])
def delete_wastage(wastage_id):
    """حذف سجل هوالك (إرجاع الكمية للمخزون)"""
    try:
        wastage = Wastage.query.get_or_404(wastage_id)
        product = Product.query.get(wastage.product_id)
        
        if product:
            # إرجاع الكمية للمخزون
            product.quantity += wastage.quantity
        
        db.session.delete(wastage)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم حذف سجل الهوالك وإرجاع الكمية للمخزون'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@wastage_bp.route('/wastages/statistics', methods=['GET'])
def get_wastage_statistics():
    """إحصائيات الهوالك"""
    try:
        # فترة الإحصائيات (افتراضياً آخر 30 يوم)
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # إجمالي الهوالك في الفترة
        total_wastages = db.session.query(func.count(Wastage.id)).filter(
            Wastage.created_at >= start_date
        ).scalar()
        
        # إجمالي الخسائر المالية
        total_cost = db.session.query(func.sum(Wastage.total_cost)).filter(
            Wastage.created_at >= start_date
        ).scalar() or 0
        
        # إجمالي الكميات المهدرة
        total_quantity = db.session.query(func.sum(Wastage.quantity)).filter(
            Wastage.created_at >= start_date
        ).scalar() or 0
        
        # الهوالك حسب السبب
        wastage_by_reason = db.session.query(
            Wastage.reason,
            func.count(Wastage.id).label('count'),
            func.sum(Wastage.total_cost).label('total_cost'),
            func.sum(Wastage.quantity).label('total_quantity')
        ).filter(
            Wastage.created_at >= start_date
        ).group_by(Wastage.reason).all()
        
        # أكثر المنتجات هدراً
        top_wasted_products = db.session.query(
            Product.name,
            Product.serial_number,
            func.sum(Wastage.quantity).label('total_quantity'),
            func.sum(Wastage.total_cost).label('total_cost')
        ).join(Wastage).filter(
            Wastage.created_at >= start_date
        ).group_by(Product.id).order_by(
            desc(func.sum(Wastage.total_cost))
        ).limit(10).all()
        
        # الهوالك اليومية (آخر 7 أيام)
        daily_wastages = []
        for i in range(7):
            day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            day_total = db.session.query(func.sum(Wastage.total_cost)).filter(
                Wastage.created_at >= day_start,
                Wastage.created_at < day_end
            ).scalar() or 0
            
            daily_wastages.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'total_cost': float(day_total)
            })
        
        return jsonify({
            'success': True,
            'statistics': {
                'period_days': days,
                'total_wastages': total_wastages,
                'total_cost': float(total_cost),
                'total_quantity': total_quantity,
                'wastage_by_reason': [
                    {
                        'reason': reason,
                        'count': count,
                        'total_cost': float(total_cost or 0),
                        'total_quantity': total_quantity or 0
                    }
                    for reason, count, total_cost, total_quantity in wastage_by_reason
                ],
                'top_wasted_products': [
                    {
                        'name': name,
                        'barcode': serial_number,
                        'total_quantity': total_quantity or 0,
                        'total_cost': float(total_cost or 0)
                    }
                    for name, serial_number, total_quantity, total_cost in top_wasted_products
                ],
                'daily_wastages': list(reversed(daily_wastages))
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wastage_bp.route('/wastage-reasons', methods=['GET'])
def get_wastage_reasons():
    """جلب أسباب الهوالك"""
    try:
        reasons = WastageReason.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'reasons': [reason.to_dict() for reason in reasons]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wastage_bp.route('/wastage-reasons', methods=['POST'])
def create_wastage_reason():
    """إضافة سبب هوالك جديد"""
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'success': False, 'error': 'اسم السبب مطلوب'}), 400
        
        # التحقق من عدم وجود السبب مسبقاً
        existing = WastageReason.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'success': False, 'error': 'هذا السبب موجود مسبقاً'}), 400
        
        reason = WastageReason(
            name=data['name'],
            description=data.get('description', '')
        )
        
        db.session.add(reason)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة السبب بنجاح',
            'reason': reason.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# إضافة أسباب الهوالك الافتراضية
def init_default_wastage_reasons():
    """إضافة أسباب الهوالك الافتراضية"""
    default_reasons = [
        {'name': 'انتهاء الصلاحية', 'description': 'منتجات منتهية الصلاحية'},
        {'name': 'تلف أثناء النقل', 'description': 'تلف المنتج أثناء عملية النقل'},
        {'name': 'كسر أو تلف', 'description': 'كسر أو تلف المنتج'},
        {'name': 'عيب في التصنيع', 'description': 'عيب من المصنع'},
        {'name': 'سوء التخزين', 'description': 'تلف بسبب سوء التخزين'},
        {'name': 'أخرى', 'description': 'أسباب أخرى'}
    ]
    
    for reason_data in default_reasons:
        existing = WastageReason.query.filter_by(name=reason_data['name']).first()
        if not existing:
            reason = WastageReason(**reason_data)
            db.session.add(reason)
    
    try:
        db.session.commit()
    except:
        db.session.rollback()

