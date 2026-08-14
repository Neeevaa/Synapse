import sys
import os
import importlib.util

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

backend_main_path = os.path.join(backend_dir, "app", "main.py")

spec = importlib.util.spec_from_file_location("app.main", backend_main_path)
mod = importlib.util.module_from_spec(spec)
sys.modules["app.main"] = mod
spec.loader.exec_module(mod)

app = mod.app
