from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from src.models.user import db
from src.models.invoice import Invoice, InvoiceItem
from src.models.product import Product
from src.models.customer import Customer, LoyaltyTransaction
from src.models.category import Category  # إضافة استيراد Category
from src.services.telegram_service import telegram_service
from src.services.print_service import print_service
import logging

invoice_bp = Blueprint('invoice', __name__)

@invoice_bp.route('/invoices', methods=['GET'])
def get_invoices():
    """الحصول على جميع الفواتير مع إمكانية التصفية"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Invoice.query
        
        # تصفية حسب الحالة
        if status:
            query = query.filter(Invoice.status == status)
        
        # تصفية حسب التاريخ
        if start_date:
            start_date = datetime.fromisoformat(start_date)
            query = query.filter(Invoice.created_at >= start_date)
        
        if end_date:
            end_date = datetime.fromisoformat(end_date)
            query = query.filter(Invoice.created_at <= end_date)
        
        # ترتيب حسب التاريخ (الأحدث أولاً)
        query = query.order_by(Invoice.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        invoices = pagination.items
        
        return jsonify({
            'success': True,
            'invoices': [invoice.to_dict() for invoice in invoices],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@invoice_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """الحصول على فاتورة محددة"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        return jsonify({
            'success': True,
            'invoice': invoice.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@invoice_bp.route('/invoices', methods=['POST'])
