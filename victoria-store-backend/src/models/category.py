from datetime import datetime
from src.models.user import db

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    total_sales = db.Column(db.Float, default=0.0)  # إجمالي المبيعات للفئة
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<Category {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'total_sales': self.total_sales,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active,
            'product_count': len(self.products) if hasattr(self, 'products') else 0
        }

    def add_sale(self, amount):
        """إضافة مبلغ مبيعات للفئة"""
        self.total_sales += amount
        self.updated_at = datetime.utcnow()

    def reset_sales(self):
        """إعادة تعيين مبيعات الفئة"""
        self.total_sales = 0.0
        self.updated_at = datetime.utcnow()

    @classmethod
    def get_active_categories(cls):
        """الحصول على الفئات النشطة فقط"""
        return cls.query.filter_by(is_active=True).order_by(cls.name).all()

    @classmethod
    def search(cls, query):
        """البحث في الفئات بالاسم أو الوصف"""
        return cls.query.filter(
            db.or_(
                cls.name.contains(query),
                cls.description.contains(query)
            )
        ).all()

