// OpenSVG Content Script

console.log('OpenSVG: Content script loaded');

// Listen for messages from Popup or Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCAN_SVGS') {
        scanSVGs().then(data => {
            sendResponse(data);
            // Also send to background for persistence
            chrome.runtime.sendMessage({
                action: 'SVG_SCAN_COMPLETE',
                payload: data
            });
        });
        return true; // Indicates async response
    }
});

// Generate a normalized signature for deduplication
function getSignature(svgElement) {
    const clone = svgElement.cloneNode(true);

    // Remove non-visual attributes from root
    ['id', 'class', 'style', 'width', 'height'].forEach(attr => {
        clone.removeAttribute(attr);
    });

    // Remove all data-* attributes
    Array.from(clone.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
            clone.removeAttribute(attr.name);
        }
    });

    // Normalize whitespace and return
    return clone.outerHTML.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}

async function scanSVGs() {
    console.log('OpenSVG: Scanning for SVGs...');

    const svgs = [];
    const seenSignatures = new Set();
    const serializer = new XMLSerializer();

    // 1. Inline SVGs
    const inlineSvgs = document.querySelectorAll('svg');
    inlineSvgs.forEach((svg, index) => {
        try {
            // Generate signature for deduplication
            const signature = getSignature(svg);
            if (seenSignatures.has(signature)) {
                return; // Skip duplicate
            }
            seenSignatures.add(signature);

            // Capture computed styles before cloning
            const style = window.getComputedStyle(svg);
            const computedFill = style.fill;
            const computedStroke = style.stroke;
            const computedColor = style.color;

            // Clone to avoid modifying original
            const clone = svg.cloneNode(true);

            // Apply computed styles to ensure appearance is preserved
            if (computedFill && computedFill !== 'none') {
                clone.style.fill = computedFill;
            }
            if (computedStroke && computedStroke !== 'none') {
                clone.style.stroke = computedStroke;
            }
            if (computedColor) {
                clone.style.color = computedColor;
            }

            // Serialize
            let source = "";
            try {
                source = serializer.serializeToString(clone);
            } catch (e) {
                source = clone.outerHTML;
            }

            if (!source || source === '<svg></svg>') {
                source = clone.outerHTML;
            }

            const rect = svg.getBoundingClientRect();

            svgs.push({
                type: 'inline',
                id: `inline-${svgs.filter(s => s.type === 'inline').length}`,
                source: source,
                width: rect.width || parseFloat(svg.getAttribute('width')) || 0,
                height: rect.height || parseFloat(svg.getAttribute('height')) || 0,
                viewBox: svg.getAttribute('viewBox'),
                url: window.location.href,
                timestamp: Date.now()
            });
        } catch (err) {
            console.error('Error processing inline SVG:', err);
        }
    });

    // 2. Img tags with SVG src
    const imgTags = document.querySelectorAll('img[src*=".svg"]');
    const dataImgTags = document.querySelectorAll('img[src^="data:image/svg+xml"]');

    const processImg = (img, prefix) => {
        try {
            const src = img.src;

            // Deduplicate by URL
            if (seenSignatures.has(src)) {
                return;
            }
            seenSignatures.add(src);

            const rect = img.getBoundingClientRect();
            svgs.push({
                type: 'file',
                id: `${prefix}-${svgs.filter(s => s.type === 'file').length}`,
                url: src,
                width: rect.width || img.naturalWidth || 0,
                height: rect.height || img.naturalHeight || 0,
                timestamp: Date.now()
            });
        } catch (err) {
            console.error('Error processing IMG SVG:', err);
        }
    };

    imgTags.forEach((img) => processImg(img, 'img'));
    dataImgTags.forEach((img) => processImg(img, 'data-img'));

    // 3. Object and Embed tags
    const objects = document.querySelectorAll('object[data*=".svg"]');
    objects.forEach((obj) => {
        if (seenSignatures.has(obj.data)) return;
        seenSignatures.add(obj.data);

        svgs.push({
            type: 'file',
            id: `object-${svgs.filter(s => s.type === 'file').length}`,
            url: obj.data,
            width: obj.offsetWidth,
            height: obj.offsetHeight,
            timestamp: Date.now()
        });
    });

    const embeds = document.querySelectorAll('embed[src*=".svg"]');
    embeds.forEach((embed) => {
        if (seenSignatures.has(embed.src)) return;
        seenSignatures.add(embed.src);

        svgs.push({
            type: 'file',
            id: `embed-${svgs.filter(s => s.type === 'file').length}`,
            url: embed.src,
            width: embed.offsetWidth,
            height: embed.offsetHeight,
            timestamp: Date.now()
        });
    });

    console.log(`OpenSVG: Found ${svgs.length} unique SVGs`);

    return {
        svgs: svgs,
        pageTitle: document.title,
        pageUrl: window.location.href
    };
}
