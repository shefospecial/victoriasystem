#!/usr/bin/env python3
"""
ملف تشغيل سريع لخادم فيكتوريا ستور
"""

import os
import sys

# إضافة المجلد الحالي إلى مسار Python
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.main import app

if __name__ == '__main__':
    print("🚀 بدء تشغيل خادم فيكتوريا ستور...")
    print("📍 الرابط: http://localhost:5000")
    print("🛑 للإيقاف: اضغط Ctrl+C")
    print("-" * 50)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )

