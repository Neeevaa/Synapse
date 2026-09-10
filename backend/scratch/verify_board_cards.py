import os
import sys
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.e2e.conftest import login_user

def test_kanban_cards_compact_and_detail():
    frontend_url = "http://localhost:3000"
    email = "arya@gmail.com"
    password = "admin@synapse"

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1440,900")

    driver = webdriver.Chrome(options=chrome_options)
    try:
        # 1. Login with verified login_user helper
        login_user(driver, frontend_url, email, password)
        print("[VERIFIED] Authenticated successfully")

        # 2. Go to projects and open Aromiq
        driver.get(f"{frontend_url}/projects")
        aromiq_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[.//h3[contains(text(), 'Aromiq')]]"))
        )
        aromiq_btn.click()

        # 3. Navigate to Board
        board_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/board')]"))
        )
        board_link.click()

        WebDriverWait(driver, 10).until(lambda d: "/board" in d.current_url)

        # 4. Verify 5 columns are present
        column_labels = ["To Do", "In Progress", "In Review", "Done", "Cancelled"]
        for label in column_labels:
            col = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.XPATH, f"//span[contains(text(), '{label}')]"))
            )
            print(f"[VERIFIED] Column found: {label}")

        # 5. Check task cards across columns
        cards = driver.find_elements(By.XPATH, "//div[contains(@class, 'group') and contains(@class, 'rounded-xl') and .//h4]")
        print(f"[INFO] Found {len(cards)} task cards on the board.")
        assert len(cards) > 0, "Expected at least one task card on the board"

        for idx, card in enumerate(cards):
            # Verify no long paragraph descriptions in card
            paragraphs = card.find_elements(By.TAG_NAME, "p")
            assert len(paragraphs) == 0, f"Card {idx} should NOT have <p> description elements! Found: {len(paragraphs)}"

            # Verify title exists
            title_elem = card.find_element(By.TAG_NAME, "h4")
            assert title_elem.text.strip(), f"Card {idx} must have non-empty title"

            # Verify workstream / priority badges exist
            badges = card.find_elements(By.XPATH, ".//span[contains(@class, 'uppercase')]")
            assert len(badges) >= 1, f"Card {idx} should have badges"

        # Screenshot of the compact board
        screenshot_dir = r"C:\Users\Neeva\.gemini\antigravity-ide\brain\79e3fa9e-48c8-4987-baa0-f1ad4932e9b1"
        board_shot = os.path.join(screenshot_dir, "compact_kanban_board.png")
        driver.save_screenshot(board_shot)
        print(f"[VERIFIED] Saved board screenshot to {board_shot}")

        # 6. Click first card to open TaskDetailPanel
        first_card = cards[0]
        first_card_title = first_card.find_element(By.TAG_NAME, "h4").text.strip()
        print(f"[INFO] Clicking task card: {first_card_title}")
        first_card.click()

        # Wait for slide-over panel
        panel = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside[contains(@class, 'translate-x-0')]"))
        )
        print(f"[VERIFIED] TaskDetailPanel opened successfully!")

        # Verify panel contents
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside//label[contains(., 'Title')]"))
        )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside//label[contains(., 'Status')]"))
        )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside//label[contains(., 'Priority')]"))
        )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside//label[contains(., 'Workstream')]"))
        )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside//label[contains(., 'Story Points')]"))
        )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside//label[contains(., 'Description')]"))
        )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside//label[contains(., 'Assignee')]"))
        )
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//aside//h4[contains(., 'Comments & Activity')]"))
        )

        detail_shot = os.path.join(screenshot_dir, "task_detail_panel.png")
        driver.save_screenshot(detail_shot)
        print(f"[VERIFIED] Saved task detail panel screenshot to {detail_shot}")

        # Close panel
        close_btn = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//aside//button[contains(@class, 'hover:text-foreground')]"))
        )
        close_btn.click()

        print("[SUCCESS] All Kanban card compactness and TaskDetailPanel interactions verified!")

    finally:
        driver.quit()

if __name__ == "__main__":
    test_kanban_cards_compact_and_detail()
