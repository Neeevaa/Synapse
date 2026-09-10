import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.mark.e2e
def test_project_workspace_navigation(authenticated_driver, frontend_url: str):
    """
    TEST 3: Project Navigation Test
    After authentication:
      - Opens project list (/projects)
      - Opens an available project card (e.g., Aromiq)
      - Verifies project overview loads
      - Navigates to Requirements & Review
      - Navigates to Knowledge Base
      - Navigates to Traceability Matrix
    Uses canonical semantic selectors and current production routes.
    """
    driver = authenticated_driver

    # 1. Navigate to Projects List
    driver.get(f"{frontend_url}/projects")
    WebDriverWait(driver, 10).until(lambda d: "/projects" in d.current_url)

    # 2. Locate and open an available project card
    # Each project card is a button containing an h3 with the project title
    project_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//h3]"))
    )
    project_title = project_card.find_element(By.TAG_NAME, "h3").text
    assert len(project_title) > 0
    project_card.click()

    # 3. Verify Project Overview page loads
    WebDriverWait(driver, 10).until(
        lambda d: "/projects/" in d.current_url and not d.current_url.endswith("/projects")
    )
    overview_h2 = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, f"//h2[contains(text(), '{project_title}')]"))
    )
    assert project_title in overview_h2.text

    # 4. Navigate to Requirements workspace
    req_link = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/requirements')]"))
    )
    req_link.click()

    WebDriverWait(driver, 10).until(lambda d: "/requirements" in d.current_url)
    req_h1 = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(text(), 'Requirements Management')]"))
    )
    assert "Requirements Management" in req_h1.text

    # 5. Navigate to Knowledge Base workspace
    know_link = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/knowledge')]"))
    )
    know_link.click()

    WebDriverWait(driver, 10).until(lambda d: "/knowledge" in d.current_url)
    know_h1 = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(text(), 'Knowledge Base')]"))
    )
    assert "Knowledge Base" in know_h1.text

    # 6. Navigate to Traceability workspace
    trace_link = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/traceability')]"))
    )
    trace_link.click()

    WebDriverWait(driver, 10).until(lambda d: "/traceability" in d.current_url)
    trace_h2 = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Traceability Matrix')]"))
    )
    assert "Traceability Matrix" in trace_h2.text
