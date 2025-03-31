# Zedmonkey <span style="background-color: #3D5AFE; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7em; vertical-align: middle;">βeta</span>

<p align="center">
  <img src="src/icons/icon128.png" alt="Zedmonkey Logo" width="128" height="128">
</p>

<p align="center">
  <b>A lightning-fast userscript manager engineered for developers who demand speed and efficiency</b>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/ahppjceidfcinboledomgmbmnafdidll"><img src="https://img.shields.io/badge/Download-Chrome_Web_Store-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Download from Chrome Web Store"></a>
  <a href="https://github.com/livrasand/Zedmonkey"><img src="https://img.shields.io/badge/View_Source-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="View Source on GitHub"></a>
</p>

## Performance That Speaks For Itself

| Metric | Zedmonkey | Tampermonkey | Violentmonkey |
|--------|-----------|--------------|---------------|
| Self Time (ms) | **0.2** | 14.1 | 0.7 |
| Total Time (ms) | **0.2** | 14.8 | 202.8 |
| Memory Usage (KB) | **30,500** | 57,752 | 41,080 |
| JavaScript Memory (KB) | **1,426** | 4,573 | 3,448 |
| CPU Usage (%) | **0.0** | 0.1 | 0.0 |
| Background Processes | **None when inactive** | Always running | Always running |

*All measurements taken on a Windows 10 PC using Microsoft Edge browser and www.google.com as test page. Lower values are better.*

## Features

- **⚡ Unbeatable Speed**: Scripts load instantly thanks to ultra-reduced size and optimized performance
- **☁️ Cloud Synchronization**: Sync to Dropbox, OneDrive, Google Drive, or WebDAV across all your browsers
- **🪶 Minimalist Philosophy**: 13KB limit ensures optimal performance without sacrificing functionality
- **🛡️ Modern Zedata Format**: Our clean format designed with enhanced security features and improved readability
- **🧩 Full Compatibility**: Works with traditional userscript formats, ensuring you can use scripts from any source
- **👻 Zero Background Impact**: Only activates when needed, completely disappearing from task manager when not in use

## Introducing Zedata Block

A revolutionary format that makes traditional Metadata Blocks obsolete. Designed for speed and efficiency.

**Traditional Metadata Block (317 bytes):**
```javascript
// ==UserScript==
// @name         Hello World Script
// @namespace    zedmonkey
// @version      1.0.0
// @description  Hello World!
// @author       Zedmonkey User
// @match        *://*/*
// @grant        none
// ==/UserScript==
```

**Zedmonkey Zedata Block (131 bytes):**
```
script,HelloWorldScript,zedmonkey,1.0.0,HelloWorld,ZedmonkeyUser,*,none
```

**58.65% Size Reduction** - Less data to transfer and store  
**70-80% Faster Parsing** - Simple comma-based format vs line-by-line parsing  
**~40% Memory Reduction** - More compact structure means less RAM usage

## Installation

### From Chrome Web Store
1. Visit the [Zedmonkey page](https://chromewebstore.google.com/detail/ahppjceidfcinboledomgmbmnafdidll) on Chrome Web Store
2. Click "Add to Chrome" (or "Add to Edge" if using Microsoft Edge)
3. Confirm the installation when prompted

### From Source (Development Version)
1. Clone this repository: `git clone https://github.com/livrasand/Zedmonkey.git`
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the Zedmonkey directory

## Browser Compatibility

- ✅ Chrome - Fully supported
- ✅ Edge - Fully supported
- 🔜 Firefox - Coming soon
- 🔜 Safari - Coming soon

## Usage

1. Click the Zedmonkey icon in your browser toolbar to open the popup
2. Use the "+" button to create a new script or import existing ones
3. Enable/disable scripts using the toggle switches
4. Click on a script to edit its content and metadata

## Development Status

Zedmonkey is currently in active development and considered BETA software. While it's functional for daily use, you may encounter bugs or incomplete features. A STABLE release is planned for the near future.

### Current Limitations
- Some advanced userscript features may not be fully implemented
- UI and UX improvements are ongoing
- Performance optimizations are still being added

## Contributing

We believe in open collaboration and continuous improvement. Help us make Zedmonkey even better:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Areas for Contribution

- **Security Auditing**: Help us identify and fix potential vulnerabilities
- **Performance Optimization**: Find ways to make Zedmonkey even faster and more efficient
- **UI/UX Improvements**: Enhance the user interface while maintaining our minimalist approach
- **Documentation**: Help us create better guides and examples for users

## Acknowledgments

- Inspired by the need for a lightweight, developer-focused userscript manager
- Thanks to all contributors and testers who have helped shape this project

---

<p align="center">Made with ❤️ for developers who value simplicity and performance</p>
<p align="center">© 2025 Zedmonkey Project. Lightweight by design, powerful by default.</p>
