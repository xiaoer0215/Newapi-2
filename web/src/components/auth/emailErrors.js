export function normalizeEmailDeliveryMessage(message, t = (value) => value) {
  const text = String(message || '').trim();

  if (!text) return text;

  if (/^550\b/i.test(text) || /non-existent account/i.test(text)) {
    return t('收件邮箱不存在或地址填写错误，请检查邮箱地址是否正确。');
  }

  return text;
}
