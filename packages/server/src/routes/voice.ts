import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { success, error } from '../lib/response';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';

const router = Router();

// Validation schema
const recognizeSchema = z.object({
  audio: z.string().optional(), // Base64 encoded audio
  text: z.string().optional(), // Text to process (for testing)
});

/**
 * POST /recognize - Voice recognition endpoint (stub)
 * Returns placeholder response
 */
router.post('/recognize', validate(recognizeSchema), asyncHandler(async (req: Request, res: Response) => {
  const { audio, text } = req.body;

  // TODO: Implement actual voice recognition
  // Options:
  // 1. Web Speech API (client-side, no server processing needed)
  // 2. Baidu Speech API
  // 3. iFlytek Speech API
  // 4. Local speech recognition model

  // For now, return a placeholder response
  if (text) {
    // Parse the text to extract intake/output information
    const parsed = parseVoiceInput(text);

    return res.json(success({
      rawText: text,
      parsed,
      confidence: 0.85,
      method: 'text',
    }, 'Voice input processed'));
  }

  return res.json(success({
    rawText: '',
    parsed: null,
    confidence: 0,
    method: 'placeholder',
    message: 'Voice recognition not yet implemented. Please use manual input.',
  }, 'Voice recognition placeholder'));
}));

/**
 * Parse voice input text to extract record information
 */
function parseVoiceInput(text: string): any {
  const lowerText = text.toLowerCase();

  // Common intake items
  const intakeKeywords = ['喝水', '饮水', '水', '汤', '牛奶', '果汁', '饮料', '输液', '静脉', '管饲'];
  // Common output items
  const outputKeywords = ['尿', '小便', '大便', '呕吐', '引流', '出汗'];

  let recordType: 'intake' | 'output' | null = null;
  let itemName = '';
  let amount = 0;
  let unit = 'ml';

  // Detect type
  for (const keyword of intakeKeywords) {
    if (lowerText.includes(keyword)) {
      recordType = 'intake';
      itemName = keyword;
      break;
    }
  }

  if (!recordType) {
    for (const keyword of outputKeywords) {
      if (lowerText.includes(keyword)) {
        recordType = 'output';
        itemName = keyword;
        break;
      }
    }
  }

  // Extract number
  const numberMatch = text.match(/(\d+(\.\d+)?)/);
  if (numberMatch) {
    amount = parseFloat(numberMatch[1]);
  }

  // Detect unit
  if (lowerText.includes('升') || lowerText.includes('l ')) {
    unit = 'L';
    amount = amount * 1000; // Convert to ml
  } else if (lowerText.includes('ml') || lowerText.includes('毫升')) {
    unit = 'ml';
  } else if (lowerText.includes('次')) {
    unit = '次';
  }

  // Normalize item names
  const itemNameMap: { [key: string]: string } = {
    '喝水': '饮水',
    '水': '饮水',
    '小便': '尿量',
    '尿': '尿量',
    '大便': '大便',
    '呕吐': '呕吐物',
  };

  if (itemNameMap[itemName]) {
    itemName = itemNameMap[itemName];
  }

  return {
    recordType,
    itemName,
    amount,
    unit,
  };
}

export default router;
