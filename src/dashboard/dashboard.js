import { formatBytes, optimizeSvg, downloadBlob, copyToClipboard, isDark } from '../shared/svg-utils.js';
import { SimpleZip } from '../shared/zip-utils.js';

let allSvgs = [];
let filteredSvgs = [];
let selectedIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI
    setupEventListeners();

    // Load data
    const data = await chrome.storage.local.get('lastScan');
    if (data && data.lastScan) {
        allSvgs = data.lastScan.svgs || [];
        filteredSvgs = allSvgs; // Initialize filteredSvgs
        renderPageInfo(data.lastScan);
        document.getElementById('totalCount').textContent = `${allSvgs.length} SVGs found`;
        renderSvgs(allSvgs);
    } else {
        // No data found
        const emptyState = document.querySelector('.empty-state');
        if (emptyState) emptyState.style.display = 'block';
    }
});

// Listen for refresh messages
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'REFRESH_DATA') {
        chrome.storage.local.get('lastScan').then(data => {
            if (data && data.lastScan) {
                allSvgs = data.lastScan.svgs || [];
                renderPageInfo(data.lastScan);
                document.getElementById('totalCount').textContent = `${allSvgs.length} SVGs found`;
                applyFilters();
            }
        });
    }
});

function setupEventListeners() {
    // Segmented Control Filters
    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });

    // Selection
    document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
        const isChecked = e.target.checked;

        if (isChecked) {
            filteredSvgs.forEach(svg => selectedIds.add(svg.id));
        } else {
            // Only remove filtered SVGs from selection (in case we have complex filters later, 
            // but for now it behaves like clear all if 'all' filter is active)
            // If we want "Deselect All visible", we should strictly remove filteredIds.
            filteredSvgs.forEach(svg => selectedIds.delete(svg.id));
        }

        // Update UI without full re-render
        document.querySelectorAll('.svg-select').forEach(cb => {
            // Check if this checkbox corresponds to a selected ID
            cb.checked = selectedIds.has(cb.dataset.id);
        });

        updateSelectionUI();
    });

    // Floating Bar Actions
    document.getElementById('downloadSelectedBtn').addEventListener('click', downloadSelected);
    document.getElementById('clearSelectionBtn').addEventListener('click', () => {
        selectedIds.clear();
        updateSelectionUI();
        renderSvgs(filteredSvgs);
    });

    // Header Actions
    // Download All button removed from header as per request

}

function updateSelectionUI() {
    const count = selectedIds.size;
    const floatingBar = document.getElementById('floatingBar');
    const selectionCount = document.getElementById('selectionCount');
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    // Update checkbox state
    selectAllCheckbox.checked = count > 0 && count === filteredSvgs.length;

    if (count > 0) {
        floatingBar.classList.add('visible');
        selectionCount.textContent = `${count} Selected`;
        downloadSelectedBtn.textContent = `Download (${count})`;
    } else {
        floatingBar.classList.remove('visible');
    }
}

function applyFilters() {
    const activeBtn = document.querySelector('.segment-btn.active');
    const filterType = activeBtn ? activeBtn.dataset.filter : 'all';

    filteredSvgs = allSvgs.filter(svg => {
        return filterType === 'all' || svg.type === filterType;
    });

    // Update total count in toolbar
    document.getElementById('totalCount').textContent = `${filteredSvgs.length} SVGs`;

    renderSvgs(filteredSvgs);
}

