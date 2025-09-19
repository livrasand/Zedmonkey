// Test script to verify service worker registration
// Run this in browser console to test

async function testServiceWorker() {
    console.log('🔧 Testing Zedmonkey service worker...');
    
    try {
        // Test 1: Check if service worker is registered
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            console.log('✅ Service worker is registered');
            console.log('   State:', registration.active?.state);
        } else {
            console.log('❌ No service worker registration found');
            return;
        }
        
        // Test 2: Try to access storage
        const result = await chrome.storage.local.get('scripts');
        console.log('✅ Storage access successful');
        console.log('   Scripts count:', (result.scripts || []).length);
        
        // Test 3: Test dynamic imports by sending a message
        chrome.runtime.sendMessage({ action: 'createTestScript' }, (response) => {
            if (response && response.success) {
                console.log('✅ Dynamic imports working - test script created');
                console.log('   Script name:', response.name);
            } else {
                console.log('❌ Dynamic imports failed:', response?.error);
            }
        });
        
    } catch (error) {
        console.log('❌ Service worker test failed:', error);
    }
}

// Auto-run if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
    testServiceWorker();
} else {
    console.log('Run this script in the extension context (popup, options page, etc.)');
}
