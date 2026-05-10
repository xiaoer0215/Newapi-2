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

import i18next from 'i18next';
import { Modal, Tag, Typography, Avatar } from '@douyinfe/semi-ui';
import { copy, showSuccess } from './utils';
import { MOBILE_BREAKPOINT } from '../hooks/common/useIsMobile';
import { visit } from 'unist-util-visit';
import * as LobeIcons from '@lobehub/icons';
import {
  OpenAI,
  Claude,
  Gemini,
  Moonshot,
  Zhipu,
  Qwen,
  DeepSeek,
  Minimax,
  Wenxin,
  Spark,
  Midjourney,
  Hunyuan,
  Cohere,
  Cloudflare,
  Ai360,
  Yi,
  Jina,
  Mistral,
  XAI,
  Ollama,
  Doubao,
  Suno,
  Xinference,
  OpenRouter,
  Dify,
  Coze,
  SiliconCloud,
  FastGPT,
  Kling,
  Jimeng,
  Perplexity,
  Replicate,
} from '@lobehub/icons';

import {
  LayoutDashboard,
  Zap,
  MessageSquare,
  KeyRound,
  BarChart3,
  Image as ImageIcon,
  FileText,
  CheckSquare,
  CreditCard,
  Layers,
  Gift,
  UserRound,
  UsersRound,
  Settings,
  CircleUser,
  Package,
  Server,
  CalendarClock,
  ShoppingCart,
  Star,
  Activity,
  DollarSign,
  Share2,
} from 'lucide-react';
import {
  SiAtlassian,
  SiAuth0,
  SiAuthentik,
  SiBitbucket,
  SiDiscord,
  SiDropbox,
  SiFacebook,
  SiGitea,
  SiGithub,
  SiGitlab,
  SiGoogle,
  SiKeycloak,
  SiNextcloud,
  SiNotion,
  SiOkta,
  SiOpenid,
  SiReddit,
  SiSlack,
  SiTelegram,
  SiTwitch,
  SiWechat,
  SiX,
} from 'react-icons/si';

// 鑾峰彇渚ц竟鏍廘ucide鍥炬爣缁勪欢
export function getLucideIcon(key, selected = false) {
  const size = 18;
  const strokeWidth = 2;
  const iconColor = 'currentColor';
  const commonProps = {
    size,
    strokeWidth,
    className: 'transition-colors duration-150',
  };

  switch (key) {
    case 'detail':
      return <LayoutDashboard {...commonProps} color={iconColor} />;
    case 'playground':
      return <Zap {...commonProps} color={iconColor} />;
    case 'chat':
      return <MessageSquare {...commonProps} color={iconColor} />;
    case 'token':
      return <KeyRound {...commonProps} color={iconColor} />;
    case 'log':
      return <BarChart3 {...commonProps} color={iconColor} />;
    case 'drawing':
    case 'midjourney':
      return <ImageIcon {...commonProps} color={iconColor} />;
    case 'task':
      return <CheckSquare {...commonProps} color={iconColor} />;
    case 'topup':
      return <CreditCard {...commonProps} color={iconColor} />;
    case 'member_upgrade':
      return <Star {...commonProps} color={iconColor} />;
    case 'affiliate':
      return <Share2 {...commonProps} color={iconColor} />;
    case 'channel':
      return <Layers {...commonProps} color={iconColor} />;
    case 'redemption':
      return <Gift {...commonProps} color={iconColor} />;
    case 'personal':
      return <UserRound {...commonProps} color={iconColor} />;
    case 'user':
      return <UsersRound {...commonProps} color={iconColor} />;
    case 'models':
      return <Package {...commonProps} color={iconColor} />;
    case 'deployment':
      return <Server {...commonProps} color={iconColor} />;
    case 'subscription':
      return <CalendarClock {...commonProps} color={iconColor} />;
    case 'auto_delivery':
      return <ShoppingCart {...commonProps} color={iconColor} />;
    case 'group_monitor':
      return <Activity {...commonProps} color={iconColor} />;
    case 'pricing':
      return <DollarSign {...commonProps} color={iconColor} />;
    case 'about':
      return <FileText {...commonProps} color={iconColor} />;
    case 'setting':
      return <Settings {...commonProps} color={iconColor} />;
    default:
      return <CircleUser {...commonProps} color={iconColor} />;
  }
}

// 鑾峰彇妯″瀷鍒嗙被
export const getModelCategories = (() => {
  let categoriesCache = null;
  let lastLocale = null;

  return (t) => {
    const currentLocale = i18next.language;
    if (categoriesCache && lastLocale === currentLocale) {
      return categoriesCache;
    }

    categoriesCache = {
      all: {
        label: t('全部模型'),
        icon: null,
        filter: () => true,
      },
      openai: {
        label: 'OpenAI',
        icon: <OpenAI />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('gpt') ||
          model.model_name.toLowerCase().includes('dall-e') ||
          model.model_name.toLowerCase().includes('whisper') ||
          model.model_name.toLowerCase().includes('tts-1') ||
          model.model_name.toLowerCase().includes('text-embedding-3') ||
          model.model_name.toLowerCase().includes('text-moderation') ||
          model.model_name.toLowerCase().includes('babbage') ||
          model.model_name.toLowerCase().includes('davinci') ||
          model.model_name.toLowerCase().includes('curie') ||
          model.model_name.toLowerCase().includes('ada') ||
          model.model_name.toLowerCase().includes('o1') ||
          model.model_name.toLowerCase().includes('o3') ||
          model.model_name.toLowerCase().includes('o4'),
      },
      anthropic: {
        label: 'Anthropic',
        icon: <Claude.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('claude'),
      },
      gemini: {
        label: 'Gemini',
        icon: <Gemini.Color />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('gemini') ||
          model.model_name.toLowerCase().includes('gemma') ||
          model.model_name.toLowerCase().includes('learnlm') ||
          model.model_name.toLowerCase().startsWith('embedding-') ||
          model.model_name.toLowerCase().includes('text-embedding-004') ||
          model.model_name.toLowerCase().includes('imagen-4') ||
          model.model_name.toLowerCase().includes('veo-') ||
          model.model_name.toLowerCase().includes('aqa'),
      },
      moonshot: {
        label: 'Moonshot',
        icon: <Moonshot />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('moonshot') ||
          model.model_name.toLowerCase().includes('kimi'),
      },
      zhipu: {
        label: t('智谱'),
        icon: <Zhipu.Color />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('chatglm') ||
          model.model_name.toLowerCase().includes('glm-') ||
          model.model_name.toLowerCase().includes('cogview') ||
          model.model_name.toLowerCase().includes('cogvideo'),
      },
      qwen: {
        label: t('通义千问'),
        icon: <Qwen.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('qwen'),
      },
      deepseek: {
        label: 'DeepSeek',
        icon: <DeepSeek.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('deepseek'),
      },
      minimax: {
        label: 'MiniMax',
        icon: <Minimax.Color />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('abab') ||
          model.model_name.toLowerCase().includes('minimax'),
      },
      baidu: {
        label: t('鏂囧績涓€瑷€'),
        icon: <Wenxin.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('ernie'),
      },
      xunfei: {
        label: t('璁鏄熺伀'),
        icon: <Spark.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('spark'),
      },
      midjourney: {
        label: 'Midjourney',
        icon: <Midjourney />,
        filter: (model) => model.model_name.toLowerCase().includes('mj_'),
      },
      tencent: {
        label: t('鑵捐娣峰厓'),
        icon: <Hunyuan.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('hunyuan'),
      },
      cohere: {
        label: 'Cohere',
        icon: <Cohere.Color />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('command') ||
          model.model_name.toLowerCase().includes('c4ai-') ||
          model.model_name.toLowerCase().includes('embed-'),
      },
      cloudflare: {
        label: 'Cloudflare',
        icon: <Cloudflare.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('@cf/'),
      },
      ai360: {
        label: t('360智脑'),
        icon: <Ai360.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('360'),
      },
      jina: {
        label: 'Jina',
        icon: <Jina />,
        filter: (model) => model.model_name.toLowerCase().includes('jina'),
      },
      mistral: {
        label: 'Mistral AI',
        icon: <Mistral.Color />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('mistral') ||
          model.model_name.toLowerCase().includes('codestral') ||
          model.model_name.toLowerCase().includes('pixtral') ||
          model.model_name.toLowerCase().includes('voxtral') ||
          model.model_name.toLowerCase().includes('magistral'),
      },
      xai: {
        label: 'xAI',
        icon: <XAI />,
        filter: (model) => model.model_name.toLowerCase().includes('grok'),
      },
      llama: {
        label: 'Llama',
        icon: <Ollama />,
        filter: (model) => model.model_name.toLowerCase().includes('llama'),
      },
      doubao: {
        label: t('豆包'),
        icon: <Doubao.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('doubao'),
      },
      yi: {
        label: t('零一万物'),
        icon: <Yi.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('yi'),
      },
    };

    lastLocale = currentLocale;
    return categoriesCache;
  };
})();

/**
 * 鏍规嵁娓犻亾绫诲瀷杩斿洖瀵瑰簲鐨勫巶鍟嗗浘鏍?
 * @param {number} channelType - 娓犻亾绫诲瀷鍊?
 * @returns {JSX.Element|null} - 瀵瑰簲鐨勫巶鍟嗗浘鏍囩粍浠?
 */
export function getChannelIcon(channelType) {
  const iconSize = 14;

  switch (channelType) {
    case 1: // OpenAI
    case 3: // Azure OpenAI
    case 57: // Codex
      return <OpenAI size={iconSize} />;
    case 2: // Midjourney Proxy
    case 5: // Midjourney Proxy Plus
      return <Midjourney size={iconSize} />;
    case 36: // Suno API
      return <Suno size={iconSize} />;
    case 4: // Ollama
      return <Ollama size={iconSize} />;
    case 14: // Anthropic Claude
    case 33: // AWS Claude
      return <Claude.Color size={iconSize} />;
    case 41: // Vertex AI
      return <Gemini.Color size={iconSize} />;
    case 34: // Cohere
      return <Cohere.Color size={iconSize} />;
    case 39: // Cloudflare
      return <Cloudflare.Color size={iconSize} />;
    case 43: // DeepSeek
      return <DeepSeek.Color size={iconSize} />;
    case 15: // 鐧惧害鏂囧績鍗冨竼
    case 46: // 鐧惧害鏂囧績鍗冨竼V2
      return <Wenxin.Color size={iconSize} />;
    case 17: // 闃块噷閫氫箟鍗冮棶
      return <Qwen.Color size={iconSize} />;
    case 18: // 璁鏄熺伀璁ょ煡
      return <Spark.Color size={iconSize} />;
    case 16: // 鏅鸿氨 ChatGLM
    case 26: // 鏅鸿氨 GLM-4V
      return <Zhipu.Color size={iconSize} />;
    case 24: // Google Gemini
    case 11: // Google PaLM2
      return <Gemini.Color size={iconSize} />;
    case 47: // Xinference
      return <Xinference.Color size={iconSize} />;
    case 25: // Moonshot
      return <Moonshot size={iconSize} />;
    case 27: // Perplexity
      return <Perplexity.Color size={iconSize} />;
    case 20: // OpenRouter
      return <OpenRouter size={iconSize} />;
    case 19: // 360 鏅鸿剳
      return <Ai360.Color size={iconSize} />;
    case 23: // 鑵捐娣峰厓
      return <Hunyuan.Color size={iconSize} />;
    case 31: // 闆朵竴涓囩墿
      return <Yi.Color size={iconSize} />;
    case 35: // MiniMax
      return <Minimax.Color size={iconSize} />;
    case 37: // Dify
      return <Dify.Color size={iconSize} />;
    case 38: // Jina
      return <Jina size={iconSize} />;
    case 40: // SiliconCloud
      return <SiliconCloud.Color size={iconSize} />;
    case 42: // Mistral AI
      return <Mistral.Color size={iconSize} />;
    case 45: // 瀛楄妭鐏北鏂硅垷銆佽眴鍖呴€氱敤
      return <Doubao.Color size={iconSize} />;
    case 48: // xAI
      return <XAI size={iconSize} />;
    case 49: // Coze
      return <Coze size={iconSize} />;
    case 50: // 鍙伒 Kling
      return <Kling.Color size={iconSize} />;
    case 51: // 鍗虫ⅵ Jimeng
      return <Jimeng.Color size={iconSize} />;
    case 54: // 璞嗗寘瑙嗛 Doubao Video
      return <Doubao.Color size={iconSize} />;
    case 56: // Replicate
      return <Replicate size={iconSize} />;
    case 8: // 鑷畾涔夋笭閬?
    case 22: // 鐭ヨ瘑搴擄細FastGPT
      return <FastGPT.Color size={iconSize} />;
    case 21: // 鐭ヨ瘑搴擄細AI Proxy
    case 44: // 宓屽叆妯″瀷锛歁okaAI M3E
    default:
      return null; // 鏈煡绫诲瀷鎴栬嚜瀹氫箟娓犻亾涓嶆樉绀哄浘鏍?
  }
}

