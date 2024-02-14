(() => addObserverIfDesiredNodeAvailable())();

async function addObserverIfDesiredNodeAvailable() {
    const captionsContainer = document.querySelector(
        'div[data-purpose="captions-cue-text"]'
    );

    if (!captionsContainer) {
        window.setTimeout(addObserverIfDesiredNodeAvailable, 500);
        return;
    }

    await translateCaptions();

    let isPending = false;

    const observer = new MutationObserver(async () => {
        const { enabled = false } = await chrome.storage.local.get(['enabled']);

        if (!enabled) {
            return observer.disconnect();
        }

        if (!isPending) {
            isPending = true;

            await translateCaptions();

            return setTimeout(() => {
                isPending = false;
            }, 200);
        }
    });

    // Observe the parent because the captions container
    // gets removed & inserted back when captions update
    observer.observe(captionsContainer.parentElement, {
        subtree: true,
        childList: true,
        characterData: true,
    });
}

async function translate(text) {
    const { apiKey, translateFrom, translateTo } =
        await chrome.storage.local.get([
            'apiKey',
            'translateFrom',
            'translateTo',
        ]);

    if (!apiKey) {
        throw new Error(
            'Please provide the Google API key in the background.js file. The key could be found in the Google Cloud console. Also, make sure you have enabled the Cloud Translation API.'
        );
    }

    const options = {
        q: text,
        source: translateFrom === 'detect' ? undefined : translateFrom,
        target: translateTo,
        format: 'text',
    };

    const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
        }
    );

    const parsedResponse = await response.json();
    return parsedResponse.data?.translations[0].translatedText;
}

async function translateCaptions() {
    const captionsContainer = document.querySelector(
        'div[data-purpose="captions-cue-text"]'
    );

    if (captionsContainer) {
        const currentCaptionsText = captionsContainer.textContent;
        if (currentCaptionsText.length > 0) {
            try {
                translatedText = await translate(currentCaptionsText);

                if (
                    translatedText &&
                    translatedText.length > 0 &&
                    translatedText !== currentCaptionsText
                ) {
                    captionsContainer.textContent = translatedText;
                }
            } catch (error) {
                console.error(error);
            }
        }
    }
}
