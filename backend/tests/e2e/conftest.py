import os
import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

load_dotenv()


@pytest.fixture(scope="session")
def frontend_url() -> str:
    """Returns the base URL for the Synapse frontend application."""
    return os.getenv("SYNAPSE_FRONTEND_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture(scope="session")
def test_credentials() -> tuple[str, str]:
    """
    Returns (email, password) from environment variables.
    Fails explicitly with instructions if credentials are not configured.
    Never prints or logs the password.
    """
    email = os.getenv("SYNAPSE_TEST_EMAIL")
    password = os.getenv("SYNAPSE_TEST_PASSWORD")

    if not email or not password:
        pytest.fail(
            "E2E test credentials are not configured.\n"
            "Please configure the following environment variables (or add them to backend/.env):\n"
            "  SYNAPSE_TEST_EMAIL=<test_user_email>\n"
            "  SYNAPSE_TEST_PASSWORD=<test_user_password>\n"
            "Optionally:\n"
            "  SYNAPSE_FRONTEND_URL (default: http://localhost:3000)\n"
            "  SELENIUM_HEADLESS (default: true)"
        )
    return email, password


@pytest.fixture(scope="function")
def driver():
    """
    Launches Chrome WebDriver with configured options.
    Defaults to headless mode for headless/CI compatibility.
    """
    options = Options()
    headless = os.getenv("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")

    chrome_driver = webdriver.Chrome(options=options)
    chrome_driver.implicitly_wait(3)
    try:
        yield chrome_driver
    finally:
        try:
            chrome_driver.quit()
        except Exception:
            pass


def login_user(driver, base_url: str, email: str, password: str, timeout: int = 15):
    """
    Reusable helper to log in a user through the real frontend login form.
    Uses explicit waits on semantic form controls.
    """
    driver.get(f"{base_url}/login")

    # Locate email and password inputs via stable semantic attributes
    email_inp = WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.NAME, "email"))
    )
    pw_inp = WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.NAME, "password"))
    )
    submit_btn = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
    )

    email_inp.clear()
    email_inp.send_keys(email)
    pw_inp.clear()
    pw_inp.send_keys(password)
    submit_btn.click()

    # Wait for post-login redirect (to /dashboard, /member-dashboard, or /projects)
    WebDriverWait(driver, timeout).until(
        lambda d: "/dashboard" in d.current_url
        or "/member-dashboard" in d.current_url
        or "/projects" in d.current_url
    )

    # Wait for the authenticated shell header controls to mount
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "button[aria-label='Notifications']"))
    )


@pytest.fixture(scope="function")
def authenticated_driver(driver, frontend_url: str, test_credentials: tuple[str, str]):
    """Provides a WebDriver instance already authenticated with test credentials."""
    email, password = test_credentials
    login_user(driver, frontend_url, email, password)
    yield driver
