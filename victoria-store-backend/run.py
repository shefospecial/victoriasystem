import os
import sys
import threading
import time
import webview
from flask import Flask, send_from_directory
import mimetypes
import logging
from flask_cors import CORS

# Import your backend modules
from src.models.user import db
from src.models.product import Product
from src.models.invoice import Invoice, InvoiceItem
from src.models.reminder import Reminder
from src.models.admin import Admin
from src.models.customer import Customer
from src.models.supplier import Supplier, PurchaseOrder, PurchaseOrderItem, SupplierPayment
from src.models.supplier_transaction import SupplierTransaction
from src.models.wastage import Wastage, WastageReason
from src.models.category import Category
from src.models.settings import Settings

from src.routes.user import user_bp
from src.routes.product import product_bp
from src.routes.invoice import invoice_bp
from src.routes.customer import customer_bp
from src.routes.wastage import wastage_bp
from src.routes.supplier import supplier_bp
from src.routes.supplier_transaction import supplier_transaction_bp
from src.routes.category import category_bp
from src.routes.auth import auth_bp
from src.routes.settings import settings_bp

# Configure logging
logging.basicConfig(level=logging.DEBUG, format="[%(levelname)s] %(message)s")

mimetypes.add_type("application/javascript", ".js")

if getattr(sys, 'frozen', False):
    application_path = sys._MEIPASS
    frontend_dist_dir = os.path.join(application_path, 'dist')
    # When bundled, the database should be next to the executable
    base_dir = os.path.dirname(sys.executable)
else:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.abspath(os.path.join(current_dir, os.pardir))
    frontend_dist_dir = os.path.join(parent_dir, 'victoria-store-frontend', 'dist')
    base_dir = os.path.dirname(__file__)

# Ensure the database directory exists
database_dir = os.path.join(base_dir, 'database')
if not os.path.exists(database_dir):
    os.makedirs(database_dir)
logging.debug(f"[Database Directory] {database_dir}")

app = Flask(
    __name__,
    static_folder=frontend_dist_dir,
    static_url_path=
'/'
,
    template_folder=frontend_dist_dir,
    instance_relative_config=True
)

CORS(app, origins="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"], supports_credentials=True)

# Configure database path
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(database_dir, 'app.db')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "victoria_store_secret_key_2024"

db.init_app(app)

with app.app_context():
    db.create_all()
    # Assuming Admin.create_default_admin() is a function you have
    # to create the default admin user if it doesn't exist.
    # You might need to import Admin from your models.
    # If this function is not in your models, you'll need to adapt this.
    try:
        Admin.create_default_admin()
    except Exception as e:
        logging.error(f"Error creating default admin: {e}")

# Register blueprints
app.register_blueprint(user_bp, url_prefix=
'/api'
)
app.register_blueprint(product_bp, url_prefix=
'/api'
)
app.register_blueprint(invoice_bp, url_prefix=
'/api'
)
app.register_blueprint(customer_bp, url_prefix=
'/api'
)
app.register_blueprint(wastage_bp, url_prefix=
'/api'
)
app.register_blueprint(supplier_bp, url_prefix=
'/api'
)
app.register_blueprint(supplier_transaction_bp, url_prefix=
'/api'
)
app.register_blueprint(category_bp, url_prefix=
'/api'
)
app.register_blueprint(auth_bp, url_prefix=
'/api'
)
app.register_blueprint(settings_bp, url_prefix=
'/api'
)

@app.route(
'/'
)
def serve_index():
    logging.debug(f"[Flask Request] Serving index.html from: {app.template_folder}")
    return send_from_directory(app.template_folder, 'index.html')

@app.route(
'/<path:filename>'
)
def serve_static(filename):
    logging.debug(f"[Flask Request] Serving static file: {filename} from: {app.static_folder}")
    return send_from_directory(app.static_folder, filename)

def start_flask_app():
    try:
        logging.info("Starting Flask application...")
        app.run(debug=False, host=
'127.0.0.1'
, port=5000, threaded=True)
    except Exception as e:
        logging.error(f"Failed to start Flask app: {e}")

if __name__ == '__main__':
    flask_thread = threading.Thread(target=start_flask_app)
    flask_thread.daemon = True
    flask_thread.start()
    
    time.sleep(2) # Give Flask a moment to start
    
    logging.info("Attempting to create webview window...")
    try:
        webview.create_window(
'Victoria Store - Cashier System'
, 
'http://127.0.0.1:5000'
, width=1200, height=800)
        webview.start(debug=False) # Re-enable debug for webview to get console output
        logging.info("Webview started successfully.")
    except Exception as e:
        logging.error(f"Failed to start webview: {e}")
