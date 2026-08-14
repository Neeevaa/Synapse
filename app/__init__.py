import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

backend_app_dir = os.path.join(backend_dir, "app")
if backend_app_dir not in __path__:
    __path__.append(backend_app_dir)
