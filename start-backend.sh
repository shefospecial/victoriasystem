#!/bin/bash

echo "========================================"
echo "      فيكتوريا ستور - الخادم الخلفي"
echo "========================================"
echo

cd victoria-store-backend

echo "تثبيت المتطلبات..."
pip3 install -r requirements.txt

echo
echo "بدء تشغيل الخادم..."
python3 run.py

