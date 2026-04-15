const DEVICE_FINGERPRINT_STORAGE_KEY = 'new_api_device_fingerprint_v1';

function hashString(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function getDeviceFingerprint() {
  if (typeof window === 'undefined') {
    return '';
  }

  const cached = window.localStorage.getItem(DEVICE_FINGERPRINT_STORAGE_KEY);
  if (cached) {
    return cached;
  }

  const nav = window.navigator || {};
  const scr = window.screen || {};
  const source = [
    nav.userAgent || '',
    nav.language || '',
    (nav.languages || []).join(','),
    nav.platform || '',
    String(nav.hardwareConcurrency || ''),
    String(nav.deviceMemory || ''),
    String(nav.maxTouchPoints || ''),
    String(scr.width || ''),
    String(scr.height || ''),
    String(scr.colorDepth || ''),
    Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || '',
  ].join('|');

  const fingerprint = `fp_${hashString(source)}_${hashString(
    `${nav.userAgent || ''}|${scr.width || ''}x${scr.height || ''}`,
  )}`;
  window.localStorage.setItem(DEVICE_FINGERPRINT_STORAGE_KEY, fingerprint);
  return fingerprint;
}
