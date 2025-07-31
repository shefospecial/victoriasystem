from datetime import datetime
from src.models.user import db

class Settings(db.Model):
    __tablename__ = 'settings'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_value(cls, key, default=None):
        """الحصول على قيمة إعداد"""
        setting = cls.query.filter_by(key=key).first()
        return setting.value if setting else default
    
    @classmethod
    def set_value(cls, key, value, description=None):
        """تعيين قيمة إعداد"""
        setting = cls.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            setting.updated_at = datetime.utcnow()
            if description:
                setting.description = description
        else:
            setting = cls(key=key, value=value, description=description)
            db.session.add(setting)
        
        db.session.commit()
        return setting
    
    @classmethod
    def create_default_settings(cls):
        """إنشاء الإعدادات الافتراضية"""
        default_settings = [
            {
                'key': 'telegram_bot_token',
                'value': '8113580303:AAGdyjZ4b5hQpGDLynm7Fj2YkmoQq-ZgIAk',
                'description': 'رمز بوت التليجرام'
            },
            {
                'key': 'telegram_chat_id',
                'value': '-4508452489',
                'description': 'معرف مجموعة التليجرام'
            },
            {
                'key': 'store_name',
                'value': 'فيكتوريا ستور',
                'description': 'اسم المتجر'
            },
            {
                'key': 'low_stock_threshold',
                'value': '5',
                'description': 'حد تنبيه نقص المخزون'
            }
        ]
        
        for setting_data in default_settings:
            existing = cls.query.filter_by(key=setting_data['key']).first()
            if not existing:
                setting = cls(
                    key=setting_data['key'],
                    value=setting_data['value'],
                    description=setting_data['description']
                )
                db.session.add(setting)
        
        db.session.commit()
        print("تم إنشاء الإعدادات الافتراضية")

