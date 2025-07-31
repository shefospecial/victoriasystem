@echo off
echo ========================================
echo      فيكتوريا ستور - الخادم الخلفي
echo ========================================
echo.

cd victoria-store-backend

echo تثبيت المتطلبات...
pip install -r requirements.txt

echo.
echo بدء تشغيل الخادم...
python run.py

pause

