/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Select,
  Spin,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ExternalLink,
  History,
  Image as ImageIcon,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  API,
  showError,
  showSuccess,
} from '../../helpers';
import { useTranslation } from 'react-i18next';

const { Text, Paragraph } = Typography;

const MAX_REFERENCE_IMAGES = 3;
const MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024;
const DRAWING_HISTORY_LIMIT = 12;
const DRAWING_HISTORY_PAGE_SIZE = 8;
const DRAWING_HISTORY_DB = 'new-api-drawing-history';
const DRAWING_HISTORY_STORE = 'records';
const SYSTEM_DRAWING_TOKEN_NAME = '\u7cfb\u7edf\uff1a\u751f\u56fe\u4e13\u7528';
const LEGACY_SYSTEM_DRAWING_TOKEN_NAME = 'system-drawing-token';

const DEFAULT_FORM = {
  prompt: '',
  model: '',
  aspectRatio: '1:1',
  imageSize: '1K',
  n: 1,
  extraBody: '',
};

const DRAWING_REQUEST_MODE_IMAGE_GENERATION = 'image_generation';
const DRAWING_REQUEST_MODE_GEMINI_NATIVE = 'gemini_generate_content';
const DRAWING_REQUEST_MODE_RESPONSES_IMAGE_GENERATION =
  'responses_image_generation';
const DRAWING_REQUEST_MODE_OPENAI_IMAGE_EDIT = 'openai_image_edit';

const getDrawingTokenName = (tokenName) =>
  String(tokenName || '').trim() || SYSTEM_DRAWING_TOKEN_NAME;

const getDrawingHistoryKey = (tokenName) =>
  `drawing-history:${getDrawingTokenName(tokenName)}`;

const isInlineDrawingImage = (src) =>
  /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(String(src || '').trim());

const isFreeCdnDrawingImage = (src) =>
  /^https?:\/\/(?:files\.catbox\.moe|litterbox\.catbox\.moe|skyimg\.net|img\.scdn\.io|(?:cloudflarecnimg|edgeoneimg|anycastimg)\.(?:scdn\.io|cdn\.sn)|tuchuang\.xqd\.cn|wzapi\.com)\//i.test(
    String(src || '').trim(),
  );

const normalizeDrawingUploadSource = (src) => {
  const value = String(src || '').trim();
  if (!value) {
    return '';
  }
  if (/^(?:data:image\/|https?:\/\/)/i.test(value)) {
    return value;
  }
  if (typeof window !== 'undefined') {
    try {
      return new URL(value, window.location.origin).href;
    } catch (_) {
      return value;
    }
  }
  return value;
};

const sanitizeDrawingHistoryRecords = (records) =>
  (Array.isArray(records) ? records : [])
    .map((record) => ({
      ...record,
      images: (Array.isArray(record?.images) ? record.images : []).filter(
        (image) => image?.src && !isInlineDrawingImage(image.src),
      ),
    }))
    .filter((record) => record.images.length > 0);

const ASPECT_RATIO_OPTIONS = [
  { label: '1:1 正方形', value: '1:1' },
  { label: '3:2 横图', value: '3:2' },
  { label: '2:3 竖图', value: '2:3' },
  { label: '16:9 宽屏', value: '16:9' },
  { label: '9:16 海报', value: '9:16' },
];

const IMAGE_SIZE_OPTIONS = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
];

const DRAWING_ASPECT_RATIO_OPTIONS = [
  { label: '1:1 正方形', value: '1:1' },
  { label: '16:9 横向宽屏', value: '16:9' },
  { label: '9:16 竖向', value: '9:16' },
  { label: '4:3 横向标准', value: '4:3' },
  { label: '3:4 竖向标准', value: '3:4' },
];

const DRAWING_IMAGE_SIZE_OPTIONS = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
];

const isResponsesImageGenerationModel = (model) => {
  const name = String(model || '').trim().toLowerCase();
  if (!name) {
    return false;
  }

  return [
    'gpt-4o',
    'chatgpt-4o',
    'gpt-4.1',
    'gpt-4.5',
    'gpt-5',
  ].some((prefix) => name.startsWith(prefix));
};

const isOpenAIImageEditModel = (model) => {
  const name = String(model || '').trim().toLowerCase();
  if (!name) {
    return false;
  }

  return name.startsWith('gpt-image-') || name === 'chatgpt-image-latest';
};

const isDalle2Model = (model) => {
  const name = String(model || '').trim().toLowerCase();
  return name === 'dall-e' || name === 'dall-e-2';
};

const isDalle3Model = (model) =>
  String(model || '').trim().toLowerCase() === 'dall-e-3';

const isGPTImageApiSizeModel = (model) => {
  const name = String(model || '').trim().toLowerCase();
  return name.startsWith('gpt-image-') || name === 'chatgpt-image-latest';
};

const supportsReferenceImages = (requestMode) =>
  requestMode === DRAWING_REQUEST_MODE_GEMINI_NATIVE ||
  requestMode === DRAWING_REQUEST_MODE_RESPONSES_IMAGE_GENERATION ||
  requestMode === DRAWING_REQUEST_MODE_OPENAI_IMAGE_EDIT;

const resolveApiUrl = (endpoint) => {
  if (!endpoint) {
    return `${window.location.origin}/v1/images/generations`;
  }
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const baseURL = API.defaults.baseURL || window.location.origin;
  return new URL(endpoint, baseURL).toString();
};

const resolveGeminiGenerateContentUrl = (model) =>
  resolveApiUrl(`/v1beta/models/${encodeURIComponent(model)}:generateContent`);

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const deepMerge = (baseValue, overrideValue) => {
  if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
    return overrideValue;
  }

  const merged = { ...baseValue };
  Object.keys(overrideValue).forEach((key) => {
    const nextValue = overrideValue[key];
    if (isPlainObject(nextValue) && isPlainObject(merged[key])) {
      merged[key] = deepMerge(merged[key], nextValue);
      return;
    }
    merged[key] = nextValue;
  });
  return merged;
};

const resolveDrawingRequestMode = (requestModes, defaultRequestMode, model) => {
  if (requestModes?.[model]) {
    return requestModes[model];
  }
  if (!model && defaultRequestMode) {
    return defaultRequestMode;
  }
  if (String(model || '').startsWith('gemini-')) {
    return DRAWING_REQUEST_MODE_GEMINI_NATIVE;
  }
  if (isOpenAIImageEditModel(model)) {
    return DRAWING_REQUEST_MODE_OPENAI_IMAGE_EDIT;
  }
  if (isResponsesImageGenerationModel(model)) {
    return DRAWING_REQUEST_MODE_RESPONSES_IMAGE_GENERATION;
  }
  return DRAWING_REQUEST_MODE_IMAGE_GENERATION;
};

const isPortraitAspectRatio = (aspectRatio) =>
  ['2:3', '3:4', '9:16'].includes(String(aspectRatio || '').trim());

const isLandscapeAspectRatio = (aspectRatio) =>
  ['3:2', '4:3', '16:9'].includes(String(aspectRatio || '').trim());

const normalizeDrawingImageSizeLevel = (imageSize) => {
  const size = String(imageSize || '1K').trim().toUpperCase();
  if (['1K', '2K', '4K'].includes(size)) {
    return size;
  }
  return '1K';
};

const IMAGE_GENERATION_SIZE_PRESETS = {
  '1K': {
    '1:1': '1024x1024',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '4:3': '1536x1152',
    '3:4': '1152x1536',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
  },
  '2K': {
    '1:1': '2048x2048',
    '3:2': '1920x1280',
    '2:3': '1280x1920',
    '4:3': '2048x1536',
    '3:4': '1536x2048',
    '16:9': '2048x1152',
    '9:16': '1152x2048',
  },
  '4K': {
    '1:1': '4096x4096',
    '3:2': '3840x2560',
    '2:3': '2560x3840',
    '4:3': '4096x3072',
    '3:4': '3072x4096',
    '16:9': '4096x2304',
    '9:16': '2304x4096',
  },
};

const aspectRatioToImageGenerationSize = (
  aspectRatio,
  model,
  { forceGPTImageSize = false, imageSize = '1K' } = {},
) => {
  const ratio = String(aspectRatio || '1:1').trim();
  const sizeLevel = normalizeDrawingImageSizeLevel(imageSize);

  if (isDalle2Model(model)) {
    return '1024x1024';
  }

  if (forceGPTImageSize || isGPTImageApiSizeModel(model)) {
    if (isPortraitAspectRatio(ratio)) {
      return '1024x1536';
    }
    if (isLandscapeAspectRatio(ratio)) {
      return '1536x1024';
    }
    return '1024x1024';
  }

  if (isDalle3Model(model)) {
    if (isPortraitAspectRatio(ratio)) {
      return '1024x1792';
    }
    if (isLandscapeAspectRatio(ratio)) {
      return '1792x1024';
    }
    return '1024x1024';
  }

  const presets = IMAGE_GENERATION_SIZE_PRESETS[sizeLevel] || IMAGE_GENERATION_SIZE_PRESETS['1K'];
  return presets[ratio] || presets['1:1'];
};

const imageSizeToGenerationQuality = (
  imageSize,
  model,
  { forceGPTImageQuality = false, requestMode = '' } = {},
) => {
  const size = String(imageSize || '1K').trim().toUpperCase();
  if (size === '1K') {
    return '';
  }

  if (isDalle3Model(model)) {
    return 'hd';
  }

  if (
    forceGPTImageQuality ||
    isGPTImageApiSizeModel(model) ||
    requestMode === DRAWING_REQUEST_MODE_RESPONSES_IMAGE_GENERATION ||
    requestMode === DRAWING_REQUEST_MODE_OPENAI_IMAGE_EDIT
  ) {
    return size === '4K' ? 'high' : 'medium';
  }

  return size === '4K' ? '4k' : 'high';
};

