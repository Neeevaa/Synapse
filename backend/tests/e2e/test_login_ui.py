import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.mark.e2e
def test_application_smoke(driver, frontend_url: str):
    """
    TEST 1: Application Smoke Test
    Opens http://localhost:3000
    Verifies:
      - Page loads successfully
      - Page title contains 'Synapse'
      - Main heading indicates running application
    """
    driver.get(frontend_url)

    # Verify page title
    WebDriverWait(driver, 10).until(lambda d: "Synapse" in d.title)
    assert "Synapse" in driver.title, f"Expected 'Synapse' in title, got '{driver.title}'"

    # Verify main content element
    heading = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.TAG_NAME, "h1"))
    )
    assert "Synapse" in heading.text


@pytest.mark.e2e
def test_login_ui_success(driver, frontend_url: str, test_credentials: tuple[str, str]):
    """
    TEST 2: Login UI Test
    Opens login page.
    Using configured test credentials:
      - Enters email
      - Enters password
      - Submits form
      - Verifies successful navigation to the authenticated application/dashboard
      - Verifies authenticated shell header and notification bell mount
    """
    email, password = test_credentials
    driver.get(f"{frontend_url}/login")

    # Verify Login page heading
    h2 = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Sign in to your account')]"))
    )
    assert "Sign in" in h2.text

    # Locate inputs via semantic attributes
    email_inp = driver.find_element(By.NAME, "email")
    pw_inp = driver.find_element(By.NAME, "password")
    submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")

    email_inp.clear()
    email_inp.send_keys(email)
    pw_inp.clear()
    pw_inp.send_keys(password)
    submit_btn.click()

    # Verify navigation to authenticated route
    WebDriverWait(driver, 15).until(
        lambda d: "/dashboard" in d.current_url
        or "/member-dashboard" in d.current_url
        or "/projects" in d.current_url
    )
    assert "/login" not in driver.current_url

    # Verify authenticated shell controls mount
    bell = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "button[aria-label='Notifications']"))
    )
    assert bell is not None


@pytest.mark.e2e
def test_login_ui_invalid_credentials(driver, frontend_url: str):
    """
    Bonus validation: verifies that invalid credentials display an inline error
    and remain on the login page without navigating away.
    """
    driver.get(f"{frontend_url}/login")

    email_inp = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.NAME, "email"))
    )
    pw_inp = driver.find_element(By.NAME, "password")
    submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")

    email_inp.clear()
    email_inp.send_keys("unregistered_user@example.com")
    pw_inp.clear()
    pw_inp.send_keys("WrongPassword123!")
    submit_btn.click()

    # Verify error alert appears
    error_alert = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'bg-destructive')]"))
    )
    assert error_alert.is_displayed()
    assert "/login" in driver.current_url
