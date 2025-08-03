document.addEventListener('DOMContentLoaded', () => {
    const autoUpdateCheckbox = document.getElementById('auto-update');
    const debugModeCheckbox = document.getElementById('debug-mode');
    const autoDetectScriptsCheckbox = document.getElementById('auto-detect-scripts');
    const autoShowInstallUiCheckbox = document.getElementById('auto-show-install-ui');
    const saveSettingsButton = document.getElementById('save-settings');
    const statusMessage = document.getElementById('status-message');

    // Load settings
    chrome.storage.sync.get([
        'autoUpdate',
        'debugMode',
        'autoDetectScripts',
        'autoShowInstallUI'
    ], (items) => {
        if (autoUpdateCheckbox) {
            autoUpdateCheckbox.checked = items.autoUpdate !== false;
        }
        if (debugModeCheckbox) {
            debugModeCheckbox.checked = items.debugMode === true;
        }
        if (autoDetectScriptsCheckbox) {
            autoDetectScriptsCheckbox.checked = items.autoDetectScripts !== false;
        }
        if (autoShowInstallUiCheckbox) {
            autoShowInstallUiCheckbox.checked = items.autoShowInstallUI !== false;
        }
    });

    // Save settings
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', () => {
            chrome.storage.sync.set({
                autoUpdate: autoUpdateCheckbox ? autoUpdateCheckbox.checked : true,
                debugMode: debugModeCheckbox ? debugModeCheckbox.checked : false,
                autoDetectScripts: autoDetectScriptsCheckbox ? autoDetectScriptsCheckbox.checked : true,
                autoShowInstallUI: autoShowInstallUiCheckbox ? autoShowInstallUiCheckbox.checked : true
            }, () => {
                if (statusMessage) {
                    statusMessage.textContent = 'Settings saved!';
                    setTimeout(() => {
                        statusMessage.textContent = '';
                    }, 2000);
                }
            });
        });
    }
});