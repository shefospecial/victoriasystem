from datetime import datetime
from src.models.user import db

class SupplierTransaction(db.Model):
    __tablename__ = 'supplier_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # 'purchase' أو 'payment'
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    reference_number = db.Column(db.String(100))  # رقم مرجعي للفاتورة أو الإيصال
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), default='الإدارة')
    
    # علاقة مع الموزع
    supplier = db.relationship('Supplier', backref=db.backref('transactions', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'transaction_type': self.transaction_type,
            'transaction_type_ar': 'شراء' if self.transaction_type == 'purchase' else 'دفعة',
            'amount': self.amount,
            'description': self.description,
            'reference_number': self.reference_number,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by
        }
    
    @staticmethod
    def get_supplier_balance(supplier_id):
        """حساب رصيد الموزع (المشتريات - المدفوعات)"""
        purchases = db.session.query(db.func.sum(SupplierTransaction.amount)).filter_by(
            supplier_id=supplier_id, 
            transaction_type='purchase'
        ).scalar() or 0
        
        payments = db.session.query(db.func.sum(SupplierTransaction.amount)).filter_by(
            supplier_id=supplier_id, 
            transaction_type='payment'
        ).scalar() or 0
        
        return purchases - payments
    
    @staticmethod
    def get_supplier_statement(supplier_id, date_from=None, date_to=None):
        """الحصول على كشف حساب الموزع"""
        query = SupplierTransaction.query.filter_by(supplier_id=supplier_id)
        
        if date_from:
            query = query.filter(SupplierTransaction.created_at >= date_from)
        if date_to:
            query = query.filter(SupplierTransaction.created_at <= date_to)
            
        transactions = query.order_by(SupplierTransaction.created_at.desc()).all()
        
        # حساب الرصيد التراكمي
        running_balance = 0
        statement = []
        
        for transaction in reversed(transactions):
            if transaction.transaction_type == 'purchase':
                running_balance += transaction.amount
            else:  # payment
                running_balance -= transaction.amount
                
            statement.append({
                **transaction.to_dict(),
                'running_balance': running_balance
            })
        
        return list(reversed(statement))

