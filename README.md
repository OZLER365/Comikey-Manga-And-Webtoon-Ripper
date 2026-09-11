# Comikey Ripper (Manga & Webtoon)

A unified Tampermonkey userscript built to capture and download high-resolution chapters from Comikey. It features a seamless, draggable interface with dedicated processing modes for both traditional manga and scrolling webtoons, saving files directly to organized local folders.

## ✨ Core Features

* **Dual Processing Modes:** Easily switch between "Manga Mode" (for traditional page formats) and "Webtoon Mode" (for continuous vertical scrolling formats like manhwa or manhua) directly from the UI.
* **Smart Adaptive Auto-Scroll:** The auto-scroller dynamically monitors network traffic and render times. It pauses automatically to let slow images fully load before advancing the page, ensuring no missing panels.
* **Floating & Minimizable UI:** A dark-themed, draggable control panel that lets you adjust scroll speed (50ms–2000ms), toggle auto-download, and monitor capture progress in real-time.
* **Direct Folder Export:** Utilizes `GM_download` to bypass ZIP creation, saving sequentially numbered images directly to a folder named after the chapter on your hard drive.
* **Cryptographic Deduplication:** Hashes image data in the background to automatically filter out low-resolution placeholders and duplicate panels.

## ⚠️ Critical Setup & Quirks

* **Reading Direction (MANDATORY):** You MUST set the site's reading direction to **Vertical (Scroll Up to Down)**. The script will not function correctly in Right-to-Left mode.
* **Webtoon Counter Quirk:** When using Webtoon Mode, the total page counter may occasionally display one extra image (e.g., showing 46 total when there are only 45 actual images). This is normal and will not affect the download.
* **Auto-Scroll Recommendation:** It is highly recommended to use the script's built-in Auto Scroll rather than scrolling manually, as it perfectly synchronizes with the image capture hooks.

## 🚀 Installation & Usage

1. **Prerequisite:** Install the **Tampermonkey** browser extension (required for direct folder downloading).
2. **Install Script:** Add the userscript via my Greasyfork profile.
3. **Usage:** Open a chapter on Comikey and select your desired mode (Manga or Webtoon) from the floating UI.
4. **Capture:** Click **Auto Scroll** and let the script scan the chapter. 
5. **Download:** If "Auto-Download" is checked, saving will begin automatically once the bottom is reached. Otherwise, click **Download** to save the files.

## 🔗 Links, Feedback & Support

**This software is strictly for personal educational purposes. Do not repost or distribute the downloaded media.**

* **Greasyfork Profile:** [ozler365 on Greasyfork](https://greasyfork.org/en/users/1553223-ozler365)
* **GitHub Repository Hub:** [ozler-s-works-info](https://ozler365.github.io/ozler-s-works-info/#/repositories)
* **Support the Developer:** Keep this project maintained by leaving a tip at [Buy Me a Coffee (ozler)](https://buymeacoffee.com/ozler).

For bug reports, feature requests, or general troubleshooting, please leave a review on Greasyfork or send an email to **devjk6918@gmail.com**.