function renderSvgs(svgs) {
    const grid = document.getElementById('svgGrid');
    const emptyState = document.querySelector('.empty-state');

    grid.innerHTML = '';

    if (svgs.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        grid.style.display = 'none';
        return;
    } else {
        if (emptyState) emptyState.style.display = 'none';
        grid.style.display = 'grid';
    }

    svgs.forEach(svg => {
        const card = document.createElement('div');
        card.className = 'svg-card';

        // Determine content to show
        let previewContent = '';
        let sizeInfo = 'Unknown size';

        if (svg.type === 'inline') {
            // Remove width and height attributes for preview to allow CSS scaling
            // taking care not to break the SVG syntax.
            // We use a simple regex to replace width="..." and height="..." with nothing,
            // relying on viewBox for aspect ratio.
            let previewSource = svg.source
                .replace(/\s(width|height)=["'][^"']*["']/gi, '')
                .replace(/\s(width|height)=[^"'\s>]+/gi, '');

            // Should also ensure style doesn't have fixed width/height
            // Inject a class or style to force 100%
            previewContent = previewSource;
            sizeInfo = formatBytes(new Blob([svg.source]).size);
        } else {
            // File
            previewContent = `<img src="${svg.url}" alt="SVG Preview">`;
            sizeInfo = 'External File';
        }

        const isSelected = selectedIds.has(svg.id);

        card.innerHTML = `
      <div class="card-preview">
        <div class="card-select">
          <input type="checkbox" class="svg-select" data-id="${svg.id}" ${isSelected ? 'checked' : ''}>
        </div>
        <div class="card-badge">${svg.type}</div>
        ${previewContent}
      </div>
      <div class="card-info">
        <div class="card-name" title="${svg.id}">${svg.id}</div>
        <div class="card-meta">
            <span>${Math.round(svg.width)}x${Math.round(svg.height)}</span>
            <span>${sizeInfo}</span>
        </div>
        <div class="card-colors" id="colors-${svg.id}">
          <!-- Colors will be injected here -->
        </div>
      </div>
      <div class="card-actions">
        <button class="action-btn btn-copy" data-id="${svg.id}">Copy</button>
        <button class="action-btn btn-download" data-id="${svg.id}">Download</button>
        <button class="action-btn btn-export" data-id="${svg.id}">PNG</button>
      </div>
    `;

        // Extract and render colors & apply dynamic background
        getSvgContent(svg).then(content => {
            if (content) {
                import('../shared/svg-utils.js').then(m => {
                    const colors = m.extractColors(content);
                    const colorContainer = card.querySelector(`#colors-${svg.id}`);
                    const previewContainer = card.querySelector('.card-preview');

                    // Dynamic Background Logic - REVERTED for stability
                    // Default to dark checker
                    previewContainer.classList.add('bg-checker-dark');

                    if (colors.length > 0) {
                        colors.slice(0, 5).forEach(color => {
                            const swatch = document.createElement('div');
                            swatch.className = 'color-swatch';
                            swatch.style.backgroundColor = color;
                            swatch.title = color;
                            swatch.addEventListener('click', () => {
                                copyToClipboard(color);
                            });
                            colorContainer.appendChild(swatch);
                        });
                    }
                });
            }
        });

        // Event listeners for card actions
        const checkbox = card.querySelector('.svg-select');

        // Card preview click toggles selection
        card.querySelector('.card-preview').addEventListener('click', (e) => {
            // Don't toggle if clicking on the checkbox itself
            if (e.target === checkbox) return;
            checkbox.checked = !checkbox.checked;
            if (checkbox.checked) {
                selectedIds.add(svg.id);
            } else {
                selectedIds.delete(svg.id);
            }
            updateSelectionUI();
        });

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedIds.add(svg.id);
            } else {
                selectedIds.delete(svg.id);
            }
            updateSelectionUI();
        });

        card.querySelector('.btn-copy').addEventListener('click', async () => {
            const content = await getSvgContent(svg);
            if (content) {
                copyToClipboard(content);
                const btn = card.querySelector('.btn-copy');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = originalText, 2000);
            }
        });

        card.querySelector('.btn-download').addEventListener('click', async () => {
            const content = await getSvgContent(svg);
            if (content) {
                const blob = new Blob([content], { type: 'image/svg+xml' });
                downloadBlob(blob, `${svg.id}.svg`);
            }
        });

        card.querySelector('.btn-export').addEventListener('click', async () => {
            const content = await getSvgContent(svg);
            if (content) {
                try {
                    const width = svg.width || 512;
                    const height = svg.height || 512;
                    const module = await import('../shared/svg-utils.js');
                    const blob = await module.svgToImage(content, width, height, 'png');
                    downloadBlob(blob, `${svg.id}.png`);
                } catch (err) {
                    console.error('Export failed:', err);
                    alert('Failed to export image');
                }
            }
        });

        grid.appendChild(card);
    });
}

async function getSvgContent(svg) {
    if (svg.type === 'inline') {
        return svg.source;
    } else {
        try {
            const response = await fetch(svg.url);
            return await response.text();
        } catch (err) {
            console.error('Failed to fetch SVG:', err);
            return null;
        }
    }
}

async function downloadSelected() {
    const idsToDownload = Array.from(selectedIds);
    if (idsToDownload.length === 0) return;
    await downloadSvgs(idsToDownload);
}

async function downloadSvgs(idsToDownload) {
    if (idsToDownload.length === 0) return;

    // Determine which button triggered this to show loading state
    const isSelectionDownload = idsToDownload.length === selectedIds.size && idsToDownload.every(id => selectedIds.has(id));
    const btn = isSelectionDownload ? document.getElementById('downloadSelectedBtn') : null;

    let originalText = '';
    if (btn) {
        originalText = btn.innerHTML; // Use innerHTML to preserve icon if any
        btn.textContent = '...';
        btn.disabled = true;
    }

    try {
        const zip = new SimpleZip();
        let count = 0;

        for (const id of idsToDownload) {
            const svg = allSvgs.find(s => s.id === id);
            if (svg) {
                const content = await getSvgContent(svg);
                if (content) {
                    zip.addFile(`${svg.id}.svg`, content);
                    count++;
                }
            }
        }

        if (count > 0) {
            const zipContent = zip.generate();
            const blob = new Blob([zipContent], { type: 'application/zip' });
            downloadBlob(blob, 'opensvg-download.zip');
        } else {
            alert('No valid content to download');
        }

    } catch (err) {
        console.error('Download failed:', err);
        alert('Failed to create ZIP');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

function renderPageInfo(scanData) {
    const titleEl = document.querySelector('.page-title');
    const urlEl = document.querySelector('.page-url');

    if (titleEl) {
        titleEl.textContent = scanData.pageTitle || 'Unknown Title';
        titleEl.classList.remove('skeleton');
    }

    if (urlEl) {
        // truncate url if needed, or css handles it
        urlEl.textContent = scanData.pageUrl || 'Unknown URL';
        urlEl.title = scanData.pageUrl; // tooltip
        urlEl.classList.remove('skeleton');
    }
}