/**
 * 鏍规嵁鍥炬爣鍚嶇О鍔ㄦ€佽幏鍙?LobeHub 鍥炬爣缁勪欢
 * 鏀寔锛?
 * - 鍩虹锛?OpenAI"銆?OpenAI.Color" 绛?
 * - 棰濆灞炴€э紙鐐瑰彿閾惧紡锛夛細"OpenAI.Avatar.type={'platform'}"銆?OpenRouter.Avatar.shape={'square'}"
 * - 缁х画鍏煎绗簩鍙傛暟 size锛涜嫢瀛楃涓查噷鏈?size=锛屼互瀛楃涓蹭负鍑?
 * @param {string} iconName - 鍥炬爣鍚嶇О/鎻忚堪
 * @param {number} size - 鍥炬爣澶у皬锛岄粯璁や负 14
 * @returns {JSX.Element} - 瀵瑰簲鐨勫浘鏍囩粍浠舵垨 Avatar
 */
export function getLobeHubIcon(iconName, size = 14) {
  if (typeof iconName === 'string') iconName = iconName.trim();
  // 濡傛灉娌℃湁鍥炬爣鍚嶇О锛岃繑鍥?Avatar
  if (!iconName) {
    return <Avatar size='extra-extra-small'>?</Avatar>;
  }

  // 瑙ｆ瀽缁勪欢璺緞涓庣偣鍙烽摼寮忓睘鎬?
  const segments = String(iconName).split('.');
  const baseKey = segments[0];
  const BaseIcon = LobeIcons[baseKey];

  let IconComponent = undefined;
  let propStartIndex = 1;

  if (BaseIcon && segments.length > 1 && BaseIcon[segments[1]]) {
    IconComponent = BaseIcon[segments[1]];
    propStartIndex = 2;
  } else {
    IconComponent = LobeIcons[baseKey];
    propStartIndex = 1;
  }

  // 澶辫触鍏滃簳
  if (
    !IconComponent ||
    (typeof IconComponent !== 'function' && typeof IconComponent !== 'object')
  ) {
    const firstLetter = String(iconName).charAt(0).toUpperCase();
    return <Avatar size='extra-extra-small'>{firstLetter}</Avatar>;
  }

  // 瑙ｆ瀽鐐瑰彿閾惧紡灞炴€э紝褰㈠锛歬ey={...}銆乲ey='...'銆乲ey="..."銆乲ey=123銆乲ey銆乲ey=true/false
  const props = {};

  const parseValue = (raw) => {
    if (raw == null) return true;
    let v = String(raw).trim();
    // 鍘婚櫎涓€灞傝姳鎷彿鍖呰９
    if (v.startsWith('{') && v.endsWith('}')) {
      v = v.slice(1, -1).trim();
    }
    // 鍘婚櫎寮曞彿
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return v.slice(1, -1);
    }
    // 甯冨皵
    if (v === 'true') return true;
    if (v === 'false') return false;
    // 鏁板瓧
    if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
    // 鍏朵粬鍘熸牱杩斿洖瀛楃涓?
    return v;
  };

  for (let i = propStartIndex; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg) continue;
    const eqIdx = seg.indexOf('=');
    if (eqIdx === -1) {
      props[seg.trim()] = true;
      continue;
    }
    const key = seg.slice(0, eqIdx).trim();
    const valRaw = seg.slice(eqIdx + 1).trim();
    props[key] = parseValue(valRaw);
  }

  // 鍏煎绗簩鍙傛暟 size锛岃嫢瀛楃涓蹭腑鏈樉寮忔寚瀹?size锛屽垯浣跨敤鍑芥暟鍏ュ弬
  if (props.size == null && size != null) props.size = size;

  return <IconComponent {...props} />;
}

const oauthProviderIconMap = {
  github: SiGithub,
  gitlab: SiGitlab,
  gitea: SiGitea,
  google: SiGoogle,
  discord: SiDiscord,
  facebook: SiFacebook,
  x: SiX,
  twitter: SiX,
  slack: SiSlack,
  telegram: SiTelegram,
  wechat: SiWechat,
  keycloak: SiKeycloak,
  nextcloud: SiNextcloud,
  authentik: SiAuthentik,
  openid: SiOpenid,
  okta: SiOkta,
  auth0: SiAuth0,
  atlassian: SiAtlassian,
  bitbucket: SiBitbucket,
  notion: SiNotion,
  twitch: SiTwitch,
  reddit: SiReddit,
  dropbox: SiDropbox,
};

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value || '');
}

function isSimpleEmoji(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  return trimmed.length > 0 && trimmed.length <= 4 && !isHttpUrl(trimmed);
}

function normalizeOAuthIconKey(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^ri:/, '')
    .replace(/^react-icons:/, '')
    .replace(/^si:/, '');
}

/**
 * Render custom OAuth provider icon with react-icons or URL/emoji fallback.
 * Supported formats:
 * - react-icons simple key: github / gitlab / google / keycloak
 * - prefixed key: ri:github / si:github
 * - full URL image: https://example.com/logo.png
 * - emoji: 馃惐
 */
export function getOAuthProviderIcon(iconName, size = 20) {
  const raw = String(iconName || '').trim();
  const iconSize = Number(size) > 0 ? Number(size) : 20;

  if (!raw) {
    return <Layers size={iconSize} color='var(--semi-color-text-2)' />;
  }

  if (isHttpUrl(raw)) {
    return (
      <img
        src={raw}
        alt='provider icon'
        width={iconSize}
        height={iconSize}
        style={{ borderRadius: 4, objectFit: 'cover' }}
      />
    );
  }

  if (isSimpleEmoji(raw)) {
    return (
      <span
        style={{
          width: iconSize,
          height: iconSize,
          lineHeight: `${iconSize}px`,
          textAlign: 'center',
          display: 'inline-block',
          fontSize: Math.max(Math.floor(iconSize * 0.8), 14),
        }}
      >
        {raw}
      </span>
    );
  }

  const key = normalizeOAuthIconKey(raw);
  const IconComp = oauthProviderIconMap[key];
  if (IconComp) {
    return <IconComp size={iconSize} />;
  }

  return (
    <Avatar size='extra-extra-small'>{raw.charAt(0).toUpperCase()}</Avatar>
  );
}

// 棰滆壊鍒楄〃
const colors = [
  'amber',
  'blue',
  'cyan',
  'green',
  'grey',
  'indigo',
  'light-blue',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'violet',
  'yellow',
];

// 鍩虹10鑹茶壊鏉?(N 鈮?10)
const baseColors = [
  '#1664FF', // 涓昏壊
  '#1AC6FF',
  '#FF8A00',
  '#3CC780',
  '#7442D4',
  '#FFC400',
  '#304D77',
  '#B48DEB',
  '#009488',
  '#FF7DDA',
];

// 鎵╁睍20鑹茶壊鏉?(10 < N 鈮?20)
const extendedColors = [
  '#1664FF',
  '#B2CFFF',
  '#1AC6FF',
  '#94EFFF',
  '#FF8A00',
  '#FFCE7A',
  '#3CC780',
  '#B9EDCD',
  '#7442D4',
  '#DDC5FA',
  '#FFC400',
  '#FAE878',
  '#304D77',
  '#8B959E',
  '#B48DEB',
  '#EFE3FF',
  '#009488',
  '#59BAA8',
  '#FF7DDA',
  '#FFCFEE',
];

// 妯″瀷棰滆壊鏄犲皠
export const modelColorMap = {
  'dall-e': 'rgb(147,112,219)', // 娣辩传鑹?
  // 'dall-e-2': 'rgb(147,112,219)', // 浠嬩簬绱壊鍜岃摑鑹蹭箣闂寸殑鑹茶皟
  'dall-e-3': 'rgb(153,50,204)', // 浠嬩簬绱綏鍏板拰娲嬬孩涔嬮棿鐨勮壊璋?
  'gpt-3.5-turbo': 'rgb(184,227,167)', // 娴呯豢鑹?
  // 'gpt-3.5-turbo-0301': 'rgb(131,220,131)', // 浜豢鑹?
  'gpt-3.5-turbo-0613': 'rgb(60,179,113)', // 娴锋磱缁?
  'gpt-3.5-turbo-1106': 'rgb(32,178,170)', // 娴呮捣娲嬬豢
  'gpt-3.5-turbo-16k': 'rgb(149,252,206)', // 娣℃鑹?
  'gpt-3.5-turbo-16k-0613': 'rgb(119,255,214)', // 娣℃
  'gpt-3.5-turbo-instruct': 'rgb(175,238,238)', // 绮夎摑鑹?
  'gpt-4': 'rgb(135,206,235)', // 澶╄摑鑹?
  // 'gpt-4-0314': 'rgb(70,130,180)', // 閽㈣摑鑹?
  'gpt-4-0613': 'rgb(100,149,237)', // 鐭㈣溅鑿婅摑
  'gpt-4-1106-preview': 'rgb(30,144,255)', // 閬撳钃?
  'gpt-4-0125-preview': 'rgb(2,177,236)', // 娣卞ぉ钃?
  'gpt-4-turbo-preview': 'rgb(2,177,255)', // 娣卞ぉ钃?
  'gpt-4-32k': 'rgb(104,111,238)', // 涓传鑹?
  // 'gpt-4-32k-0314': 'rgb(90,105,205)', // 鏆楃伆钃濊壊
  'gpt-4-32k-0613': 'rgb(61,71,139)', // 鏆楄摑鐏拌壊
  'gpt-4-all': 'rgb(65,105,225)', // 鐨囧钃?
  'gpt-4-gizmo-*': 'rgb(0,0,255)', // 绾摑鑹?
  'gpt-4-vision-preview': 'rgb(25,25,112)', // 鍗堝钃?
  'text-ada-001': 'rgb(255,192,203)', // 绮夌孩鑹?
  'text-babbage-001': 'rgb(255,160,122)', // 娴呯強鐟氳壊
  'text-curie-001': 'rgb(219,112,147)', // 鑻嶇传缃楀叞鑹?
  // 'text-davinci-002': 'rgb(199,21,133)', // 涓传缃楀叞绾㈣壊
  'text-davinci-003': 'rgb(219,112,147)', // 鑻嶇传缃楀叞鑹诧紙涓嶤urie鐩稿悓锛岃〃绀哄悓涓€涓郴鍒楋級
  'text-davinci-edit-001': 'rgb(255,105,180)', // 鐑矇鑹?
  'text-embedding-ada-002': 'rgb(255,182,193)', // 娴呯矇绾?
  'text-embedding-v1': 'rgb(255,174,185)', // 娴呯矇绾㈣壊锛堢暐鏈夊尯鍒級
  'text-moderation-latest': 'rgb(255,130,171)', // 寮虹矇鑹?
  'text-moderation-stable': 'rgb(255,160,122)', // 娴呯強鐟氳壊锛堜笌Babbage鐩稿悓锛岃〃绀哄悓涓€绫诲姛鑳斤級
  'tts-1': 'rgb(255,140,0)', // 娣辨鑹?
  'tts-1-1106': 'rgb(255,165,0)', // 姗欒壊
  'tts-1-hd': 'rgb(255,215,0)', // 閲戣壊
  'tts-1-hd-1106': 'rgb(255,223,0)', // 閲戦粍鑹诧紙鐣ユ湁鍖哄埆锛?
  'whisper-1': 'rgb(245,245,220)', // 绫宠壊
  'claude-3-opus-20240229': 'rgb(255,132,31)', // 姗欑孩鑹?
  'claude-3-sonnet-20240229': 'rgb(253,135,93)', // 姗欒壊
  'claude-3-haiku-20240307': 'rgb(255,175,146)', // 娴呮鑹?
};

