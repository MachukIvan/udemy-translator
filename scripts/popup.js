document.addEventListener('DOMContentLoaded', async () => {
    const selectFrom = document.getElementById('translate-from');
    const selectTo = document.getElementById('translate-to');

    const toggleInput = document.getElementById('toggle');

    if (selectFrom !== null && selectTo !== null) {
        const detectLanguageOption = { name: 'Detect', language: 'detect' };

        try {
            const {
                enabled = false,
                supportedLanguages = [],
                translateFrom,
                translateTo,
            } = await chrome.storage.local.get([
                'enabled',
                'supportedLanguages',
                'translateFrom',
                'translateTo',
            ]);

            if (toggleInput.checked !== enabled) {
                toggleInput.checked = enabled;
            }

            selectFrom.options[0] = new Option(
                detectLanguageOption.name,
                detectLanguageOption.language
            );

            let selectedFromValue = translateFrom;
            if (!selectedFromValue) {
                selectedFromValue = detectLanguageOption.language;
                selectFrom.options[0].selected = true;
                await chrome.storage.local.set({
                    translateFrom: detectLanguageOption.language,
                });
            }

            let selectedToValue = translateTo;
            if (!selectedToValue) {
                selectedToValue = window.navigator.language;
                await chrome.storage.local.set({
                    translateTo: window.navigator.language,
                });
            }

            supportedLanguages.forEach(({ name, language }, index) => {
                selectFrom.options[index + 1] =
                    selectedFromValue === language
                        ? new Option(name, language, true, true)
                        : new Option(name, language);
                selectTo.options[index] =
                    selectedToValue === language
                        ? new Option(name, language, true, true)
                        : new Option(name, language);
            });
        } catch (error) {
            console.error(error);
        }
    }

    selectFrom.addEventListener('change', async (event) => {
        await chrome.storage.local.set({
            translateFrom: event.target.value,
        });
    });

    selectTo.addEventListener('change', async (event) => {
        await chrome.storage.local.set({
            translateTo: event.target.value,
        });
    });

    toggleInput.addEventListener('change', async (event) => {
        const enabled = event.target.checked;

        const extensionId = chrome.runtime.id;
        const success = await chrome.runtime.sendMessage(extensionId, {
            enabled,
        });

        if (success) {
            await chrome.storage.local.set({ enabled });
        } else {
            toggleInput.checked = !enabled;
        }
    });
});
