from datetime import datetime
from src.models.user import db

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)  # ربط مع العميل
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    total_cost = db.Column(db.Float, nullable=False, default=0.0)  # إجمالي تكلفة الشراء
    profit = db.Column(db.Float, nullable=False, default=0.0)
    tax_amount = db.Column(db.Float, nullable=False, default=0.0)
    discount_amount = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.String(20), nullable=False, default='completed')  # completed, returned, cancelled
    payment_method = db.Column(db.String(20), nullable=False, default='cash')  # cash, card, transfer
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    synced = db.Column(db.Boolean, default=False)
    
    # العلاقة مع عناصر الفاتورة
    items = db.relationship('InvoiceItem', backref='invoice', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'customer_id': self.customer_id,
            'customer_name': self.customer.name if self.customer else None,
            'customer_phone': self.customer.phone if self.customer else None,
            'total_amount': self.total_amount,
            'total_cost': self.total_cost,
            'profit': self.profit,
            'tax_amount': self.tax_amount,
            'discount_amount': self.discount_amount,
            'status': self.status,
            'payment_method': self.payment_method,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'synced': self.synced,
            'items': [item.to_dict() for item in self.items],
            'items_count': len(self.items)
        }

    def calculate_totals(self):
        """حساب الإجماليات من عناصر الفاتورة"""
        self.total_amount = sum(item.total_price for item in self.items)
        self.total_cost = sum(item.total_cost for item in self.items)
        self.profit = self.total_amount - self.total_cost - self.tax_amount - self.discount_amount
        self.synced = False

    @classmethod
    def generate_invoice_number(cls):
        """توليد رقم فاتورة جديد"""
        today = datetime.now()
        date_prefix = today.strftime("%Y%m%d")
        
        # البحث عن آخر فاتورة في نفس اليوم
        last_invoice = cls.query.filter(
            cls.invoice_number.like(f"{date_prefix}%")
        ).order_by(cls.invoice_number.desc()).first()
        
        if last_invoice:
            # استخراج الرقم التسلسلي وزيادته
            sequence = int(last_invoice.invoice_number[-4:]) + 1
        else:
            sequence = 1
            
        return f"{date_prefix}{sequence:04d}"

    @classmethod
    def get_sales_by_date_range(cls, start_date, end_date):
        """الحصول على المبيعات في فترة زمنية محددة"""
        return cls.query.filter(
            cls.created_at >= start_date,
            cls.created_at <= end_date,
            cls.status == 'completed'
        ).all()

    @classmethod
    def get_daily_sales_summary(cls, date):
        """ملخص مبيعات يوم محدد"""
        start_of_day = datetime.combine(date, datetime.min.time())
        end_of_day = datetime.combine(date, datetime.max.time())
        
        invoices = cls.get_sales_by_date_range(start_of_day, end_of_day)
        
        return {
            'total_sales': sum(inv.total_amount for inv in invoices),
            'total_profit': sum(inv.profit for inv in invoices),
            'invoices_count': len(invoices),
            'invoices': [inv.to_dict() for inv in invoices]
        }


class InvoiceItem(db.Model):
    __tablename__ = 'invoice_items'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)  # سعر البيع للوحدة
    unit_cost = db.Column(db.Float, nullable=False)   # سعر الشراء للوحدة
    total_price = db.Column(db.Float, nullable=False)  # إجمالي سعر البيع
    total_cost = db.Column(db.Float, nullable=False)   # إجمالي سعر الشراء
    discount_amount = db.Column(db.Float, nullable=False, default=0.0)

    def __repr__(self):
        return f'<InvoiceItem {self.product.name if self.product else "Unknown"} x{self.quantity}>'

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else 'Unknown',
            'product_serial': self.product.serial_number if self.product else None,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'unit_cost': self.unit_cost,
            'total_price': self.total_price,
            'total_cost': self.total_cost,
            'discount_amount': self.discount_amount,
            'profit': self.total_price - self.total_cost - self.discount_amount
        }

    def calculate_totals(self):
        """حساب الإجماليات"""
        self.total_price = (self.unit_price * self.quantity) - self.discount_amount
        self.total_cost = self.unit_cost * self.quantity

# إضافة العلاقة بين InvoiceItem والProduct
InvoiceItem.product = db.relationship('Product', backref='invoice_items', lazy=True)

