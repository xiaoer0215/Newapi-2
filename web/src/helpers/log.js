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

// Cache parsed results — each log row's `other` string is parsed up to 8× per
// render (once per column). Caching eliminates all redundant JSON.parse calls.
const _logOtherCache = new Map();
const _LOG_OTHER_CACHE_MAX = 500;

export function getLogOther(otherStr) {
  if (otherStr === undefined || otherStr === null || otherStr === '') {
    return {};
  }
  if (typeof otherStr === 'object') {
    return otherStr;
  }
  if (_logOtherCache.has(otherStr)) {
    return _logOtherCache.get(otherStr);
  }
  try {
    const result = JSON.parse(otherStr);
    // Evict oldest entries when cache is full
    if (_logOtherCache.size >= _LOG_OTHER_CACHE_MAX) {
      _logOtherCache.delete(_logOtherCache.keys().next().value);
    }
    _logOtherCache.set(otherStr, result);
    return result;
  } catch (e) {
    console.error(`Failed to parse record.other: "${otherStr}".`, e);
    return null;
  }
}
