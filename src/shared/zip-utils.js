// Simple ZIP implementation (Store only, no compression) to avoid dependencies
// Based on standard ZIP file format specifications

export class SimpleZip {
    constructor() {
        this.files = [];
    }

    addFile(name, content) {
        // content can be string or Uint8Array
        if (typeof content === 'string') {
            content = new TextEncoder().encode(content);
        }
        this.files.push({ name, content });
    }

    generate() {
        const fileEntries = [];
        let offset = 0;

        // Local File Headers and Data
        const localHeaders = [];
        for (const file of this.files) {
            const nameBytes = new TextEncoder().encode(file.name);
            const content = file.content;
            const crc = this.crc32(content);

            const header = new Uint8Array(30 + nameBytes.length);
            const view = new DataView(header.buffer);

            view.setUint32(0, 0x04034b50, true); // Signature
            view.setUint16(4, 10, true); // Version needed
            view.setUint16(6, 0, true); // Flags
            view.setUint16(8, 0, true); // Compression (0 = Store)
            view.setUint16(10, 0, true); // Time (dummy)
            view.setUint16(12, 0, true); // Date (dummy)
            view.setUint32(14, crc, true); // CRC32
            view.setUint32(18, content.length, true); // Compressed size
            view.setUint32(22, content.length, true); // Uncompressed size
            view.setUint16(26, nameBytes.length, true); // Filename length
            view.setUint16(28, 0, true); // Extra field length

            header.set(nameBytes, 30);

            localHeaders.push({ header, content, offset, nameBytes, crc });
            offset += header.length + content.length;
        }

        // Central Directory
        const centralDirectory = [];
        let cdOffset = offset;

        for (const file of localHeaders) {
            const header = new Uint8Array(46 + file.nameBytes.length);
            const view = new DataView(header.buffer);

            view.setUint32(0, 0x02014b50, true); // Signature
            view.setUint16(4, 10, true); // Version made by
            view.setUint16(6, 10, true); // Version needed
            view.setUint16(8, 0, true); // Flags
            view.setUint16(10, 0, true); // Compression
            view.setUint16(12, 0, true); // Time
            view.setUint16(14, 0, true); // Date
            view.setUint32(16, file.crc, true); // CRC32
            view.setUint32(20, file.content.length, true); // Compressed size
            view.setUint32(24, file.content.length, true); // Uncompressed size
            view.setUint16(28, file.nameBytes.length, true); // Filename length
            view.setUint16(30, 0, true); // Extra field length
            view.setUint16(32, 0, true); // Comment length
            view.setUint16(34, 0, true); // Disk number
            view.setUint16(36, 0, true); // Internal attrs
            view.setUint32(38, 0, true); // External attrs
            view.setUint32(42, file.offset, true); // Offset of local header

            header.set(file.nameBytes, 46);
            centralDirectory.push(header);
        }

        // End of Central Directory
        const cdSize = centralDirectory.reduce((acc, val) => acc + val.length, 0);
        const eocd = new Uint8Array(22);
        const eocdView = new DataView(eocd.buffer);

        eocdView.setUint32(0, 0x06054b50, true); // Signature
        eocdView.setUint16(4, 0, true); // Disk number
        eocdView.setUint16(6, 0, true); // Disk with CD
        eocdView.setUint16(8, localHeaders.length, true); // Entries in this disk
        eocdView.setUint16(10, localHeaders.length, true); // Total entries
        eocdView.setUint32(12, cdSize, true); // Size of CD
        eocdView.setUint32(16, cdOffset, true); // Offset of CD
        eocdView.setUint16(20, 0, true); // Comment length

        // Combine all
        const totalSize = offset + cdSize + eocd.length;
        const finalBuffer = new Uint8Array(totalSize);
        let currentPos = 0;

        for (const file of localHeaders) {
            finalBuffer.set(file.header, currentPos);
            currentPos += file.header.length;
            finalBuffer.set(file.content, currentPos);
            currentPos += file.content.length;
        }

        for (const cd of centralDirectory) {
            finalBuffer.set(cd, currentPos);
            currentPos += cd.length;
        }

        finalBuffer.set(eocd, currentPos);

        return finalBuffer;
    }

    crc32(data) {
        let crc = 0 ^ (-1);
        for (let i = 0; i < data.length; i++) {
            crc = (crc >>> 8) ^ this.crcTable[(crc ^ data[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }

    get crcTable() {
        if (!this._crcTable) {
            this._crcTable = [];
            for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++) {
                    if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
                    else c = c >>> 1;
                }
                this._crcTable[n] = c;
            }
        }
        return this._crcTable;
    }
}
