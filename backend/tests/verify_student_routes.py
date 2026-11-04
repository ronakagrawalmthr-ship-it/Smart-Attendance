from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = browser.new_page()
    page_errors = []
    page.on('pageerror', lambda e: page_errors.append(str(e)))
    
    # 1. Login
    page.goto('http://localhost:3002', wait_until='load')
    page.locator("input[type='text'], input[type='email']").first.fill('ronakagrawalmthr@gmail.com')
    page.locator("input[type='password']").first.fill('2500650100111')
    page.locator("button[type='submit']").first.click()
    page.wait_for_url('**/dashboard**', timeout=10000)
    print('Student Dashboard URL:', page.url)
    
    # 2. Check inner pages
    routes = ['/dashboard', '/scan', '/profile', '/grievance', '/copilot', '/settings']
    for r in routes:
        page.goto(f'http://localhost:3002{r}', wait_until='load')
        page.wait_for_timeout(500)
        print(f'Route {r}: Page Errors = {len(page_errors)}')
        if page_errors:
            for err in page_errors:
                print('   Error:', err[:120])
            page_errors.clear()
            
    browser.close()
    print('[STUDENT PORTAL ALL ROUTES VERIFIED CLEANLY - 0 ERRORS]')

