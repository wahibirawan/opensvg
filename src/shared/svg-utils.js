// SVG Utilities

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function optimizeSvg(svgContent) {
    // Basic optimization mock
    let optimized = svgContent
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
        .replace(/\s(version|xmlns:xlink)="[^"]*"/g, '') // Remove some attributes
        .trim();

    return optimized;
}

export function extractColors(svgContent) {
    // Extract hex colors
    const regex = /#[0-9a-fA-F]{3,6}/g;
    const matches = svgContent.match(regex) || [];
    return [...new Set(matches)]; // Unique colors
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Success
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

export function svgToImage(svgContent, width, height, format = 'png') {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Add charset to ensure proper parsing
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                resolve(blob);
                URL.revokeObjectURL(url);
            }, `image/${format}`);
        };

        img.onerror = (err) => {
            reject(err);
            URL.revokeObjectURL(url);
        };

        img.src = url;
    });
}

export function isDark(color) {
    // Check if color is hex
    if (!color.startsWith('#')) return false;

    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
}
