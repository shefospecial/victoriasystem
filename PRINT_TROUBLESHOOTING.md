# دليل حل مشاكل الطباعة - Victoria Store

## مشكلة: الفاتورة تظهر بيضاء عند الطباعة

### الأسباب المحتملة:
1. **مشكلة في CSS للطباعة**
2. **إعدادات المتصفح**
3. **إعدادات الطابعة**
4. **مشكلة في عرض المحتوى**

### الحلول المطبقة:

#### 1. تحسين CSS للطباعة
```css
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  .receipt-container {
    color: black !important;
    background: white !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
}
```

#### 2. فرض ظهور النص
```css
.receipt-container h2,
.receipt-container p,
.receipt-container span,
.receipt-container div {
  color: #000 !important;
  background: none !important;
}
```

#### 3. إخفاء العناصر غير المطلوبة
```css
body > *:not(.receipt-container) {
  display: none !important;
}
```

## إعدادات المتصفح المطلوبة

### Chrome:
1. اضغط Ctrl+P للطباعة
2. في "More settings":
   - Paper size: Custom (58mm x auto)
   - Margins: None
   - Options: ✓ Background graphics

### Firefox:
1. اضغط Ctrl+P للطباعة
2. في إعدادات الطباعة:
   - Paper size: Custom
   - Margins: 0
   - ✓ Print backgrounds

### Edge:
1. اضغط Ctrl+P للطباعة
2. More settings:
   - Paper size: Custom
   - Margins: None
   - ✓ Background graphics

## إعدادات الطابعة

### للطابعات الحرارية:
- **العرض:** 58mm
- **الطول:** Auto/Continuous
- **الهوامش:** 0mm جميع الجهات
- **الدقة:** 203 DPI (عادي) أو 300 DPI (عالي)
- **السرعة:** متوسطة (لتجنب التشويش)

### للطابعات العادية (للاختبار):
- **مقاس الورق:** A4
- **التوجه:** Portrait
- **المقياس:** 100%
- **الهوامش:** 0mm

## اختبارات الطباعة

### 1. اختبار أساسي:
```html
<div style="color: black; background: white;">
  نص تجريبي للطباعة
</div>
```

### 2. اختبار CSS:
- افتح Developer Tools (F12)
- اذهب إلى Console
- اكتب: `window.print()`
- تحقق من ظهور المحتوى في معاينة الطباعة

### 3. اختبار الفاتورة:
- افتح `receipt-test.html`
- اضغط على زر "طباعة الفاتورة"
- تحقق من ظهور المحتوى في معاينة الطباعة

## مشاكل شائعة وحلولها

### المشكلة: النص لا يظهر
**الحل:**
```css
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
```

### المشكلة: الفاتورة كبيرة جداً
**الحل:**
- تأكد من مقاس الورق 58mm
- تحقق من إعدادات المقياس (100%)

### المشكلة: الخطوط غير واضحة
**الحل:**
```css
font-family: 'Courier New', monospace !important;
-webkit-font-smoothing: none !important;
```

### المشكلة: الحدود لا تظهر
**الحل:**
```css
border-top: 1px solid #000 !important;
```

## نصائح للحصول على أفضل النتائج

1. **استخدم Chrome أو Firefox** للحصول على أفضل دعم للطباعة
2. **اختبر دائماً** قبل الطباعة الفعلية
3. **تأكد من إعدادات الطابعة** قبل كل استخدام
4. **استخدم ورق حراري عالي الجودة** للطابعات الحرارية
5. **نظف رأس الطابعة** بانتظام للحصول على طباعة واضحة

## الدعم الفني

إذا استمرت المشاكل:
1. تحقق من تحديث المتصفح
2. جرب متصفح آخر
3. تحقق من تعريفات الطابعة
4. اختبر مع طابعة أخرى

