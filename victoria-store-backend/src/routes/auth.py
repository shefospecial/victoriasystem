from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.admin import Admin
import jwt
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """تسجيل الدخول"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'اسم المستخدم وكلمة المرور مطلوبان'}), 400
        
        # البحث عن المستخدم
        user = Admin.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            return jsonify({'success': False, 'error': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401
        
        if not user.is_active:
            return jsonify({'success': False, 'error': 'الحساب غير نشط'}), 401
        
        # تحديد الدور بناءً على اسم المستخدم
        role = 'admin' if username == 'admin' else 'cashier'
        
        # إنشاء token
        token = jwt.encode({
            'user_id': user.id,
            'username': user.username,
            'role': role,  # ← استخدم المتغير الجديد
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, 'secret_key', algorithm='HS256')
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل الدخول بنجاح',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': role,  # ← استخدم المتغير الجديد
                'full_name': user.full_name
            },
            'token': token
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/auth/verify', methods=['POST'])
def verify_token():
    """التحقق من صحة token"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'success': False, 'error': 'Token مطلوب'}), 401
        
        payload = jwt.decode(token, 'secret_key', algorithms=['HS256'])
        user = Admin.query.get(payload['user_id'])
        
        if not user or not user.is_active:
            return jsonify({'success': False, 'error': 'Token غير صحيح'}), 401
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'full_name': user.full_name
            }
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'error': 'Token منتهي الصلاحية'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'error': 'Token غير صحيح'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

