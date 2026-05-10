export const isInlineSvgMarkup = (value) => {
  const trimmed = String(value || '').trim();
  return (
    trimmed.startsWith('<svg') ||
    (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))
  );
};

export const normalizeUserGroupText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const removeSvgRootSizingStyle = (styleValue) => {
  const blockedProps = new Set([
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
  ]);

  return String(styleValue || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const propName = item.split(':')[0]?.trim().toLowerCase();
      return propName && !blockedProps.has(propName);
    })
    .join('; ');
};

export const normalizeInlineSvgMarkup = (value) => {
  const trimmed = String(value || '').trim();
  if (!isInlineSvgMarkup(trimmed)) {
    return trimmed;
  }

  return trimmed.replace(/<svg\b([^>]*)>/i, (match, attrs = '') => {
    let rootStyle = '';
    let nextAttrs = attrs
      .replace(/\swidth\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\sheight\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\spreserveAspectRatio\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\sstyle\s*=\s*(['"])(.*?)\1/i, (_, quote, styleValue) => {
        rootStyle = removeSvgRootSizingStyle(styleValue);
        return '';
      });

    const normalizedStyle = [
      'display:block',
      rootStyle,
      'max-width:100%',
      'max-height:100%',
    ]
      .filter(Boolean)
      .join('; ');

    return `<svg${nextAttrs} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="${normalizedStyle}">`;
  });
};

export const sanitizeInlineSvgMarkup = (value) =>
  normalizeInlineSvgMarkup(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z-]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(
      /\s(?:href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi,
      '',
    );

export const resolveUserGroupIconSrc = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  if (isInlineSvgMarkup(trimmed)) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      sanitizeInlineSvgMarkup(trimmed),
    )}`;
  }

  return trimmed;
};

export const getUserGroupIconType = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return 'empty';
  }
  if (isInlineSvgMarkup(trimmed)) {
    return 'svg';
  }
  if (trimmed.startsWith('data:image/')) {
    return 'data';
  }
  return 'url';
};

export const normalizeUserGroupIconsMap = (groupIcons) => {
  const nextMap = {};
  Object.entries(groupIcons || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeUserGroupText(key);
    const trimmedValue = String(value || '').trim();
    if (normalizedKey && trimmedValue) {
      nextMap[normalizedKey] = trimmedValue;
    }
  });
  return nextMap;
};

const DEFAULT_GROUP_ICON_ALIASES = [
  '\u666e\u901a\u7528\u6237',
  '\u9ed8\u8ba4\u5206\u7ec4',
  '\u9ed8\u8ba4',
];

export const resolveUserGroupIconValue = ({
  currentGroup,
  currentGroupDisplayName,
  groupIcons,
  userUsableGroups,
}) => {
  const iconMap = groupIcons || {};
  const normalizedGroupIcons = normalizeUserGroupIconsMap(iconMap);
  const pickGroupIcon = (candidate) => {
    const directMatch = String(iconMap?.[candidate] || '').trim();
    if (directMatch) {
      return directMatch;
    }
    return normalizedGroupIcons[normalizeUserGroupText(candidate)] || '';
  };

  const candidates = [currentGroup, currentGroupDisplayName];
  if (normalizeUserGroupText(currentGroup) === 'default') {
    candidates.push(...DEFAULT_GROUP_ICON_ALIASES);
  }

  Object.entries(userUsableGroups || {}).forEach(([groupKey, groupLabel]) => {
    const normalizedKey = normalizeUserGroupText(groupKey);
    const normalizedLabel = normalizeUserGroupText(groupLabel);
    const normalizedCurrent = normalizeUserGroupText(currentGroup);
    const normalizedDisplay = normalizeUserGroupText(currentGroupDisplayName);
    if (
      normalizedKey === normalizedCurrent ||
      normalizedLabel === normalizedCurrent ||
      normalizedKey === normalizedDisplay ||
      normalizedLabel === normalizedDisplay
    ) {
      candidates.push(groupKey, groupLabel);
    }
  });

  for (const candidate of candidates) {
    const matched = pickGroupIcon(candidate);
    if (matched) {
      return matched;
    }
  }

  return '';
};
