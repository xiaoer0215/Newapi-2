export const USERNAME_RULE_TEXT = '账号支持中文、英文、数字、符号和邮箱格式，不能包含空格，最多50个字符';

export const normalizeUsername = (value = '') => value.trim();

const USERNAME_PATTERN = /^\S{1,50}$/u;

export const isValidUsername = (value = '') => {
  const normalizedValue = normalizeUsername(value);
  return USERNAME_PATTERN.test(normalizedValue);
};
