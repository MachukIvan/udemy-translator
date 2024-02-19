const GOOGLE_API_KEY = '';

// Receive list of supported languages and put it in the storage
chrome.runtime.onInstalled.addListener(handleInstalled);

// Re-run content script when new video starts
chrome.tabs.onUpdated.addListener(handleUpdated);

// Handle the message sent by the toggle input from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message, sendResponse);
    return true;
});

async function fetchSupportedLanguagesList() {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.length === 0) {
        throw new Error(
            'Please provide the Google API key in the background.js file. The key could be found in the Google Cloud console. Also, make sure you have enabled the Cloud Translation API.'
        );
    }

    const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_API_KEY}&target=en`
    );

    const result = await response.json();
    return result.data.languages;
}

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true });
    return tab;
}

async function registerAndExecuteContentScript(tabId) {
    const contentScript = {
        id: 'udemy-translator',
        matches: ['https://www.udemy.com/course/*'],
        js: ['scripts/content.js'],
    };

    await chrome.scripting.registerContentScripts([contentScript]);
    await chrome.scripting.executeScript({
        target: { tabId },
        files: ['scripts/content.js'],
    });
}

async function unregisterContentScripts() {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    const scriptIds = scripts.map((script) => script.id);
    if (scriptIds.length > 0) {
        await chrome.scripting.unregisterContentScripts({
            ids: scriptIds,
        });
    }
}

async function updateBadge(enabled, tabId) {
    if (enabled) {
        await chrome.action.setBadgeText({
            text: 'ON',
            tabId,
        });
        await chrome.action.setBadgeBackgroundColor({
            color: '#3e4143',
            tabId,
        });
    } else {
        await chrome.action.setBadgeText({ text: '', tabId });
    }
}

async function handleMessage({ enabled }, sendResponse) {
    const tab = await getActiveTab();

    if (!tab) {
        await unregisterContentScripts();
        sendResponse(false);
    }

    try {
        if (enabled) {
            await registerAndExecuteContentScript(tab.id);
        } else {
            await unregisterContentScripts();
        }

        await updateBadge(enabled, tab.id);
        sendResponse(true);
    } catch (error) {
        console.error(error);
        await unregisterContentScripts();
        sendResponse(false);
    }
}

async function handleInstalled() {
    try {
        const supportedLanguages = await fetchSupportedLanguagesList();
        await chrome.storage.local.set({
            supportedLanguages,
            enabled: false,
            apiKey: GOOGLE_API_KEY,
        });
    } catch (error) {
        console.error(error);
    }
}

async function handleUpdated(tabId, changeInfo) {
    if (changeInfo.url) {
        const { enabled = false } = await chrome.storage.local.get(['enabled']);
        if (enabled) {
            try {
                await unregisterContentScripts();
                await registerAndExecuteContentScript(tabId);
            } catch (error) {
                console.error(error);
            }
        }
    }
}