const formatDrawingSizeLabel = ({ aspectRatio, imageSize, actualSize }) =>
  [aspectRatio || '1:1', imageSize || '1K', actualSize]
    .filter(Boolean)
    .join(' · ');

const buildDrawingPrompt = ({
  prompt,
  aspectRatio,
  imageSize,
  referenceImages,
}) => {
  const lines = [String(prompt || '').trim()];
  lines.push('');
  lines.push(`生成参数: 宽高比=${aspectRatio || '1:1'}, 尺寸=${imageSize || '1K'}`);

  if (Array.isArray(referenceImages) && referenceImages.length > 0) {
    lines.push(
      `参考图: 已附带 ${referenceImages.length} 张参考图，请结合参考图中的主体、构图、风格和色彩进行生成。`,
    );
  }

  return lines.filter(Boolean).join('\n');
};

const extractImageSourcesFromText = (text, prefix) => {
  const rawText = String(text || '').trim();
  if (!rawText) {
    return {
      images: [],
      text: '',
    };
  }

  const images = [];
  const markdownImagePattern =
    /!\[[^\]]*]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+|https?:\/\/[^)\s]+)\)/g;

  let cleanedText = rawText.replace(markdownImagePattern, (matched, src) => {
    images.push({
      id: `text-image-${prefix}-${images.length}`,
      src,
      link: String(src).startsWith('http') ? src : '',
      revisedPrompt: '',
    });
    return '';
  });

  const trimmedText = cleanedText.trim();
  if (
    images.length === 0 &&
    /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmedText)
  ) {
    images.push({
      id: `text-image-${prefix}-0`,
      src: trimmedText,
      link: '',
      revisedPrompt: '',
    });
    cleanedText = '';
  }

  return {
    images,
    text: String(cleanedText || '').trim(),
  };
};

const openDrawingHistoryDB = () =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DRAWING_HISTORY_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAWING_HISTORY_STORE)) {
        db.createObjectStore(DRAWING_HISTORY_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readDrawingHistory = async (key) => {
  const db = await openDrawingHistoryDB();
  if (!db) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAWING_HISTORY_STORE, 'readonly');
    const request = transaction.objectStore(DRAWING_HISTORY_STORE).get(key);

    request.onsuccess = () => {
      const records = Array.isArray(request.result?.records)
        ? request.result.records
        : [];
      resolve(
        sanitizeDrawingHistoryRecords(records).slice(0, DRAWING_HISTORY_LIMIT),
      );
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
};

const writeDrawingHistory = async (key, records) => {
  const db = await openDrawingHistoryDB();
  if (!db) {
    return;
  }
  const safeRecords = sanitizeDrawingHistoryRecords(records);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAWING_HISTORY_STORE, 'readwrite');
    transaction.objectStore(DRAWING_HISTORY_STORE).put(
      {
        records: safeRecords.slice(0, DRAWING_HISTORY_LIMIT),
        updatedAt: Date.now(),
      },
      key,
    );
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
};

const readDrawingHistoryWithFallback = async (tokenName) => {
  const primaryKey = getDrawingHistoryKey(tokenName);
  const primaryRecords = await readDrawingHistory(primaryKey);
  if (
    primaryRecords.length > 0 ||
    getDrawingTokenName(tokenName) !== SYSTEM_DRAWING_TOKEN_NAME
  ) {
    return primaryRecords;
  }

  const legacyKey = getDrawingHistoryKey(LEGACY_SYSTEM_DRAWING_TOKEN_NAME);
  const legacyRecords = await readDrawingHistory(legacyKey);
  if (legacyRecords.length > 0) {
    await writeDrawingHistory(primaryKey, legacyRecords);
  }
  return legacyRecords;
};

const normalizeGeminiImageConfig = (imageConfig) => {
  if (!isPlainObject(imageConfig)) {
    return null;
  }

  const normalized = {};
  Object.entries(imageConfig).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    switch (key) {
      case 'aspect_ratio':
      case 'aspectRatio':
        normalized.aspectRatio = value;
        break;
      case 'image_size':
      case 'imageSize':
        normalized.imageSize = value;
        break;
      default:
        normalized[key] = value;
        break;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const normalizeGeminiThinkingConfig = (thinkingConfig) => {
  if (!isPlainObject(thinkingConfig)) {
    return null;
  }

  const normalized = {};
  Object.entries(thinkingConfig).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    switch (key) {
      case 'include_thoughts':
      case 'includeThoughts':
        normalized.includeThoughts = value;
        break;
      case 'thinking_budget':
      case 'thinkingBudget':
        normalized.thinkingBudget = value;
        break;
      case 'thinking_level':
      case 'thinkingLevel':
        normalized.thinkingLevel = value;
        break;
      default:
        normalized[key] = value;
        break;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const normalizeGeminiNativeExtraBody = (extraBody) => {
  if (!isPlainObject(extraBody)) {
    return extraBody;
  }

  const normalized = deepMerge({}, extraBody);
  const googleBody = normalized.google;

  if (isPlainObject(googleBody)) {
    const generationConfigPatch = {};
    const imageConfig = normalizeGeminiImageConfig(
      googleBody.image_config || googleBody.imageConfig,
    );
    const thinkingConfig = normalizeGeminiThinkingConfig(
      googleBody.thinking_config || googleBody.thinkingConfig,
    );

    if (imageConfig) {
      generationConfigPatch.imageConfig = imageConfig;
    }
    if (thinkingConfig) {
      generationConfigPatch.thinkingConfig = thinkingConfig;
    }
    if (Object.keys(generationConfigPatch).length > 0) {
      normalized.generationConfig = deepMerge(
        normalized.generationConfig || {},
        generationConfigPatch,
      );
    }
    delete normalized.google;
  }

  if (isPlainObject(normalized.generationConfig)) {
    const imageConfig = normalizeGeminiImageConfig(
      normalized.generationConfig.imageConfig ||
        normalized.generationConfig.image_config,
    );
    if (imageConfig) {
      normalized.generationConfig.imageConfig = imageConfig;
    }
    delete normalized.generationConfig.image_config;

    const thinkingConfig = normalizeGeminiThinkingConfig(
      normalized.generationConfig.thinkingConfig ||
        normalized.generationConfig.thinking_config,
    );
    if (thinkingConfig) {
      normalized.generationConfig.thinkingConfig = thinkingConfig;
    }
    delete normalized.generationConfig.thinking_config;
  }

  return normalized;
};

const buildGeminiGenerateContentPayload = ({
  prompt,
  n,
  aspectRatio,
  imageSize,
  extraBody,
  referenceImages,
}) => {
  const parts = (referenceImages || []).map((item) => ({
    inlineData: {
      mimeType: item.mimeType,
      data: item.base64,
    },
  }));

  parts.push({
    text: prompt,
  });

  const basePayload = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      candidateCount: Math.max(1, Number(n) || 1),
      aspectRatio: aspectRatio || '1:1',
      imageSize: imageSize || '1K',
      outputMimeType: 'image/jpeg',
      imageConfig: {
        aspectRatio: aspectRatio || '1:1',
      },
    },
  };

  if (imageSize) {
    basePayload.generationConfig.imageConfig.imageSize = imageSize;
  }

  return deepMerge(basePayload, normalizeGeminiNativeExtraBody(extraBody || {}));
};

const buildResponsesImageGenerationPayload = ({
  model,
  prompt,
  aspectRatio,
  imageSize,
  extraBody,
  referenceImages,
}) => {
  const imageTool = {
    type: 'image_generation',
    size: aspectRatioToImageGenerationSize(aspectRatio, model, {
      forceGPTImageSize: true,
    }),
  };

  const quality = imageSizeToGenerationQuality(imageSize, model, {
    forceGPTImageQuality: true,
    requestMode: DRAWING_REQUEST_MODE_RESPONSES_IMAGE_GENERATION,
  });
  if (quality) {
    imageTool.quality = quality;
  }

  if (Array.isArray(referenceImages) && referenceImages.length > 0) {
    imageTool.action = 'edit';
  }

  const content = [
    {
      type: 'input_text',
      text: prompt,
    },
  ];

  (referenceImages || []).forEach((item) => {
    const dataUrl =
      item?.previewUrl ||
      `data:${item?.mimeType || 'image/png'};base64,${item?.base64 || ''}`;
    if (!dataUrl) {
      return;
    }
    content.push({
      type: 'input_image',
      image_url: dataUrl,
      detail: 'high',
    });
  });

  const basePayload = {
    model,
    input: [
      {
        role: 'user',
        content,
      },
    ],
    tools: [imageTool],
    tool_choice: {
      type: 'image_generation',
    },
  };

  return deepMerge(basePayload, extraBody || {});
};

const normalizeGeminiImageItem = (part, index) => {
  const inlineData = part?.inlineData || part?.inline_data;
  const data = inlineData?.data;
  const mimeType = inlineData?.mimeType || inlineData?.mime_type || 'image/png';
  if (!data || !String(mimeType).startsWith('image/')) {
    return null;
  }
  return {
    id: `gemini-${index}`,
    src: `data:${mimeType};base64,${data}`,
    link: '',
    revisedPrompt: '',
  };
};

const normalizeGeminiGenerateContentResponse = (body) => {
  const images = [];
  const textParts = [];
  const candidates = Array.isArray(body?.candidates) ? body.candidates : [];

  candidates.forEach((candidate, candidateIndex) => {
    const parts = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
      : [];

    parts.forEach((part, partIndex) => {
      const image = normalizeGeminiImageItem(
        part,
        `${candidateIndex}-${partIndex}`,
      );
      if (image) {
        images.push(image);
        return;
      }
      if (part?.text) {
        const extracted = extractImageSourcesFromText(
          part.text,
          `${candidateIndex}-${partIndex}`,
        );
        if (extracted.images.length > 0) {
          images.push(...extracted.images);
        }
        if (extracted.text) {
          textParts.push(extracted.text);
        }
      }
    });
  });

  return {
    images,
    responseText: textParts.join('\n').trim(),
    blockReason: body?.promptFeedback?.blockReason || '',
  };
};

const normalizeResponsesImageSource = (value, prefix, revisedPrompt = '') => {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return null;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return {
      id: `responses-${prefix}`,
      src: rawValue,
      link: rawValue,
      revisedPrompt,
    };
  }

  if (/^data:image\//i.test(rawValue)) {
    return {
      id: `responses-${prefix}`,
      src: rawValue,
      link: '',
      revisedPrompt,
    };
  }

  return {
    id: `responses-${prefix}`,
    src: `data:image/png;base64,${rawValue}`,
    link: '',
    revisedPrompt,
  };
};

const getImageSourceDedupKey = (src) =>
  String(src || '')
    .trim()
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '')
    .replace(/\s+/g, '');

const getResponsesContentImageSource = (content) => {
  if (!content) {
    return '';
  }
  if (typeof content.image_url === 'string') {
    return content.image_url;
  }
  if (content.image_url?.url) {
    return content.image_url.url;
  }
  if (typeof content.url === 'string') {
    return content.url;
  }
  if (typeof content.result === 'string') {
    return content.result;
  }
  if (content.b64_json) {
    return `data:image/png;base64,${content.b64_json}`;
  }
  return '';
};

const normalizeResponsesImageGenerationResponse = (body) => {
  const images = [];
  const textParts = [];
  const seenSources = new Set();
  const outputs = Array.isArray(body?.output) ? body.output : [];

  const appendImage = (image) => {
    const sourceKey = getImageSourceDedupKey(image?.src);
    if (!image || !image.src || seenSources.has(sourceKey)) {
      return;
    }
    seenSources.add(sourceKey);
    images.push(image);
  };

  outputs.forEach((output, outputIndex) => {
    const revisedPrompt = String(output?.revised_prompt || '').trim();
    const resultItems = Array.isArray(output?.result)
      ? output.result
      : [output?.result];

    resultItems.forEach((item, resultIndex) => {
      appendImage(
        normalizeResponsesImageSource(
          item,
          `${outputIndex}-${resultIndex}`,
          revisedPrompt,
        ),
      );
    });

    const outputContents = Array.isArray(output?.content) ? output.content : [];
    outputContents.forEach((content, contentIndex) => {
      const directImageSource = getResponsesContentImageSource(content);
      if (directImageSource) {
        appendImage(
          normalizeResponsesImageSource(
            directImageSource,
            `content-${outputIndex}-${contentIndex}`,
            revisedPrompt,
          ),
        );
        return;
      }

      if (content?.text) {
        const extracted = extractImageSourcesFromText(
          content.text,
          `responses-${outputIndex}-${contentIndex}`,
        );
        extracted.images.forEach((image) =>
          appendImage({
            ...image,
            revisedPrompt: image.revisedPrompt || revisedPrompt,
          }),
        );
        if (extracted.text) {
          textParts.push(extracted.text);
        }
      }
    });
  });

  return {
    images,
    responseText: textParts.join('\n').trim(),
  };
};

const normalizeDrawingErrorMessage = (message, t) => {
  const rawMessage = String(message || '').trim();
  if (!rawMessage) {
    return t('生图请求失败');
  }

  const loweredMessage = rawMessage.toLowerCase();
  if (
    loweredMessage.includes('system disk overloaded') ||
    loweredMessage.includes('disk overloaded')
  ) {
    return t('当前生图服务负载较高，请稍后重试');
  }
  if (
    loweredMessage.includes('system memory overloaded') ||
    loweredMessage.includes('memory overloaded')
  ) {
    return t('当前生图服务负载较高，请稍后重试');
  }
  if (loweredMessage.includes('no space left on device')) {
    return t('当前生图服务磁盘空间不足，请联系管理员处理');
  }
  if (loweredMessage.includes('status_code=503')) {
    return t('当前生图服务暂时不可用，请稍后再试');
  }

  return rawMessage.replace(/^error:\s*/i, '').trim();
};

const normalizeDrawingImages = (images, limit = 1) => {
  const seenSources = new Set();
  const normalized = [];

  (Array.isArray(images) ? images : []).forEach((image) => {
    const sourceKey = getImageSourceDedupKey(image?.src);
    if (!image?.src || !sourceKey || seenSources.has(sourceKey)) {
      return;
    }
    seenSources.add(sourceKey);
    normalized.push(image);
  });

  return normalized.slice(0, Math.max(1, Number(limit) || 1));
};

const uploadDrawingImageToFreeCdn = async (image, recordId, index) => {
  if (!image?.src || isFreeCdnDrawingImage(image.src)) {
    return image;
  }

  const uploadSource = normalizeDrawingUploadSource(image.src);
  if (!uploadSource) {
    return image;
  }

  const res = await API.post('/api/user/self/drawing/upload', {
    image: uploadSource,
    filename: `drawing-${recordId}-${index + 1}.png`,
  });
  if (!res.data?.success || !res.data?.data?.url) {
    throw new Error(res.data?.message || 'upload image to free cdn failed');
  }

  return {
    ...image,
    src: res.data.data.url,
    link: res.data.data.url,
    cdnProvider: res.data.data.provider || 'catbox',
  };
};

const uploadDrawingImagesToFreeCdn = async (images, recordId) =>
  Promise.all(
    images.map((image, index) =>
      uploadDrawingImageToFreeCdn(image, recordId, index),
    ),
  );

const formatTime = (timestamp) => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const formatElapsedTime = (totalSeconds) => {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
};

const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
};