export function modelToColor(modelName) {
  // 1. 濡傛灉妯″瀷鍦ㄩ瀹氫箟鐨?modelColorMap 涓紝浣跨敤棰勫畾涔夐鑹?
  if (modelColorMap[modelName]) {
    return modelColorMap[modelName];
  }

  // 2. 鐢熸垚涓€涓ǔ瀹氱殑鏁板瓧浣滀负绱㈠紩
  let hash = 0;
  for (let i = 0; i < modelName.length; i++) {
    hash = (hash << 5) - hash + modelName.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  hash = Math.abs(hash);

  // 3. 鏍规嵁妯″瀷鍚嶇О闀垮害閫夋嫨涓嶅悓鐨勮壊鏉?
  const colorPalette = modelName.length > 10 ? extendedColors : baseColors;

  // 4. 浣跨敤hash鍊奸€夋嫨棰滆壊
  const index = hash % colorPalette.length;
  return colorPalette[index];
}

export function stringToColor(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  let i = sum % colors.length;
  return colors[i];
}

// 娓叉煋甯︽湁妯″瀷鍥炬爣鐨勬爣绛?
export function renderModelTag(modelName, options = {}) {
  const {
    color,
    size = 'default',
    shape = 'square',
    onClick,
    suffixIcon,
    className,
  } = options;

  const categories = getModelCategories(i18next.t);
  const categoryTagColors = {
    openai: 'blue',
    anthropic: 'orange',
    gemini: 'green',
    moonshot: 'indigo',
    zhipu: 'cyan',
    qwen: 'light-blue',
    deepseek: 'teal',
    minimax: 'pink',
    baidu: 'blue',
    xunfei: 'yellow',
    midjourney: 'purple',
    tencent: 'cyan',
    cohere: 'lime',
    cloudflare: 'orange',
    ai360: 'green',
    jina: 'teal',
    mistral: 'violet',
    xai: 'grey',
    llama: 'grey',
    doubao: 'red',
    yi: 'amber',
  };
  let icon = null;
  let categoryKey = '';

  for (const [key, category] of Object.entries(categories)) {
    if (key !== 'all' && category.filter({ model_name: modelName })) {
      icon = category.icon;
      categoryKey = key;
      break;
    }
  }

  return (
    <Tag
      color={color || stringToColor(modelName)}
      prefixIcon={icon}
      suffixIcon={suffixIcon}
      size={size}
      shape={shape}
      className={['model-name-tag', className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {modelName}
    </Tag>
  );
}

export function renderText(text, limit) {
  if (text.length > limit) {
    return text.slice(0, limit - 3) + '...';
  }
  return text;
}

/**
 * Render group tags based on the input group string
 * @param {string} group - The input group string
 * @returns {JSX.Element} - The rendered group tags
 */
export function renderGroup(group) {
  if (group === '') {
    return (
      <Tag key='default' color='white' shape='circle'>
        {i18next.t('用户分组')}
      </Tag>
    );
  }

  const tagColors = {
    vip: 'yellow',
    pro: 'yellow',
    svip: 'red',
    premium: 'red',
  };

  const groups = group.split(',').sort();

  return (
    <span key={group}>
      {groups.map((group) => (
        <Tag
          color={tagColors[group] || stringToColor(group)}
          key={group}
          shape='circle'
          onClick={async (event) => {
            event.stopPropagation();
            if (await copy(group)) {
              showSuccess(i18next.t('\u5df2\u590d\u5236\uff1a') + group);
            } else {
              Modal.error({
                title: i18next.t('\u65e0\u6cd5\u590d\u5236\u5230\u526a\u8d34\u677f\uff0c\u8bf7\u624b\u52a8\u590d\u5236'),
                content: group,
              });
            }
          }}
        >
          {group}
        </Tag>
      ))}
    </span>
  );
}

export function renderRatio(ratio) {
  let color = 'green';
  if (ratio > 5) {
    color = 'red';
  } else if (ratio > 3) {
    color = 'orange';
  } else if (ratio > 1) {
    color = 'blue';
  }
  return (
    <Tag color={color}>
      {ratio}x {i18next.t('倍率')}
    </Tag>
  );
}

const measureTextWidth = (
  text,
  style = {
    fontSize: '14px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  containerWidth,
) => {
  const span = document.createElement('span');

  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'nowrap';
  span.style.fontSize = style.fontSize;
  span.style.fontFamily = style.fontFamily;

  span.textContent = text;

  document.body.appendChild(span);
  const width = span.offsetWidth;

  document.body.removeChild(span);

  return width;
};

export function truncateText(text, maxWidth = 200) {
  const isMobileScreen = window.matchMedia(
    `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
  ).matches;
  if (!isMobileScreen) {
    return text;
  }
  if (!text) return text;

  try {
    // Handle percentage-based maxWidth
    let actualMaxWidth = maxWidth;
    if (typeof maxWidth === 'string' && maxWidth.endsWith('%')) {
      const percentage = parseFloat(maxWidth) / 100;
      // Use window width as fallback container width
      actualMaxWidth = window.innerWidth * percentage;
    }

    const width = measureTextWidth(text);
    if (width <= actualMaxWidth) return text;

    let left = 0;
    let right = text.length;
    let result = text;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const truncated = text.slice(0, mid) + '...';
      const currentWidth = measureTextWidth(truncated);

      if (currentWidth <= actualMaxWidth) {
        result = truncated;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  } catch (error) {
    console.warn(
      'Text measurement failed, falling back to character count',
      error,
    );
    if (text.length > 20) {
      return text.slice(0, 17) + '...';
    }
    return text;
  }
}

export const renderGroupOption = (item) => {
  const {
    disabled,
    selected,
    label,
    value,
    focused,
    className,
    style,
    onMouseEnter,
    onClick,
    empty,
    emptyContent,
    ...rest
  } = item;

  const baseStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: focused ? 'var(--semi-color-fill-0)' : 'transparent',
    opacity: disabled ? 0.5 : 1,
    ...(selected && {
      backgroundColor: 'var(--semi-color-primary-light-default)',
    }),
    '&:hover': {
      backgroundColor: !disabled && 'var(--semi-color-fill-1)',
    },
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleMouseEnter = (e) => {
    if (!disabled && onMouseEnter) {
      onMouseEnter(e);
    }
  };

  return (
    <div
      style={baseStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography.Text strong type={disabled ? 'tertiary' : undefined}>
          {value}
        </Typography.Text>
        <Typography.Text type='secondary' size='small'>
          {label}
        </Typography.Text>
      </div>
      {item.ratio && renderRatio(item.ratio)}
    </div>
  );
};

export function renderNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 10000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num;
  }
}

export function renderQuotaNumberWithDigit(num, digits = 2) {
  if (typeof num !== 'number' || isNaN(num)) {
    return 0;
  }
  const quotaDisplayType = localStorage.getItem('quota_display_type') || 'USD';
  num = num.toFixed(digits);
  if (quotaDisplayType === 'CNY') {
    return '楼' + num;
  } else if (quotaDisplayType === 'USD') {
    return '$' + num;
  } else if (quotaDisplayType === 'CUSTOM') {
    const statusStr = localStorage.getItem('status');
    let symbol = '陇';
    try {
      if (statusStr) {
        const s = JSON.parse(statusStr);
        symbol = s?.custom_currency_symbol || symbol;
      }
    } catch (e) {}
    return symbol + num;
  } else {
    return num;
  }
}

export function renderNumberWithPoint(num) {
  if (num === undefined) return '';
  num = num.toFixed(2);
  if (num >= 100000) {
    // Convert number to string to manipulate it
    let numStr = num.toString();
    // Find the position of the decimal point
    let decimalPointIndex = numStr.indexOf('.');

    let wholePart = numStr;
    let decimalPart = '';

    // If there is a decimal point, split the number into whole and decimal parts
    if (decimalPointIndex !== -1) {
      wholePart = numStr.slice(0, decimalPointIndex);
      decimalPart = numStr.slice(decimalPointIndex);
    }

    // Take the first two and last two digits of the whole number part
    let shortenedWholePart = wholePart.slice(0, 2) + '..' + wholePart.slice(-2);

    // Return the formatted number
    return shortenedWholePart + decimalPart;
  }

  // If the number is less than 100,000, return it unmodified
  return num;
}

export function getQuotaPerUnit() {
  let quotaPerUnit = localStorage.getItem('quota_per_unit');
  quotaPerUnit = parseFloat(quotaPerUnit);
  return quotaPerUnit;
}

export function renderUnitWithQuota(quota) {
  let quotaPerUnit = localStorage.getItem('quota_per_unit');
  quotaPerUnit = parseFloat(quotaPerUnit);
  quota = parseFloat(quota);
  return quotaPerUnit * quota;
}

export function getQuotaWithUnit(quota, digits = 6) {
  let quotaPerUnit = localStorage.getItem('quota_per_unit');
  quotaPerUnit = parseFloat(quotaPerUnit);
  return (quota / quotaPerUnit).toFixed(digits);
}

export function renderQuotaWithAmount(amount) {
  const quotaDisplayType = localStorage.getItem('quota_display_type') || 'USD';
  if (quotaDisplayType === 'TOKENS') {
    return renderNumber(renderUnitWithQuota(amount));
  }

  const numericAmount = Number(amount);
  const formattedAmount = Number.isFinite(numericAmount)
    ? numericAmount.toFixed(2)
    : amount;

  if (quotaDisplayType === 'CNY') {
    return '楼' + formattedAmount;
  } else if (quotaDisplayType === 'CUSTOM') {
    const statusStr = localStorage.getItem('status');
    let symbol = '陇';
    try {
      if (statusStr) {
        const s = JSON.parse(statusStr);
        symbol = s?.custom_currency_symbol || symbol;
      }
    } catch (e) {}
    return symbol + formattedAmount;
  }
  return '$' + formattedAmount;
}

/**
 * 获取当前货币配置信息
 * @returns {Object} - { symbol, rate, type }
 */
export function getCurrencyConfig() {
  const quotaDisplayType = localStorage.getItem('quota_display_type') || 'USD';
  const statusStr = localStorage.getItem('status');

  let symbol = '$';
  let rate = 1;

  if (quotaDisplayType === 'CNY') {
    symbol = '\u00a5';
    try {
      if (statusStr) {
        const s = JSON.parse(statusStr);
        rate = s?.usd_exchange_rate || 7;
      }
    } catch (e) {}
  } else if (quotaDisplayType === 'CUSTOM') {
    try {
      if (statusStr) {
        const s = JSON.parse(statusStr);
        symbol = s?.custom_currency_symbol || '\u00a4';
        rate = s?.custom_currency_exchange_rate || 1;
      }
    } catch (e) {}
  }

  return { symbol, rate, type: quotaDisplayType };
}

/**
 * 灏嗙編鍏冮噾棰濊浆鎹负褰撳墠閫夋嫨鐨勮揣甯?
 * @param {number} usdAmount - 缇庡厓閲戦
 * @param {number} digits - 灏忔暟浣嶆暟
 * @returns {string} - 鏍煎紡鍖栧悗鐨勮揣甯佸瓧绗︿覆
 */
export function convertUSDToCurrency(usdAmount, digits = 2) {
  const { symbol, rate } = getCurrencyConfig();
  const convertedAmount = usdAmount * rate;
  return symbol + convertedAmount.toFixed(digits);
}

export function renderQuota(quota, digits = 2) {
  let quotaPerUnit = localStorage.getItem('quota_per_unit');
  const quotaDisplayType = localStorage.getItem('quota_display_type') || 'USD';
  quotaPerUnit = parseFloat(quotaPerUnit);
  if (quotaDisplayType === 'TOKENS') {
    return renderNumber(quota);
  }
  const resultUSD = quota / quotaPerUnit;
  let symbol = '$';
  let value = resultUSD;
  if (quotaDisplayType === 'CNY') {
    const statusStr = localStorage.getItem('status');
    let usdRate = 1;
    try {
      if (statusStr) {
        const s = JSON.parse(statusStr);
        usdRate = s?.usd_exchange_rate || 1;
      }
    } catch (e) {}
    value = resultUSD * usdRate;
    symbol = '楼';
  } else if (quotaDisplayType === 'CUSTOM') {
    const statusStr = localStorage.getItem('status');
    let symbolCustom = '陇';
    let rate = 1;
    try {
      if (statusStr) {
        const s = JSON.parse(statusStr);
        symbolCustom = s?.custom_currency_symbol || symbolCustom;
        rate = s?.custom_currency_exchange_rate || rate;
      }
    } catch (e) {}
    value = resultUSD * rate;
    symbol = symbolCustom;
  }
  const fixedResult = value.toFixed(digits);
  if (parseFloat(fixedResult) === 0 && quota > 0 && value > 0) {
    const minValue = Math.pow(10, -digits);
    return symbol + minValue.toFixed(digits);
  }
  return symbol + fixedResult;
}

function isValidGroupRatio(ratio) {
  return Number.isFinite(ratio) && ratio !== -1;
}

/**
 * Helper function to get effective ratio and label
 * @param {number} groupRatio - The default group ratio
 * @param {number} user_group_ratio - The user-specific group ratio
 * @returns {Object} - Object containing { ratio, label, useUserGroupRatio }
 */
function getEffectiveRatio(groupRatio, user_group_ratio) {
  const useUserGroupRatio = isValidGroupRatio(user_group_ratio);
  const ratioLabel = useUserGroupRatio
    ? i18next.t('专属倍率')
    : i18next.t('分组倍率');
  const effectiveRatio = useUserGroupRatio ? user_group_ratio : groupRatio;

  return {
    ratio: effectiveRatio,
    label: ratioLabel,
    useUserGroupRatio: useUserGroupRatio,
  };
}

function getQuotaDisplayType() {
  return localStorage.getItem('quota_display_type') || 'USD';
}

function resolveBillingDisplayMode(displayMode, modelPrice = -1) {
  if (modelPrice !== -1) {
    return 'price';
  }
  if (getQuotaDisplayType() === 'TOKENS') {
    return 'ratio';
  }
  return displayMode === 'ratio' ? 'ratio' : 'price';
}

function isPriceDisplayMode(displayMode, modelPrice = -1) {
  return resolveBillingDisplayMode(displayMode, modelPrice) === 'price';
}

function shouldUseRatioBillingProcess(modelPrice = -1) {
  return modelPrice === -1 && getQuotaDisplayType() === 'TOKENS';
}

function formatCompactDisplayPrice(usdAmount, digits = 6) {
  const { symbol, rate } = getCurrencyConfig();
  const amount = Number((usdAmount * rate).toFixed(digits));
  return `${symbol}${amount}`;
}

function appendPricePart(parts, condition, key, vars) {
  if (!condition) {
    return;
  }
  parts.push(i18next.t(key, vars));
}

function joinBillingSummary(parts) {
  return parts.filter(Boolean).join('\uff0c');
}

function getGroupRatioText(groupRatio, user_group_ratio) {
  const { ratio, label } = getEffectiveRatio(groupRatio, user_group_ratio);
  return i18next.t('{{ratioType}} {{ratio}}x', {
    ratioType: label,
    ratio,
  });
}

function formatRatioValue(value, digits = 6) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Number(num.toFixed(digits));
}

function renderDisplayAmountFromUsd(usdAmount, digits = 6) {
  return renderQuotaWithAmount(Number(Number(usdAmount || 0).toFixed(digits)));
}

function formatBillingDisplayPrice(usdAmount, rate, digits = 6) {
  return (usdAmount * rate).toFixed(digits);
}

function buildBillingText(key, vars) {
  return i18next.t(key, vars);
}

function buildBillingPriceText(
  key,
  { symbol, usdAmount, rate, amountKey = 'price', digits = 6, ...vars },
) {
  return buildBillingText(key, {
    symbol,
    [amountKey]: formatBillingDisplayPrice(usdAmount, rate, digits),
    ...vars,
  });
}

function renderBillingArticle(lines, { showReferenceNote = true } = {}) {
  const articleLines = lines.filter(Boolean);

  if (showReferenceNote) {
    articleLines.push(buildBillingText('仅供参考，以实际扣费为准'));
  }

  return (
    <article>
      {articleLines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </article>
  );
}

// Shared core for simple price rendering (used by OpenAI-like and Claude-like variants)
function renderPriceSimpleCore({
  modelRatio,
  modelPrice = -1,
  groupRatio,
  user_group_ratio,
  cacheTokens = 0,
  cacheRatio = 1.0,
  cacheCreationTokens = 0,
  cacheCreationRatio = 1.0,
  cacheCreationTokens5m = 0,
  cacheCreationRatio5m = 1.0,
  cacheCreationTokens1h = 0,
  cacheCreationRatio1h = 1.0,
  image = false,
  imageRatio = 1.0,
  isSystemPromptOverride = false,
  displayMode = 'price',
  outputMode = 'text',
}) {
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    groupRatio,
    user_group_ratio,
  );
  const finalGroupRatio = effectiveGroupRatio;

  const { symbol, rate } = getCurrencyConfig();
  const hasSplitCacheCreation =
    cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;

  const shouldShowLegacyCacheCreation =
    !hasSplitCacheCreation && cacheCreationTokens !== 0;

  const shouldShowCache = cacheTokens !== 0;
  const shouldShowCacheCreation5m =
    hasSplitCacheCreation && cacheCreationTokens5m > 0;
  const shouldShowCacheCreation1h =
    hasSplitCacheCreation && cacheCreationTokens1h > 0;

  if (outputMode === 'segments') {
    const segments = [
      {
        tone: 'primary',
        text: getGroupRatioText(groupRatio, user_group_ratio),
      },
    ];

    if (modelPrice !== -1) {
      segments.push({
        tone: 'secondary',
        text: isPriceDisplayMode(displayMode, modelPrice)
          ? i18next.t('模型价格 {{price}}', {
              price: formatCompactDisplayPrice(modelPrice),
            })
          : i18next.t('\u6309\u6b21'),
      });
    } else if (isPriceDisplayMode(displayMode, modelPrice)) {
      segments.push({
        tone: 'secondary',
        text: i18next.t('输入 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelRatio * 2.0),
        }),
      });

      if (shouldShowCache) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('\u7f13\u5b58\u8bfb {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(modelRatio * 2.0 * cacheRatio),
          }),
        });
      }

      if (hasSplitCacheCreation && shouldShowCacheCreation5m) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('5m缓存创建 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(
              modelRatio * 2.0 * cacheCreationRatio5m,
            ),
          }),
        });
      }
      if (hasSplitCacheCreation && shouldShowCacheCreation1h) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('1h缓存创建 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(
              modelRatio * 2.0 * cacheCreationRatio1h,
            ),
          }),
        });
      }
      if (!hasSplitCacheCreation && shouldShowLegacyCacheCreation) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('缓存创建 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(
              modelRatio * 2.0 * cacheCreationRatio,
            ),
          }),
        });
      }

      if (image) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('图片输入 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(modelRatio * 2.0 * imageRatio),
          }),
        });
      }
    } else {
      segments.push({
        tone: 'secondary',
        text: i18next.t('模型: {{ratio}}', {
          ratio: modelRatio,
        }),
      });

      if (shouldShowCache) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('缓存: {{cacheRatio}}', {
            cacheRatio: cacheRatio,
          }),
        });
      }

      if (hasSplitCacheCreation) {
        if (shouldShowCacheCreation5m && shouldShowCacheCreation1h) {
          segments.push({
            tone: 'secondary',
            text: i18next.t(
              '缓存创建: 5m {{cacheCreationRatio5m}} / 1h {{cacheCreationRatio1h}}',
              {
                cacheCreationRatio5m: cacheCreationRatio5m,
                cacheCreationRatio1h: cacheCreationRatio1h,
              },
            ),
          });
        } else if (shouldShowCacheCreation5m) {
          segments.push({
            tone: 'secondary',
            text: i18next.t('缓存创建: 5m {{cacheCreationRatio5m}}', {
              cacheCreationRatio5m: cacheCreationRatio5m,
            }),
          });
        } else if (shouldShowCacheCreation1h) {
          segments.push({
            tone: 'secondary',
            text: i18next.t('缓存创建: 1h {{cacheCreationRatio1h}}', {
              cacheCreationRatio1h: cacheCreationRatio1h,
            }),
          });
        }
      } else if (shouldShowLegacyCacheCreation) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('缓存创建: {{cacheCreationRatio}}', {
            cacheCreationRatio: cacheCreationRatio,
          }),
        });
      }

      if (image) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('图片输入: {{imageRatio}}', {
            imageRatio: imageRatio,
          }),
        });
      }
    }

    if (isSystemPromptOverride) {
      segments.push({
        tone: 'primary',
        text: i18next.t('系统提示覆盖'),
      });
    }

    return segments;
  }

  if (modelPrice !== -1) {
    if (isPriceDisplayMode(displayMode, modelPrice)) {
      return joinBillingSummary([
        i18next.t('模型价格：{{symbol}}{{price}}', {
          symbol: symbol,
          price: (modelPrice * rate).toFixed(6),
        }),
        getGroupRatioText(groupRatio, user_group_ratio),
      ]);
    }
    const displayPrice = (modelPrice * rate).toFixed(6);
    return i18next.t('价格：{{symbol}}{{price}} * {{ratioType}}：{{ratio}}', {
      symbol: symbol,
      price: displayPrice,
      ratioType: ratioLabel,
      ratio: finalGroupRatio,
    });
  }

  if (isPriceDisplayMode(displayMode, modelPrice)) {
    const parts = [];
    if (modelPrice !== -1) {
      parts.push(
        i18next.t('模型价格 {{price}}', {
          price: formatCompactDisplayPrice(modelPrice),
        }),
      );
      parts.push(getGroupRatioText(groupRatio, user_group_ratio));
      return joinBillingSummary(parts);
    }

    parts.push(
      i18next.t('输入 {{price}} / 1M tokens', {
        price: formatCompactDisplayPrice(modelRatio * 2.0),
      }),
    );

    if (shouldShowCache) {
      parts.push(
        i18next.t('\u7f13\u5b58\u8bfb {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelRatio * 2.0 * cacheRatio),
        }),
      );
    }

    if (hasSplitCacheCreation && shouldShowCacheCreation5m) {
      parts.push(
        i18next.t('5m缓存创建 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(
            modelRatio * 2.0 * cacheCreationRatio5m,
          ),
        }),
      );
    }
    if (hasSplitCacheCreation && shouldShowCacheCreation1h) {
      parts.push(
        i18next.t('1h缓存创建 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(
            modelRatio * 2.0 * cacheCreationRatio1h,
          ),
        }),
      );
    }
    if (!hasSplitCacheCreation && shouldShowLegacyCacheCreation) {
      parts.push(
        i18next.t('缓存创建 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(
            modelRatio * 2.0 * cacheCreationRatio,
          ),
        }),
      );
    }

    if (image) {
      parts.push(
        i18next.t('图片输入 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelRatio * 2.0 * imageRatio),
        }),
      );
    }

    parts.push(getGroupRatioText(groupRatio, user_group_ratio));

    let result = joinBillingSummary(parts);
    if (isSystemPromptOverride) {
      result += '\n\r' + i18next.t('系统提示覆盖');
    }
    return result;
  }

  const parts = [];
  // base: model ratio
  parts.push(i18next.t('模型: {{ratio}}'));

  // cache part (label differs when with image)
  if (shouldShowCache) {
    parts.push(i18next.t('缓存: {{cacheRatio}}'));
  }

  if (hasSplitCacheCreation) {
    if (shouldShowCacheCreation5m && shouldShowCacheCreation1h) {
      parts.push(
        i18next.t(
          '缓存创建: 5m {{cacheCreationRatio5m}} / 1h {{cacheCreationRatio1h}}',
        ),
      );
    } else if (shouldShowCacheCreation5m) {
      parts.push(i18next.t('缓存创建: 5m {{cacheCreationRatio5m}}'));
    } else if (shouldShowCacheCreation1h) {
      parts.push(i18next.t('缓存创建: 1h {{cacheCreationRatio1h}}'));
    }
  } else if (shouldShowLegacyCacheCreation) {
    parts.push(i18next.t('缓存创建: {{cacheCreationRatio}}'));
  }

  // image part
  if (image) {
    parts.push(i18next.t('图片输入: {{imageRatio}}'));
  }

  parts.push(`{{ratioType}}: {{groupRatio}}`);

  let result = i18next.t(parts.join(' * '), {
    ratio: modelRatio,
    ratioType: ratioLabel,
    groupRatio: finalGroupRatio,
    cacheRatio: cacheRatio,
    cacheCreationRatio: cacheCreationRatio,
    cacheCreationRatio5m: cacheCreationRatio5m,
    cacheCreationRatio1h: cacheCreationRatio1h,
    imageRatio: imageRatio,
  });

  if (isSystemPromptOverride) {
    result += '\n\r' + i18next.t('系统提示覆盖');
  }

  return result;
}

export function renderTaskBillingProcess(other, content) {
  if (other?.task_id != null) {
    return renderBillingArticle(
      [content].filter(Boolean),
      { showReferenceNote: false },
    );
  }
  return renderBillingArticle([
    buildBillingText('任务预扣费（将在任务完成后按实际 token 重算）'),
  ]);
}

export function renderModelPrice(
  inputTokens,
  completionTokens,
  modelRatio,
  modelPrice = -1,
  completionRatio,
  groupRatio,
  user_group_ratio,
  cacheTokens = 0,
  cacheRatio = 1.0,
  image = false,
  imageRatio = 1.0,
  imageOutputTokens = 0,
  webSearch = false,
  webSearchCallCount = 0,
  webSearchPrice = 0,
  fileSearch = false,
  fileSearchCallCount = 0,
  fileSearchPrice = 0,
  audioInputSeperatePrice = false,
  audioInputTokens = 0,
  audioInputPrice = 0,
  imageGenerationCall = false,
  imageGenerationCallPrice = 0,
  displayMode = 'price',
) {
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    groupRatio,
    user_group_ratio,
  );
  groupRatio = effectiveGroupRatio;

  const { symbol, rate } = getCurrencyConfig();

  if (!shouldUseRatioBillingProcess(modelPrice)) {
    if (modelPrice !== -1) {
      return renderBillingArticle([
        buildBillingPriceText('\u6309\u6b21\uff1a{{symbol}}{{price}}', {
          symbol,
          usdAmount: modelPrice,
          rate,
        }),
        buildBillingPriceText(
          '\u6309\u6b21 {{symbol}}{{price}} * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
          {
            symbol,
            usdAmount: modelPrice,
            rate,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amountKey: 'price',
            total: formatBillingDisplayPrice(modelPrice * groupRatio, rate),
          },
        ),
      ]);
    }

    if (completionRatio === undefined) {
      completionRatio = 0;
    }
    const inputRatioPrice = modelRatio * 2.0;
    const completionRatioPrice = modelRatio * 2.0 * completionRatio;
    const cacheRatioPrice = modelRatio * 2.0 * cacheRatio;
    const imageRatioPrice = modelRatio * 2.0 * imageRatio;
    let effectiveInputTokens =
      inputTokens - cacheTokens + cacheTokens * cacheRatio;
    if (image && imageOutputTokens > 0) {
      effectiveInputTokens =
        inputTokens - imageOutputTokens + imageOutputTokens * imageRatio;
    }
    if (audioInputTokens > 0) {
      effectiveInputTokens -= audioInputTokens;
    }
    const price =
      (effectiveInputTokens / 1000000) * inputRatioPrice * groupRatio +
      (audioInputTokens / 1000000) * audioInputPrice * groupRatio +
      (completionTokens / 1000000) * completionRatioPrice * groupRatio +
      (webSearchCallCount / 1000) * webSearchPrice * groupRatio +
      (fileSearchCallCount / 1000) * fileSearchPrice * groupRatio +
      imageGenerationCallPrice * groupRatio;

    let inputDesc = '';
    if (image && imageOutputTokens > 0) {
      inputDesc = buildBillingPriceText(
        '(输入 {{nonImageInput}} tokens + 图片输入 {{imageInput}} tokens / 1M tokens * {{symbol}}{{price}}',
        {
          nonImageInput: inputTokens - imageOutputTokens,
          imageInput: imageOutputTokens,
          symbol,
          usdAmount: inputRatioPrice,
          rate,
        },
      );
    } else if (cacheTokens > 0) {
      inputDesc = buildBillingText(
        '(输入 {{nonCacheInput}} tokens / 1M tokens * {{symbol}}{{price}} + 缓存 {{cacheInput}} tokens / 1M tokens * {{symbol}}{{cachePrice}}',
        {
          nonCacheInput: inputTokens - cacheTokens,
          cacheInput: cacheTokens,
          symbol,
          price: formatBillingDisplayPrice(inputRatioPrice, rate),
          cachePrice: formatBillingDisplayPrice(cacheRatioPrice, rate),
        },
      );
    } else if (audioInputSeperatePrice && audioInputTokens > 0) {
      inputDesc = buildBillingText(
        '(\u8f93\u5165 {{nonAudioInput}} tokens / 1M tokens * {{symbol}}{{price}} + \u97f3\u9891\u8f93\u5165 {{audioInput}} tokens / 1M tokens * {{symbol}}{{audioPrice}}',
        {
          nonAudioInput: inputTokens - audioInputTokens,
          audioInput: audioInputTokens,
          symbol,
          price: formatBillingDisplayPrice(inputRatioPrice, rate),
          audioPrice: formatBillingDisplayPrice(audioInputPrice, rate),
        },
      );
    } else {
      inputDesc = buildBillingPriceText(
        '(输入 {{input}} tokens / 1M tokens * {{symbol}}{{price}}',
        {
          input: inputTokens,
          symbol,
          usdAmount: inputRatioPrice,
          rate,
        },
      );
    }

    const outputDesc = buildBillingText(
      '输出 {{completion}} tokens / 1M tokens * {{symbol}}{{compPrice}}) * {{ratioType}} {{ratio}}',
      {
        completion: completionTokens,
        symbol,
        compPrice: formatBillingDisplayPrice(completionRatioPrice, rate),
        ratio: groupRatio,
        ratioType: ratioLabel,
      },
    );

    const extraServices = [
      webSearch && webSearchCallCount > 0
        ? buildBillingPriceText(
            ' + Web\u641c\u7d22 {{count}}\u6b21 / 1K \u6b21 * {{symbol}}{{price}} * {{ratioType}} {{ratio}}',
            {
              count: webSearchCallCount,
              symbol,
              usdAmount: webSearchPrice,
              rate,
              ratio: groupRatio,
              ratioType: ratioLabel,
            },
          )
        : '',
      fileSearch && fileSearchCallCount > 0
        ? buildBillingPriceText(
            ' + \u6587\u4ef6\u641c\u7d22 {{count}}\u6b21 / 1K \u6b21 * {{symbol}}{{price}} * {{ratioType}} {{ratio}}',
            {
              count: fileSearchCallCount,
              symbol,
              usdAmount: fileSearchPrice,
              rate,
              ratio: groupRatio,
              ratioType: ratioLabel,
            },
          )
        : '',
      imageGenerationCall && imageGenerationCallPrice > 0
        ? buildBillingPriceText(
            ' + \u56fe\u7247\u751f\u6210\u8c03\u7528 {{symbol}}{{price}} / 1\u6b21 * {{ratioType}} {{ratio}}',
            {
              symbol,
              usdAmount: imageGenerationCallPrice,
              rate,
              ratio: groupRatio,
              ratioType: ratioLabel,
            },
          )
        : '',
    ].join('');

    const billingLines = [
      buildBillingPriceText(
        '输入价格：{{symbol}}{{price}} / 1M tokens{{audioPrice}}',
        {
          symbol,
          usdAmount: inputRatioPrice,
          rate,
          audioPrice: audioInputSeperatePrice
            ? `\uff0c${i18next.t('\u97f3\u9891\u8f93\u5165\u4ef7\u683c')} ${symbol}${formatBillingDisplayPrice(audioInputPrice, rate)} / 1M tokens`
            : '',
        },
      ),
      buildBillingPriceText('输出价格：{{symbol}}{{total}} / 1M tokens', {
        symbol,
        usdAmount: completionRatioPrice,
        rate,
        amountKey: 'total',
      }),
      cacheTokens > 0
        ? buildBillingPriceText(
            '缓存读取价格：{{symbol}}{{total}} / 1M tokens',
            {
              symbol,
              usdAmount: inputRatioPrice * cacheRatio,
              rate,
              amountKey: 'total',
            },
          )
        : null,
      image && imageOutputTokens > 0
        ? buildBillingPriceText(
            '图片输入价格：{{symbol}}{{total}} / 1M tokens',
            {
              symbol,
              usdAmount: imageRatioPrice,
              rate,
              amountKey: 'total',
            },
          )
        : null,
      webSearch && webSearchCallCount > 0
        ? buildBillingPriceText('Web搜索价格：{{symbol}}{{price}} / 1K 次', {
            symbol,
            usdAmount: webSearchPrice,
            rate,
          })
        : null,
      fileSearch && fileSearchCallCount > 0
        ? buildBillingPriceText('文件搜索价格：{{symbol}}{{price}} / 1K 次', {
            symbol,
            usdAmount: fileSearchPrice,
            rate,
          })
        : null,
      imageGenerationCall && imageGenerationCallPrice > 0
        ? buildBillingPriceText('图片生成调用：{{symbol}}{{price}} / 1次', {
            symbol,
            usdAmount: imageGenerationCallPrice,
            rate,
          })
        : null,
      buildBillingText(
        '{{inputDesc}} + {{outputDesc}}{{extraServices}} = {{symbol}}{{total}}',
        {
          inputDesc,
          outputDesc,
          extraServices,
          symbol,
          total: formatBillingDisplayPrice(price, rate),
        },
      ),
    ];

    return renderBillingArticle(billingLines);
  }

  if (modelPrice !== -1) {
    const displayPrice = (modelPrice * rate).toFixed(6);
    const displayTotal = (modelPrice * groupRatio * rate).toFixed(6);
    return i18next.t(
      '\u6309\u6b21\uff1a{{symbol}}{{price}} * {{ratioType}}\uff1a{{ratio}} = {{symbol}}{{total}}',
      {
        symbol: symbol,
        price: displayPrice,
        ratio: groupRatio,
        total: displayTotal,
        ratioType: ratioLabel,
      },
    );
  }

  if (completionRatio === undefined) {
    completionRatio = 0;
  }

  const modelRatioValue = formatRatioValue(modelRatio);
  const completionRatioValue = formatRatioValue(completionRatio);
  const cacheRatioValue = formatRatioValue(cacheRatio);
  const imageRatioValue = formatRatioValue(imageRatio);
  const inputRatioPrice = modelRatio * 2.0;
  const completionRatioPrice = modelRatio * 2.0 * completionRatioValue;
  const audioRatioValue =
    audioInputSeperatePrice && audioInputPrice > 0
      ? formatRatioValue(audioInputPrice / inputRatioPrice)
      : null;

  const textInputTokens = Math.max(
    inputTokens - cacheTokens - audioInputTokens,
    0,
  );
  const imageInputTokens =
    image && imageOutputTokens > 0 ? imageOutputTokens : 0;
  const cacheInputTokens = cacheTokens;

  const textInputAmount =
    (textInputTokens / 1000000) * inputRatioPrice * groupRatio;
  const cacheInputAmount =
    (cacheInputTokens / 1000000) *
    inputRatioPrice *
    cacheRatioValue *
    groupRatio;
  const imageInputAmount =
    (imageInputTokens / 1000000) *
    inputRatioPrice *
    imageRatioValue *
    groupRatio;
  const audioInputAmount =
    (audioInputTokens / 1000000) * audioInputPrice * groupRatio;
  const completionAmount =
    (completionTokens / 1000000) * completionRatioPrice * groupRatio;
  const webSearchAmount =
    (webSearchCallCount / 1000) * webSearchPrice * groupRatio;
  const fileSearchAmount =
    (fileSearchCallCount / 1000) * fileSearchPrice * groupRatio;
  const imageGenerationAmount = imageGenerationCallPrice * groupRatio;

  const totalAmount =
    textInputAmount +
    cacheInputAmount +
    imageInputAmount +
    audioInputAmount +
    completionAmount +
    webSearchAmount +
    fileSearchAmount +
    imageGenerationAmount;

  return renderBillingArticle([
    [
      buildBillingText('模型倍率 {{modelRatio}}', {
        modelRatio: modelRatioValue,
      }),
      buildBillingText('补全倍率 {{completionRatio}}', {
        completionRatio: completionRatioValue,
      }),
      cacheInputTokens > 0
        ? buildBillingText('缓存倍率 {{cacheRatio}}', {
            cacheRatio: cacheRatioValue,
          })
        : null,
      imageInputTokens > 0
        ? buildBillingText('图片倍率 {{imageRatio}}', {
            imageRatio: imageRatioValue,
          })
        : null,
      audioRatioValue !== null
        ? buildBillingText('\u97f3\u9891\u500d\u7387 {{audioRatio}}', {
            audioRatio: audioRatioValue,
          })
        : null,
      buildBillingText('{{ratioType}} {{ratio}}', {
        ratioType: ratioLabel,
        ratio: groupRatio,
      }),
    ]
      .filter(Boolean)
      .join('\uff0c'),
    textInputTokens > 0
      ? buildBillingText(
          '\u666e\u901a\u8f93\u5165\uff1a{{tokens}} / 1M * \u6a21\u578b\u500d\u7387 {{modelRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: textInputTokens,
            modelRatio: modelRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(textInputAmount),
          },
        )
      : null,
    cacheInputTokens > 0
      ? buildBillingText(
          '缓存输入：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 缓存倍率 {{cacheRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheInputTokens,
            modelRatio: modelRatioValue,
            cacheRatio: cacheRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(cacheInputAmount),
          },
        )
      : null,
    imageInputTokens > 0
      ? buildBillingText(
          '图片输入：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 图片倍率 {{imageRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: imageInputTokens,
            modelRatio: modelRatioValue,
            imageRatio: imageRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(imageInputAmount),
          },
        )
      : null,
    audioInputTokens > 0 && audioRatioValue !== null
      ? buildBillingText(
          '\u97f3\u9891\u8f93\u5165\uff1a{{tokens}} / 1M * \u6a21\u578b\u500d\u7387 {{modelRatio}} * \u97f3\u9891\u500d\u7387 {{audioRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: audioInputTokens,
            modelRatio: modelRatioValue,
            audioRatio: audioRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(audioInputAmount),
          },
        )
      : null,
    buildBillingText(
      '输出：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 补全倍率 {{completionRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: completionTokens,
        modelRatio: modelRatioValue,
        completionRatio: completionRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmountFromUsd(completionAmount),
      },
    ),
    webSearch && webSearchCallCount > 0
      ? buildBillingText(
          'Web 搜索：{{count}} / 1K * 单价 {{price}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            count: webSearchCallCount,
            price: renderDisplayAmountFromUsd(webSearchPrice),
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(webSearchAmount),
          },
        )
      : null,
    fileSearch && fileSearchCallCount > 0
      ? buildBillingText(
          '文件搜索：{{count}} / 1K * 单价 {{price}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            count: fileSearchCallCount,
            price: renderDisplayAmountFromUsd(fileSearchPrice),
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(fileSearchAmount),
          },
        )
      : null,
    imageGenerationCall && imageGenerationCallPrice > 0
      ? buildBillingText(
          '\u56fe\u7247\u751f\u6210\uff1a1 \u6b21 * \u5355\u4ef7 {{price}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            price: renderDisplayAmountFromUsd(imageGenerationCallPrice),
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(imageGenerationAmount),
          },
        )
      : null,
    buildBillingText('\u5408\u8ba1\uff1a{{total}}', {
      total: renderDisplayAmountFromUsd(totalAmount),
    }),
  ]);
}

export function renderLogContent(
  modelRatio,
  completionRatio,
  modelPrice = -1,
  groupRatio,
  user_group_ratio,
  cacheRatio = 1.0,
  image = false,
  imageRatio = 1.0,
  webSearch = false,
  webSearchCallCount = 0,
  fileSearch = false,
  fileSearchCallCount = 0,
  displayMode = 'price',
) {
  const {
    ratio,
    label: ratioLabel,
    useUserGroupRatio: useUserGroupRatio,
  } = getEffectiveRatio(groupRatio, user_group_ratio);

  // 获取货币配置
  const { symbol, rate } = getCurrencyConfig();

  if (isPriceDisplayMode(displayMode, modelPrice)) {
    if (modelPrice !== -1) {
      return joinBillingSummary([
        i18next.t('模型价格 {{symbol}}{{price}} / 次', {
          symbol,
          price: (modelPrice * rate).toFixed(6),
        }),
        getGroupRatioText(groupRatio, user_group_ratio),
      ]);
    }

    const parts = [
      i18next.t('输入价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: (modelRatio * 2.0 * rate).toFixed(6),
      }),
      i18next.t('输出价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: (modelRatio * 2.0 * completionRatio * rate).toFixed(6),
      }),
    ];
    appendPricePart(
      parts,
      cacheRatio !== 1.0,
      '缓存读取价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelRatio * 2.0 * cacheRatio * rate).toFixed(6),
      },
    );
    appendPricePart(
      parts,
      image,
      '图片输入价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelRatio * 2.0 * imageRatio * rate).toFixed(6),
      },
    );
    appendPricePart(
      parts,
      webSearch,
      'Web 搜索调用 {{webSearchCallCount}} 次',
      {
        webSearchCallCount,
      },
    );
    appendPricePart(
      parts,
      fileSearch,
      '文件搜索调用 {{fileSearchCallCount}} 次',
      {
        fileSearchCallCount,
      },
    );
    parts.push(getGroupRatioText(groupRatio, user_group_ratio));
    return joinBillingSummary(parts);
  }

  if (modelPrice !== -1) {
    return i18next.t('模型价格 {{symbol}}{{price}}，{{ratioType}} {{ratio}}', {
      symbol: symbol,
      price: (modelPrice * rate).toFixed(6),
      ratioType: ratioLabel,
      ratio,
    });
  } else {
    if (image) {
      return i18next.t(
        '\u6a21\u578b\u500d\u7387 {{modelRatio}}\uff0c\u7f13\u5b58\u500d\u7387 {{cacheRatio}}\uff0c\u8f93\u51fa\u500d\u7387 {{completionRatio}}\uff0c\u56fe\u7247\u8f93\u5165\u500d\u7387 {{imageRatio}}\uff0c{{ratioType}} {{ratio}}',
        {
          modelRatio: modelRatio,
          cacheRatio: cacheRatio,
          completionRatio: completionRatio,
          imageRatio: imageRatio,
          ratioType: ratioLabel,
          ratio,
        },
      );
    } else if (webSearch) {
      return i18next.t(
        '模型倍率 {{modelRatio}}，缓存倍率 {{cacheRatio}}，输出倍率 {{completionRatio}}，{{ratioType}} {{ratio}}，Web 搜索调用 {{webSearchCallCount}} 次',
        {
          modelRatio: modelRatio,
          cacheRatio: cacheRatio,
          completionRatio: completionRatio,
          ratioType: ratioLabel,
          ratio,
          webSearchCallCount,
        },
      );
    } else {
      return i18next.t(
        '\u6a21\u578b\u500d\u7387 {{modelRatio}}\uff0c\u7f13\u5b58\u500d\u7387 {{cacheRatio}}\uff0c\u8f93\u51fa\u500d\u7387 {{completionRatio}}\uff0c{{ratioType}} {{ratio}}',
        {
          modelRatio: modelRatio,
          cacheRatio: cacheRatio,
          completionRatio: completionRatio,
          ratioType: ratioLabel,
          ratio,
        },
      );
    }
  }
}

export function renderModelPriceSimple(
  modelRatio,
  modelPrice = -1,
  groupRatio,
  user_group_ratio,
  cacheTokens = 0,
  cacheRatio = 1.0,
  cacheCreationTokens = 0,
  cacheCreationRatio = 1.0,
  cacheCreationTokens5m = 0,
  cacheCreationRatio5m = 1.0,
  cacheCreationTokens1h = 0,
  cacheCreationRatio1h = 1.0,
  image = false,
  imageRatio = 1.0,
  isSystemPromptOverride = false,
  provider = 'openai',
  displayMode = 'price',
  outputMode = 'text',
) {
  return renderPriceSimpleCore({
    modelRatio,
    modelPrice,
    groupRatio,
    user_group_ratio,
    cacheTokens,
    cacheRatio,
    cacheCreationTokens,
    cacheCreationRatio,
    cacheCreationTokens5m,
    cacheCreationRatio5m,
    cacheCreationTokens1h,
    cacheCreationRatio1h,
    image,
    imageRatio,
    isSystemPromptOverride,
    displayMode,
    outputMode,
  });
}

export function renderAudioModelPrice(
  inputTokens,
  completionTokens,
  modelRatio,
  modelPrice = -1,
  completionRatio,
  audioInputTokens,
  audioCompletionTokens,
  audioRatio,
  audioCompletionRatio,
  groupRatio,
  user_group_ratio,
  cacheTokens = 0,
  cacheRatio = 1.0,
  displayMode = 'price',
) {
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    groupRatio,
    user_group_ratio,
  );
  groupRatio = effectiveGroupRatio;

  // 获取货币配置
  const { symbol, rate } = getCurrencyConfig();

  if (!shouldUseRatioBillingProcess(modelPrice)) {
    if (modelPrice !== -1) {
      return renderBillingArticle([
        buildBillingPriceText('模型价格：{{symbol}}{{price}} / 次', {
          symbol,
          usdAmount: modelPrice,
          rate,
        }),
        buildBillingPriceText(
          '\u6a21\u578b\u4ef7\u683c {{symbol}}{{price}} / \u6b21 * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
          {
            symbol,
            usdAmount: modelPrice,
            rate,
            ratioType: ratioLabel,
            ratio: groupRatio,
            total: formatBillingDisplayPrice(modelPrice * groupRatio, rate),
          },
        ),
      ]);
    }

    if (completionRatio === undefined) {
      completionRatio = 0;
    }
    audioRatio = parseFloat(audioRatio).toFixed(6);
    const inputRatioPrice = modelRatio * 2.0;
    const completionRatioPrice = modelRatio * 2.0 * completionRatio;
    const textPrice =
      ((inputTokens - cacheTokens + cacheTokens * cacheRatio) / 1000000) *
        inputRatioPrice *
        groupRatio +
      (completionTokens / 1000000) * completionRatioPrice * groupRatio;
    const audioPrice =
      (audioInputTokens / 1000000) * inputRatioPrice * audioRatio * groupRatio +
      (audioCompletionTokens / 1000000) *
        inputRatioPrice *
        audioRatio *
        audioCompletionRatio *
        groupRatio;
    const totalPrice = textPrice + audioPrice;

    return renderBillingArticle([
      buildBillingPriceText('输入价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        usdAmount: inputRatioPrice,
        rate,
      }),
      buildBillingPriceText('输出价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        usdAmount: completionRatioPrice,
        rate,
      }),
      cacheTokens > 0
        ? buildBillingPriceText(
            '缓存读取价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              usdAmount: inputRatioPrice * cacheRatio,
              rate,
            },
          )
        : null,
      buildBillingPriceText('\u97f3\u9891\u8f93\u5165\u4ef7\u683c\uff1a{{symbol}}{{price}} / 1M tokens', {
        symbol,
        usdAmount: inputRatioPrice * audioRatio,
        rate,
      }),
      buildBillingPriceText('\u97f3\u9891\u8865\u5168\u4ef7\u683c\uff1a{{symbol}}{{price}} / 1M tokens', {
        symbol,
        usdAmount: inputRatioPrice * audioRatio * audioCompletionRatio,
        rate,
      }),
      buildBillingText(
        '\u6587\u5b57\u63d0\u793a {{input}} tokens / 1M tokens * {{symbol}}{{textInputPrice}} + \u6587\u5b57\u8865\u5168 {{completion}} tokens / 1M tokens * {{symbol}}{{textCompPrice}} + \u97f3\u9891\u63d0\u793a {{audioInput}} tokens / 1M tokens * {{symbol}}{{audioInputPrice}} + \u97f3\u9891\u8865\u5168 {{audioCompletion}} tokens / 1M tokens * {{symbol}}{{audioCompPrice}} * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
        {
          input: inputTokens,
          completion: completionTokens,
          audioInput: audioInputTokens,
          audioCompletion: audioCompletionTokens,
          textInputPrice: formatBillingDisplayPrice(inputRatioPrice, rate),
          textCompPrice: formatBillingDisplayPrice(completionRatioPrice, rate),
          audioInputPrice: formatBillingDisplayPrice(
            audioRatio * inputRatioPrice,
            rate,
          ),
          audioCompPrice: formatBillingDisplayPrice(
            audioRatio * audioCompletionRatio * inputRatioPrice,
            rate,
          ),
          ratioType: ratioLabel,
          ratio: groupRatio,
          symbol,
          total: formatBillingDisplayPrice(totalPrice, rate),
        },
      ),
    ]);
  }

  // 1 ratio = $0.002 / 1K tokens
  if (modelPrice !== -1) {
    return i18next.t(
      '模型价格：{{symbol}}{{price}} * {{ratioType}}：{{ratio}} = {{symbol}}{{total}}',
      {
        symbol: symbol,
        price: (modelPrice * rate).toFixed(6),
        ratio: groupRatio,
        total: (modelPrice * groupRatio * rate).toFixed(6),
        ratioType: ratioLabel,
      },
    );
  }

  if (completionRatio === undefined) {
    completionRatio = 0;
  }

  const modelRatioValue = formatRatioValue(modelRatio);
  const completionRatioValue = formatRatioValue(completionRatio);
  const cacheRatioValue = formatRatioValue(cacheRatio);
  const audioRatioValue = formatRatioValue(audioRatio);
  const audioCompletionRatioValue = formatRatioValue(audioCompletionRatio);

  const inputRatioPrice = modelRatio * 2.0;
  const completionRatioPrice = modelRatio * 2.0 * completionRatioValue;

  const effectiveInputTokens =
    inputTokens - cacheTokens + cacheTokens * cacheRatioValue;

  const textPrice =
    (effectiveInputTokens / 1000000) * inputRatioPrice * groupRatio +
    (completionTokens / 1000000) * completionRatioPrice * groupRatio;
  const audioPrice =
    (audioInputTokens / 1000000) *
      inputRatioPrice *
      audioRatioValue *
      groupRatio +
    (audioCompletionTokens / 1000000) *
      inputRatioPrice *
      audioRatioValue *
      audioCompletionRatioValue *
      groupRatio;
  const totalPrice = textPrice + audioPrice;

  return renderBillingArticle([
    buildBillingText(
      '\u6a21\u578b\u500d\u7387 {{modelRatio}}\uff0c\u8865\u5168\u500d\u7387 {{completionRatio}}\uff0c\u97f3\u9891\u500d\u7387 {{audioRatio}}\uff0c\u97f3\u9891\u8865\u5168\u500d\u7387 {{audioCompletionRatio}}\uff0c{{cachePart}}{{ratioType}} {{ratio}}',
      {
        modelRatio: modelRatioValue,
        completionRatio: completionRatioValue,
        audioRatio: audioRatioValue,
        audioCompletionRatio: audioCompletionRatioValue,
        cachePart:
          cacheTokens > 0
            ? `${i18next.t('缓存倍率')} ${cacheRatioValue}，`
            : '',
        ratioType: ratioLabel,
        ratio: groupRatio,
      },
    ),
    buildBillingText(
      '\u666e\u901a\u8f93\u5165\uff1a{{tokens}} / 1M * \u6a21\u578b\u500d\u7387 {{modelRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: Math.max(inputTokens - cacheTokens, 0),
        modelRatio: modelRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmountFromUsd(
          (Math.max(inputTokens - cacheTokens, 0) / 1000000) *
            inputRatioPrice *
            groupRatio,
        ),
      },
    ),
    cacheTokens > 0
      ? buildBillingText(
          '缓存输入：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 缓存倍率 {{cacheRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheTokens,
            modelRatio: modelRatioValue,
            cacheRatio: cacheRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(
              (cacheTokens / 1000000) *
                inputRatioPrice *
                cacheRatioValue *
                groupRatio,
            ),
          },
        )
      : null,
    buildBillingText(
      '文字输出：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 补全倍率 {{completionRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: completionTokens,
        modelRatio: modelRatioValue,
        completionRatio: completionRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmountFromUsd(
          (completionTokens / 1000000) *
            inputRatioPrice *
            completionRatioValue *
            groupRatio,
        ),
      },
    ),
    buildBillingText(
      '\u97f3\u9891\u8f93\u5165\uff1a{{tokens}} / 1M * \u6a21\u578b\u500d\u7387 {{modelRatio}} * \u97f3\u9891\u500d\u7387 {{audioRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: audioInputTokens,
        modelRatio: modelRatioValue,
        audioRatio: audioRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmountFromUsd(
          (audioInputTokens / 1000000) *
            inputRatioPrice *
            audioRatioValue *
            groupRatio,
        ),
      },
    ),
    buildBillingText(
      '\u97f3\u9891\u8f93\u51fa\uff1a{{tokens}} / 1M * \u6a21\u578b\u500d\u7387 {{modelRatio}} * \u97f3\u9891\u500d\u7387 {{audioRatio}} * \u97f3\u9891\u8865\u5168\u500d\u7387 {{audioCompletionRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: audioCompletionTokens,
        modelRatio: modelRatioValue,
        audioRatio: audioRatioValue,
        audioCompletionRatio: audioCompletionRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmountFromUsd(
          (audioCompletionTokens / 1000000) *
            inputRatioPrice *
            audioRatioValue *
            audioCompletionRatioValue *
            groupRatio,
        ),
      },
    ),
    buildBillingText(
      '\u5408\u8ba1\uff1a\u6587\u5b57\u90e8\u5206 {{textTotal}} + \u97f3\u9891\u90e8\u5206 {{audioTotal}} = {{total}}',
      {
        textTotal: renderDisplayAmountFromUsd(textPrice),
        audioTotal: renderDisplayAmountFromUsd(audioPrice),
        total: renderDisplayAmountFromUsd(totalPrice),
      },
    ),
  ]);
}

export function renderQuotaWithPrompt(quota, digits) {
  const quotaDisplayType = localStorage.getItem('quota_display_type') || 'USD';
  if (quotaDisplayType !== 'TOKENS') {
    return i18next.t('等价金额：') + renderQuota(quota, digits);
  }
  return '';
}

export function renderClaudeModelPrice(
  inputTokens,
  completionTokens,
  modelRatio,
  modelPrice = -1,
  completionRatio,
  groupRatio,
  user_group_ratio,
  cacheTokens = 0,
  cacheRatio = 1.0,
  cacheCreationTokens = 0,
  cacheCreationRatio = 1.0,
  cacheCreationTokens5m = 0,
  cacheCreationRatio5m = 1.0,
  cacheCreationTokens1h = 0,
  cacheCreationRatio1h = 1.0,
  displayMode = 'price',
) {
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    groupRatio,
    user_group_ratio,
  );
  groupRatio = effectiveGroupRatio;

  // 获取货币配置
  const { symbol, rate } = getCurrencyConfig();

  if (!shouldUseRatioBillingProcess(modelPrice)) {
    if (modelPrice !== -1) {
      return renderBillingArticle([
        buildBillingPriceText('模型价格：{{symbol}}{{price}} / 次', {
          symbol,
          usdAmount: modelPrice,
          rate,
        }),
        buildBillingPriceText(
          '\u6a21\u578b\u4ef7\u683c {{symbol}}{{price}} / \u6b21 * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
          {
            symbol,
            usdAmount: modelPrice,
            rate,
            ratioType: ratioLabel,
            ratio: groupRatio,
            total: formatBillingDisplayPrice(modelPrice * groupRatio, rate),
          },
        ),
      ]);
    }

    if (completionRatio === undefined) {
      completionRatio = 0;
    }

    const inputRatioPrice = modelRatio * 2.0;
    const completionRatioPrice = modelRatio * 2.0 * completionRatio;
    const cacheRatioPrice = modelRatio * 2.0 * cacheRatio;
    const cacheCreationRatioPrice = modelRatio * 2.0 * cacheCreationRatio;
    const cacheCreationRatioPrice5m = modelRatio * 2.0 * cacheCreationRatio5m;
    const cacheCreationRatioPrice1h = modelRatio * 2.0 * cacheCreationRatio1h;
    const hasSplitCacheCreation =
      cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;
    const legacyCacheCreationTokens = hasSplitCacheCreation
      ? 0
      : cacheCreationTokens;
    const effectiveInputTokens =
      inputTokens +
      cacheTokens * cacheRatio +
      legacyCacheCreationTokens * cacheCreationRatio +
      cacheCreationTokens5m * cacheCreationRatio5m +
      cacheCreationTokens1h * cacheCreationRatio1h;
    const price =
      (effectiveInputTokens / 1000000) * inputRatioPrice * groupRatio +
      (completionTokens / 1000000) * completionRatioPrice * groupRatio;
    const inputUnitPrice = inputRatioPrice * rate;
    const completionUnitPrice = completionRatioPrice * rate;
    const cacheUnitPrice = cacheRatioPrice * rate;
    const cacheCreationUnitPrice = cacheCreationRatioPrice * rate;
    const cacheCreationUnitPrice5m = cacheCreationRatioPrice5m * rate;
    const cacheCreationUnitPrice1h = cacheCreationRatioPrice1h * rate;
    const cacheCreationUnitPriceTotal =
      cacheCreationUnitPrice5m + cacheCreationUnitPrice1h;
    const shouldShowCache = cacheTokens > 0;
    const shouldShowLegacyCacheCreation =
      !hasSplitCacheCreation && cacheCreationTokens > 0;
    const shouldShowCacheCreation5m =
      hasSplitCacheCreation && cacheCreationTokens5m > 0;
    const shouldShowCacheCreation1h =
      hasSplitCacheCreation && cacheCreationTokens1h > 0;

    const breakdownSegments = [
      i18next.t('提示 {{input}} tokens / 1M tokens * {{symbol}}{{price}}', {
        input: inputTokens,
        symbol,
        price: inputUnitPrice.toFixed(6),
      }),
    ];

    if (shouldShowCache) {
      breakdownSegments.push(
        i18next.t('缓存 {{tokens}} tokens / 1M tokens * {{symbol}}{{price}}', {
          tokens: cacheTokens,
          symbol,
          price: cacheUnitPrice.toFixed(6),
        }),
      );
    }

    if (shouldShowLegacyCacheCreation) {
      breakdownSegments.push(
        i18next.t(
          '缓存创建 {{tokens}} tokens / 1M tokens * {{symbol}}{{price}}',
          {
            tokens: cacheCreationTokens,
            symbol,
            price: cacheCreationUnitPrice.toFixed(6),
          },
        ),
      );
    }

    if (shouldShowCacheCreation5m) {
      breakdownSegments.push(
        i18next.t(
          '5m缓存创建 {{tokens}} tokens / 1M tokens * {{symbol}}{{price}}',
          {
            tokens: cacheCreationTokens5m,
            symbol,
            price: cacheCreationUnitPrice5m.toFixed(6),
          },
        ),
      );
    }

    if (shouldShowCacheCreation1h) {
      breakdownSegments.push(
        i18next.t(
          '1h缓存创建 {{tokens}} tokens / 1M tokens * {{symbol}}{{price}}',
          {
            tokens: cacheCreationTokens1h,
            symbol,
            price: cacheCreationUnitPrice1h.toFixed(6),
          },
        ),
      );
    }

    breakdownSegments.push(
      i18next.t(
        '补全 {{completion}} tokens / 1M tokens * {{symbol}}{{price}}',
        {
          completion: completionTokens,
          symbol,
          price: completionUnitPrice.toFixed(6),
        },
      ),
    );

    const breakdownText = breakdownSegments.join(' + ');

    return renderBillingArticle([
      buildBillingPriceText('输入价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        usdAmount: inputRatioPrice,
        rate,
      }),
      buildBillingPriceText('输出价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        usdAmount: completionRatioPrice,
        rate,
      }),
      cacheTokens > 0
        ? buildBillingPriceText(
            '缓存读取价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              usdAmount: cacheRatioPrice,
              rate,
            },
          )
        : null,
      !hasSplitCacheCreation && cacheCreationTokens > 0
        ? buildBillingPriceText(
            '缓存创建价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              usdAmount: cacheCreationRatioPrice,
              rate,
            },
          )
        : null,
      hasSplitCacheCreation && cacheCreationTokens5m > 0
        ? buildBillingPriceText(
            '5m缓存创建价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              usdAmount: cacheCreationRatioPrice5m,
              rate,
            },
          )
        : null,
      hasSplitCacheCreation && cacheCreationTokens1h > 0
        ? buildBillingPriceText(
            '1h缓存创建价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              usdAmount: cacheCreationRatioPrice1h,
              rate,
            },
          )
        : null,
      buildBillingText(
        '{{breakdown}} * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
        {
          breakdown: breakdownText,
          ratioType: ratioLabel,
          ratio: groupRatio,
          symbol,
          total: formatBillingDisplayPrice(price, rate),
        },
      ),
    ]);
  }

  if (modelPrice !== -1) {
    return i18next.t(
      '模型价格：{{symbol}}{{price}} * {{ratioType}}：{{ratio}} = {{symbol}}{{total}}',
      {
        symbol: symbol,
        price: (modelPrice * rate).toFixed(6),
        ratioType: ratioLabel,
        ratio: groupRatio,
        total: (modelPrice * groupRatio * rate).toFixed(6),
      },
    );
  }

  if (completionRatio === undefined) {
    completionRatio = 0;
  }

  const modelRatioValue = formatRatioValue(modelRatio);
  const completionRatioValue = formatRatioValue(completionRatio);
  const cacheRatioValue = formatRatioValue(cacheRatio);
  const cacheCreationRatioValue = formatRatioValue(cacheCreationRatio);
  const cacheCreationRatio5mValue = formatRatioValue(cacheCreationRatio5m);
  const cacheCreationRatio1hValue = formatRatioValue(cacheCreationRatio1h);

  const inputRatioPrice = modelRatio * 2.0;
  const completionRatioPrice = modelRatio * 2.0 * completionRatioValue;

  const hasSplitCacheCreation =
    cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;
  const shouldShowCache = cacheTokens > 0;
  const shouldShowLegacyCacheCreation =
    !hasSplitCacheCreation && cacheCreationTokens > 0;
  const shouldShowCacheCreation5m =
    hasSplitCacheCreation && cacheCreationTokens5m > 0;
  const shouldShowCacheCreation1h =
    hasSplitCacheCreation && cacheCreationTokens1h > 0;

  const legacyCacheCreationTokens = hasSplitCacheCreation
    ? 0
    : cacheCreationTokens;
  const effectiveInputTokens =
    inputTokens +
    cacheTokens * cacheRatioValue +
    legacyCacheCreationTokens * cacheCreationRatioValue +
    cacheCreationTokens5m * cacheCreationRatio5mValue +
    cacheCreationTokens1h * cacheCreationRatio1hValue;

  const totalAmount =
    (effectiveInputTokens / 1000000) * inputRatioPrice * groupRatio +
    (completionTokens / 1000000) * completionRatioPrice * groupRatio;

  return renderBillingArticle([
    buildBillingText(
      '\u6a21\u578b\u500d\u7387 {{modelRatio}}\uff0c\u8f93\u51fa\u500d\u7387 {{completionRatio}}\uff0c\u7f13\u5b58\u500d\u7387 {{cacheRatio}}\uff0c{{ratioType}} {{ratio}}',
      {
        modelRatio: modelRatioValue,
        completionRatio: completionRatioValue,
        cacheRatio: cacheRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
      },
    ),
    hasSplitCacheCreation
      ? buildBillingText(
          '缓存创建倍率 5m {{cacheCreationRatio5m}} / 1h {{cacheCreationRatio1h}}',
          {
            cacheCreationRatio5m: cacheCreationRatio5mValue,
            cacheCreationRatio1h: cacheCreationRatio1hValue,
          },
        )
      : buildBillingText('缓存创建倍率 {{cacheCreationRatio}}', {
          cacheCreationRatio: cacheCreationRatioValue,
        }),
    buildBillingText(
      '\u666e\u901a\u8f93\u5165\uff1a{{tokens}} / 1M * \u6a21\u578b\u500d\u7387 {{modelRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: inputTokens,
        modelRatio: modelRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmountFromUsd(
          (inputTokens / 1000000) * inputRatioPrice * groupRatio,
        ),
      },
    ),
    shouldShowCache
      ? buildBillingText(
          '缓存读取：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 缓存倍率 {{cacheRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheTokens,
            modelRatio: modelRatioValue,
            cacheRatio: cacheRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(
              (cacheTokens / 1000000) *
                inputRatioPrice *
                cacheRatioValue *
                groupRatio,
            ),
          },
        )
      : null,
    shouldShowLegacyCacheCreation
      ? buildBillingText(
          '缓存创建：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 缓存创建倍率 {{cacheCreationRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheCreationTokens,
            modelRatio: modelRatioValue,
            cacheCreationRatio: cacheCreationRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(
              (cacheCreationTokens / 1000000) *
                inputRatioPrice *
                cacheCreationRatioValue *
                groupRatio,
            ),
          },
        )
      : null,
    shouldShowCacheCreation5m
      ? buildBillingText(
          '5m缓存创建：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 5m缓存创建倍率 {{cacheCreationRatio5m}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheCreationTokens5m,
            modelRatio: modelRatioValue,
            cacheCreationRatio5m: cacheCreationRatio5mValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(
              (cacheCreationTokens5m / 1000000) *
                inputRatioPrice *
                cacheCreationRatio5mValue *
                groupRatio,
            ),
          },
        )
      : null,
    shouldShowCacheCreation1h
      ? buildBillingText(
          '1h缓存创建：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 1h缓存创建倍率 {{cacheCreationRatio1h}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheCreationTokens1h,
            modelRatio: modelRatioValue,
            cacheCreationRatio1h: cacheCreationRatio1hValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmountFromUsd(
              (cacheCreationTokens1h / 1000000) *
                inputRatioPrice *
                cacheCreationRatio1hValue *
                groupRatio,
            ),
          },
        )
      : null,
    buildBillingText(
      '补全 {{completion}} tokens * 输出倍率 {{completionRatio}}',
      {
        completion: completionTokens,
        completionRatio: completionRatioValue,
      },
    ),
    buildBillingText(
      '输出：{{tokens}} / 1M * 模型倍率 {{modelRatio}} * 输出倍率 {{completionRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: completionTokens,
        modelRatio: modelRatioValue,
        completionRatio: completionRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmountFromUsd(
          (completionTokens / 1000000) *
            inputRatioPrice *
            completionRatioValue *
            groupRatio,
        ),
      },
    ),
    buildBillingText('\u5408\u8ba1\uff1a{{total}}', {
      total: renderDisplayAmountFromUsd(totalAmount),
    }),
  ]);
}

export function renderClaudeLogContent(
  modelRatio,
  completionRatio,
  modelPrice = -1,
  groupRatio,
  user_group_ratio,
  cacheRatio = 1.0,
  cacheCreationRatio = 1.0,
  cacheCreationTokens5m = 0,
  cacheCreationRatio5m = 1.0,
  cacheCreationTokens1h = 0,
  cacheCreationRatio1h = 1.0,
  displayMode = 'price',
) {
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    groupRatio,
    user_group_ratio,
  );
  groupRatio = effectiveGroupRatio;

  // 获取货币配置
  const { symbol, rate } = getCurrencyConfig();

  if (isPriceDisplayMode(displayMode, modelPrice)) {
    if (modelPrice !== -1) {
      return joinBillingSummary([
        i18next.t('模型价格 {{symbol}}{{price}} / 次', {
          symbol,
          price: (modelPrice * rate).toFixed(6),
        }),
        getGroupRatioText(groupRatio, user_group_ratio),
      ]);
    }

    const parts = [
      i18next.t('输入价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: (modelRatio * 2.0 * rate).toFixed(6),
      }),
      i18next.t('输出价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: (modelRatio * 2.0 * completionRatio * rate).toFixed(6),
      }),
      i18next.t('缓存读取价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: (modelRatio * 2.0 * cacheRatio * rate).toFixed(6),
      }),
    ];
    const hasSplitCacheCreation =
      cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;
    appendPricePart(
      parts,
      hasSplitCacheCreation && cacheCreationTokens5m > 0,
      '5m缓存创建价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelRatio * 2.0 * cacheCreationRatio5m * rate).toFixed(6),
      },
    );
    appendPricePart(
      parts,
      hasSplitCacheCreation && cacheCreationTokens1h > 0,
      '1h缓存创建价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelRatio * 2.0 * cacheCreationRatio1h * rate).toFixed(6),
      },
    );
    appendPricePart(
      parts,
      !hasSplitCacheCreation,
      '缓存创建价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelRatio * 2.0 * cacheCreationRatio * rate).toFixed(6),
      },
    );
    parts.push(getGroupRatioText(groupRatio, user_group_ratio));
    return joinBillingSummary(parts);
  }

  if (modelPrice !== -1) {
    return i18next.t('模型价格 {{symbol}}{{price}}，{{ratioType}} {{ratio}}', {
      symbol: symbol,
      price: (modelPrice * rate).toFixed(6),
      ratioType: ratioLabel,
      ratio: groupRatio,
    });
  } else {
    const hasSplitCacheCreation =
      cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;
    const shouldShowCacheCreation5m =
      hasSplitCacheCreation && cacheCreationTokens5m > 0;
    const shouldShowCacheCreation1h =
      hasSplitCacheCreation && cacheCreationTokens1h > 0;

    let cacheCreationPart = null;
    if (hasSplitCacheCreation) {
      if (shouldShowCacheCreation5m && shouldShowCacheCreation1h) {
        cacheCreationPart = i18next.t(
          '缓存创建倍率 5m {{cacheCreationRatio5m}} / 1h {{cacheCreationRatio1h}}',
          {
            cacheCreationRatio5m,
            cacheCreationRatio1h,
          },
        );
      } else if (shouldShowCacheCreation5m) {
        cacheCreationPart = i18next.t(
          '缓存创建倍率 5m {{cacheCreationRatio5m}}',
          {
            cacheCreationRatio5m,
          },
        );
      } else if (shouldShowCacheCreation1h) {
        cacheCreationPart = i18next.t(
          '缓存创建倍率 1h {{cacheCreationRatio1h}}',
          {
            cacheCreationRatio1h,
          },
        );
      }
    }

    if (!cacheCreationPart) {
      cacheCreationPart = i18next.t('缓存创建倍率 {{cacheCreationRatio}}', {
        cacheCreationRatio,
      });
    }

    const parts = [
      i18next.t('模型倍率 {{modelRatio}}', { modelRatio }),
      i18next.t('输出倍率 {{completionRatio}}', { completionRatio }),
      i18next.t('缓存倍率 {{cacheRatio}}', { cacheRatio }),
      cacheCreationPart,
      i18next.t('{{ratioType}} {{ratio}}', {
        ratioType: ratioLabel,
        ratio: groupRatio,
      }),
    ];

    return parts.join('\uff0c');
  }
}

// 宸茬粺涓€鑷?renderModelPriceSimple锛岃嫢浠嶆湁閬楃暀寮曠敤锛岃鏀逛负浼犲叆 provider='claude'

/**
 * rehype 鎻掍欢锛氬皢娈佃惤绛夋枃鏈妭鐐规媶鍒嗕负閫愯瘝 <span>锛屽苟娣诲姞娣″叆鍔ㄧ敾 class銆?
 * 浠呭湪娴佸紡娓叉煋闃舵浣跨敤锛岄伩鍏嶅凡娓叉煋鏂囧瓧閲嶅鍔ㄧ敾銆?
 */
export function rehypeSplitWordsIntoSpans(options = {}) {
  const { previousContentLength = 0 } = options;

  return (tree) => {
    let currentCharCount = 0; // 褰撳墠宸插鐞嗙殑瀛楃鏁?

    visit(tree, 'element', (node) => {
      if (
        ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'strong'].includes(
          node.tagName,
        ) &&
        node.children
      ) {
        const newChildren = [];
        node.children.forEach((child) => {
          if (child.type === 'text') {
            try {
              // 浣跨敤 Intl.Segmenter 绮惧噯鎷嗗垎涓嫳鏂囧強鏍囩偣
              const segmenter = new Intl.Segmenter('zh', {
                granularity: 'word',
              });
              const segments = segmenter.segment(child.value);

              Array.from(segments)
                .map((seg) => seg.segment)
                .filter(Boolean)
                .forEach((word) => {
                  const wordStartPos = currentCharCount;
                  const wordEndPos = currentCharCount + word.length;

                  // 鍒ゆ柇杩欎釜璇嶆槸鍚︽槸鏂板鐨勶紙鍦?previousContentLength 涔嬪悗锛?
                  const isNewContent = wordStartPos >= previousContentLength;

                  newChildren.push({
                    type: 'element',
                    tagName: 'span',
                    properties: {
                      className: isNewContent ? ['animate-fade-in'] : [],
                    },
                    children: [{ type: 'text', value: word }],
                  });

                  currentCharCount = wordEndPos;
                });
            } catch (_) {
              // Fallback锛氬鏋滄祻瑙堝櫒涓嶆敮鎸?Segmenter
              const textStartPos = currentCharCount;
              const isNewContent = textStartPos >= previousContentLength;

              if (isNewContent) {
                // 鏂板唴瀹癸紝娣诲姞鍔ㄧ敾
                newChildren.push({
                  type: 'element',
                  tagName: 'span',
                  properties: {
                    className: ['animate-fade-in'],
                  },
                  children: [{ type: 'text', value: child.value }],
                });
              } else {
                // 鏃у唴瀹癸紝涓嶆坊鍔犲姩鐢?
                newChildren.push(child);
              }

              currentCharCount += child.value.length;
            }
          } else {
            newChildren.push(child);
          }
        });
        node.children = newChildren;
      }
    });
  };
}

