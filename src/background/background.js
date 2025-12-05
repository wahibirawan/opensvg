// OpenSVG Background Script

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;

    // Prevent running on restricted URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        console.warn('Cannot scan restricted URL');
        return;
    }

    try {
        // Attempt to scan directly
        await scanTab(tab.id);
    } catch (error) {
        console.log('Initial scan failed, injecting script...', error);

        // Inject script and retry
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/content/content.js']
            });

            // Short delay for script init
            await new Promise(resolve => setTimeout(resolve, 100));

            await scanTab(tab.id);
        } catch (injectionError) {
            console.error('Scan failed after injection:', injectionError);
        }
    }
});

async function scanTab(tabId) {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'SCAN_SVGS' });

    if (response && response.svgs) {
        await chrome.storage.local.set({ lastScan: response });
        openDashboard();
    } else {
        throw new Error('No SVGs found or invalid response');
    }
}

async function openDashboard() {
    const dashboardUrl = chrome.runtime.getURL('src/dashboard/dashboard.html');

    // Check if dashboard is already open
    const tabs = await chrome.tabs.query({ url: dashboardUrl });
    if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id, { active: true });
        chrome.tabs.reload(tabs[0].id); // Reload to fetch new data from storage
    } else {
        await chrome.tabs.create({ url: dashboardUrl });
    }
}

// Listen for messages from dashboard or content script if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'OPEN_DASHBOARD') {
        openDashboard();
    }
});