def create_invoice():
    """إنشاء فاتورة جديدة"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'لم يتم استلام بيانات'}), 400
        
        # التحقق من وجود عناصر في الفاتورة
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({'success': False, 'error': 'الفاتورة يجب أن تحتوي على عنصر واحد على الأقل'}), 400
        
        # Get print flag (default to True for backward compatibility)
        should_print = data.get('print_receipt', True)
        
        # إنشاء الفاتورة
        invoice = Invoice(
            invoice_number=Invoice.generate_invoice_number(),
            customer_id=data.get('customer_id'),
            tax_amount=float(data.get('tax_amount', 0)),
            discount_amount=float(data.get('discount_amount', 0)),
            payment_method=data.get('payment_method', 'cash')
        )
        
        db.session.add(invoice)
        db.session.flush()  # للحصول على ID الفاتورة
        
        # قائمة الفئات المحدثة لتجنب التكرار
        updated_categories = {}
        
        # إضافة عناصر الفاتورة
        for item_data in data['items']:
            product = Product.query.get(item_data['product_id'])
            if not product:
                return jsonify({'success': False, 'error': f'المنتج {item_data["product_id"]} غير موجود'}), 400
            
            quantity = int(item_data['quantity'])
            
            # التحقق من توفر الكمية
            #if product.quantity < quantity:
               # return jsonify({
                  #  'success': False, 
                 #   'error': f'الكمية المتاحة للمنتج {product.name} هي {product.quantity} فقط'
                #}), 400
            
            # إنشاء عنصر الفاتورة
            unit_price = float(item_data.get('unit_price', product.selling_price))
            invoice_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=unit_price,
                unit_cost=product.purchase_price,
                discount_amount=float(item_data.get('discount_amount', 0))
            )
            invoice_item.calculate_totals()
            
            # تحديث كمية المنتج
            product.update_quantity(-quantity)
            
            # تحديث رصيد الفئة - إضافة الجزء المفقود
            if product.category_id:
                category = Category.query.get(product.category_id)
                if category:
                    # حساب صافي المبيعات للعنصر (بعد خصم الخصم)
                    item_sales = invoice_item.total_price
                    
                    # تجميع المبيعات لكل فئة لتجنب التحديث المتكرر
                    if category.id in updated_categories:
                        updated_categories[category.id] += item_sales
                    else:
                        updated_categories[category.id] = item_sales
            
            db.session.add(invoice_item)
        
        # تحديث رصيد الفئات
        for category_id, sales_amount in updated_categories.items():
            category = Category.query.get(category_id)
            if category:
                category.add_sale(sales_amount)
        
        # حساب إجماليات الفاتورة
        invoice.calculate_totals()
        
        # إضافة نقاط الولاء للعميل إذا كان موجوداً
        loyalty_points_earned = 0
        if invoice.customer_id:
            customer = Customer.query.get(invoice.customer_id)
            if customer:
                loyalty_points_earned = customer.update_purchase_stats(invoice.total_amount)
                
                # تسجيل معاملة نقاط الولاء
                if loyalty_points_earned > 0:
                    loyalty_transaction = LoyaltyTransaction(
                        customer_id=customer.id,
                        points=loyalty_points_earned,
                        transaction_type='earned',
                        description=f'نقاط من فاتورة رقم {invoice.invoice_number}',
                        invoice_id=invoice.id
                    )
                    db.session.add(loyalty_transaction)
        
        # حفظ البيانات في قاعدة البيانات
        db.session.commit()
        
        # التعامل مع الطباعة
        if should_print:
            try:
                success = print_service.print_invoice(invoice, invoice.items)
                if not success:
                    logging.warning("فشل في الطباعة")
            except Exception as e:
                logging.error(f"خطأ في الطباعة: {e}")
        else:
            logging.info("تم تخطي الطباعة حسب الطلب")
            
        # إرسال إشعار تليجرام للفاتورة الجديدة
        try:
            invoice_data = invoice.to_dict()
            telegram_service.send_invoice_notification(invoice_data)
        except Exception as e:
            logging.error(f"خطأ في إرسال إشعار التليجرام: {e}")
        
        response_data = {
            'success': True,
            'message': 'تم إنشاء الفاتورة بنجاح',
            'invoice': invoice.to_dict(),
            'printed': should_print
        }
        
        if loyalty_points_earned > 0:
            response_data['loyalty_points_earned'] = loyalty_points_earned
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"خطأ في إنشاء الفاتورة: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@invoice_bp.route('/invoices/<int:invoice_id>/return', methods=['POST'])
def return_invoice(invoice_id):
    """إرجاع فاتورة (مرتجع)"""
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        
        if invoice.status != 'completed':
            return jsonify({'success': False, 'error': 'لا يمكن إرجاع فاتورة غير مكتملة'}), 400
        
        data = request.get_json()
        return_items = data.get('items', [])
        
        # قائمة الفئات المحدثة لتجنب التكرار
        updated_categories = {}
        
        if not return_items:
            # إرجاع كامل
            for item in invoice.items:
                product = Product.query.get(item.product_id)
                if product:
                    product.update_quantity(item.quantity)
                    
                    # خصم المبيعات من رصيد الفئة في حالة الإرجاع الكامل
                    if product.category_id:
                        category = Category.query.get(product.category_id)
                        if category:
                            item_sales = item.total_price
                            if category.id in updated_categories:
                                updated_categories[category.id] -= item_sales
                            else:
                                updated_categories[category.id] = -item_sales
            
            invoice.status = 'returned'
        else:
            # إرجاع جزئي - إنشاء فاتورة مرتجع جديدة
            return_invoice = Invoice(
                invoice_number=f"RET-{invoice.invoice_number}",
                status='returned',
                total_amount=-invoice.total_amount,
                total_cost=-invoice.total_cost,
                profit=-invoice.profit
            )
            
            db.session.add(return_invoice)
            db.session.flush()
            
            for return_item in return_items:
                original_item = InvoiceItem.query.filter_by(
                    invoice_id=invoice.id,
                    product_id=return_item['product_id']
                ).first()
                
                if original_item:
                    return_quantity = min(int(return_item['quantity']), original_item.quantity)
                    
                    # إنشاء عنصر مرتجع
                    return_invoice_item = InvoiceItem(
                        invoice_id=return_invoice.id,
                        product_id=original_item.product_id,
                        quantity=-return_quantity,
                        unit_price=original_item.unit_price,
                        unit_cost=original_item.unit_cost
                    )
                    return_invoice_item.calculate_totals()
                    
                    # إرجاع الكمية للمخزون
                    product = Product.query.get(original_item.product_id)
                    if product:
                        product.update_quantity(return_quantity)
                        
                        # خصم المبيعات من رصيد الفئة في حالة الإرجاع الجزئي
                        if product.category_id:
                            category = Category.query.get(product.category_id)
                            if category:
                                # حساب المبلغ المرتجع بناءً على النسبة
                                returned_amount = (return_quantity / original_item.quantity) * original_item.total_price
                                if category.id in updated_categories:
                                    updated_categories[category.id] -= returned_amount
                                else:
                                    updated_categories[category.id] = -returned_amount
                    
                    db.session.add(return_invoice_item)
        
        # تحديث رصيد الفئات
        for category_id, sales_change in updated_categories.items():
            category = Category.query.get(category_id)
            if category:
                category.add_sale(sales_change)  # سالب في حالة الإرجاع
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إرجاع الفاتورة بنجاح',
            'invoice': invoice.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@invoice_bp.route('/invoices/stats', methods=['GET'])
def get_invoice_stats():
    """إحصائيات الفواتير"""
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
        
        # الحصول على الفواتير في الفترة المحددة
        invoices = Invoice.get_sales_by_date_range(start_date, end_date)
        
        # حساب الإحصائيات
        total_sales = sum(inv.total_amount for inv in invoices if inv.status == 'completed')
        total_profit = sum(inv.profit for inv in invoices if inv.status == 'completed')
        total_invoices = len([inv for inv in invoices if inv.status == 'completed'])
        returned_invoices = len([inv for inv in invoices if inv.status == 'returned'])
        
        # إحصائيات يومية
        daily_stats = {}
        for invoice in invoices:
            date_key = invoice.created_at.date().isoformat()
            if date_key not in daily_stats:
                daily_stats[date_key] = {
                    'sales': 0,
                    'profit': 0,
                    'invoices_count': 0
                }
            
            if invoice.status == 'completed':
                daily_stats[date_key]['sales'] += invoice.total_amount
                daily_stats[date_key]['profit'] += invoice.profit
                daily_stats[date_key]['invoices_count'] += 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total_sales': total_sales,
                'total_profit': total_profit,
                'total_invoices': total_invoices,
                'returned_invoices': returned_invoices,
                'average_invoice_value': total_sales / total_invoices if total_invoices > 0 else 0,
                'profit_margin': (total_profit / total_sales * 100) if total_sales > 0 else 0,
                'daily_stats': daily_stats
            },
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@invoice_bp.route('/invoices/daily/<string:date>', methods=['GET'])
def get_daily_sales(date):
    """مبيعات يوم محدد"""
    try:
        target_date = datetime.fromisoformat(date).date()
        summary = Invoice.get_daily_sales_summary(target_date)
        
        return jsonify({
            'success': True,
            'summary': summary,
            'date': date
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@invoice_bp.route('/invoices/statistics', methods=['GET'])
def get_invoice_statistics():
    """الحصول على إحصائيات الفواتير"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # إحصائيات الفواتير
        invoices_query = Invoice.query.filter(Invoice.created_at >= start_date)
        
        total_invoices = invoices_query.count()
        total_sales = db.session.query(db.func.sum(Invoice.total_amount)).filter(
            Invoice.created_at >= start_date,
            Invoice.status != 'returned'
        ).scalar() or 0
        
        average_invoice = total_sales / total_invoices if total_invoices > 0 else 0
        
        # نقاط الولاء المستخدمة
        loyalty_points_used = db.session.query(db.func.sum(Invoice.loyalty_points_used)).filter(
            Invoice.created_at >= start_date
        ).scalar() or 0
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_invoices': total_invoices,
                'total_sales': float(total_sales),
                'average_invoice': float(average_invoice),
                'loyalty_points_used': int(loyalty_points_used)
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@invoice_bp.route('/invoices/search', methods=['GET'])
def search_invoices():
    """البحث في الفواتير بناءً على رقم الفاتورة أو اسم العميل أو رقم الهاتف"""
    try:
        search_query = request.args.get('q', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        if not search_query:
            return jsonify({
                'success': True,
                'invoices': [],
                'total': 0,
                'pages': 0,
                'current_page': page
            })
        
        # البحث في الفواتير
        query = Invoice.query.join(Customer, Invoice.customer_id == Customer.id, isouter=True)
        
        # البحث في رقم الفاتورة أو اسم العميل أو رقم الهاتف
        search_filter = db.or_(
            Invoice.invoice_number.ilike(f'%{search_query}%'),
            Customer.name.ilike(f'%{search_query}%'),
            Customer.phone.ilike(f'%{search_query}%')
        )
        
        query = query.filter(search_filter)
        
        # ترتيب حسب التاريخ (الأحدث أولاً)
        query = query.order_by(Invoice.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        invoices = pagination.items
        
        return jsonify({
            'success': True,
            'invoices': [invoice.to_dict() for invoice in invoices],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'search_query': search_query
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

