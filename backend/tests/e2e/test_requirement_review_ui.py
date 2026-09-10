"""
Selenium E2E Test: AI Requirement Review Flow
Verifies:
  - Navigation from project to Requirements workspace
  - Locating REQ-AROMIQ-001 Restaurant Order Cancellation Policy
  - Initiating / opening AI Requirement Review modal
  - Explicit wait for AI review completion
  - Verification of review structure:
    - Summary statistic cards (Total Findings, etc.)
    - Finding cards containing severity and issue type
    - Grounding / evidence visibility (Project Evidence, Verified Sources)
    - Human triage controls (Accept, Reject, Modify buttons)
  - Clean dismissal of review modal
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.mark.e2e
def test_requirement_review_modal_flow(authenticated_driver, frontend_url: str):
    driver = authenticated_driver

    # 1. Navigate to Projects list
    driver.get(f"{frontend_url}/projects")
    WebDriverWait(driver, 10).until(lambda d: "/projects" in d.current_url)

    # 2. Open Aromiq project workspace
    project_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//h3]"))
    )
    project_card.click()

    # 3. Wait for project dashboard and navigate to Requirements
    WebDriverWait(driver, 10).until(
        lambda d: "/projects/" in d.current_url and not d.current_url.endswith("/projects")
    )
    req_link = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/requirements')]"))
    )
    req_link.click()

    # 4. Verify Requirements page loads
    WebDriverWait(driver, 10).until(lambda d: "/requirements" in d.current_url)
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(text(), 'Requirements') or contains(text(), 'Requirement')]"))
    )

    # 5. Locate REQ-AROMIQ-001 / Restaurant Order Cancellation Policy row
    req_row = WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((
            By.XPATH,
            "//tr[contains(., 'Restaurant Order Cancellation Policy') or contains(., 'REQ-AROMIQ-001')]"
        ))
    )
    assert req_row.is_displayed(), "REQ-AROMIQ-001 row should be visible in requirements table"

    # 6. Locate and click 'Review with AI' button
    review_button = req_row.find_element(
        By.XPATH,
        ".//button[contains(., 'Review with AI') or contains(., 'Review')]"
    )
    review_button.click()

    # 7. Verify Requirement Review modal opens
    modal_header = WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((
            By.XPATH,
            "//div[contains(@class, 'fixed')]//h2[contains(text(), 'AI Requirement Review')]"
        ))
    )
    assert modal_header.is_displayed()

    # 8. Explicitly wait for review loading to finish and review summary stats to mount
    summary_stat = WebDriverWait(driver, 45).until(
        EC.visibility_of_element_located((
            By.XPATH,
            "//div[contains(@class, 'fixed')]//div[contains(., 'Total Findings') and .//div[contains(@class, 'font-extrabold')]]"
        ))
    )
    assert summary_stat.is_displayed()

    # 9. Verify finding cards are rendered or explicit zero-findings state is rendered
    finding_cards = driver.find_elements(
        By.XPATH,
        "//div[contains(@class, 'fixed')]//div[contains(@class, 'rounded-xl') and .//div[contains(@class, 'space-y-1')] and .//button[contains(., 'Accept')]]"
    )

    if len(finding_cards) > 0:
        first_card = finding_cards[0]
        # Verify severity or issue type info
        severity_elements = first_card.find_elements(
            By.XPATH,
            ".//span[contains(@class, 'uppercase') and (contains(text(), 'HIGH') or contains(text(), 'MEDIUM') or contains(text(), 'LOW') or contains(text(), 'CRITICAL'))]"
        )
        assert len(severity_elements) > 0, "Finding card must display severity information"

        # Verify grounding / evidence information
        evidence_elements = first_card.find_elements(
            By.XPATH,
            ".//div[contains(., 'Project Evidence:') or contains(., 'Grounded in Project Context')]"
        )
        assert len(evidence_elements) > 0, "Finding card should contain evidence/grounding information"

        # Verify human triage controls
        accept_btn = first_card.find_elements(By.XPATH, ".//button[contains(., 'Accept')]")
        reject_btn = first_card.find_elements(By.XPATH, ".//button[contains(., 'Reject')]")
        modify_btn = first_card.find_elements(By.XPATH, ".//button[contains(., 'Modify')]")

        assert len(accept_btn) > 0, "Human triage control 'Accept' must be visible"
        assert len(reject_btn) > 0, "Human triage control 'Reject' must be visible"
        assert len(modify_btn) > 0, "Human triage control 'Modify' must be visible"
    else:
        # Check for clean valid empty/no issues state
        no_issues = driver.find_elements(
            By.XPATH,
            "//div[contains(@class, 'fixed')]//p[contains(text(), 'No requirement issues detected')]"
        )
        assert len(no_issues) > 0, "If no finding cards, explicit valid empty state must be shown"

    # 10. Verify modal can be closed cleanly
    close_btn = WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((
            By.XPATH,
            "//div[contains(@class, 'fixed')]//button[contains(@class, 'text-muted-foreground') and .//*[local-name()='svg']]"
        ))
    )
    close_btn.click()

    # Wait for modal to dismiss
    WebDriverWait(driver, 5).until(
        EC.invisibility_of_element_located((
            By.XPATH,
            "//div[contains(@class, 'fixed')]//h2[contains(text(), 'AI Requirement Review')]"
        ))
    )
