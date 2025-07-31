from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.user import db
from src.models.category import Category

category_bp = Blueprint('category', __name__)

@category_bp.route('/categories', methods=['GET'])
def get_categories():
    """الحصول على جميع الفئات"""
    try:
        search_query = request.args.get('search', '')
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        if search_query:
            categories = Category.search(search_query)
        elif active_only:
            categories = Category.get_active_categories()
        else:
            categories = Category.query.order_by(Category.name).all()
        
        return jsonify({
            'success': True,
            'categories': [category.to_dict() for category in categories],
            'total': len(categories)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@category_bp.route('/categories/<int:category_id>', methods=['GET'])
def get_category(category_id):
    """الحصول على فئة محددة"""
    try:
        category = Category.query.get_or_404(category_id)
        return jsonify({
            'success': True,
            'category': category.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@category_bp.route('/categories', methods=['POST'])
def create_category():
    """إنشاء فئة جديدة"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        if not data.get('name'):
            return jsonify({'success': False, 'error': 'اسم الفئة مطلوب'}), 400
        
        # التحقق من عدم تكرار الاسم
        existing_category = Category.query.filter_by(name=data['name']).first()
        if existing_category:
            return jsonify({'success': False, 'error': 'اسم الفئة موجود مسبقاً'}), 400
        
        category = Category(
            name=data['name'],
            description=data.get('description', ''),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الفئة بنجاح',
            'category': category.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@category_bp.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """تحديث فئة موجودة"""
    try:
        category = Category.query.get_or_404(category_id)
        data = request.get_json()
        
        # التحقق من عدم تكرار الاسم
        if data.get('name') and data['name'] != category.name:
            existing_category = Category.query.filter_by(name=data['name']).first()
            if existing_category:
                return jsonify({'success': False, 'error': 'اسم الفئة موجود مسبقاً'}), 400
        
        # تحديث البيانات
        if 'name' in data:
            category.name = data['name']
        if 'description' in data:
            category.description = data['description']
        if 'is_active' in data:
            category.is_active = data['is_active']
        
        category.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث الفئة بنجاح',
            'category': category.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@category_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """حذف فئة"""
    try:
        category = Category.query.get_or_404(category_id)
        
        # التحقق من عدم وجود منتجات مرتبطة
        if category.products:
            return jsonify({
                'success': False, 
                'error': f'لا يمكن حذف الفئة لأنها مرتبطة بـ {len(category.products)} منتج'
            }), 400
        
        db.session.delete(category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم حذف الفئة بنجاح'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@category_bp.route('/categories/<int:category_id>/reset-sales', methods=['POST'])
def reset_category_sales(category_id):
    """إعادة تعيين مبيعات الفئة (للمسؤول فقط)"""
    try:
        category = Category.query.get_or_404(category_id)
        
        old_sales = category.total_sales
        category.reset_sales()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'تم إعادة تعيين مبيعات فئة "{category.name}" من {old_sales} جنيه إلى 0 جنيه',
            'category': category.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@category_bp.route('/categories/statistics', methods=['GET'])
def get_categories_statistics():
    """إحصائيات الفئات"""
    try:
        categories = Category.query.all()
        
        total_categories = len(categories)
        active_categories = len([c for c in categories if c.is_active])
        total_sales = sum(c.total_sales for c in categories)
        
        # ترتيب الفئات حسب المبيعات
        top_categories = sorted(categories, key=lambda x: x.total_sales, reverse=True)[:5]
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_categories': total_categories,
                'active_categories': active_categories,
                'inactive_categories': total_categories - active_categories,
                'total_sales': total_sales,
                'top_categories': [
                    {
                        'id': cat.id,
                        'name': cat.name,
                        'total_sales': cat.total_sales,
                        'product_count': len(cat.products)
                    } for cat in top_categories
                ]
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

