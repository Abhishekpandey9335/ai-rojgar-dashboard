import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
DEBUG = True
ALLOWED_HOSTS = ["*"]
INSTALLED_APPS = ["django.contrib.contenttypes", "corsheaders", "api"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware", "django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "config.urls"
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
CORS_ALLOW_ALL_ORIGINS = True  # tighten for production

# Email via Python smtplib (Django SMTP backend)
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "").replace(" ", "").strip()
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "airojgar8@gmail.com")


# --- Postgres via DATABASE_URL (falls back to SQLite) ---
import os as _os
if _os.environ.get("DATABASE_URL"):
    import dj_database_url as _dj
    DATABASES = {"default": _dj.parse(_os.environ["DATABASE_URL"], conn_max_age=600)}


# --- deploy settings ---
import os as _o
if _o.environ.get("SECRET_KEY"):
    SECRET_KEY = _o.environ["SECRET_KEY"]
if _o.environ.get("DEBUG") is not None:
    DEBUG = _o.environ["DEBUG"] == "1"
_hosts = [h.strip() for h in _o.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]
if _hosts:
    ALLOWED_HOSTS = _hosts
_front = _o.environ.get("FRONTEND_URL", "").strip().rstrip("/")
if _front:
    CORS_ALLOWED_ORIGINS = [_front]
    CSRF_TRUSTED_ORIGINS = [_front]
STATIC_ROOT = BASE_DIR / "staticfiles"
if "whitenoise.middleware.WhiteNoiseMiddleware" not in MIDDLEWARE:
    _i = MIDDLEWARE.index("django.middleware.security.SecurityMiddleware") + 1
    MIDDLEWARE.insert(_i, "whitenoise.middleware.WhiteNoiseMiddleware")
