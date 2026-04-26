/**
 * services/fileParserService.js
 * Extracts raw text from PDF and DOCX files
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts text from a PDF file
 * @param {string} filePath - Absolute path to PDF
 * @returns {Promise<string>} Extracted text
 */
const extractFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer, {
      // Normalize whitespace and preserve structure
      pagerender: (pageData) => {
        return pageData.getTextContent().then((textContent) => {
          let text = '';
          let lastY = null;

          for (const item of textContent.items) {
            // Add newline when Y position changes significantly (new line)
            if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
              text += '\n';
            }
            text += item.str + ' ';
            lastY = item.transform[5];
          }
          return text;
        });
      },
    });

    const text = data.text
      .replace(/\s+/g, ' ')             // Collapse multiple spaces
      .replace(/\n\s*\n/g, '\n\n')      // Normalize blank lines
      .trim();

    if (!text || text.length < 50) {
      throw new Error('Could not extract meaningful text from PDF. The file may be image-based.');
    }

    return text;
  } catch (error) {
    if (error.message.includes('meaningful text')) throw error;
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
};

/**
 * Extracts text from a DOCX file using mammoth
 * @param {string} filePath - Absolute path to DOCX
 * @returns {Promise<string>} Extracted text
 */
const extractFromDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });

    if (result.messages && result.messages.length > 0) {
      const warnings = result.messages
        .filter((m) => m.type === 'warning')
        .map((m) => m.message);
      if (warnings.length > 0) {
        console.warn('DOCX parse warnings:', warnings);
      }
    }

    const text = result.value
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (!text || text.length < 50) {
      throw new Error('Could not extract meaningful text from DOCX file.');
    }

    return text;
  } catch (error) {
    if (error.message.includes('meaningful text')) throw error;
    throw new Error(`DOCX parsing failed: ${error.message}`);
  }
};

/**
 * Main entry point — auto-detects file type and extracts text
 * @param {string} filePath - Path to uploaded file
 * @param {string} fileType - 'pdf' or 'docx'
 * @returns {Promise<string>} Raw extracted text
 */
const parseFile = async (filePath, fileType) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const type = fileType.toLowerCase().replace('.', '');

  if (type === 'pdf') {
    return extractFromPDF(filePath);
  } else if (type === 'docx' || type === 'doc') {
    return extractFromDOCX(filePath);
  } else {
    throw new Error(`Unsupported file type: ${fileType}. Only PDF and DOCX are supported.`);
  }
};

/**
 * Validates that a file is a real PDF/DOCX (by magic bytes)
 * @param {string} filePath
 * @returns {boolean}
 */
const validateFileIntegrity = (filePath) => {
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);

  // PDF magic bytes: %PDF
  const isPDF = buffer.toString('utf8', 0, 4) === '%PDF';

  // DOCX/ZIP magic bytes: PK (0x50 0x4B)
  const isDOCX = buffer[0] === 0x50 && buffer[1] === 0x4B;

  return isPDF || isDOCX;
};

module.exports = { parseFile, validateFileIntegrity };
