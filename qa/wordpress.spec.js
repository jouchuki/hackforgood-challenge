import{test,expect}from'@playwright/test';
test('actual WordPress plugin activates and redirects only synthetic search',async({page})=>{
 await page.goto('http://localhost:9400/');
 await expect(page.locator('body')).not.toContainText('Using null as an array offset is deprecated');
 await expect(page.locator('#before-demo-search')).toBeVisible();
 await expect(page.locator('script[data-site="wordpress"]')).toHaveCount(1);
 await page.locator('#before-demo-search').fill('test-trigger-red');
 await page.getByRole('button',{name:'Open prevention demo'}).click();
 await expect(page).toHaveURL(/localhost:3000\/intervention\/wordpress/);
 await expect(page.locator('h1')).toBeVisible();
 expect(page.url()).not.toContain('test-trigger-red');
 await page.goto('http://localhost:9400/?s=walking');
 await expect(page).toHaveURL(/localhost:9400/);
});
test('WordPress settings are real capability-protected options',async({page})=>{
 await page.goto('http://localhost:9400/wp-admin/options-general.php?page=before-prevention');
 await expect(page.getByRole('heading',{name:'Next Step Prevention',exact:true})).toBeVisible();
 await expect(page.locator('#before_endpoint')).toHaveValue('http://localhost:3000');
 await expect(page.locator('#before_site')).toHaveValue('wordpress');
 await expect(page.locator('input[name="_wpnonce"]')).toHaveCount(1);
});

test('WordPress deployment verification follows its real SDK and server-side handover',async({page})=>{
 const session=await page.request.post('http://localhost:3000/api/session',{data:{role:'moderator'}});expect(session.ok()).toBeTruthy();
 const started=await page.request.post('http://localhost:3000/api/moderator/sites/wordpress/deployment',{data:{}});expect(started.ok()).toBeTruthy();
 const initial=await started.json();expect(initial.testUrl).toMatch(/^http:\/\/localhost:9400\/\?before_check=[a-f0-9]{32}$/);
 let metricPosts=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/metrics'))metricPosts++;});
 await page.goto(initial.testUrl);await expect(page.locator('#before-demo-search')).toBeVisible();
 await expect.poll(async()=>{const status=await(await page.request.get('http://localhost:3000/api/moderator/sites/wordpress/deployment')).json();return status.verification.steps.sdk;}).toBe(true);
 await page.locator('#before-demo-search').fill('test-trigger-red');await page.getByRole('button',{name:'Open prevention demo'}).click();
 await expect(page).toHaveURL(/localhost:3000\/intervention\/wordpress\?.*before_check=/);
 await expect(page.locator('[data-before-stage]')).toBeVisible();
 await expect.poll(async()=>{const status=await(await page.request.get('http://localhost:3000/api/moderator/sites/wordpress/deployment')).json();return status.verification.status;}).toBe('verified');
 expect(metricPosts).toBe(0);
 await page.goto('http://localhost:3000/moderator/integrations?site=wordpress');await expect(page.locator('#deployment-status')).toContainText('Deployment verified');
 await page.screenshot({path:'artifacts/ui-clarity/after/wordpress-deployment-verified.png',fullPage:true,animations:'disabled'});
});
