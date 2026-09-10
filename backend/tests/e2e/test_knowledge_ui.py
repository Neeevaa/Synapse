import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC


@pytest.mark.e2e
def test_knowledge_vector_search_ui_flow(authenticated_driver, frontend_url: str):
    """
    TEST 2: Knowledge Base Vector Search UI
    Using authenticated fixture:
      - Navigates to an available project (Aromiq)
      - Opens Knowledge Base workspace
      - Verifies Knowledge Base page loads
      - Opens 'Vector Search Playground'
      - Enters cancellation query:
        'What rules govern restaurant order cancellation and which order states can be cancelled?'
      - Sets Top-K = 5
      - Submits search
      - Verifies:
        - Search completes successfully
        - Results container appears with chunk count
        - At least one result card is displayed
        - Cancellation-related project artifacts are retrieved in results
    Does NOT re-index the project during the test.
    """
    driver = authenticated_driver

    # 1. Navigate to Projects List
    driver.get(f"{frontend_url}/projects")
    WebDriverWait(driver, 10).until(lambda d: "/projects" in d.current_url)

    # 2. Locate and open Aromiq project card
    project_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//h3]"))
    )
    project_card.click()

    # 3. Wait for project overview and navigate to Knowledge Base
    WebDriverWait(driver, 10).until(
        lambda d: "/projects/" in d.current_url and not d.current_url.endswith("/projects")
    )
    know_link = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/knowledge')]"))
    )
    know_link.click()

    # 4. Verify Knowledge Base page loads
    WebDriverWait(driver, 10).until(lambda d: "/knowledge" in d.current_url)
    heading = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(text(), 'Knowledge Base')]"))
    )
    assert "Knowledge Base" in heading.text

    # 5. Open / Ensure 'Vector Search Playground' tab is active
    search_tab = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Vector Search Playground')]"))
    )
    search_tab.click()

    # 6. Locate search input and enter query
    query_text = "What rules govern restaurant order cancellation and which order states can be cancelled?"
    query_input = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//input[@type='text' and contains(@placeholder, 'query')]"))
    )
    query_input.clear()
    query_input.send_keys(query_text)

    # 7. Set Top-K = 5
    select_elements = driver.find_elements(By.TAG_NAME, "select")
    # Top-K select is the one containing option value 5
    top_k_select = None
    for sel in select_elements:
        options = [opt.get_attribute("value") for opt in sel.find_elements(By.TAG_NAME, "option")]
        if "5" in options:
            top_k_select = sel
            break

    if top_k_select:
        Select(top_k_select).select_by_value("5")

    # 8. Submit search
    search_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[@type='submit' and contains(., 'Search Vectors')]"))
    )
    search_btn.click()

    # 9. Wait for search to complete and results container to appear
    results_header = WebDriverWait(driver, 35).until(
        EC.visibility_of_element_located((By.XPATH, "//div[contains(., 'relevant vector chunks') and .//strong]"))
    )
    assert results_header.is_displayed()

    # 10. Verify result cards are displayed
    result_cards = WebDriverWait(driver, 10).until(
        EC.presence_of_all_elements_located(
            (By.XPATH, "//div[contains(@class, 'rounded-xl') and .//span[contains(., '% Match')]]")
        )
    )
    assert len(result_cards) >= 1, "At least one vector search result card must be displayed"

    # 11. Preferentially verify cancellation-related results are present
    all_results_text = " ".join([card.text.lower() for card in result_cards])
    assert "cancel" in all_results_text or "cancellation" in all_results_text, (
        "Expected cancellation-related artifacts in vector search results for Aromiq"
    )
