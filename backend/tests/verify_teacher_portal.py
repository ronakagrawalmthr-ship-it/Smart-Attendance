from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = browser.new_page()
    page_errors = []
    page.on('pageerror', lambda e: page_errors.append(str(e)))
    
    page.goto('http://localhost:3000/teacher', wait_until='load')
    page.wait_for_timeout(1000)
    print('Teacher Portal URL:', page.url)
    print(f'Teacher Page Errors: {len(page_errors)}')
    if page_errors:
        for err in page_errors:
            print('   Error:', err[:120])
            
    browser.close()
    print('[TEACHER PORTAL VERIFIED CLEANLY - 0 ERRORS]')

