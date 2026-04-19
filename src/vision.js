require('dotenv').config();
const axios = require('axios');
const { getVisionClient } = require('./googleAuth');
const logger = require('./logger');

/**
 * Downloads image from a URL and returns it as a base64 string.
 */
async function downloadImageAsBase64(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}

/**
 * Runs TEXT_DETECTION on an image URL via Google Cloud Vision API.
 * Returns the full extracted text string, or null if nothing found.
 */
async function extractTextFromImage(imageUrl) {
  try {
    logger.info(`Running OCR on image: ${imageUrl}`);

    const base64Image = await downloadImageAsBase64(imageUrl);

    const client = getVisionClient();
    const [result] = await client.textDetection({
      image: { content: base64Image },
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      logger.warn('Vision API returned no text annotations');
      return null;
    }

    // First annotation contains the full text block
    const fullText = detections[0].description || '';
    logger.info(`OCR result (first 200 chars): ${fullText.slice(0, 200)}`);
    return fullText;
  } catch (err) {
    logger.error(`Vision API error: ${err.message}`, err);
    throw err;
  }
}

module.exports = { extractTextFromImage };
