from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import jwt
from src.models.user import db
from src.models.admin import Admin
from src.models.product import Product
from src.models.invoice import Invoice
from src.models.reminder import Reminder

admin_bp = Blueprint('admin', __name__)

def generate_token(admin_id):
    """توليد JWT token"""
    payload = {
        'admin_id': admin_id,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, 'victoria_store_secret_key_2024', algorithm='HS256')

def verify_token(token):
    """التحقق من JWT token"""
    try:
        payload = jwt.decode(token, 'victoria_store_secret_key_2024', algorithms=['HS256'])
        return payload['admin_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """ديكوريتر للتحقق من المصادقة"""
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': 'رمز المصادقة مطلوب'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        admin_id = verify_token(token)
        if not admin_id:
            return jsonify({'success': False, 'error': 'رمز المصادقة غير صالح'}), 401
        
        admin = Admin.query.get(admin_id)
        if not admin or not admin.is_active:
            return jsonify({'success': False, 'error': 'المستخدم غير موجود أو غير نشط'}), 401
        
        request.current_admin = admin
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function

@admin_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """تسجيل دخول الإدارة"""
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'success': False, 'error': 'اسم المستخدم وكلمة المرور مطلوبان'}), 400
        
        admin = Admin.query.filter_by(username=data['username']).first()
        
        if not admin or not admin.check_password(data['password']):
            return jsonify({'success': False, 'error': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401
        
        if not admin.is_active:
            return jsonify({'success': False, 'error': 'الحساب غير نشط'}), 401
        
        # تحديث وقت آخر تسجيل دخول
        admin.update_last_login()
        db.session.commit()
        
        # توليد رمز المصادقة
        token = generate_token(admin.id)
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل الدخول بنجاح',
            'token': token,
            'admin': admin.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/admin/profile', methods=['GET'])
@require_auth
def get_admin_profile():
    """الحصول على ملف الإدارة الشخصي"""
    try:
        return jsonify({
            'success': True,
            'admin': request.current_admin.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/admin/dashboard', methods=['GET'])
@require_auth
def get_dashboard_stats():
    """إحصائيات لوحة التحكم"""
    try:
        # إحصائيات عامة
        total_products = Product.query.count()
        low_stock_products = len(Product.get_low_stock_products())
        
        # إحصائيات المبيعات (آخر 30 يوم)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_invoices = Invoice.get_sales_by_date_range(thirty_days_ago, datetime.now())
        
        total_sales = sum(inv.total_amount for inv in recent_invoices if inv.status == 'completed')
        total_profit = sum(inv.profit for inv in recent_invoices if inv.status == 'completed')
        total_invoices = len([inv for inv in recent_invoices if inv.status == 'completed'])
        
        # إحصائيات اليوم
        today = datetime.now().date()
        today_summary = Invoice.get_daily_sales_summary(today)
        
        # التذكيرات القادمة والمتأخرة
        upcoming_reminders = Reminder.get_upcoming_reminders(7)
        overdue_reminders = Reminder.get_overdue_reminders()
        
        # أفضل المنتجات مبيعاً (آخر 30 يوم)
        from sqlalchemy import func
        top_products = db.session.query(
            Product.name,
            func.sum(InvoiceItem.quantity).label('total_sold'),
            func.sum(InvoiceItem.total_price).label('total_revenue')
        ).join(InvoiceItem).join(Invoice).filter(
            Invoice.created_at >= thirty_days_ago,
            Invoice.status == 'completed'
        ).group_by(Product.id).order_by(func.sum(InvoiceItem.quantity).desc()).limit(5).all()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'products': {
                    'total': total_products,
                    'low_stock': low_stock_products
                },
                'sales_30_days': {
                    'total_sales': total_sales,
                    'total_profit': total_profit,
                    'total_invoices': total_invoices,
                    'average_invoice': total_sales / total_invoices if total_invoices > 0 else 0
                },
                'today': today_summary,
                'reminders': {
                    'upcoming': len(upcoming_reminders),
                    'overdue': len(overdue_reminders)
                },
                'top_products': [
                    {
                        'name': product.name,
                        'quantity_sold': product.total_sold,
                        'revenue': product.total_revenue
                    } for product in top_products
                ]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/admin/sales-report', methods=['GET'])
@require_auth
def get_sales_report():
    """تقرير المبيعات المفصل"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # تحديد الفترة الزمنية (افتراضياً آخر 30 يوم)
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        else:
            start_date = datetime.fromisoformat(start_date)
        
        if not end_date:
            end_date = datetime.now()
        else:
            end_date = datetime.fromisoformat(end_date)
        
        # الحصول على الفواتير
        invoices = Invoice.get_sales_by_date_range(start_date, end_date)
        completed_invoices = [inv for inv in invoices if inv.status == 'completed']
        
        # إحصائيات مفصلة
        total_sales = sum(inv.total_amount for inv in completed_invoices)
        total_cost = sum(inv.total_cost for inv in completed_invoices)
        total_profit = sum(inv.profit for inv in completed_invoices)
        
        # تجميع البيانات حسب التاريخ
        daily_data = {}
        for invoice in completed_invoices:
            date_key = invoice.created_at.date().isoformat()
            if date_key not in daily_data:
                daily_data[date_key] = {
                    'date': date_key,
                    'sales': 0,
                    'cost': 0,
                    'profit': 0,
                    'invoices_count': 0
                }
            
            daily_data[date_key]['sales'] += invoice.total_amount
            daily_data[date_key]['cost'] += invoice.total_cost
            daily_data[date_key]['profit'] += invoice.profit
            daily_data[date_key]['invoices_count'] += 1
        
        # ترتيب البيانات حسب التاريخ
        daily_data_list = sorted(daily_data.values(), key=lambda x: x['date'])
        
        return jsonify({
            'success': True,
            'report': {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'summary': {
                    'total_sales': total_sales,
                    'total_cost': total_cost,
                    'total_profit': total_profit,
                    'profit_margin': (total_profit / total_sales * 100) if total_sales > 0 else 0,
                    'total_invoices': len(completed_invoices),
                    'average_invoice_value': total_sales / len(completed_invoices) if completed_invoices else 0
                },
                'daily_data': daily_data_list,
                'invoices': [inv.to_dict() for inv in completed_invoices]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/admin/profit-report', methods=['GET'])
@require_auth
def get_profit_report():
    """تقرير الأرباح"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        else:
            start_date = datetime.fromisoformat(start_date)
        
        if not end_date:
            end_date = datetime.now()
        else:
            end_date = datetime.fromisoformat(end_date)
        
        # الحصول على الفواتير المكتملة
        invoices = Invoice.query.filter(
            Invoice.created_at >= start_date,
            Invoice.created_at <= end_date,
            Invoice.status == 'completed'
        ).all()
        
        # حساب الأرباح حسب المنتج
        from sqlalchemy import func
        product_profits = db.session.query(
            Product.name,
            func.sum(InvoiceItem.total_price - InvoiceItem.total_cost).label('profit'),
            func.sum(InvoiceItem.quantity).label('quantity_sold'),
            func.sum(InvoiceItem.total_price).label('revenue')
        ).join(InvoiceItem).join(Invoice).filter(
            Invoice.created_at >= start_date,
            Invoice.created_at <= end_date,
            Invoice.status == 'completed'
        ).group_by(Product.id).order_by(func.sum(InvoiceItem.total_price - InvoiceItem.total_cost).desc()).all()
        
        total_profit = sum(inv.profit for inv in invoices)
        total_revenue = sum(inv.total_amount for inv in invoices)
        
        return jsonify({
            'success': True,
            'profit_report': {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'summary': {
                    'total_profit': total_profit,
                    'total_revenue': total_revenue,
                    'profit_margin': (total_profit / total_revenue * 100) if total_revenue > 0 else 0
                },
                'product_profits': [
                    {
                        'product_name': product.name,
                        'profit': product.profit,
                        'quantity_sold': product.quantity_sold,
                        'revenue': product.revenue,
                        'profit_margin': (product.profit / product.revenue * 100) if product.revenue > 0 else 0
                    } for product in product_profits
                ]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/admin/low-stock-report', methods=['GET'])
@require_auth
def get_low_stock_report():
    """تقرير النواقص"""
    try:
        threshold = request.args.get('threshold', 3, type=int)
        low_stock_products = Product.get_low_stock_products(threshold)
        
        return jsonify({
            'success': True,
            'low_stock_report': {
                'threshold': threshold,
                'total_products': len(low_stock_products),
                'products': [product.to_dict() for product in low_stock_products]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

