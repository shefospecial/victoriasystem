from datetime import datetime
from src.models.user import db

class Supplier(db.Model):
    """نموذج الموزعين"""
    __tablename__ = 'suppliers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    company_name = db.Column(db.String(150))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.Text)
    
    # الحسابات المالية
    total_purchases = db.Column(db.Float, default=0.0)  # إجمالي المشتريات
    total_payments = db.Column(db.Float, default=0.0)   # إجمالي المدفوعات
    balance = db.Column(db.Float, default=0.0)          # الرصيد (موجب = مدين لنا، سالب = دائن علينا)
    
    # معلومات إضافية
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    purchase_orders = db.relationship('PurchaseOrder', backref='supplier', lazy=True)
    supplier_payments = db.relationship('SupplierPayment', backref='supplier', lazy=True)
    
    def update_balance(self):
        """تحديث الرصيد بناءً على المشتريات والمدفوعات"""
        self.balance = self.total_purchases - self.total_payments
        self.updated_at = datetime.utcnow()
        # إزالة db.session.commit() من هنا
    
    def add_purchase(self, amount):
        """إضافة مشترى جديد"""
        self.total_purchases += amount
        self.update_balance()
        db.session.commit()
    
    def add_payment(self, amount):
        """إضافة دفعة جديدة"""
        self.total_payments += amount
        self.update_balance()
        db.session.commit()
    
    @classmethod
    def recalculate_all_balances(cls):
        """إعادة حساب أرصدة جميع الموردين"""
        suppliers = cls.query.all()
        for supplier in suppliers:
            # حساب إجمالي المشتريات
            total_purchases = db.session.query(db.func.sum(PurchaseOrder.total_amount)).filter_by(supplier_id=supplier.id).scalar() or 0
            
            # حساب إجمالي المدفوعات
            total_payments = db.session.query(db.func.sum(SupplierPayment.amount)).filter_by(supplier_id=supplier.id).scalar() or 0
            
            # تحديث البيانات
            supplier.total_purchases = total_purchases
            supplier.total_payments = total_payments
            supplier.balance = total_purchases - total_payments
        
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'company_name': self.company_name,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'total_purchases': self.total_purchases,
            'total_payments': self.total_payments,
            'balance': self.balance,
            'notes': self.notes,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PurchaseOrder(db.Model):
    """نموذج أوامر الشراء من الموزعين"""
    __tablename__ = 'purchase_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=False)
    
    # المبالغ
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    paid_amount = db.Column(db.Float, default=0.0)
    remaining_amount = db.Column(db.Float, default=0.0)
    
    # الحالة
    status = db.Column(db.String(20), default='pending')  # pending, completed, cancelled
    payment_status = db.Column(db.String(20), default='unpaid')  # unpaid, partial, paid
    
    # التواريخ
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    delivery_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ملاحظات
    notes = db.Column(db.Text)
    
    # العلاقات
    items = db.relationship('PurchaseOrderItem', backref='purchase_order', lazy=True, cascade='all, delete-orphan')
    
    @staticmethod
    def generate_order_number():
        """توليد رقم أمر شراء فريد"""
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return f'PO{timestamp}'
    
    def calculate_totals(self):
        """حساب الإجماليات"""
        self.total_amount = sum(item.total_amount for item in self.items)
        self.remaining_amount = self.total_amount - self.paid_amount
        
        # تحديث حالة الدفع
        if self.paid_amount == 0:
            self.payment_status = 'unpaid'
        elif self.paid_amount >= self.total_amount:
            self.payment_status = 'paid'
        else:
            self.payment_status = 'partial'
        
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'total_amount': self.total_amount,
            'paid_amount': self.paid_amount,
            'remaining_amount': self.remaining_amount,
            'status': self.status,
            'payment_status': self.payment_status,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'delivery_date': self.delivery_date.isoformat() if self.delivery_date else None,
            'notes': self.notes,
            'items': [item.to_dict() for item in self.items],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PurchaseOrderItem(db.Model):
    """نموذج عناصر أوامر الشراء"""
    __tablename__ = 'purchase_order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    
    # العلاقات
    product = db.relationship('Product', backref='purchase_order_items')
    
    def calculate_total(self):
        """حساب الإجمالي"""
        self.total_amount = self.quantity * self.unit_cost
    
    def to_dict(self):
        return {
            'id': self.id,
            'purchase_order_id': self.purchase_order_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'quantity': self.quantity,
            'unit_cost': self.unit_cost,
            'total_amount': self.total_amount
        }

class SupplierPayment(db.Model):
    """نموذج مدفوعات الموزعين"""
    __tablename__ = 'supplier_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=False)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.id'))
    
    amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(20), default='cash')  # cash, bank_transfer, check
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # معلومات إضافية
    reference_number = db.Column(db.String(100))  # رقم الشيك أو الحوالة
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    purchase_order = db.relationship('PurchaseOrder', backref='payments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'purchase_order_id': self.purchase_order_id,
            'purchase_order_number': self.purchase_order.order_number if self.purchase_order else None,
            'amount': self.amount,
            'payment_method': self.payment_method,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'reference_number': self.reference_number,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

