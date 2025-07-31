from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from src.models.user import db

class Admin(db.Model):
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Admin {self.username}>'

    def set_password(self, password):
        """تعيين كلمة مرور مشفرة"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """التحقق من كلمة المرور"""
        return check_password_hash(self.password_hash, password)

    def update_last_login(self):
        """تحديث وقت آخر تسجيل دخول"""
        self.last_login = datetime.utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def create_default_admin(cls):
        """إنشاء حسابات إدارة افتراضية"""
        # إنشاء حساب المدير
        admin = cls.query.filter_by(username='admin').first()
        if not admin:
            admin = cls(
                username='admin',
                email='admin@victoriastore.com',
                full_name='مدير النظام'
            )
            admin.set_password('admin123')
            db.session.add(admin)
        
        # إنشاء حساب الكاشير
        cashier = cls.query.filter_by(username='cashier').first()
        if not cashier:
            cashier = cls(
                username='cashier',
                email='cashier@victoriastore.com',
                full_name='الكاشير'
            )
            cashier.set_password('cashier123')
            db.session.add(cashier)
        
        db.session.commit()
        return admin

