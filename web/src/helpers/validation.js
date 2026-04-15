export const USERNAME_RULE_TEXT = '账号仅支持英文、数字、下划线，或邮箱地址';

export const normalizeUsername = (value = '') => value.trim();

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidUsername = (value = '') => {
  const normalizedValue = normalizeUsername(value);
  return (
    USERNAME_PATTERN.test(normalizedValue) ||
    EMAIL_PATTERN.test(normalizedValue)
  );
};
