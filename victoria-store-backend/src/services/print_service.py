import win32print
import win32ui
from datetime import datetime
from PIL import Image, ImageWin

class PrintService:
    def __init__(self):
        self.printer_name = "Xprinter XP-365B"
        self.line_width = 42  # عرض السطر بالاحرف تقريبا

    def center_text(self, text):
        spaces = (self.line_width - len(text)) // 2
        return " " * spaces + text

    def left_right_text(self, right, left):
        space = self.line_width - (len(right) + len(left))
        return right + " " * space + left

    def print_invoice(self, invoice, items):
        try:
            hDC = win32ui.CreateDC()
            hDC.CreatePrinterDC(self.printer_name)
            hDC.StartDoc(f"Invoice #{invoice.id}")
            hDC.StartPage()

            font = win32ui.CreateFont({
                "name": "Courier New",
                "height": 24,
                "weight": 400,
            })
            bold_font = win32ui.CreateFont({
                "name": "Courier New",
                "height": 26,
                "weight": 700,
            })
            hDC.SelectObject(font)
            y = 50

            # عنوان المتجر
            hDC.SelectObject(bold_font)
            hDC.TextOut(50, y, self.center_text("فيكتوريا ستور"))
            y += 30
            hDC.SelectObject(font)
            hDC.TextOut(50, y, self.center_text("01068027864"))

            # التاريخ / الوقت / الفاتورة
            now = datetime.now()
            y += 40
            hDC.TextOut(50, y, self.left_right_text("التاريخ:", now.strftime("%d/%m/%Y")))
            y += 25
            hDC.TextOut(50, y, self.left_right_text("الوقت:", now.strftime("%H:%M")))
            y += 25
            # هنا التعديل
            hDC.TextOut(50, y, self.left_right_text(f"{invoice.id}", ":رقم الفاتورة"))

            # فاصل
            y += 35
            hDC.TextOut(50, y, "-" * self.line_width)

            # عناوين الجدول
            y += 30
            hDC.SelectObject(bold_font)
            header = f"{'المنتج':<15}{'الكمية':^12}{'السعر':>15}"
            hDC.TextOut(50, y, header)
            hDC.SelectObject(font)

            # تفاصيل المنتجات
            for item in items:
                y += 25
                name = item.product.name[:12]
                qty = str(item.quantity)
                price = f"{item.total_price:.2f}"
                line = f"{name:<15}{qty:^12}{price:>15}"
                hDC.TextOut(50, y, line)

            # فاصل
            y += 35
            hDC.TextOut(50, y, "-" * self.line_width)

            # الإجمالي
            y += 30
            hDC.SelectObject(bold_font)
            hDC.TextOut(50, y, self.left_right_text("الإجمالي:", f"{invoice.total_amount:.2f} جنيه"))

            # رسالة الشكر
            y += 50
            hDC.SelectObject(font)
            hDC.TextOut(50, y, self.center_text("شكراً لزيارتكم!"))
            y += 25
            hDC.TextOut(50, y, self.center_text("نتمنى لكم يوماً سعيداً"))

            # إنهاء الطباعة
            hDC.EndPage()
            hDC.EndDoc()
            hDC.DeleteDC()
            return True

        except Exception as e:
            print("⚠️ خطأ أثناء الطباعة:", e)
            return False

print_service = PrintService()