const normalizeImageItem = (item, index) => {
  if (!item) {
    return null;
  }
  if (item.url) {
    return {
      id: `url-${index}`,
      src: item.url,
      link: item.url,
      revisedPrompt: item.revised_prompt || '',
    };
  }
  if (item.b64_json) {
    return {
      id: `b64-${index}`,
      src: `data:image/png;base64,${item.b64_json}`,
      link: '',
      revisedPrompt: item.revised_prompt || '',
    };
  }
  return null;
};

const downloadImage = (src, filename) => {
  if (!src) {
    return;
  }
  const link = document.createElement('a');
  link.href = src;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });

const dataUrlToFile = (dataUrl, filename, mimeType) => {
  const [header, base64] = String(dataUrl || '').split(',');
  if (!header || !base64) {
    throw new Error('参考图片数据无效');
  }

  const detectedMimeType =
    mimeType ||
    header.match(/^data:([^;]+);base64$/i)?.[1] ||
    'image/png';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: detectedMimeType });
};

const appendFormDataValue = (formData, key, value) => {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendFormDataValue(formData, `${key}[]`, item));
    return;
  }

  if (isPlainObject(value)) {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, String(value));
};

const buildOpenAIImageEditFormData = ({
  model,
  prompt,
  n,
  aspectRatio,
  imageSize,
  extraBody,
  referenceImages,
}) => {
  const size = aspectRatioToImageGenerationSize(aspectRatio, model, {
    forceGPTImageSize: true,
  });
  const fields = {
    ...(extraBody || {}),
    model,
    prompt,
    n: Math.max(1, Number(n) || 1),
    size,
  };

  const quality = imageSizeToGenerationQuality(imageSize, model, {
    forceGPTImageQuality: true,
    requestMode: DRAWING_REQUEST_MODE_OPENAI_IMAGE_EDIT,
  });
  if (quality && fields.quality === undefined) {
    fields.quality = quality;
  }

  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (key === 'image' || key === 'image[]') {
      return;
    }
    appendFormDataValue(formData, key, value);
  });

  (referenceImages || []).forEach((item, index) => {
    const dataUrl =
      item?.previewUrl ||
      `data:${item?.mimeType || 'image/png'};base64,${item?.base64 || ''}`;
    if (!dataUrl) {
      return;
    }

    const file = dataUrlToFile(
      dataUrl,
      item?.name || `reference-${index + 1}.png`,
      item?.mimeType,
    );
    formData.append(
      referenceImages.length > 1 ? 'image[]' : 'image',
      file,
      file.name,
    );
  });

  return {
    formData,
    sizeLabel: size,
  };
};

