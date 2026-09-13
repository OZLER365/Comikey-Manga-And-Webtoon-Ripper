// ==UserScript==
// @name         Comikey Ripper (Manga & Webtoon)
// @namespace    comikey-ripper-script
// @version      2.6
// @description  Combines Comikey Manga and Webtoon Rippers. Added Draggable & Minimizable UI.
// @author       ozler365
// @license      MIT
// @icon         https://comikey.com/static/images/favicons/favicon.b6e9a28323d2.png
// @match        *://comikey.com/*
// @grant        GM_download
// @run-at       document-idle
// @downloadURL https://update.greasyfork.org/scripts/562935/Comikey%20Ripper%20%28Manga%20%20Webtoon%29.user.js
// @updateURL https://update.greasyfork.org/scripts/562935/Comikey%20Ripper%20%28Manga%20%20Webtoon%29.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // --- SHARED STATE & DATA ---
    let currentMode = localStorage.getItem('comikey_ripper_mode') || 'manga';
    let actionState = 'IDLE'; 
    let isAutoScrolling = false;
    let lastUrl = location.href; 

    const mangaCapturedPages = new Map();
    const mangaCapturedHashes = new Set();
    const webtoonCapturedPages = new Map();
    const webtoonCapturedHashes = new Set();
    let webtoonFallbackCounter = 1;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- CHAPTER RESET LOGIC ---
    function checkUrlChange() {
        if (location.href !== lastUrl) {
            console.log("[Comikey Ripper] Chapter change detected. Clearing stored images...");
            lastUrl = location.href;
            
            mangaCapturedPages.clear();
            mangaCapturedHashes.clear();
            webtoonCapturedPages.clear();
            webtoonCapturedHashes.clear();
            webtoonFallbackCounter = 1;
            
            if (actionState !== 'IDLE') {
                stopAutoScroll(false);
            }
        }
    }

    // --- UI ELEMENTS ---
    let uiActionBtn, uiDlBtn, uiAutoDownload, uiSpeedSlider, uiSelectMode;
    
    function initUnifiedUI() {
        const uiContainer = document.createElement('div');
        uiContainer.style.cssText = `
            position: fixed; top: 50%; right: 20px; transform: translateY(-50%);
            z-index: 999999; display: flex; flex-direction: column; align-items: stretch; gap: 8px;
            background: #1e272e; padding: 12px; border-radius: 10px;
            box-shadow: 0 8px 15px rgba(0,0,0,0.5); font-family: sans-serif;
            color: white; width: 220px; box-sizing: border-box;
        `;

        // 1. Drag & Minimize Header
        const headerBar = document.createElement('div');
        headerBar.innerHTML = `<span style="flex-grow: 1; pointer-events: none;"></span><button id="min-btn" style="background: none; border: none; color: white; cursor: pointer; font-weight: bold; font-size: 14px; padding: 0 5px;" title="Minimize">_</button>`;
        headerBar.style.cssText = `
            background: #2f3542; color: #ced6e0; display: flex; justify-content: space-between; align-items: center;
            padding: 8px; font-size: 12px; cursor: move; border-radius: 6px; user-select: none; font-weight: bold; margin-bottom: 4px;
        `;

        // Wrapper for contents so they can be hidden when minimized
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `display: flex; flex-direction: column; gap: 10px;`;

        uiSelectMode = document.createElement('select');
        uiSelectMode.innerHTML = `<option value="manga">📖 Manga Mode</option><option value="webtoon">📜 Webtoon Mode</option>`;
        uiSelectMode.value = currentMode;
        uiSelectMode.style.cssText = `background: #485460; color: #fff; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; outline: none;`;
        uiSelectMode.addEventListener('change', (e) => {
            currentMode = e.target.value;
            localStorage.setItem('comikey_ripper_mode', currentMode);
        });

        const uiPageCount = document.createElement('div');
        uiPageCount.innerHTML = `<b>Captured:</b> <span id="ripper-count" style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">0 / ?</span>`;
        uiPageCount.style.cssText = `display: flex; justify-content: space-between; align-items: center; font-size: 13px;`;

        const speedDiv = document.createElement('div');
        speedDiv.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;
        const uiSpeedLabel = document.createElement('label');
        uiSpeedLabel.textContent = `Speed/Delay: 50ms`;
        uiSpeedLabel.style.fontSize = '12px';
        
        uiSpeedSlider = document.createElement('input');
        uiSpeedSlider.type = 'range';
        uiSpeedSlider.min = '50';
        uiSpeedSlider.max = '2000';
        uiSpeedSlider.step = '50';
        uiSpeedSlider.value = '50';
        uiSpeedSlider.style.width = '100%';
        uiSpeedSlider.oninput = () => uiSpeedLabel.textContent = `Speed/Delay: ${uiSpeedSlider.value}ms`;
        
        speedDiv.appendChild(uiSpeedLabel);
        speedDiv.appendChild(uiSpeedSlider);

        const autoDlDiv = document.createElement('div');
        autoDlDiv.style.cssText = `display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;`;
        uiAutoDownload = document.createElement('input');
        uiAutoDownload.type = 'checkbox';
        uiAutoDownload.id = 'cmk-auto-dl';
        const autoDlLabel = document.createElement('label');
        autoDlLabel.htmlFor = 'cmk-auto-dl';
        autoDlLabel.textContent = 'Auto-Download on Finish';
        autoDlLabel.style.cursor = 'pointer';
        autoDlDiv.appendChild(uiAutoDownload);
        autoDlDiv.appendChild(autoDlLabel);

        uiActionBtn = document.createElement('button');
        uiActionBtn.style.cssText = `padding: 10px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; transition: 0.2s; color: white;`;
        uiActionBtn.addEventListener('click', handleActionBtnClick);

        uiDlBtn = document.createElement('button');
        uiDlBtn.textContent = '⬇ Download';
        uiDlBtn.style.cssText = `padding: 10px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; background-color: #ff4757; color: white; transition: 0.2s;`;
        uiDlBtn.addEventListener('click', triggerDownload);

        const bmac = document.createElement('a');
        bmac.href = 'https://buymeacoffee.com/ozler';
        bmac.target = '_blank';
        bmac.textContent = '☕ Support ozler';
        bmac.style.cssText = `font-size: 12px; color: #fff; background: #FF813F; padding: 6px; border-radius: 4px; text-decoration: none; text-align: center; margin-top: 5px;`;

        // Assemble Sub-elements
        contentWrapper.appendChild(uiSelectMode);
        contentWrapper.appendChild(uiPageCount);
        contentWrapper.appendChild(speedDiv);
        contentWrapper.appendChild(autoDlDiv);
        contentWrapper.appendChild(uiActionBtn);
        contentWrapper.appendChild(uiDlBtn);
        contentWrapper.appendChild(bmac);
        
        // Assemble Main Container
        uiContainer.appendChild(headerBar);
        uiContainer.appendChild(contentWrapper);
        document.body.appendChild(uiContainer);

        setActionState('IDLE');

        // --- Minimize Logic ---
        const minBtn = headerBar.querySelector('#min-btn');
        let isMinimized = false;
        minBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            contentWrapper.style.display = isMinimized ? 'none' : 'flex';
            minBtn.textContent = isMinimized ? '□' : '_';
            minBtn.title = isMinimized ? 'Maximize' : 'Minimize';
        });

        // --- Drag Logic ---
        let isDragging = false;
        let offsetX, offsetY;

        headerBar.addEventListener('mousedown', (e) => {
            if (e.target === minBtn) return; // Don't drag if clicking the minimize button
            isDragging = true;
            const rect = uiContainer.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            // Remove translation transform to prevent jumping when coordinates update
            uiContainer.style.transform = 'none';
            uiContainer.style.bottom = 'auto';
            uiContainer.style.right = 'auto';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            requestAnimationFrame(() => {
                uiContainer.style.left = `${e.clientX - offsetX}px`;
                uiContainer.style.top = `${e.clientY - offsetY}px`;
            });
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // --- UI HELPERS & LOGIC ---
    function getMangaMaxPages() {
        const slider = document.querySelector('input.br-slider[type="range"]');
        return (slider && slider.max) ? parseInt(slider.max, 10) : 0;
    }

    function updatePageCount() {
        const span = document.getElementById('ripper-count');
        if (!span) return;
        
        if (currentMode === 'manga') {
            const max = getMangaMaxPages();
            span.textContent = `${mangaCapturedPages.size} / ${max > 0 ? max : '?'}`;
            if (uiDlBtn && actionState !== 'DOWNLOADING') uiDlBtn.textContent = `⬇ Download (${mangaCapturedPages.size})`;
        } else {
            let totalElements = document.querySelectorAll('#br-spine > div').length || 0;
            if (totalElements > 0) totalElements -= 1; // Fix webtoon counting 1 extra
            if (webtoonCapturedPages.size > totalElements) totalElements = webtoonCapturedPages.size;
            span.textContent = `${webtoonCapturedPages.size} / ${totalElements > 0 ? totalElements : '?'}`;
            if (uiDlBtn && actionState !== 'DOWNLOADING') uiDlBtn.textContent = `⬇ Download (${webtoonCapturedPages.size})`;
        }
    }

    function setActionState(state) {
        actionState = state;
        if (state === 'IDLE') {
            uiActionBtn.textContent = '▶ Auto Scroll';
            uiActionBtn.style.backgroundColor = '#3c40c6';
        } else if (state === 'SCROLLING') {
            uiActionBtn.textContent = '⏹ Stop Auto Scroll';
            uiActionBtn.style.backgroundColor = '#ffa502';
        } else if (state === 'DOWNLOADING') {
            uiActionBtn.textContent = 'Downloading...';
            uiActionBtn.style.backgroundColor = '#747d8c';
        }
    }

    async function handleActionBtnClick() {
        if (actionState === 'IDLE') {
            startAutoScroll();
        } else if (actionState === 'SCROLLING') {
            stopAutoScroll(false);
        }
    }

    // --- SCROLLING LOGIC ---

    async function startAutoScroll() {
        isAutoScrolling = true;
        setActionState('SCROLLING');

        window.scrollTo(0, 0);
        await sleep(1000); 

        // ==== MANGA SCROLLING ====
        if (currentMode === 'manga') {
            let lastScrollTop = -1;
            let scrollAttempts = 0;

            while (isAutoScrolling && currentMode === 'manga') {
                const visibleContainers = Array.from(document.querySelectorAll('.item')).filter(div => {
                    const rect = div.getBoundingClientRect();
                    return rect.top < (window.innerHeight + 150) && rect.bottom > -150;
                });

                let newlyLoaded = false;

                for (const container of visibleContainers) {
                    let waitAttempts = 0;
                    while (waitAttempts < 150) {
                        if (!isAutoScrolling) return;
                        
                        const canvas = container.querySelector('canvas.page-img');
                        if (canvas) {
                            if (canvas.dataset.scrollProcessed === "true") {
                                break;
                            }

                            const hAttr = canvas.getAttribute('height');
                            if (hAttr && hAttr !== "0" && parseInt(hAttr, 10) > 0) {
                                canvas.dataset.scrollProcessed = "true";
                                newlyLoaded = true;
                                break; 
                            }
                        }
                        
                        await sleep(100);
                        waitAttempts++;
                    }
                }

                if (newlyLoaded) {
                    await sleep(1500); 
                }

                window.scrollBy(0, window.innerHeight * 0.7);
                const currentDelay = parseInt(uiSpeedSlider.value, 10);
                await sleep(currentDelay);

                const max = getMangaMaxPages();
                const reachedMax = (max > 0 && mangaCapturedPages.size >= max);
                let reachedBottom = false;

                if (window.scrollY === lastScrollTop) {
                    scrollAttempts++;
                    if (scrollAttempts >= 3) reachedBottom = true;
                } else {
                    scrollAttempts = 0;
                }
                
                lastScrollTop = window.scrollY;

                if (reachedMax || reachedBottom) {
                    stopAutoScroll(true);
                    break;
                }
            }
        } 
        // ==== WEBTOON SCROLLING ====
        else {
            let lastScrollTop = -1;
            let scrollAttempts = 0;

            while (isAutoScrolling && currentMode === 'webtoon') {
                const visibleContainers = Array.from(document.querySelectorAll('.item')).filter(div => {
                    const rect = div.getBoundingClientRect();
                    return rect.top < (window.innerHeight + 150) && rect.bottom > -150;
                });

                for (const container of visibleContainers) {
                    let waitAttempts = 0;
                    while (waitAttempts < 150) {
                        if (!isAutoScrolling) return;
                        
                        const img = container.querySelector('img');
                        if (img && img.getAttribute('src') && img.getAttribute('src').startsWith('blob:')) {
                            break; 
                        }
                        
                        await sleep(100);
                        waitAttempts++;
                    }
                }

                window.scrollBy(0, window.innerHeight * 0.7);
                const currentDelay = parseInt(uiSpeedSlider.value, 10);
                await sleep(currentDelay);

                let totalElements = document.querySelectorAll('#br-spine > div').length || 0;
                if (totalElements > 0) totalElements -= 1; // Fix webtoon counting 1 extra
                const reachedMax = (totalElements > 0 && webtoonCapturedPages.size >= totalElements);
                let reachedBottom = false;

                if (window.scrollY === lastScrollTop) {
                    scrollAttempts++;
                    if (scrollAttempts >= 3) reachedBottom = true;
                } else {
                    scrollAttempts = 0;
                }
                
                lastScrollTop = window.scrollY;

                if (reachedMax || reachedBottom) {
                    stopAutoScroll(true);
                    break;
                }
            }
        }
    }

    function stopAutoScroll(completedAutomatically) {
        isAutoScrolling = false;

        if (completedAutomatically) {
            if (uiAutoDownload.checked) {
                triggerDownload();
            } else {
                setActionState('IDLE');
            }
        } else {
            setActionState('IDLE');
        }
    }

    // --- DOWNLOAD LOGIC ---
    async function triggerDownload() {
        setActionState('DOWNLOADING');
        uiDlBtn.disabled = true;
        uiActionBtn.disabled = true;

        if (currentMode === 'manga') {
            if (mangaCapturedPages.size === 0) {
                alert("No pages captured yet.");
                resetDownloadButtons();
                return;
            }
            const safeFolderTitle = document.title.replace(/[\\/:*?"<>|]/g, '').trim();
            const sortedBlobs = Array.from(mangaCapturedPages.entries())
                                     .sort((a, b) => a[0] - b[0])
                                     .map(entry => entry[1]);

            uiActionBtn.textContent = `Downloading ${sortedBlobs.length} pages...`;
            uiDlBtn.textContent = `Downloading ${sortedBlobs.length} pages...`;

            const downloadPromises = sortedBlobs.map((blob, i) => {
                return new Promise((resolve) => {
                    const pageNum = (i + 1).toString().padStart(3, '0');
                    const filePath = `${safeFolderTitle}/${pageNum}.png`;
                    const url = URL.createObjectURL(blob);
                    
                    GM_download({
                        url: url,
                        name: filePath,
                        saveAs: false,
                        onload: () => { URL.revokeObjectURL(url); resolve(); },
                        onerror: (err) => { console.error(`Failed to dl page ${pageNum}`, err); resolve(); },
                        ontimeout: () => resolve()
                    });
                });
            });

            await Promise.all(downloadPromises);

        } else {
            if (webtoonCapturedPages.size === 0) {
                alert("No images captured yet. Scroll down the page.");
                resetDownloadButtons();
                return;
            }
            const imagesToDownload = Array.from(webtoonCapturedPages.values()).sort((a, b) => a.pageNum - b.pageNum);
            const pad = String(imagesToDownload.length).length;
            const folderName = document.title.replace(/[<>:"/\\|?*]/g, "").trim() || "Comikey_Download";
            
            uiActionBtn.textContent = `Downloading ${imagesToDownload.length} pages...`;
            uiDlBtn.textContent = `Downloading ${imagesToDownload.length} pages...`;

            const downloadPromises = imagesToDownload.map((img) => {
                return new Promise((resolve) => {
                    const fileName = `image_${String(img.pageNum).padStart(pad, '0')}.${img.ext}`;
                    const fullPath = `${folderName}/${fileName}`;
                    const blobUrl = URL.createObjectURL(img.blob);

                    GM_download({
                        url: blobUrl,
                        name: fullPath,
                        saveAs: false,
                        onload: () => { URL.revokeObjectURL(blobUrl); resolve(); },
                        onerror: (err) => { console.error(`Failed to dl ${fileName}`, err); URL.revokeObjectURL(blobUrl); resolve(); },
                        ontimeout: () => resolve()
                    });
                });
            });

            await Promise.all(downloadPromises);
        }

        uiActionBtn.textContent = '✅ Done!';
        uiDlBtn.textContent = '✅ Done!';
        await sleep(2000);
        resetDownloadButtons();
    }

    function resetDownloadButtons() {
        uiDlBtn.disabled = false;
        uiActionBtn.disabled = false;
        setActionState('IDLE');
    }

    // =========================================================================
    // 1. MANGA BACKGROUND CAPTURE (UNTOUCHED)
    // =========================================================================
    const MIN_FILE_SIZE = 40000;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const cleanToBlob = iframe.contentWindow.HTMLCanvasElement.prototype.toBlob;

    async function hashBlob(blob) {
        const buf = await blob.arrayBuffer();
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function captureVisibleCanvases() {
        if (currentMode !== 'manga') return;

        const visibleCanvases = Array.from(document.querySelectorAll('canvas')).filter(c => c.width > 100);
        for (const canvas of visibleCanvases) {
            const rect = canvas.getBoundingClientRect();
            const absoluteY = Math.round((window.scrollY + rect.top) / 10) * 10;

            if (!mangaCapturedPages.has(absoluteY)) {
                const blob = await new Promise((resolve) => {
                    cleanToBlob.call(canvas, resolve, 'image/png');
                });

                if (blob && blob.size > MIN_FILE_SIZE) {
                    const hash = await hashBlob(blob);
                    if (!mangaCapturedHashes.has(hash)) {
                        mangaCapturedHashes.add(hash);
                        mangaCapturedPages.set(absoluteY, blob);
                    }
                } else if (blob) {
                    console.log(`[Manga Mode] Ignored likely placeholder. Size: ${(blob.size/1024).toFixed(2)}KB.`);
                }
            }
        }
    }


    // =========================================================================
    // 2. WEBTOON BLOB-HOOK BACKGROUND CAPTURE (UNTOUCHED)
    // =========================================================================
    async function captureWebtoonCanvases() {
        if (currentMode !== 'webtoon') return;

        const images = document.querySelectorAll('img[src^="blob:https://comikey.com"]');
        for (let img of images) {
            if (img.dataset.ripperCaptured || img.dataset.ripperProcessing) continue;
            if (!img.complete || img.naturalWidth === 0) continue;

            img.dataset.ripperProcessing = "true";

            try {
                const ariaLabel = img.getAttribute('aria-label');
                let pageNum = null;
                if (ariaLabel) {
                    const match = ariaLabel.match(/\d+/);
                    if (match) pageNum = parseInt(match[0], 10);
                }
                if (pageNum === null) pageNum = webtoonFallbackCounter++;

                if (webtoonCapturedPages.has(pageNum)) {
                    img.dataset.ripperCaptured = "true";
                    delete img.dataset.ripperProcessing;
                    continue;
                }

                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png', 1.0));

                webtoonCapturedPages.set(pageNum, {
                    blob: pngBlob,
                    ext: 'png',
                    pageNum: pageNum
                });
                
                img.dataset.ripperCaptured = "true";

            } catch (e) {
                console.error("[Comikey+] Webtoon fetch/convert failed:", e);
            } finally {
                delete img.dataset.ripperProcessing;
            }
        }
    }


    // --- INITIALIZATION ---
    initUnifiedUI();
    setInterval(checkUrlChange, 500); 
    setInterval(updatePageCount, 500); 
    setInterval(captureVisibleCanvases, 500); 
    setInterval(captureWebtoonCanvases, 500); 

})();