# Zedmonkey

<p align="center">
  <img src="src/icons/icon128.png" alt="Zedmonkey Logo" width="128" height="128">
</p>

<p align="center">
  <b>A lightweight, developer-focused userscript manager built for speed and efficiency</b>
</p>

<p align="center">
  <i>⚠️ Currently in BETA - Stable release coming soon ⚠️</i>
</p>

## Overview

Zedmonkey is an open-source userscript manager designed for developers who demand speed, simplicity, and efficiency. It allows you to create, manage, and run custom JavaScript and CSS scripts on websites to enhance functionality, fix issues, or customize your browsing experience.

## Features

- **Lightweight & Fast**: Engineered for minimal resource usage and maximum performance
- **Developer-Friendly**: Built with developers in mind, featuring a clean code editor with syntax highlighting
- **Dual Metadata Support**: Compatible with traditional userscript metadata and the minimalist Zedata Block format
- **Automatic Updates**: Keep your scripts up-to-date with automatic version checking
- **Script Management**: Easily organize, enable/disable, and edit your scripts
- **Site-Specific Scripts**: Run scripts only on the sites where you need them
- **Import/Export**: Seamlessly share and backup your scripts

## Installation

### From Source (Development Version)
1. Clone this repository: `git clone https://github.com/yourusername/Zedmonkey.git`
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the Zedmonkey directory

### From Chrome Web Store
*Coming soon with the stable release*

## Usage

1. Click the Zedmonkey icon in your browser toolbar to open the popup
2. Use the "+" button to create a new script or import existing ones
3. Enable/disable scripts using the toggle switches
4. Click on a script to edit its content and metadata

## Zedata Block

Zedmonkey introduces a minimalist metadata format called "Zedata Block" that uses TOML syntax for cleaner, more efficient script configuration:

```toml
[script]
name = "Hello World Script"
namespace = "http://zedmonkey.local"
version = "1.0"
description = "Shows a 'Hello World' notification when page loads"
author = "Your Name"
match = "*://*/*"
grant = "none"
```

Learn more about Zedata Block in the documentation .

## Development Status
⚠️ BETA PHASE ⚠️

Zedmonkey is currently in active development and considered BETA software. While it's functional for daily use, you may encounter bugs or incomplete features. A STABLE release is planned for the near future.

### Current Limitations
- Some advanced userscript features may not be fully implemented
- UI and UX improvements are ongoing
- Performance optimizations are still being added

## Contributing
Contributions are welcome! If you'd like to help improve Zedmonkey:

1. Fork the repository
2. Create a feature branch: git checkout -b feature/amazing-feature
3. Commit your changes: git commit -m 'Add some amazing feature'
4. Push to the branch: git push origin feature/amazing-feature
5. Open a Pull Request

## Acknowledgments
- Inspired by the need for a lightweight, developer-focused userscript manager
- Thanks to all contributors and testers who have helped shape this project

Made with ❤️ for developers who value simplicity and performance
