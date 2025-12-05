# OpenSVG - SVG Inspector & Downloader

**OpenSVG** is a powerful browser extension designed for developers and designers to instantly inspect, extract, and organize SVG assets from any website.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## 🚀 Features

- **Instant Scan**: Detects all SVG assets on a page, including:
  - Inline `<svg>` tags
  - `<img>` tags with SVG sources
  - `<object>` and `<embed>` SVG files
  - Base64 encoded SVGs
- **Smart Deduplication**: Automatically filters out duplicate SVGs so you only see unique assets.
- **Visual Dashboard**: View all SVGs in a clean grid layout with transparent/checkerboard backgrounds.
- **Advanced Filtering**: Filter by type (All, Inline, Files).
- **Bulk Actions**: Select multiple or all SVGs to download in a ZIP file.
- **Export Options**:
  - **Copy Code**: One-click copy of raw SVG code (clipboard ready).
  - **Download**: Save individual `.svg` files.
  - **Export PNG**: Convert and download SVGs as high-quality PNGs.
- **Privacy Focused**: All processing happens locally in your browser. No data is sent to external servers.

## 📦 Installation

This extension is built for Chromium-based browsers (Chrome, Edge, Brave, etc.).

### From Source (Developer Mode)

1.  Clone this repository or download the ZIP.
    ```bash
    git clone https://github.com/wahibirawan/opensvg.git
    ```
2.  Open your browser's extensions page:
    -   **Chrome**: `chrome://extensions`
    -   **Edge**: `edge://extensions`
3.  Enable **Developer Mode** (usually a toggle in the top-right corner).
4.  Click **Load unpacked**.
5.  Select the folder where you cloned/extracted this repository.

## 🛠 Usage

1.  Navigate to any website where you want to extract SVGs.
2.  Click the **OpenSVG** icon in your browser toolbar.
3.  The dashboard will open, displaying all found SVGs.
4.  **Hover** over a card to see actions (Copy, Download, PNG).
5.  **Click** a card or use the checkbox to select it.
6.  Use the **"Select All"** checkbox to select everything.
7.  Click **"Download Selected"** to get a ZIP of your selection.

## ☕ Support

If you find this tool useful, consider buying me a coffee to support development!

[**Buy me a coffee**](https://buymeacoffee.com/wahibirawan)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📝 Privacy Policy

This tool only downloads SVG files.
We do not collect any personal data.
No tracking, analytics, or cookies.
All downloads go directly to your device.
We do not store or share your files.
You are responsible for any content you download or upload.
If you run this on a third party server, the server admin may have access.
Use it as needed.

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

