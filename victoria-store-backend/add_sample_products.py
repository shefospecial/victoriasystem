#!/usr/bin/env python3
import requests
import json

# عنوان الخادم
BASE_URL = 'http://localhost:5000/api'

# منتجات تجريبية
sample_products = [
    {
        "name": "شامبو هيد آند شولدرز",
        "barcode": "123456789",
        "purchase_price": 25.0,
        "selling_price": 35.0,
        "quantity": 50
    },
    {
        "name": "معجون أسنان سيجنال",
        "barcode": "987654321",
        "purchase_price": 15.0,
        "selling_price": 22.0,
        "quantity": 30
    },
    {
        "name": "صابون لوكس",
        "barcode": "456789123",
        "purchase_price": 8.0,
        "selling_price": 12.0,
        "quantity": 100
    },
    {
        "name": "شوكولاتة كيت كات",
        "barcode": "789123456",
        "purchase_price": 5.0,
        "selling_price": 8.0,
        "quantity": 75
    },
    {
        "name": "عصير مانجو جهينة",
        "barcode": "321654987",
        "purchase_price": 12.0,
        "selling_price": 18.0,
        "quantity": 40
    },
    {
        "name": "بسكويت أوريو",
        "barcode": "654987321",
        "purchase_price": 10.0,
        "selling_price": 15.0,
        "quantity": 60
    },
    {
        "name": "مياه نستله",
        "barcode": "147258369",
        "purchase_price": 2.0,
        "selling_price": 3.5,
        "quantity": 200
    },
    {
        "name": "شاي ليبتون",
        "barcode": "963852741",
        "purchase_price": 20.0,
        "selling_price": 28.0,
        "quantity": 25
    }
]

def add_products():
    print("إضافة المنتجات التجريبية...")
    
    for product in sample_products:
        try:
            response = requests.post(f'{BASE_URL}/products', json=product)
            if response.status_code == 201:
                print(f"✅ تم إضافة: {product['name']}")
            else:
                print(f"❌ فشل في إضافة: {product['name']} - {response.text}")
        except Exception as e:
            print(f"❌ خطأ في إضافة {product['name']}: {e}")
    
    print("\nتم الانتهاء من إضافة المنتجات!")

if __name__ == "__main__":
    add_products()

