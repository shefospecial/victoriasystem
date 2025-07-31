from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from src.models.user import db
from src.models.reminder import Reminder

reminder_bp = Blueprint('reminder', __name__)

@reminder_bp.route('/reminders', methods=['GET'])
def get_reminders():
    """الحصول على جميع التذكيرات"""
    try:
        status = request.args.get('status')  # upcoming, overdue, completed, all
        reminder_type = request.args.get('type')  # salary, supplier_payment, custom
        days_ahead = request.args.get('days_ahead', 30, type=int)
        
        query = Reminder.query
        
        # تصفية حسب النوع
        if reminder_type:
            query = query.filter(Reminder.type == reminder_type)
        
        # تصفية حسب الحالة
        if status == 'upcoming':
            query = query.filter(
                Reminder.due_date <= datetime.utcnow() + timedelta(days=days_ahead),
                Reminder.is_completed == False
            )
        elif status == 'overdue':
            query = query.filter(
                Reminder.due_date < datetime.utcnow(),
                Reminder.is_completed == False
            )
        elif status == 'completed':
            query = query.filter(Reminder.is_completed == True)
        elif status != 'all':
            query = query.filter(Reminder.is_completed == False)
        
        reminders = query.order_by(Reminder.due_date).all()
        
        return jsonify({
            'success': True,
            'reminders': [reminder.to_dict() for reminder in reminders],
            'total': len(reminders)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders/<int:reminder_id>', methods=['GET'])
def get_reminder(reminder_id):
    """الحصول على تذكير محدد"""
    try:
        reminder = Reminder.query.get_or_404(reminder_id)
        return jsonify({
            'success': True,
            'reminder': reminder.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders', methods=['POST'])
def create_reminder():
    """إنشاء تذكير جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['type', 'title', 'due_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'حقل {field} مطلوب'}), 400
        
        due_date = datetime.fromisoformat(data['due_date'])
        
        reminder = Reminder(
            type=data['type'],
            title=data['title'],
            description=data.get('description'),
            amount=float(data['amount']) if data.get('amount') else None,
            due_date=due_date,
            is_recurring=data.get('is_recurring', False),
            recurrence_interval=int(data['recurrence_interval']) if data.get('recurrence_interval') else None,
            employee_name=data.get('employee_name'),
            supplier_name=data.get('supplier_name')
        )
        
        db.session.add(reminder)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء التذكير بنجاح',
            'reminder': reminder.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders/<int:reminder_id>', methods=['PUT'])
def update_reminder(reminder_id):
    """تحديث تذكير موجود"""
    try:
        reminder = Reminder.query.get_or_404(reminder_id)
        data = request.get_json()
        
        # تحديث البيانات
        if 'title' in data:
            reminder.title = data['title']
        if 'description' in data:
            reminder.description = data['description']
        if 'amount' in data:
            reminder.amount = float(data['amount']) if data['amount'] else None
        if 'due_date' in data:
            reminder.due_date = datetime.fromisoformat(data['due_date'])
        if 'is_recurring' in data:
            reminder.is_recurring = data['is_recurring']
        if 'recurrence_interval' in data:
            reminder.recurrence_interval = int(data['recurrence_interval']) if data['recurrence_interval'] else None
        if 'employee_name' in data:
            reminder.employee_name = data['employee_name']
        if 'supplier_name' in data:
            reminder.supplier_name = data['supplier_name']
        
        reminder.synced = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث التذكير بنجاح',
            'reminder': reminder.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders/<int:reminder_id>/complete', methods=['PATCH'])
def complete_reminder(reminder_id):
    """تمييز التذكير كمكتمل"""
    try:
        reminder = Reminder.query.get_or_404(reminder_id)
        reminder.mark_completed()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تمييز التذكير كمكتمل',
            'reminder': reminder.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders/<int:reminder_id>', methods=['DELETE'])
def delete_reminder(reminder_id):
    """حذف تذكير"""
    try:
        reminder = Reminder.query.get_or_404(reminder_id)
        db.session.delete(reminder)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم حذف التذكير بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders/salary', methods=['POST'])
def create_salary_reminder():
    """إنشاء تذكير مرتب"""
    try:
        data = request.get_json()
        
        required_fields = ['employee_name', 'amount', 'due_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'حقل {field} مطلوب'}), 400
        
        due_date = datetime.fromisoformat(data['due_date'])
        is_recurring = data.get('is_recurring', True)
        
        reminder = Reminder.create_salary_reminder(
            employee_name=data['employee_name'],
            amount=float(data['amount']),
            due_date=due_date,
            is_recurring=is_recurring
        )
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء تذكير المرتب بنجاح',
            'reminder': reminder.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders/supplier-payment', methods=['POST'])
def create_supplier_payment_reminder():
    """إنشاء تذكير سداد مورد"""
    try:
        data = request.get_json()
        
        required_fields = ['supplier_name', 'amount', 'due_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'حقل {field} مطلوب'}), 400
        
        due_date = datetime.fromisoformat(data['due_date'])
        
        reminder = Reminder.create_supplier_payment_reminder(
            supplier_name=data['supplier_name'],
            amount=float(data['amount']),
            due_date=due_date,
            description=data.get('description')
        )
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء تذكير السداد بنجاح',
            'reminder': reminder.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders/upcoming', methods=['GET'])
def get_upcoming_reminders():
    """الحصول على التذكيرات القادمة"""
    try:
        days_ahead = request.args.get('days_ahead', 7, type=int)
        reminders = Reminder.get_upcoming_reminders(days_ahead)
        
        return jsonify({
            'success': True,
            'reminders': [reminder.to_dict() for reminder in reminders],
            'total': len(reminders)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminder_bp.route('/reminders/overdue', methods=['GET'])
def get_overdue_reminders():
    """الحصول على التذكيرات المتأخرة"""
    try:
        reminders = Reminder.get_overdue_reminders()
        
        return jsonify({
            'success': True,
            'reminders': [reminder.to_dict() for reminder in reminders],
            'total': len(reminders)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

