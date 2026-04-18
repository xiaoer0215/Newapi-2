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
  Download,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
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

const getDrawingTokenName = (tokenName) =>
  String(tokenName || '').trim() || SYSTEM_DRAWING_TOKEN_NAME;

const getDrawingHistoryKey = (tokenName) =>
  `drawing-history:${getDrawingTokenName(tokenName)}`;

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
  return DRAWING_REQUEST_MODE_IMAGE_GENERATION;
};

const aspectRatioToImageGenerationSize = (aspectRatio) => {
  switch (String(aspectRatio || '1:1')) {
    case '3:2':
      return '1536x1024';
    case '2:3':
      return '1024x1536';
    case '4:3':
      return '1536x1152';
    case '3:4':
      return '1152x1536';
    case '16:9':
      return '1792x1024';
    case '9:16':
      return '1024x1792';
    default:
      return '1024x1024';
  }
};

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
      resolve(records.slice(0, DRAWING_HISTORY_LIMIT));
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

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAWING_HISTORY_STORE, 'readwrite');
    transaction.objectStore(DRAWING_HISTORY_STORE).put(
      {
        records: records.slice(0, DRAWING_HISTORY_LIMIT),
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
  if (loweredMessage.includes('no space left on device')) {
    return t('当前生图服务磁盘空间不足，请联系管理员处理');
  }
  if (loweredMessage.includes('status_code=503')) {
    return t('当前生图服务暂时不可用，请稍后再试');
  }

  return rawMessage.replace(/^error:\s*/i, '').trim();
};

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
  });
  const [form, setForm] = useState(DEFAULT_FORM);
  const [referenceImages, setReferenceImages] = useState([]);
  const [resultHistory, setResultHistory] = useState([]);
  const [activeRecordId, setActiveRecordId] = useState('');
  const [historyReady, setHistoryReady] = useState(false);
  const [latestError, setLatestError] = useState('');
  const [generationStartedAt, setGenerationStartedAt] = useState(0);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);

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

  const handleGenerate = async () => {
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

    if (
      referenceImages.length > 0 &&
      requestMode !== DRAWING_REQUEST_MODE_GEMINI_NATIVE
    ) {
      showError(t('当前模型暂不支持参考图片，请切换到 Gemini 生图模型'));
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
        sizeLabel = `${form.aspectRatio} · ${form.imageSize}`;
      } else {
        const imageGenerationSize = aspectRatioToImageGenerationSize(
          form.aspectRatio,
        );
        payload = {
          ...extraBody,
          model: form.model,
          prompt: finalPrompt,
          n: generationCount,
          size: imageGenerationSize,
        };
        if (
          (form.imageSize === '2K' || form.imageSize === '4K') &&
          payload.quality === undefined
        ) {
          payload.quality = 'high';
        }
        sizeLabel = imageGenerationSize;
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          Authorization: config.authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

      const nextRecord = {
        id: `${Date.now()}`,
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
                        {currentRequestMode === DRAWING_REQUEST_MODE_GEMINI_NATIVE
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
                        currentRequestMode !== DRAWING_REQUEST_MODE_GEMINI_NATIVE
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

                    <div className='drawing-upload-foot'>
                      <Text type='tertiary'>
                        {`${referenceImages.length} / ${MAX_REFERENCE_IMAGES} ${t('张图片')}`}
                      </Text>
                      {referenceImages.length > 0 ? (
                        <Button
                          theme='borderless'
                          type='danger'
                          size='small'
                          icon={<Trash2 size={13} />}
                          onClick={() => setReferenceImages([])}
                        >
                          {t('清空')}
                        </Button>
                      ) : null}
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
                {t('保留最近 12 条浏览器历史记录，刷新页面后仍可继续查看。')}
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

          {submitting && resultHistory.length === 0 ? (
            <div
              style={{
                minHeight: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Spin size='large' />
            </div>
          ) : resultHistory.length === 0 ? (
            <Empty
              description={t('生成成功后，图片会显示在这里。')}
              image={<ImageIcon size={48} color='var(--semi-color-text-2)' />}
              style={{ padding: '36px 0' }}
            />
          ) : (
            <>
              <div className='drawing-history-head'>
                <div>
                  <Text strong>{t('历史记录')}</Text>
                  <Text type='tertiary' className='drawing-preview-subtitle'>
                    {t('点击下方缩略记录可快速切换右侧主预览')}
                  </Text>
                </div>
                <Tag color='blue'>{`${resultHistory.length} ${t('条记录')}`}</Tag>
              </div>

              <div className='drawing-history-strip'>
                {resultHistory.map((record) => (
                  <button
                    key={`preview-${record.id}`}
                    type='button'
                    className={`drawing-history-pill ${
                      record.id === activeRecord?.id ? 'is-active' : ''
                    }`}
                    onClick={() => setActiveRecordId(record.id)}
                  >
                    {record.images[0]?.src ? (
                      <img
                        src={record.images[0].src}
                        alt={record.model}
                        className='drawing-history-pill-image'
                      />
                    ) : (
                      <div className='drawing-history-pill-fallback'>
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <div className='drawing-history-pill-text'>
                      <span>{record.model}</span>
                      <span>{`${formatTime(record.createdAt)} · ${record.sizeLabel}`}</span>
                      <span className='drawing-history-pill-meta'>
                        {`${record.count}${t('张')} · ${
                          record.id === activeRecord?.id
                            ? t('当前查看')
                            : t('点击查看')
                        }`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className='drawing-history-list'>
              {resultHistory.map((record) => (
                <div key={record.id} className='drawing-history-card'>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Text strong>{record.model}</Text>
                      <Text
                        type='tertiary'
                        style={{ display: 'block', marginTop: 4, fontSize: 12 }}
                      >
                        {`${formatTime(record.createdAt)} · ${record.sizeLabel} · ${record.count}${t('张')}`}
                      </Text>
                    </div>
                    <Tag color='green'>{t('已完成')}</Tag>
                  </div>

                  <Paragraph
                    ellipsis={{ rows: 3, expandable: true }}
                    style={{ marginBottom: 14 }}
                  >
                    {record.prompt}
                  </Paragraph>

                  {record.responseText ? (
                    <Text
                      type='tertiary'
                      style={{
                        display: 'block',
                        marginBottom: 14,
                        fontSize: 12,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {record.responseText}
                    </Text>
                  ) : null}

                  <div className='drawing-image-grid'>
                    {record.images.map((image, index) => (
                      <div key={image.id} className='drawing-image-shell'>
                        <img
                          src={image.src}
                          alt={`drawing-${index + 1}`}
                          className='drawing-image-preview'
                        />

                        <div className='drawing-image-actions'>
                          <Button
                            size='small'
                            theme='light'
                            icon={<Download size={13} />}
                            onClick={() =>
                              downloadImage(
                                image.src,
                                `drawing-${record.id}-${index + 1}.png`,
                              )
                            }
                          >
                            {t('下载')}
                          </Button>
                          {image.link ? (
                            <Button
                              size='small'
                              theme='light'
                              icon={<ExternalLink size={13} />}
                              onClick={() => window.open(image.link, '_blank')}
                            >
                              {t('打开原图')}
                            </Button>
                          ) : null}
                        </div>

                        {image.revisedPrompt ? (
                          <Text
                            type='tertiary'
                            style={{
                              display: 'block',
                              marginTop: 10,
                              fontSize: 12,
                              lineHeight: 1.6,
                            }}
                          >
                            {`${t('修订提示词')}：${image.revisedPrompt}`}
                          </Text>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <style>{`
        .drawing-page-shell {
          padding: 24px 20px 48px;
          margin: 20px auto 0;
          min-height: calc(100dvh - 20px);
          max-width: 1440px;
          box-sizing: border-box;
        }

        .drawing-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .drawing-page-header > div {
          flex: 1;
          min-width: 0;
        }

        .drawing-page-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
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
          font-size: 18px;
          line-height: 1.45;
          font-weight: 700;
          color: #334155;
        }

        .drawing-page-hero-copy-summary {
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(251, 191, 36, 0.24);
          background: linear-gradient(135deg, rgba(255, 247, 237, 0.98), rgba(255, 255, 255, 0.96));
          color: #9a3412;
          line-height: 1.75;
          box-shadow: 0 14px 30px rgba(245, 158, 11, 0.08);
          white-space: normal;
          word-break: break-word;
        }

        .drawing-page-summary,
        .drawing-page-hero-title {
          display: none;
        }

        .drawing-stage-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.96fr) minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        .drawing-panel-card {
          border: 0 !important;
          border-radius: 26px !important;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
          background:
            radial-gradient(circle at top right, rgba(250, 204, 21, 0.12), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94));
        }

        .drawing-form-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
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
          padding: 16px 18px;
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.96);
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
          padding: 16px 18px;
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.96);
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
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.14) !important;
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
          box-shadow: 0 14px 30px rgba(245, 158, 11, 0.24);
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
          box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.08);
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
          min-height: 520px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 250, 249, 0.98));
          margin-bottom: 18px;
        }

        .drawing-preview-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at top right, rgba(250, 204, 21, 0.26), transparent 24%),
            radial-gradient(circle at 72% 18%, rgba(59, 130, 246, 0.08), transparent 16%);
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
          box-shadow: 0 10px 24px rgba(245, 158, 11, 0.08);
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
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.86),
            0 14px 30px rgba(99, 102, 241, 0.14);
        }

        .drawing-single-preview {
          position: absolute;
          inset: 0;
          padding: 18px;
        }

        .drawing-single-preview-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.92);
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
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .drawing-preview-grid-item {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          background: rgba(248, 250, 252, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.14);
        }

        .drawing-preview-grid-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
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
          box-shadow: 0 10px 24px rgba(245, 158, 11, 0.12);
          transform: translateY(-1px);
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
        }
      `}</style>
    </div>
  );
}
