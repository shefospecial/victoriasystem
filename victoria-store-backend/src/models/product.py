from datetime import datetime
from src.models.user import db

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    purchase_price = db.Column(db.Float, nullable=False, default=0.0)
    selling_price = db.Column(db.Float, nullable=False, default=0.0)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    serial_number = db.Column(db.String(100), unique=True, nullable=True)
    barcode = db.Column(db.String(100), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    synced = db.Column(db.Boolean, default=False)
    # العلاقة مع الفئة
    category = db.relationship('Category', backref='products', lazy=True)

    def __repr__(self):
        return f'<Product {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'purchase_price': self.purchase_price,
            'selling_price': self.selling_price,
            'quantity': self.quantity,
            'serial_number': self.serial_number,
            'barcode': self.serial_number or self.barcode or '',  # استخدم serial_number أو barcode
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'synced': self.synced,
            'profit_margin': self.selling_price - self.purchase_price if self.selling_price and self.purchase_price else 0,
            'is_low_stock': self.quantity < 3,
            'is_active': True,  # إضافة حقل is_active للتوافق مع الواجهة الأمامية
            'min_quantity': 3,  # إضافة حقل min_quantity للتوافق مع الواجهة الأمامية
            'description': ''  # إضافة حقل description للتوافق مع الواجهة الأمامية
        }

    def update_quantity(self, quantity_change):
        """تحديث الكمية (يمكن أن تكون موجبة أو سالبة)"""
        self.quantity += quantity_change
        self.updated_at = datetime.utcnow()
        self.synced = False

    def set_quantity(self, new_quantity):
        """تعيين كمية جديدة"""
        self.quantity = new_quantity
        self.updated_at = datetime.utcnow()
        self.synced = False

    @classmethod
    def search(cls, query):
        """البحث في المنتجات بالاسم أو السيريال - محسّن"""
        if not query or not query.strip():
            return cls.query.order_by(cls.name.asc()).all()

        query = query.strip()

        try:
            # البحث في جميع الحقول ذات الصلة
            return cls.query.filter(
                db.or_(
                    cls.name.ilike(f'%{query}%'),  # البحث بالاسم (غير حساس للحالة)
                    cls.serial_number.ilike(f'%{query}%'),  # البحث بالسيريال
                    cls.barcode.ilike(f'%{query}%') if cls.barcode else False,  # البحث بالباركود
                    cls.id == int(query) if query.isdigit() else False  # البحث بالـ ID إذا كان رقم
                )
            ).order_by(cls.name.asc()).all()
        except Exception as e:
            print(f"خطأ في البحث: {e}")
            return cls.query.order_by(cls.name.asc()).all()

    @classmethod
    def get_low_stock_products(cls, threshold=3):
        """الحصول على المنتجات ذات الكمية المنخفضة"""
        return cls.query.filter(cls.quantity < threshold).all()

# إضافة العلاقة بعد تعريف النماذج لتجنب المراجع الدائرية
def setup_relationships():
    """إعداد العلاقات بين النماذج"""
    from src.models.invoice import InvoiceItem
    Product.invoice_items = db.relationship('InvoiceItem', backref='product', lazy=True)