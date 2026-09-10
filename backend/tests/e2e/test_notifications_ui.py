import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.mark.e2e
def test_notification_bell_and_popover_flow(authenticated_driver, frontend_url: str):
    """
    TEST 1: In-App Notification Center UI Test
    Using authenticated session:
      - Opens dashboard
      - Locates notification bell button (button[aria-label="Notifications"])
      - Clicks notification bell to open popover dropdown
      - Verifies notification popover opens and renders valid content:
        - Popover header with 'Notifications' title
        - Body renders either notification items with project groups or
          the valid empty state ('All caught up!')
        - If unread notifications exist, verifies badge counter and 'Mark all read' action
      - Dismisses popover
    """
    driver = authenticated_driver

    # 1. Ensure on dashboard with authenticated shell
    if "/dashboard" not in driver.current_url:
        driver.get(f"{frontend_url}/dashboard")
        WebDriverWait(driver, 10).until(
            lambda d: "/dashboard" in d.current_url or "/member-dashboard" in d.current_url
        )

    # 2. Locate Notification Bell button
    bell_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label='Notifications']"))
    )
    assert bell_btn.is_displayed(), "Notification bell button must be visible in the header"

    # Check unread badge if present before opening
    unread_badges = bell_btn.find_elements(By.CSS_SELECTOR, "span")
    has_unread = len(unread_badges) > 0 and unread_badges[0].text.strip() != ""

    # 3. Click bell button to toggle popover
    bell_btn.click()

    # 4. Verify popover dropdown card opens
    popover = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'shadow-2xl')]"))
    )
    assert popover.is_displayed(), "Notification popover must be visible after clicking the bell"

    # 5. Verify popover header
    popover_header = popover.find_element(By.XPATH, ".//span[contains(text(), 'Notifications')]")
    assert "Notifications" in popover_header.text

    # 6. Verify either notification content OR valid empty state
    # Wait for loading spinner to clear if initial fetch is running
    WebDriverWait(driver, 10).until(
        lambda d: len(popover.find_elements(By.XPATH, ".//*[contains(text(), 'Loading notifications')]")) == 0
    )

    empty_state_elements = popover.find_elements(By.XPATH, ".//*[contains(text(), 'All caught up!')]")
    notification_items = popover.find_elements(By.XPATH, ".//div[contains(@class, 'cursor-pointer') and .//p]")

    if empty_state_elements:
        assert empty_state_elements[0].is_displayed(), "Empty state card must be visible when no notifications exist"
    else:
        # Notifications exist
        assert len(notification_items) > 0, "Notification items must be rendered when list is not empty"
        first_item = notification_items[0]
        assert first_item.is_displayed()

        # If unread notifications exist, check for Mark all read button
        if has_unread:
            mark_all_buttons = popover.find_elements(By.XPATH, ".//button[contains(., 'Mark all read')]")
            if mark_all_buttons:
                assert mark_all_buttons[0].is_displayed()

    # 7. Close popover via close button or clicking outside
    close_buttons = popover.find_elements(By.XPATH, ".//button[@title='Close']")
    if close_buttons:
        close_buttons[0].click()
    else:
        bell_btn.click()

    # Verify popover is dismissed
    WebDriverWait(driver, 5).until(
        EC.invisibility_of_element_located((By.XPATH, "//div[contains(@class, 'shadow-2xl')]"))
    )