export default function Drawing() {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [booting, setBooting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState({
    enabled: false,
    group: '',
    models: [],
    default_model: '',
    default_request_mode: '',
    model_request_modes: {},
    token_name: '',
    authorization: '',
    endpoint: '/v1/images/generations',
    responses_endpoint: '/v1/responses',
    edit_endpoint: '/v1/images/edits',
  });
  const [form, setForm] = useState(DEFAULT_FORM);
  const [referenceImages, setReferenceImages] = useState([]);
  const [resultHistory, setResultHistory] = useState([]);
  const [activeRecordId, setActiveRecordId] = useState('');
  const [historyReady, setHistoryReady] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [latestError, setLatestError] = useState('');
  const [generationStartedAt, setGenerationStartedAt] = useState(0);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);

  useEffect(() => {
    document.body.classList.add('drawing-clean-page');

    return () => {
      document.body.classList.remove('drawing-clean-page');
    };
  }, []);

  const loadInit = useCallback(async () => {
    try {
      setBooting(true);
      const res = await API.get('/api/user/self/drawing/init');
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        setLatestError(message || '');
        return;
      }

      const nextConfig = data || {};
      const nextModels = Array.isArray(nextConfig.models)
        ? nextConfig.models.filter(Boolean)
        : [];
      setConfig({
        enabled: !!nextConfig.enabled,
        group: nextConfig.group || '',
        models: nextModels,
        default_model: nextConfig.default_model || '',
        default_request_mode: nextConfig.default_request_mode || '',
        model_request_modes: nextConfig.model_request_modes || {},
        token_name: nextConfig.token_name || '',
        authorization: nextConfig.authorization || '',
        endpoint: nextConfig.endpoint || '/v1/images/generations',
        responses_endpoint: nextConfig.responses_endpoint || '/v1/responses',
        edit_endpoint: nextConfig.edit_endpoint || '/v1/images/edits',
      });
      setForm((prev) => ({
        ...prev,
        model: nextModels.includes(prev.model)
          ? prev.model
          : nextConfig.default_model || nextModels[0] || '',
      }));
      setLatestError('');
    } catch (error) {
      showError(error);
      setLatestError(error?.message || t('加载生图配置失败'));
    } finally {
      setBooting(false);
    }
  }, [t]);

  useEffect(() => {
    loadInit();
  }, [loadInit]);

  useEffect(() => {
    let disposed = false;

    setHistoryReady(false);
    readDrawingHistoryWithFallback(config.token_name)
      .then((records) => {
        if (disposed) {
          return;
        }
        setResultHistory(records);
        setActiveRecordId(records[0]?.id || '');
      })
      .catch(() => {
        if (!disposed) {
          setResultHistory([]);
          setActiveRecordId('');
        }
      })
      .finally(() => {
        if (!disposed) {
          setHistoryReady(true);
        }
      });

    return () => {
      disposed = true;
    };
  }, [config.token_name]);

  useEffect(() => {
    if (!historyReady) {
      return;
    }

    const historyKey = getDrawingHistoryKey(config.token_name);
    writeDrawingHistory(historyKey, resultHistory).catch(() => {});
  }, [config.token_name, historyReady, resultHistory]);

  useEffect(() => {
    setHistoryPage(1);
  }, [resultHistory.length]);

  useEffect(() => {
    if (!submitting || !generationStartedAt) {
      return;
    }

    const updateElapsed = () => {
      setGenerationElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - generationStartedAt) / 1000)),
      );
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [generationStartedAt, submitting]);

  const handleFormChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const appendReferenceFiles = async (files) => {
    const currentCount = referenceImages.length;
    if (currentCount >= MAX_REFERENCE_IMAGES) {
      showError(t('最多只能上传 3 张参考图片'));
      return;
    }

    const incomingFiles = Array.from(files || []);
    if (incomingFiles.length === 0) {
      return;
    }

    const availableSlots = MAX_REFERENCE_IMAGES - currentCount;
    const selectedFiles = incomingFiles.slice(0, availableSlots);
    const nextItems = [];

    for (const file of selectedFiles) {
      if (!String(file.type || '').startsWith('image/')) {
        showError(t('只支持上传图片文件'));
        continue;
      }
      if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
        showError(`${file.name} ${t('超过 5MB 限制')}`);
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        if (!base64) {
          showError(`${file.name} ${t('读取失败')}`);
          continue;
        }
        nextItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          mimeType: file.type || 'image/png',
          size: file.size,
          base64,
          previewUrl: dataUrl,
        });
      } catch (error) {
        showError(error?.message || t('读取图片失败'));
      }
    }

    if (nextItems.length > 0) {
      setReferenceImages((prev) => [...prev, ...nextItems].slice(0, 3));
    }

    if (incomingFiles.length > availableSlots) {
      showError(t('最多只能上传 3 张参考图片'));
    }
  };

  const handleReferenceInput = async (event) => {
    await appendReferenceFiles(event.target.files);
    event.target.value = '';
  };

  const handleReferenceDrop = async (event) => {
    event.preventDefault();
    await appendReferenceFiles(event.dataTransfer.files);
  };

  const addHistoryImageAsReference = async (record, image, index) => {
    if (!image?.src) {
      showError(t('图片地址无效'));
      return;
    }
    if (referenceImages.length >= MAX_REFERENCE_IMAGES) {
      showError(t('最多只能上传 3 张参考图片'));
      return;
    }

    try {
      const resolveSource = normalizeDrawingUploadSource(image.src);
      const res = await API.post('/api/user/self/drawing/resolve', {
        image: resolveSource,
        filename: `history-${record.id}-${index + 1}.png`,
      });
      if (!res.data?.success || !res.data?.data?.base64) {
        throw new Error(t('参考图片数据无效'));
      }
      const data = res.data.data || {};
      const mimeType = data.mimeType || data.mime_type || 'image/png';
      const base64 = data.base64;
      const dataUrl = data.data_url || `data:${mimeType};base64,${base64}`;

      const nextItem = {
        id: `history-${record.id}-${index}-${Date.now()}`,
        name: `history-${record.id}-${index + 1}.png`,
        mimeType,
        size: Number(data.size || 0),
        base64,
        previewUrl: dataUrl,
      };

      setReferenceImages((prev) => [...prev, nextItem].slice(0, MAX_REFERENCE_IMAGES));
      showSuccess(t('已添加到参考图片'));
    } catch (error) {
      showError(error?.message || t('读取历史图片失败'));
    }
  };

  const handleGenerate = async () => {
    // 生成前清空上一次错误，避免旧提示干扰当前任务
    setLatestError('');

    const prompt = String(form.prompt || '').trim();
    const generationCount = 1;
    const finalPrompt = buildDrawingPrompt({
      prompt,
      aspectRatio: form.aspectRatio,
      imageSize: form.imageSize,
      referenceImages,
    });
    if (!config.enabled) {
      showError(t('当前站点尚未开启生图功能'));
      return;
    }
    if (!prompt) {
      showError(t('请输入生图提示词'));
      return;
    }
    if (!form.model) {
      showError(t('当前没有可用生图模型'));
      return;
    }
    if (!config.authorization) {
      showError(t('生图专用令牌未初始化，请先刷新配置'));
      return;
    }

    let extraBody = {};
    if (String(form.extraBody || '').trim()) {
      try {
        extraBody = JSON.parse(form.extraBody);
      } catch (error) {
        showError(t('额外参数 JSON 格式不正确'));
        return;
      }
    }

    const requestMode = resolveDrawingRequestMode(
      config.model_request_modes,
      config.default_request_mode,
      form.model,
    );

    if (referenceImages.length > 0 && !supportsReferenceImages(requestMode)) {
      showError(t('当前模型暂不支持参考图片，请切换到支持参考图的生图模型'));
      return;
    }

    const nextGenerationStartedAt = Date.now();
    setGenerationStartedAt(nextGenerationStartedAt);
    setGenerationElapsedSeconds(0);
    setSubmitting(true);
    setLatestError('');

    try {
      let requestUrl = resolveApiUrl(config.endpoint);
      let payload = {};
      let requestBody = null;
      let sizeLabel = form.aspectRatio;
      if (requestMode === DRAWING_REQUEST_MODE_GEMINI_NATIVE) {
        requestUrl = resolveGeminiGenerateContentUrl(form.model);
        payload = buildGeminiGenerateContentPayload({
          prompt: finalPrompt,
          n: generationCount,
          aspectRatio: form.aspectRatio,
          imageSize: form.imageSize,
          extraBody,
          referenceImages,
        });
        sizeLabel = formatDrawingSizeLabel({
          aspectRatio: form.aspectRatio,
          imageSize: form.imageSize,
        });
      } else if (
        requestMode === DRAWING_REQUEST_MODE_RESPONSES_IMAGE_GENERATION
      ) {
        requestUrl = resolveApiUrl(config.responses_endpoint);
        payload = buildResponsesImageGenerationPayload({
          model: form.model,
          prompt: finalPrompt,
          aspectRatio: form.aspectRatio,
          imageSize: form.imageSize,
          extraBody,
          referenceImages,
        });
        sizeLabel = formatDrawingSizeLabel({
          aspectRatio: form.aspectRatio,
          imageSize: form.imageSize,
          actualSize: payload?.tools?.[0]?.size,
        });
      } else if (
        requestMode === DRAWING_REQUEST_MODE_OPENAI_IMAGE_EDIT &&
        referenceImages.length > 0
      ) {
        requestUrl = resolveApiUrl(config.edit_endpoint);
        const editRequest = buildOpenAIImageEditFormData({
          model: form.model,
          prompt: finalPrompt,
          n: generationCount,
          aspectRatio: form.aspectRatio,
          imageSize: form.imageSize,
          extraBody,
          referenceImages,
        });
        requestBody = editRequest.formData;
        sizeLabel = formatDrawingSizeLabel({
          aspectRatio: form.aspectRatio,
          imageSize: form.imageSize,
          actualSize: editRequest.sizeLabel,
        });
      } else {
        const imageGenerationSize = aspectRatioToImageGenerationSize(
          form.aspectRatio,
          form.model,
          { imageSize: form.imageSize },
        );
        payload = {
          ...extraBody,
          model: form.model,
          prompt: finalPrompt,
          n: generationCount,
          size: imageGenerationSize,
        };
        const quality = imageSizeToGenerationQuality(form.imageSize, form.model, {
          requestMode,
        });
        if (quality && payload.quality === undefined) {
          payload.quality = quality;
        }
        sizeLabel = formatDrawingSizeLabel({
          aspectRatio: form.aspectRatio,
          imageSize: form.imageSize,
          actualSize: imageGenerationSize,
        });
      }

      const headers = {
        Authorization: config.authorization,
      };
      if (requestBody === null) {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(payload);
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: requestBody,
      });

      const rawText = await response.text();
      let parsedBody = null;
      try {
        parsedBody = rawText ? JSON.parse(rawText) : {};
      } catch (error) {
        parsedBody = null;
      }

      if (!response.ok) {
        const errorMessage =
          parsedBody?.error?.message ||
          parsedBody?.message ||
          rawText ||
          `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      let images = [];
      let responseText = '';

      if (requestMode === DRAWING_REQUEST_MODE_GEMINI_NATIVE) {
        const normalizedResponse =
          normalizeGeminiGenerateContentResponse(
            parsedBody || {
              candidates: rawText
                ? [
                    {
                      content: {
                        parts: [{ text: rawText }],
                      },
                    },
                  ]
                : [],
            },
          );
        images = normalizedResponse.images;
        responseText = normalizedResponse.responseText;

        if (images.length === 0 && normalizedResponse.blockReason) {
          throw new Error(
            `Gemini blocked the request: ${normalizedResponse.blockReason}`,
          );
        }
      } else if (
        requestMode === DRAWING_REQUEST_MODE_RESPONSES_IMAGE_GENERATION
      ) {
        const normalizedResponse = normalizeResponsesImageGenerationResponse(
          parsedBody || {},
        );
        images = normalizedResponse.images;
        responseText = normalizedResponse.responseText;
      } else {
        images = Array.isArray(parsedBody?.data)
          ? parsedBody.data
              .map((item, index) => normalizeImageItem(item, index))
              .filter(Boolean)
          : [];
      }

      if (images.length === 0) {
        throw new Error(
          responseText || t('上游已返回成功，但没有拿到可展示的图片结果'),
        );
      }

      images = normalizeDrawingImages(images, generationCount);
      const recordId = `${Date.now()}`;
      const needsCdnUpload = images.some((image) =>
        image?.src && !isFreeCdnDrawingImage(image.src),
      );
      if (needsCdnUpload) {
        try {
          images = await uploadDrawingImagesToFreeCdn(images, recordId);
        } catch (uploadError) {
          showError(
            `${t('图片生成完成，但上传免费 CDN 失败，将临时使用上游图片地址')}：${
              uploadError?.message || ''
            }`,
          );
        }
      }

      const nextRecord = {
        id: recordId,
        createdAt: new Date().toISOString(),
        prompt: finalPrompt,
        rawPrompt: prompt,
        model: form.model,
        aspectRatio: form.aspectRatio,
        imageSize: form.imageSize,
        sizeLabel,
        count: images.length,
        requestMode,
        responseText,
        images,
      };

      setResultHistory((prev) =>
        [nextRecord, ...prev].slice(0, DRAWING_HISTORY_LIMIT),
      );
      setActiveRecordId(nextRecord.id);
      showSuccess(t('生图完成'));
    } catch (error) {
      const message = error?.message || t('生图请求失败');
      const errorMessage = normalizeDrawingErrorMessage(message, t);
      setLatestError(errorMessage);
      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const activeRecord =
    resultHistory.find((item) => item.id === activeRecordId) ||
    resultHistory[0] ||
    null;
  const tokenValue = getDrawingTokenName(config.token_name);
  const currentRequestMode = resolveDrawingRequestMode(
    config.model_request_modes,
    config.default_request_mode,
    form.model,
  );
  const promptLength = String(form.prompt || '').length;
  const historyImageEntries = resultHistory.flatMap((record) =>
    (record.images || []).map((image, index) => ({
      record,
      image,
      index,
      key: `${record.id}-${image.id || index}`,
    })),
  );
  const historyTotalPages = Math.max(
    1,
    Math.ceil(historyImageEntries.length / DRAWING_HISTORY_PAGE_SIZE),
  );
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedHistoryImages = historyImageEntries.slice(
    (safeHistoryPage - 1) * DRAWING_HISTORY_PAGE_SIZE,
    safeHistoryPage * DRAWING_HISTORY_PAGE_SIZE,
  );

  return (
    <div className='drawing-page-shell'>
      <div className='drawing-page-header'>
        <div>
          <div className='drawing-page-badge'>
            <Sparkles size={14} />
            {t('AI 生图')}
          </div>
          <div className='drawing-page-hero'>
            <div className='drawing-page-hero-copy'>
              <div className='drawing-page-hero-copy-title'>
                {t('\u7075\u611f\u521a\u51fa\u73b0\uff0c\u753b\u9762\u5c31\u5f00\u59cb\u6210\u5f62')}
              </div>
              <div className='drawing-page-hero-copy-summary'>
                {t(
                  '\u652f\u6301\u63d0\u793a\u8bcd\u3001\u53c2\u8003\u56fe\u3001\u5bbd\u9ad8\u6bd4\u4e0e\u56fe\u7247\u5c3a\u5bf8\u81ea\u7531\u7ec4\u5408\uff0c\u53ef\u7528\u6a21\u578b\u4f1a\u81ea\u52a8\u540c\u6b65\u540e\u53f0\u7ed8\u56fe\u914d\u7f6e\uff0c\u8ba9\u6bcf\u4e00\u4e2a\u7075\u611f\u90fd\u66f4\u5feb\u53d8\u6210\u770b\u5f97\u89c1\u7684\u6210\u7247\u3002',
                )}
              </div>
            </div>
            <Text strong className='drawing-page-hero-title'>
              {t('把一句提示词，直接变成你想要的图片')}
            </Text>
            <Paragraph className='drawing-page-summary'>
              {t(
                '站内直连 AI 生图能力，自动匹配后台已配置的模型与分组。你只需要输入提示词和参考图，系统会自动切换正确端点，消耗仍然计入当前登录用户自己的余额。',
              )}
            </Paragraph>
          </div>
        </div>

        <Button
          icon={<RefreshCw size={14} />}
          theme='light'
          loading={booting}
          onClick={loadInit}
        >
          {t('刷新配置')}
        </Button>
      </div>

      <div className='drawing-stage-grid'>
        <Card className='drawing-panel-card' bodyStyle={{ padding: 24 }}>
          <Spin spinning={booting}>
            <div className='drawing-form-stack'>
              <div>
                <Text
                  strong
                  className='drawing-config-title'
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  {t('当前配置')}
                </Text>
                <div
                  className='drawing-config-pills'
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Tag color={config.enabled ? 'green' : 'grey'}>
                    {config.enabled ? t('已开启') : t('未开启')}
                  </Tag>
                  {config.group ? (
                    <Tag color='blue'>{`${t('分组')}：${config.group}`}</Tag>
                  ) : null}
                  {config.token_name ? (
                    <Tag color='purple'>{`${t('令牌')}：${config.token_name}`}</Tag>
                  ) : null}
                  <Tag color='orange'>
                    {`${t('模型数')}：${config.models.length}`}
                  </Tag>
                </div>
              </div>

              {!config.enabled ? (
                <Empty
                  description={t(
                    '后台还没有开启生图功能，或者尚未配置生图分组与模型。',
                  )}
                  style={{ padding: '40px 0' }}
                />
              ) : (
                <>
                  <div className='drawing-field-block'>
                    <div className='drawing-field-head'>
                      <Text strong>{t('提示词')}</Text>
                      <Text type='tertiary'>{`${promptLength} / 5000`}</Text>
                    </div>
                    <Text strong style={{ display: 'none' }}>
                      {t('提示词')}
                    </Text>
                    <TextArea
                      autosize={{ minRows: 7, maxRows: 14 }}
                      value={form.prompt}
                      placeholder={t(
                        '例如：一只戴着金属耳机的橘猫坐在霓虹雨夜街头，电影感，超清细节。',
                      )}
                      onChange={(value) => handleFormChange('prompt', value)}
                    />
                  </div>

                  <div className='drawing-field-block'>
                    <div className='drawing-field-head'>
                      <Text strong>{t('参考图片（可选，1-3张）')}</Text>
                      <Text type='tertiary'>
                        {supportsReferenceImages(currentRequestMode)
                          ? t('当前模型会携带参考图片一起生成')
                          : t('当前模型暂不使用参考图片')}
                      </Text>
                    </div>

                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/png,image/jpeg,image/webp'
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleReferenceInput}
                    />

                    <div
                      className={`drawing-upload-panel ${
                        !supportsReferenceImages(currentRequestMode)
                          ? 'is-muted'
                          : ''
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleReferenceDrop}
                      onDragOver={(event) => event.preventDefault()}
                    >
                      {referenceImages.length === 0 ? (
                        <div className='drawing-upload-placeholder'>
                          <div className='drawing-upload-icon'>
                            <Upload size={18} />
                          </div>
                          <Text strong>{t('点击或拖拽图片到这里')}</Text>
                          <Text type='tertiary'>
                            {t('支持 JPEG、PNG、WebP，单张最大 5MB')}
                          </Text>
                        </div>
                      ) : (
                        <div className='drawing-reference-grid'>
                          {referenceImages.map((item) => (
                            <div key={item.id} className='drawing-reference-item'>
                              <img
                                src={item.previewUrl}
                                alt={item.name}
                                className='drawing-reference-image'
                              />
                              <button
                                type='button'
                                className='drawing-reference-remove'
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setReferenceImages((prev) =>
                                    prev.filter((image) => image.id !== item.id),
                                  );
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                              <div className='drawing-reference-meta'>
                                <span>{item.name}</span>
                                <span>{formatBytes(item.size)}</span>
                              </div>
                            </div>
                          ))}
                          {referenceImages.length < MAX_REFERENCE_IMAGES ? (
                            <button
                              type='button'
                              className='drawing-reference-add'
                              onClick={(event) => {
                                event.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                            >
                              <Upload size={18} />
                              <span>{t('继续添加')}</span>
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>

                  </div>

                  <div className='drawing-setup-shell'>
                    <div className='drawing-token-panel'>
                      <div className='drawing-panel-kicker'>{t('专用令牌')}</div>
                      <Text strong className='drawing-token-title'>
                        {t('令牌')}
                      </Text>
                      <Text type='tertiary' className='drawing-token-note'>
                        {t(
                          '系统会自动绑定当前用户的生图专用令牌，你不需要手动创建或切换。',
                        )}
                      </Text>
                      <Select
                        className='drawing-select'
                        dropdownClassName='drawing-select-dropdown'
                        filter={false}
                        value={tokenValue}
                        optionList={[{ label: tokenValue, value: tokenValue }]}
                        disabled
                      />
                    </div>

                  <div className='drawing-inline-grid'>
                    <div className='drawing-control-card'>
                      <div className='drawing-panel-kicker'>{t('模型')}</div>
                      <Text strong className='drawing-control-title'>
                        {t('模型')}
                      </Text>
                      <Text type='tertiary' className='drawing-control-note'>
                        {t('不同模型会自动切换到对应的请求端点。')}
                      </Text>
                      <Select
                        className='drawing-select'
                        dropdownClassName='drawing-select-dropdown'
                        filter={false}
                        value={form.model}
                        optionList={config.models.map((model) => ({
                          label: model,
                          value: model,
                        }))}
                        placeholder={t('请选择模型')}
                        onChange={(value) => handleFormChange('model', value)}
                      />
                    </div>

                    <div className='drawing-control-card'>
                      <div className='drawing-panel-kicker'>{t('比例')}</div>
                      <Text strong className='drawing-control-title'>
                        {t('宽高比')}
                      </Text>
                      <Text type='tertiary' className='drawing-control-note'>
                        {t('决定画面的横竖方向与构图空间。')}
                      </Text>
                      <Select
                        className='drawing-select'
                        dropdownClassName='drawing-select-dropdown'
                        filter={false}
                        value={form.aspectRatio}
                        optionList={DRAWING_ASPECT_RATIO_OPTIONS}
                        onChange={(value) =>
                          handleFormChange('aspectRatio', value)
                        }
                      />
                    </div>

                    <div className='drawing-control-card'>
                      <div className='drawing-panel-kicker'>{t('清晰度')}</div>
                      <Text strong className='drawing-control-title'>
                        {t('图片尺寸')}
                      </Text>
                      <Text type='tertiary' className='drawing-control-note'>
                        {t('尺寸越高，通常生成质量和耗时也会更高。')}
                      </Text>
                      <Select
                        className='drawing-select'
                        dropdownClassName='drawing-select-dropdown'
                        filter={false}
                        value={form.imageSize}
                        optionList={DRAWING_IMAGE_SIZE_OPTIONS}
                        onChange={(value) => handleFormChange('imageSize', value)}
                      />
                    </div>

                    <div className='drawing-control-card'>
                      <div className='drawing-panel-kicker'>{t('张数')}</div>
                      <Text strong className='drawing-control-title'>
                        {t('生成数量')}
                      </Text>
                      <Text type='tertiary' className='drawing-control-note'>
                        {t('单次可返回 1、2 或 4 张结果图。')}
                      </Text>
                      <Text strong style={{ display: 'none', marginBottom: 8 }}>
                        {t('生成数量')}
                      </Text>
                      <Select
                        className='drawing-select'
                        dropdownClassName='drawing-select-dropdown'
                        filter={false}
                        value={form.n}
                        optionList={[
                          { label: '1', value: 1 },
                          { label: '2', value: 2 },
                          { label: '4', value: 4 },
                        ]}
                        onChange={(value) => handleFormChange('n', value)}
                      />
                    </div>
                  </div>
                  </div>

                  <div className='drawing-action-bar drawing-action-bar--full'>
                    <Button
                      className='drawing-generate-button'
                      theme='solid'
                      type='primary'
                      loading={submitting}
                      icon={<Sparkles size={16} />}
                      onClick={handleGenerate}
                    >
                      {t('生成图片')}
                    </Button>
                  </div>

                  {latestError ? (
                    <div className='drawing-error-box'>{latestError}</div>
                  ) : null}
                </>
              )}
            </div>
          </Spin>
        </Card>

        <Card className='drawing-panel-card' bodyStyle={{ padding: 24 }}>
          <div className='drawing-preview-head'>
            <div>
              <Text strong>{t('最近结果')}</Text>
              <Text type='tertiary' className='drawing-preview-subtitle'>
                {t('最近生成的图片会保留 CDN 链接，点击右下角历史按钮查看。')}
              </Text>
            </div>
            {resultHistory.length > 0 ? (
              <Tag color='blue'>{`${resultHistory.length} ${t('条记录')}`}</Tag>
            ) : null}
          </div>

          <div className='drawing-preview-stage'>
            <div className='drawing-preview-glow' />

            {submitting ? (
              <div className='drawing-preview-empty'>
                <Spin size='large' />
                <Text type='tertiary'>{t('正在生成图片，请稍候')}</Text>
                <div className='drawing-preview-timer'>
                  <span>{t('本次耗时')}</span>
                  <strong>{formatElapsedTime(generationElapsedSeconds)}</strong>
                </div>
                <Text type='tertiary'>{t('正在生成图片，请稍候')}</Text>
              </div>
            ) : activeRecord ? (
              activeRecord.images.length === 1 ? (
                <div className='drawing-single-preview'>
                  <img
                    src={activeRecord.images[0].src}
                    alt='drawing-preview'
                    className='drawing-single-preview-image'
                  />
                  <div className='drawing-single-preview-actions'>
                    <Button
                      size='small'
                      theme='light'
                      icon={<Download size={13} />}
                      onClick={() =>
                        downloadImage(
                          activeRecord.images[0].src,
                          `drawing-${activeRecord.id}.png`,
                        )
                      }
                    >
                      {t('下载')}
                    </Button>
                    {activeRecord.images[0].link ? (
                      <Button
                        size='small'
                        theme='light'
                        icon={<ExternalLink size={13} />}
                        onClick={() =>
                          window.open(activeRecord.images[0].link, '_blank')
                        }
                      >
                        {t('原图')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className='drawing-preview-grid'>
                  {activeRecord.images.map((image, index) => (
                    <div key={image.id} className='drawing-preview-grid-item'>
                      <img src={image.src} alt={`drawing-${index + 1}`} />
                      <div className='drawing-preview-grid-actions'>
                        <Button
                          size='small'
                          theme='light'
                          icon={<Download size={12} />}
                          onClick={() =>
                            downloadImage(
                              image.src,
                              `drawing-${activeRecord.id}-${index + 1}.png`,
                            )
                          }
                        />
                        {image.link ? (
                          <Button
                            size='small'
                            theme='light'
                            icon={<ExternalLink size={12} />}
                            onClick={() => window.open(image.link, '_blank')}
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className='drawing-preview-empty'>
                <div className='drawing-preview-orb' />
                <ImageIcon size={32} color='var(--semi-color-text-2)' />
                <Text strong>{t('你的图片将在这里展示')}</Text>
              </div>
            )}
          </div>

          {!submitting && activeRecord ? (
            <div className='drawing-result-details'>
              <div className='drawing-preview-stat-row'>
                <div className='drawing-preview-stat'>
                  <span>{t('模型')}</span>
                  <strong>{activeRecord.model}</strong>
                </div>
                <div className='drawing-preview-stat'>
                  <span>{t('规格')}</span>
                  <strong>{activeRecord.sizeLabel}</strong>
                </div>
                <div className='drawing-preview-stat'>
                  <span>{t('数量')}</span>
                  <strong>{`${activeRecord.count}${t('张')}`}</strong>
                </div>
                <div className='drawing-preview-stat'>
                  <span>{t('时间')}</span>
                  <strong>{formatTime(activeRecord.createdAt)}</strong>
                </div>
              </div>

              <div className='drawing-detail-card'>
                <Text strong className='drawing-detail-title'>
                  {t('本次提示词')}
                </Text>
                <Paragraph
                  ellipsis={{ rows: 3, expandable: true }}
                  style={{ marginBottom: activeRecord.responseText ? 10 : 0 }}
                >
                  {activeRecord.prompt}
                </Paragraph>

                {activeRecord.responseText ? (
                  <>
                    <Text strong className='drawing-detail-title'>
                      {t('模型补充说明')}
                    </Text>
                    <Text type='tertiary' className='drawing-response-text'>
                      {activeRecord.responseText}
                    </Text>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

        </Card>
      </div>

      <button
        type='button'
        className='drawing-history-fab'
        onClick={() => setHistoryDrawerOpen(true)}
      >
        <History size={18} />
        <span>{t('历史记录')}</span>
        <em>{historyImageEntries.length}</em>
      </button>

      {historyDrawerOpen ? (
        <div
          className='drawing-history-drawer-mask'
          onClick={() => setHistoryDrawerOpen(false)}
        >
          <aside
            className='drawing-history-drawer'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='drawing-history-drawer-head'>
              <div>
                <Text strong>{t('历史记录')}</Text>
                <Text type='tertiary' className='drawing-history-drawer-subtitle'>
                  {t('点击图片切换预览，点击小笔可添加为参考图。')}
                </Text>
              </div>
              <button
                type='button'
                className='drawing-history-close'
                onClick={() => setHistoryDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {historyImageEntries.length === 0 ? (
              <Empty
                description={t('暂无历史图片')}
                image={<ImageIcon size={48} color='var(--semi-color-text-2)' />}
                style={{ padding: '52px 0' }}
              />
            ) : (
              <>
                <div className='drawing-history-drawer-grid'>
                  {pagedHistoryImages.map(({ record, image, index, key }) => (
                    <div
                      key={key}
                      role='button'
                      tabIndex={0}
                      className={`drawing-history-drawer-card ${
                        record.id === activeRecord?.id ? 'is-active' : ''
                      }`}
                      onClick={() => setActiveRecordId(record.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setActiveRecordId(record.id);
                        }
                      }}
                    >
                      <img
                        src={image.src}
                        alt={`history-${index + 1}`}
                        className='drawing-history-drawer-image'
                      />
                      <button
                        type='button'
                        className='drawing-history-edit-tip'
                        onClick={(event) => {
                          event.stopPropagation();
                          addHistoryImageAsReference(record, image, index);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <div className='drawing-history-card-overlay'>
                        <button
                          type='button'
                          onClick={(event) => {
                            event.stopPropagation();
                            addHistoryImageAsReference(record, image, index);
                          }}
                        >
                          <Pencil size={13} />
                          {t('参考图')}
                        </button>
                        <button
                          type='button'
                          onClick={(event) => {
                            event.stopPropagation();
                            window.open(image.link || image.src, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <Eye size={13} />
                          {t('原图')}
                        </button>
                        <button
                          type='button'
                          onClick={(event) => {
                            event.stopPropagation();
                            downloadImage(
                              image.src,
                              `drawing-${record.id}-${index + 1}.png`,
                            );
                          }}
                        >
                          <Download size={13} />
                          {t('下载')}
                        </button>
                      </div>
                      <div className='drawing-history-card-info'>
                        <span>{record.model}</span>
                        <small>{`${formatTime(record.createdAt)} · ${record.sizeLabel}`}</small>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='drawing-history-pagination'>
                  <button
                    type='button'
                    disabled={safeHistoryPage <= 1}
                    onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type='button'
                      className={page === safeHistoryPage ? 'is-active' : ''}
                      onClick={() => setHistoryPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type='button'
                    disabled={safeHistoryPage >= historyTotalPages}
                    onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}

      <style>{`
        .drawing-page-shell {
          width: 100%;
          padding: 0 28px 48px;
          margin: 0;
          min-height: calc(100dvh - var(--header-height, 60px));
          max-width: none;
          box-sizing: border-box;
          background: #fafafa;
          border-left: 1px solid rgba(203, 213, 225, 0.85);
          box-shadow: none;
        }

        .drawing-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          flex-wrap: wrap;
          margin: 0 -28px 22px;
          padding: 22px 28px 20px;
          background: #ffffff;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
        }

        .drawing-page-header > div {
          flex: 1;
          min-width: 0;
        }

        .drawing-page-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0;
          border-radius: 999px;
          background: transparent;
          color: #f59e0b;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .drawing-page-hero {
          width: 100%;
          max-width: none;
        }

        .drawing-page-hero-copy {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .drawing-page-hero-copy-title {
          font-size: 22px;
          line-height: 1.45;
          font-weight: 800;
          color: #1f2937;
        }

        .drawing-page-hero-copy-summary {
          padding: 0;
          border-radius: 0;
          border: 0;
          background: transparent;
          color: #64748b;
          line-height: 1.75;
          box-shadow: none;
          white-space: normal;
          word-break: break-word;
          max-width: 1080px;
        }

        .drawing-page-summary,
        .drawing-page-hero-title {
          display: none;
        }

        .drawing-stage-grid {
          display: grid;
          grid-template-columns: minmax(420px, 0.95fr) minmax(520px, 1fr);
          gap: 26px;
          align-items: start;
        }

        .drawing-panel-card {
          border: 1px solid rgba(203, 213, 225, 0.85) !important;
          border-radius: 16px !important;
          box-shadow: none !important;
          background: #ffffff !important;
          overflow: hidden;
        }

        .drawing-panel-card > .semi-card-body {
          padding: 20px 24px !important;
          background: #ffffff !important;
        }

        .drawing-form-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .drawing-config-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 2px;
        }

        .drawing-field-block {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0;
          border-radius: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
        }

        .drawing-field-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .drawing-field-label {
          display: block;
          margin-bottom: 8px;
        }

        .drawing-config-title {
          display: none !important;
        }

        .drawing-setup-shell {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 0;
          border: 0;
          background: transparent;
        }

        .drawing-token-panel {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(229, 231, 235, 0.98);
          background: #ffffff;
          box-shadow: none;
        }

        .drawing-panel-kicker {
          display: none;
        }

        .drawing-token-title,
        .drawing-control-title {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }

        .drawing-token-note,
        .drawing-control-note {
          display: none;
        }

        .drawing-control-card {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(229, 231, 235, 0.98);
          background: #ffffff;
          box-shadow: none;
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .drawing-control-card:hover {
          transform: none;
          border-color: rgba(245, 158, 11, 0.34);
          box-shadow: none;
        }

        .drawing-control-card:nth-child(4) {
          display: none;
        }

        .drawing-select,
        .drawing-token-panel .semi-select,
        .drawing-control-card .semi-select {
          width: 100%;
          min-height: 50px;
          border-radius: 16px !important;
          border: 1px solid rgba(203, 213, 225, 0.88) !important;
          background: linear-gradient(180deg, #ffffff, #f8fafc) !important;
          box-shadow: none !important;
          padding: 0 !important;
          overflow: hidden;
        }

        .drawing-select .semi-select-selection,
        .drawing-token-panel .semi-select-selection,
        .drawing-control-card .semi-select-selection {
          min-height: 48px;
          border-radius: 0 !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .drawing-select:hover,
        .drawing-token-panel .semi-select:hover,
        .drawing-control-card .semi-select:hover {
          border-color: #f59e0b;
        }

        .drawing-select.semi-select-open,
        .drawing-token-panel .semi-select.semi-select-open,
        .drawing-control-card .semi-select.semi-select-open,
        .drawing-select:focus-within,
        .drawing-token-panel .semi-select:focus-within,
        .drawing-control-card .semi-select:focus-within {
          border-color: #f59e0b !important;
          box-shadow: none !important;
        }

        .drawing-select .semi-select-selection-text,
        .drawing-token-panel .semi-select-selection-text,
        .drawing-control-card .semi-select-selection-text,
        .drawing-select .semi-select-selection-placeholder,
        .drawing-token-panel .semi-select-selection-placeholder,
        .drawing-control-card .semi-select-selection-placeholder {
          font-size: 14px;
          color: #0f172a;
        }

        .drawing-select .semi-input-wrapper,
        .drawing-token-panel .semi-input-wrapper,
        .drawing-control-card .semi-input-wrapper,
        .drawing-select .semi-input-wrapper-focus,
        .drawing-token-panel .semi-input-wrapper-focus,
        .drawing-control-card .semi-input-wrapper-focus {
          width: 100% !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .drawing-select .semi-input,
        .drawing-token-panel .semi-input,
        .drawing-control-card .semi-input {
          padding: 0 !important;
          background: transparent !important;
        }

        .drawing-select .semi-select-arrow,
        .drawing-token-panel .semi-select-arrow,
        .drawing-control-card .semi-select-arrow {
          color: #94a3b8;
        }

        .drawing-select-dropdown .semi-select-option {
          margin: 4px 8px;
          border-radius: 12px;
        }

        .drawing-select-dropdown .semi-select-option:hover {
          background: rgba(251, 191, 36, 0.12);
        }

        .drawing-select-dropdown
          .semi-select-option.semi-select-option-selected {
          background: rgba(251, 191, 36, 0.16);
          color: #b45309;
        }

        .drawing-token-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .drawing-compact-field {
          min-width: 0;
        }

        .drawing-inline-grid--compact {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .drawing-action-bar--full {
          display: block;
        }

        .drawing-generate-button {
          width: 100%;
          height: 56px;
          border: 0 !important;
          border-radius: 18px !important;
          background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%) !important;
          box-shadow: none !important;
          font-size: 16px;
          font-weight: 700;
        }

        .drawing-generate-button:hover,
        .drawing-generate-button:focus {
          background: linear-gradient(90deg, #f59e0b 0%, #ea580c 100%) !important;
        }

        .drawing-error-box {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(239, 68, 68, 0.18);
          background: rgba(254, 242, 242, 0.92);
          color: #b91c1c;
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .drawing-upload-panel {
          border: 1px dashed rgba(148, 163, 184, 0.36);
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.65));
          padding: 18px;
          min-height: 156px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .drawing-upload-panel:hover {
          border-color: rgba(245, 158, 11, 0.55);
          box-shadow: none;
        }

        .drawing-upload-panel.is-muted {
          opacity: 0.72;
        }

        .drawing-upload-placeholder {
          min-height: 118px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
        }

        .drawing-upload-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(245, 158, 11, 0.16);
          color: #d97706;
        }

        .drawing-reference-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .drawing-reference-item,
        .drawing-reference-add {
          position: relative;
          min-height: 118px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: #fff;
        }

        .drawing-reference-image {
          width: 100%;
          height: 118px;
          object-fit: cover;
          display: block;
        }

        .drawing-reference-meta {
          padding: 8px 10px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          color: var(--semi-color-text-2);
          background: rgba(255, 255, 255, 0.95);
        }

        .drawing-reference-meta span:first-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .drawing-reference-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.72);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .drawing-reference-add {
          border-style: dashed;
          color: var(--semi-color-text-1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }

        .drawing-upload-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .drawing-preview-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .drawing-preview-subtitle {
          display: block;
          margin-top: 4px;
          font-size: 12px;
        }

        .drawing-preview-stage {
          position: relative;
          min-height: 500px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(229, 231, 235, 0.92);
          background: #ffffff;
          margin-bottom: 18px;
        }

        .drawing-preview-glow {
          display: none;
        }

        .drawing-preview-empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 24px;
          text-align: center;
        }

        .drawing-preview-timer {
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(251, 191, 36, 0.28);
          color: #92400e;
          box-shadow: none;
        }

        .drawing-preview-timer span {
          font-size: 13px;
          color: #b45309;
        }

        .drawing-preview-timer strong {
          font-size: 22px;
          line-height: 1;
          color: #0f172a;
          letter-spacing: 0.04em;
          font-variant-numeric: tabular-nums;
        }

        .drawing-preview-timer + .semi-typography {
          display: none;
        }

        .drawing-preview-orb {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 28% 28%, rgba(99, 102, 241, 0.28), transparent 38%),
            radial-gradient(circle at 72% 28%, rgba(244, 114, 182, 0.32), transparent 34%),
            radial-gradient(circle at 50% 76%, rgba(34, 197, 94, 0.24), transparent 34%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(238, 242, 255, 0.82));
          box-shadow: none;
        }

        .drawing-single-preview {
          position: absolute;
          inset: 0;
          padding: 20px;
        }

        .drawing-single-preview-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          border-radius: 16px;
          background: #ffffff;
        }

        .drawing-single-preview-actions {
          position: absolute;
          top: 30px;
          right: 30px;
          display: flex;
          gap: 8px;
        }

        .drawing-preview-grid {
          position: absolute;
          inset: 0;
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .drawing-preview-grid-item {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .drawing-preview-grid-item img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          background: #ffffff;
        }

        .drawing-preview-grid-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 8px;
        }

        .drawing-result-details {
          margin-bottom: 18px;
        }

        .drawing-preview-stat-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .drawing-preview-stat {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(255, 255, 255, 0.88);
        }

        .drawing-preview-stat span {
          font-size: 12px;
          color: var(--semi-color-text-2);
        }

        .drawing-preview-stat strong {
          font-size: 14px;
          color: var(--semi-color-text-0);
          word-break: break-word;
        }

        .drawing-detail-card {
          padding: 16px 18px;
          border-radius: 20px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(255, 255, 255, 0.92);
        }

        .drawing-detail-title {
          display: block;
          margin-bottom: 8px;
        }

        .drawing-response-text {
          display: block;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .drawing-history-fab {
          position: fixed;
          right: 28px;
          bottom: 28px;
          z-index: 88;
          height: 48px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 0;
          border-radius: 16px;
          padding: 0 16px;
          background: #111827;
          color: #ffffff;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22);
          cursor: pointer;
          font-weight: 800;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .drawing-history-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.28);
        }

        .drawing-history-fab em {
          min-width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.16);
          font-style: normal;
          font-size: 12px;
        }

        .drawing-history-drawer-mask {
          position: fixed;
          inset: 0;
          z-index: 92;
          display: flex;
          justify-content: flex-end;
          background: rgba(15, 23, 42, 0.28);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }

        .drawing-history-drawer {
          width: min(480px, calc(100vw - 24px));
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.96);
          border-left: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow: -22px 0 60px rgba(15, 23, 42, 0.18);
          padding: 18px;
          overflow: hidden;
        }

        .drawing-history-drawer-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.92);
        }

        .drawing-history-drawer-subtitle {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.65;
        }

        .drawing-history-close {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 12px;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
        }

        .drawing-history-drawer-grid {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          align-content: start;
          gap: 12px;
          padding: 16px 2px 12px;
        }

        .drawing-history-drawer-card {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: #ffffff;
          cursor: pointer;
          outline: none;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .drawing-history-drawer-card.is-active {
          border-color: rgba(245, 158, 11, 0.68);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14);
        }

        .drawing-history-drawer-image {
          width: 100%;
          aspect-ratio: 1 / 1;
          display: block;
          object-fit: cover;
          background: #f1f5f9;
        }

        .drawing-history-edit-tip {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          border: 0;
          background: rgba(15, 23, 42, 0.72);
          color: #fff;
          cursor: pointer;
          z-index: 2;
        }

        .drawing-history-card-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 12px;
          background: rgba(15, 23, 42, 0.52);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease;
        }

        .drawing-history-drawer-card:hover .drawing-history-card-overlay,
        .drawing-history-drawer-card:focus-within .drawing-history-card-overlay {
          opacity: 1;
          pointer-events: auto;
        }

        .drawing-history-card-overlay button {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 0;
          border-radius: 10px;
          padding: 8px 9px;
          background: rgba(255, 255, 255, 0.92);
          color: #0f172a;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .drawing-history-card-info {
          padding: 9px 10px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .drawing-history-card-info span,
        .drawing-history-card-info small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .drawing-history-card-info span {
          color: #0f172a;
          font-size: 13px;
          font-weight: 800;
        }

        .drawing-history-card-info small {
          color: #64748b;
          font-size: 11px;
          font-weight: 650;
        }

        .drawing-history-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid rgba(226, 232, 240, 0.92);
        }

        .drawing-history-pagination button {
          min-width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(226, 232, 240, 0.96);
          border-radius: 10px;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
        }

        .drawing-history-pagination button.is-active {
          border-color: #111827;
          background: #111827;
          color: #ffffff;
        }

        .drawing-history-pagination button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .drawing-history-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 8px;
          margin-bottom: 12px;
        }

        .drawing-history-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }

        .drawing-history-pill {
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.9);
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          width: 100%;
          font: inherit;
          color: inherit;
          outline: none;
        }

        .drawing-history-pill:hover,
        .drawing-history-pill.is-active {
          border-color: rgba(245, 158, 11, 0.42);
          box-shadow: none;
          transform: none;
        }

        .drawing-history-pill-image {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          object-fit: cover;
          background: rgba(248, 250, 252, 0.9);
          flex: 0 0 auto;
        }

        .drawing-history-pill-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .drawing-history-pill-text span:first-child {
          font-size: 13px;
          font-weight: 600;
          color: var(--semi-color-text-0);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .drawing-history-pill-text span:last-child {
          font-size: 12px;
          color: var(--semi-color-text-2);
        }

        .drawing-history-pill-fallback {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(248, 250, 252, 0.9);
          color: var(--semi-color-text-2);
          flex: 0 0 auto;
        }

        .drawing-history-pill-meta {
          color: #b45309 !important;
        }

        .drawing-inline-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          align-items: stretch;
        }

        .drawing-history-list {
          display: none;
        }

        .drawing-history-card {
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 18px;
          padding: 16px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.88) 0%, #ffffff 100%);
        }

        .drawing-image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .drawing-image-shell {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: #ffffff;
          padding: 10px;
        }

        .drawing-image-preview {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 12px;
          display: block;
          background: rgba(148, 163, 184, 0.12);
        }

        .drawing-image-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 1100px) {
          .drawing-stage-grid {
            grid-template-columns: 1fr;
          }

          .drawing-preview-stat-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .drawing-page-shell {
            padding: 0 12px 32px;
            min-height: calc(100dvh - var(--header-height, 60px));
            border-left: 0;
            box-shadow: none;
          }

          .drawing-page-header {
            margin: 0 -12px 16px;
            padding: 14px 12px 12px;
            align-items: flex-start;
          }

          .drawing-page-hero-copy-title {
            font-size: 16px;
          }

          .drawing-page-hero-copy-summary {
            padding: 12px 14px;
            border-radius: 16px;
          }

          .drawing-setup-shell {
            padding: 0;
          }

          .drawing-token-panel,
          .drawing-control-card {
            padding: 14px;
          }

          .drawing-inline-grid {
            grid-template-columns: 1fr;
          }

          .drawing-stage-grid {
            grid-template-columns: 1fr;
          }

          .drawing-preview-stat-row {
            grid-template-columns: 1fr;
          }

          .drawing-preview-stage {
            min-height: 420px;
          }

          .drawing-single-preview-actions {
            top: 22px;
            right: 22px;
          }

          .drawing-history-fab {
            right: 14px;
            bottom: 14px;
            height: 44px;
            border-radius: 14px;
            padding: 0 13px;
          }

          .drawing-history-drawer {
            width: 100%;
            padding: 14px;
          }

          .drawing-history-drawer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .drawing-history-card-overlay {
            gap: 5px;
          }

          .drawing-history-card-overlay button {
            padding: 7px 7px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
