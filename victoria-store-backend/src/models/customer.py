from datetime import datetime
from src.models.user import db

class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=True)
    address = db.Column(db.Text, nullable=True)
    
    # نقاط الولاء
    loyalty_points = db.Column(db.Integer, default=0)
    total_purchases = db.Column(db.Float, default=0.0)
    visit_count = db.Column(db.Integer, default=0)
    
    # تواريخ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_visit = db.Column(db.DateTime, nullable=True)
    
    # العلاقات
    invoices = db.relationship('Invoice', backref='customer', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'loyalty_points': self.loyalty_points,
            'total_purchases': self.total_purchases,
            'visit_count': self.visit_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_visit': self.last_visit.isoformat() if self.last_visit else None
        }
    
    def add_loyalty_points(self, points):
        """إضافة نقاط ولاء للعميل"""
        self.loyalty_points += points
        db.session.commit()
    
    def redeem_points(self, points):
        """استخدام نقاط الولاء"""
        if self.loyalty_points >= points:
            self.loyalty_points -= points
            db.session.commit()
            return True
        return False
    
    def update_purchase_stats(self, amount):
        """تحديث إحصائيات الشراء"""
        self.total_purchases += amount
        self.visit_count += 1
        self.last_visit = datetime.utcnow()
        
        # إضافة نقاط ولاء (نقطة واحدة لكل 10 جنيه)
        points_to_add = int(amount // 10)
        self.loyalty_points += points_to_add
        
        db.session.commit()
        return points_to_add

class LoyaltyTransaction(db.Model):
    __tablename__ = 'loyalty_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    points = db.Column(db.Integer, nullable=False)  # موجب للإضافة، سالب للاستخدام
    transaction_type = db.Column(db.String(20), nullable=False)  # 'earned', 'redeemed'
    description = db.Column(db.String(200), nullable=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'points': self.points,
            'transaction_type': self.transaction_type,
            'description': self.description,
            'invoice_id': self.invoice_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

