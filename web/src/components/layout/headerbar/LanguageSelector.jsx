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

import React from 'react';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { Languages } from 'lucide-react';

const languageItems = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ja', label: '日本語' },
  { value: 'ru', label: 'Русский' },
  { value: 'vi', label: 'Tiếng Việt' },
];

const LanguageSelector = ({ currentLang, onLanguageChange, t }) => {
  return (
    <Dropdown
      position='bottomRight'
      render={
        <Dropdown.Menu className='!bg-semi-color-bg-overlay !border-semi-color-border !shadow-lg !rounded-lg'>
          {languageItems.map((item) => (
            <Dropdown.Item
              key={item.value}
              className={`!px-3 !py-1.5 !text-sm !text-semi-color-text-0 ${currentLang === item.value ? '!bg-semi-color-primary-light-default !font-semibold' : 'hover:!bg-semi-color-fill-1'}`}
              onClick={() => onLanguageChange(item.value)}
            >
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      }
    >
      <Button
        aria-label={t('切换语言')}
        className='!p-1.5 !text-current focus:!bg-semi-color-fill-1 !rounded-full !bg-semi-color-fill-0 hover:!bg-semi-color-fill-1'
        icon={<Languages size={18} />}
        theme='borderless'
        type='tertiary'
      />
    </Dropdown>
  );
};

export default LanguageSelector;
