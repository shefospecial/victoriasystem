from datetime import datetime, timedelta
from src.models.user import db

class Reminder(db.Model):
    __tablename__ = 'reminders'
    
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False)  # salary, supplier_payment, custom
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    amount = db.Column(db.Float, nullable=True)  # المبلغ المطلوب دفعه
    due_date = db.Column(db.DateTime, nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    is_recurring = db.Column(db.Boolean, default=False)  # تذكير متكرر
    recurrence_interval = db.Column(db.Integer, nullable=True)  # عدد الأيام للتكرار
    employee_name = db.Column(db.String(100), nullable=True)  # اسم الموظف (للمرتبات)
    supplier_name = db.Column(db.String(100), nullable=True)  # اسم المورد (للسداد)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    synced = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<Reminder {self.title}>'

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'amount': self.amount,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'is_completed': self.is_completed,
            'is_recurring': self.is_recurring,
            'recurrence_interval': self.recurrence_interval,
            'employee_name': self.employee_name,
            'supplier_name': self.supplier_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'synced': self.synced,
            'is_overdue': self.is_overdue(),
            'days_until_due': self.days_until_due()
        }

    def is_overdue(self):
        """التحقق من تجاوز موعد الاستحقاق"""
        if self.is_completed:
            return False
        return datetime.utcnow() > self.due_date

    def days_until_due(self):
        """عدد الأيام المتبقية حتى الاستحقاق"""
        if self.is_completed:
            return None
        delta = self.due_date - datetime.utcnow()
        return delta.days

    def mark_completed(self):
        """تمييز التذكير كمكتمل"""
        self.is_completed = True
        self.completed_at = datetime.utcnow()
        self.synced = False
        
        # إنشاء تذكير جديد إذا كان متكرراً
        if self.is_recurring and self.recurrence_interval:
            self.create_next_recurrence()

    def create_next_recurrence(self):
        """إنشاء التذكير التالي للتذكيرات المتكررة"""
        next_due_date = self.due_date + timedelta(days=self.recurrence_interval)
        
        next_reminder = Reminder(
            type=self.type,
            title=self.title,
            description=self.description,
            amount=self.amount,
            due_date=next_due_date,
            is_recurring=self.is_recurring,
            recurrence_interval=self.recurrence_interval,
            employee_name=self.employee_name,
            supplier_name=self.supplier_name
        )
        
        db.session.add(next_reminder)
        return next_reminder

    @classmethod
    def get_upcoming_reminders(cls, days_ahead=7):
        """الحصول على التذكيرات القادمة خلال عدد أيام محدد"""
        future_date = datetime.utcnow() + timedelta(days=days_ahead)
        return cls.query.filter(
            cls.due_date <= future_date,
            cls.is_completed == False
        ).order_by(cls.due_date).all()

    @classmethod
    def get_overdue_reminders(cls):
        """الحصول على التذكيرات المتأخرة"""
        return cls.query.filter(
            cls.due_date < datetime.utcnow(),
            cls.is_completed == False
        ).order_by(cls.due_date).all()

    @classmethod
    def create_salary_reminder(cls, employee_name, amount, due_date, is_recurring=True):
        """إنشاء تذكير مرتب"""
        reminder = cls(
            type='salary',
            title=f'مرتب {employee_name}',
            description=f'موعد دفع مرتب الموظف {employee_name}',
            amount=amount,
            due_date=due_date,
            employee_name=employee_name,
            is_recurring=is_recurring,
            recurrence_interval=30 if is_recurring else None  # شهرياً
        )
        db.session.add(reminder)
        return reminder

    @classmethod
    def create_supplier_payment_reminder(cls, supplier_name, amount, due_date, description=None):
        """إنشاء تذكير سداد مورد"""
        reminder = cls(
            type='supplier_payment',
            title=f'سداد {supplier_name}',
            description=description or f'موعد سداد المستحقات للمورد {supplier_name}',
            amount=amount,
            due_date=due_date,
            supplier_name=supplier_name
        )
        db.session.add(reminder)
        return reminder

