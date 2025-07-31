from datetime import datetime
from src.models.user import db

class Wastage(db.Model):
    """نموذج الهوالك والهادر"""
    __tablename__ = 'wastages'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(100), nullable=False)  # سبب الهوالك
    cost_per_unit = db.Column(db.Float, nullable=False)  # سعر الشراء للوحدة
    total_cost = db.Column(db.Float, nullable=False)  # إجمالي الخسارة
    notes = db.Column(db.Text)  # ملاحظات إضافية
    recorded_by = db.Column(db.String(100), nullable=False)  # من سجل الهوالك
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    product = db.relationship('Product', backref='wastages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_barcode': self.product.serial_number if self.product else None,
            'quantity': self.quantity,
            'reason': self.reason,
            'cost_per_unit': self.cost_per_unit,
            'total_cost': self.total_cost,
            'notes': self.notes,
            'recorded_by': self.recorded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class WastageReason(db.Model):
    """أسباب الهوالك المحددة مسبقاً"""
    __tablename__ = 'wastage_reasons'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

