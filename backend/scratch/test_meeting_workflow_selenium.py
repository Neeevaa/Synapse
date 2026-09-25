# backend/scratch/test_meeting_workflow_selenium.py
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def run_workflow_e2e_test():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(5)

    try:
        print("[1] Navigating to login page...")
        driver.get("http://localhost:3000/login")

        print("[2] Logging in as arya@gmail.com...")
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        password_input = driver.find_element(By.NAME, "password")
        email_input.send_keys("arya@gmail.com")
        password_input.send_keys("admin@synapse")
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()

        WebDriverWait(driver, 10).until(lambda d: "/login" not in d.current_url)
        print(f"Logged in successfully. Current URL: {driver.current_url}")

        print("[3] Navigating to Meeting Detail page...")
        meeting_url = "http://localhost:3000/projects/ff7c34f3-5621-4564-8674-b4462b637898/meetings/b6ea1cd3-a037-4c5d-8c99-85380cf214d5"
        driver.get(meeting_url)

        time.sleep(2)

        print("[4] Clicking on Intelligence tab...")
        intel_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Intelligence')]"))
        )
        intel_tab.click()
        time.sleep(2)

        print("[5] Inspecting WorkflowProgressTracker...")
        tracker_text = driver.find_element(By.XPATH, "//div[contains(@class, 'rounded-2xl')]").text
        print(f"Tracker badge summary:\n{tracker_text[:200]}")

        # Verify steps presence
        for step_label in ["Transcript", "AI Analysis", "Review Intelligence", "Review Action Items", "Task Conversion", "Complete"]:
            assert step_label in tracker_text, f"Step '{step_label}' missing from tracker!"
            print(f"  [OK] Found '{step_label}' step in tracker")

        # Check Step 6 Complete state or current step
        step_badge = driver.find_element(By.XPATH, "//span[contains(text(), 'Step')]")
        print(f"Current step badge: {step_badge.text}")
        assert "%" in step_badge.text, "Expected percentage in step badge!"

        print("[6] Testing step interaction: clicking on Step 3 (Review Intelligence)...")
        step_nodes = driver.find_elements(By.XPATH, "//div[contains(@class, 'group') and contains(@class, 'cursor-pointer')]")
        print(f"Found {len(step_nodes)} clickable step nodes.")
        
        # Click on Review Intelligence node
        review_node = driver.find_element(By.XPATH, "//p[text()='Review Intelligence']/ancestor::div[contains(@class, 'group')]")
        driver.execute_script("arguments[0].click();", review_node)
        time.sleep(2)

        # Verify Review Intelligence content
        page_source = driver.page_source
        assert "Executive Summary" in page_source, "Executive Summary missing in Step 3 view!"
        assert "Key Decisions" in page_source, "Key Decisions missing in Step 3 view!"
        assert "Identified Risks" in page_source, "Risks missing in Step 3 view!"
        assert "AI Analysis Engine" in page_source, "Metadata card missing in Step 3 view!"
        assert "Continue to Action Items" in page_source, "'Continue to Action Items' button missing in Step 3 view!"
        print("  [OK] Step 3 (Review Intelligence) content and 'Continue to Action Items' button verified.")

        print("[7] Clicking 'Continue to Action Items' button...")
        continue_btn = driver.find_element(By.XPATH, "//button[contains(., 'Continue to Action Items')]")
        continue_btn.click()
        time.sleep(1)

        # Verify Step 4 content
        page_source = driver.page_source
        assert "A. Meeting Action Items" in page_source, "Section A. Meeting Action Items missing in Step 4 view!"
        assert "B. AI Task Suggestions" in page_source, "Section B. AI Task Suggestions missing in Step 4 view!"
        print("  [OK] Step 4 shows both Meeting Action Items and AI Task Suggestions.")

        print("[8] Testing Step 5 (Task Conversion) node...")
        tasks_node = driver.find_element(By.XPATH, "//p[text()='Task Conversion']/ancestor::div[contains(@class, 'group')]")
        tasks_node.click()
        time.sleep(1)
        assert "Task Conversion Status" in driver.page_source
        assert "Converted Project Tasks" in driver.page_source
        print("  [OK] Step 5 (Task Conversion) verified.")

        print("[9] Testing Step 6 (Complete) node...")
        complete_node = driver.find_element(By.XPATH, "//p[text()='Complete']/ancestor::div[contains(@class, 'group')]")
        complete_node.click()
        time.sleep(1)
        assert "Meeting Intelligence Workflow Complete" in driver.page_source
        print("  [OK] Step 6 (Complete) verified.")

        print("[10] Testing page reload persistence...")
        driver.refresh()
        time.sleep(2)
        intel_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Intelligence')]"))
        )
        intel_tab.click()
        time.sleep(1)
        step_badge_after_reload = driver.find_element(By.XPATH, "//span[contains(text(), 'Step')]")
        print(f"Step badge after reload: {step_badge_after_reload.text}")
        assert "Step 6 of 6: Complete" in step_badge_after_reload.text, "Workflow reverted after reload!"
        print("  [OK] Workflow state successfully persisted across page reload!")

        print("\nALL WORKFLOW TESTS PASSED CLEANLY!")
    finally:
        driver.quit()

if __name__ == "__main__":
    run_workflow_e2e_test()
