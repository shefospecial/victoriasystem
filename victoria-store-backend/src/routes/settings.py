from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.settings import Settings

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/settings', methods=['GET'])
def get_all_settings():
    """جلب جميع الإعدادات"""
    try:
        settings = Settings.query.all()
        return jsonify({
            'success': True,
            'settings': [setting.to_dict() for setting in settings]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/settings/<key>', methods=['GET'])
def get_setting(key):
    """جلب إعداد محدد"""
    try:
        setting = Settings.query.filter_by(key=key).first()
        if setting:
            return jsonify({
                'success': True,
                'setting': setting.to_dict()
            })
        else:
            return jsonify({'success': False, 'error': 'الإعداد غير موجود'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/settings', methods=['POST'])
def create_or_update_settings():
    """إنشاء أو تحديث إعدادات متعددة"""
    try:
        data = request.get_json()
        
        updated_settings = []
        for key, value in data.items():
            if key not in ['success', 'error', 'message']:  # تجنب الحقول المحجوزة
                setting = Settings.set_value(key, str(value))
                updated_settings.append(setting.to_dict())
        
        return jsonify({
            'success': True,
            'message': f'تم تحديث {len(updated_settings)} إعداد',
            'settings': updated_settings
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/settings/<key>', methods=['PUT'])
def update_setting(key):
    """تحديث إعداد محدد"""
    try:
        data = request.get_json()
        value = data.get('value')
        description = data.get('description')
        
        if value is None:
            return jsonify({'success': False, 'error': 'القيمة مطلوبة'}), 400
        
        setting = Settings.set_value(key, str(value), description)
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث الإعداد بنجاح',
            'setting': setting.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/settings/<key>', methods=['DELETE'])
def delete_setting(key):
    """حذف إعداد"""
    try:
        setting = Settings.query.filter_by(key=key).first()
        if setting:
            db.session.delete(setting)
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'تم حذف الإعداد بنجاح'
            })
        else:
            return jsonify({'success': False, 'error': 'الإعداد غير موجود'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/settings/telegram/test', methods=['POST'])
def test_telegram_settings():
    """اختبار إعدادات تليجرام"""
    try:
        from src.services.telegram_service import telegram_service
        
        # إعادة تحميل الإعدادات
        telegram_service.bot_token = None
        telegram_service.chat_id = None
        
        # إرسال رسالة اختبار
        success = telegram_service.send_test_message()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'تم إرسال رسالة الاختبار بنجاح'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'فشل في إرسال رسالة الاختبار'
            }), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

