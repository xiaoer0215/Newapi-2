export const isInlineSvgMarkup = (value) => {
  const trimmed = String(value || '').trim();
  return (
    trimmed.startsWith('<svg') ||
    (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))
  );
};

export const normalizeInlineSvgMarkup = (value) => {
  const trimmed = String(value || '').trim();
  if (!isInlineSvgMarkup(trimmed)) {
    return trimmed;
  }

  return trimmed.replace(/<svg\b([^>]*)>/i, (match, attrs = '') => {
    let nextAttrs = attrs
      .replace(/\swidth\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\sheight\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\spreserveAspectRatio\s*=\s*(['"]).*?\1/gi, '');

    return `<svg${nextAttrs} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  });
};

export const resolveUserGroupIconSrc = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  if (isInlineSvgMarkup(trimmed)) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      normalizeInlineSvgMarkup(trimmed),
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
