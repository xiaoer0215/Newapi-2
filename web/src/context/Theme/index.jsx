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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from 'react';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const ActualThemeContext = createContext(null);
export const useActualTheme = () => useContext(ActualThemeContext);

const SetThemeContext = createContext(null);
export const useSetTheme = () => useContext(SetThemeContext);

// 强制浅色主题，不允许切换
const actualTheme = 'light';

export const ThemeProvider = ({ children }) => {
  const theme = 'light';

  // 强制浅色主题：清除旧的深色偏好，确保DOM始终为浅色
  useEffect(() => {
    try { localStorage.removeItem('theme-mode'); } catch (_) {}
    document.body.removeAttribute('theme-mode');
    document.documentElement.classList.remove('dark');
  }, []);

  const setTheme = useCallback(() => {
    // 主题已锁定为浅色，忽略所有切换请求
  }, []);

  return (
    <SetThemeContext.Provider value={setTheme}>
      <ActualThemeContext.Provider value={actualTheme}>
        <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
      </ActualThemeContext.Provider>
    </SetThemeContext.Provider>
  );
};
