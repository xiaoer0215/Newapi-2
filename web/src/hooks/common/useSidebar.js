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

import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { StatusContext } from '../../context/Status';
import { UserContext } from '../../context/User';
import { API } from '../../helpers';

// 鍒涘缓涓€涓叏灞€浜嬩欢绯荤粺鏉ュ悓姝ユ墍鏈塽seSidebar瀹炰緥
const sidebarEventTarget = new EventTarget();
const SIDEBAR_REFRESH_EVENT = 'sidebar-refresh';

export const DEFAULT_ADMIN_CONFIG = {
  chat: {
    enabled: true,
    playground: true,
    chat: true,
  },
  console: {
    enabled: true,
    detail: true,
    token: true,
    log: true,
    drawing: true,
    midjourney: true,
    task: true,
    group_monitor: true,
  },
  personal: {
    enabled: true,
    topup: true,
    member_upgrade: true,
    affiliate: true,
    personal: true,
  },
  admin: {
    enabled: true,
    auto_delivery: true,
    channel: true,
    models: true,
    deployment: true,
    redemption: true,
    user: true,
    subscription: true,
    setting: true,
  },
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

export const mergeAdminConfig = (savedConfig) => {
  const merged = deepClone(DEFAULT_ADMIN_CONFIG);
  if (!savedConfig || typeof savedConfig !== 'object') return merged;

  for (const [sectionKey, sectionConfig] of Object.entries(savedConfig)) {
    if (!sectionConfig || typeof sectionConfig !== 'object') continue;

    if (!merged[sectionKey]) {
      merged[sectionKey] = { ...sectionConfig };
      continue;
    }

    merged[sectionKey] = { ...merged[sectionKey], ...sectionConfig };
  }

  return merged;
};

export const useSidebar = () => {
  const [statusState] = useContext(StatusContext);
  const [userState] = useContext(UserContext);
  const [userConfig, setUserConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const instanceIdRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);

  if (!instanceIdRef.current) {
    const randomPart = Math.random().toString(16).slice(2);
    instanceIdRef.current = `sidebar-${Date.now()}-${randomPart}`;
  }

  const adminSidebarModules = statusState?.status?.SidebarModulesAdmin;

  // 鑾峰彇绠＄悊鍛橀厤缃?
  const adminConfig = useMemo(() => {
    if (adminSidebarModules) {
      try {
        const config = JSON.parse(adminSidebarModules);
        return mergeAdminConfig(config);
      } catch (error) {
        return mergeAdminConfig(null);
      }
    }
    return mergeAdminConfig(null);
  }, [adminSidebarModules]);

  // 鍔犺浇鐢ㄦ埛閰嶇疆鐨勯€氱敤鏂规硶
  const loadUserConfig = async ({ withLoading } = {}) => {
    const shouldShowLoader =
      typeof withLoading === 'boolean'
        ? withLoading
        : !hasLoadedOnceRef.current;

    try {
      if (shouldShowLoader) {
        setLoading(true);
      }

      const res = await API.get('/api/user/self');
      if (res.data.success && res.data.data.sidebar_modules) {
        let config;
        // 妫€鏌idebar_modules鏄瓧绗︿覆杩樻槸瀵硅薄
        if (typeof res.data.data.sidebar_modules === 'string') {
          config = JSON.parse(res.data.data.sidebar_modules);
        } else {
          config = res.data.data.sidebar_modules;
        }
        setUserConfig(config);
      } else {
        // 褰撶敤鎴锋病鏈夐厤缃椂锛岀敓鎴愪竴涓熀浜庣鐞嗗憳閰嶇疆鐨勯粯璁ょ敤鎴烽厤缃?        // 杩欐牱鍙互纭繚鏉冮檺鎺у埗姝ｇ‘鐢熸晥
        const defaultUserConfig = {};
        Object.keys(adminConfig).forEach((sectionKey) => {
          if (adminConfig[sectionKey]?.enabled) {
            defaultUserConfig[sectionKey] = { enabled: true };
            // 涓烘瘡涓鐞嗗憳鍏佽鐨勬ā鍧楄缃粯璁ゅ€间负true
            Object.keys(adminConfig[sectionKey]).forEach((moduleKey) => {
              if (
                moduleKey !== 'enabled' &&
                adminConfig[sectionKey][moduleKey]
              ) {
                defaultUserConfig[sectionKey][moduleKey] = true;
              }
            });
          }
        });
        setUserConfig(defaultUserConfig);
      }
    } catch (error) {
      // 鍑洪敊鏃朵篃鐢熸垚榛樿閰嶇疆锛岃€屼笉鏄缃负绌哄璞?
      const defaultUserConfig = {};
      Object.keys(adminConfig).forEach((sectionKey) => {
        if (adminConfig[sectionKey]?.enabled) {
          defaultUserConfig[sectionKey] = { enabled: true };
          Object.keys(adminConfig[sectionKey]).forEach((moduleKey) => {
            if (moduleKey !== 'enabled' && adminConfig[sectionKey][moduleKey]) {
              defaultUserConfig[sectionKey][moduleKey] = true;
            }
          });
        }
      });
      setUserConfig(defaultUserConfig);
    } finally {
      if (shouldShowLoader) {
        setLoading(false);
      }
      hasLoadedOnceRef.current = true;
    }
  };

  // 鍒锋柊鐢ㄦ埛閰嶇疆鐨勬柟娉曪紙渚涘閮ㄨ皟鐢級
  const refreshUserConfig = async () => {
    if (Object.keys(adminConfig).length > 0) {
      await loadUserConfig({ withLoading: false });
    }

    // 瑙﹀彂鍏ㄥ眬鍒锋柊浜嬩欢锛岄€氱煡鎵€鏈塽seSidebar瀹炰緥鏇存柊
    sidebarEventTarget.dispatchEvent(
      new CustomEvent(SIDEBAR_REFRESH_EVENT, {
        detail: { sourceId: instanceIdRef.current, skipLoader: true },
      }),
    );
  };

  // 鍔犺浇鐢ㄦ埛閰嶇疆
  useEffect(() => {
    // 鍙湁褰撶鐞嗗憳閰嶇疆鍔犺浇瀹屾垚鍚庢墠鍔犺浇鐢ㄦ埛閰嶇疆
    if (Object.keys(adminConfig).length > 0) {
      loadUserConfig();
    }
  }, [adminConfig]);

  // 鐩戝惉鍏ㄥ眬鍒锋柊浜嬩欢
  useEffect(() => {
    const handleRefresh = (event) => {
      if (event?.detail?.sourceId === instanceIdRef.current) {
        return;
      }

      if (Object.keys(adminConfig).length > 0) {
        loadUserConfig({
          withLoading: event?.detail?.skipLoader ? false : undefined,
        });
      }
    };

    sidebarEventTarget.addEventListener(SIDEBAR_REFRESH_EVENT, handleRefresh);

    return () => {
      sidebarEventTarget.removeEventListener(
        SIDEBAR_REFRESH_EVENT,
        handleRefresh,
      );
    };
  }, [adminConfig]);

  // 璁＄畻鏈€缁堢殑鏄剧ず閰嶇疆
  const finalConfig = useMemo(() => {
    const result = {};

    // 纭繚adminConfig宸插姞杞?
    if (!adminConfig || Object.keys(adminConfig).length === 0) {
      return result;
    }

    // 濡傛灉userConfig鏈姞杞斤紝绛夊緟鍔犺浇瀹屾垚
    if (!userConfig) {
      return result;
    }

    // 閬嶅巻鎵€鏈夊尯鍩?
    Object.keys(adminConfig).forEach((sectionKey) => {
      const adminSection = adminConfig[sectionKey];
      const userSection = userConfig[sectionKey];

      // 濡傛灉绠＄悊鍛樼鐢ㄤ簡鏁翠釜鍖哄煙锛屽垯璇ュ尯鍩熶笉鏄剧ず
      if (!adminSection?.enabled) {
        result[sectionKey] = { enabled: false };
        return;
      }

      // 鍖哄煙绾у埆锛氱敤鎴峰彲浠ラ€夋嫨闅愯棌绠＄悊鍛樺厑璁哥殑鍖哄煙
      // 褰搖serSection瀛樺湪鏃舵鏌nabled鐘舵€侊紝鍚﹀垯榛樿涓簍rue
      const sectionEnabled = userSection ? userSection.enabled !== false : true;
      result[sectionKey] = { enabled: sectionEnabled };

      // 鍔熻兘绾у埆锛氬彧鏈夌鐞嗗憳鍜岀敤鎴烽兘鍏佽鐨勫姛鑳芥墠鏄剧ず
      Object.keys(adminSection).forEach((moduleKey) => {
        if (moduleKey === 'enabled') return;

        const adminAllowed = adminSection[moduleKey];
        // 褰搖serSection瀛樺湪鏃舵鏌ユā鍧楃姸鎬侊紝鍚﹀垯榛樿涓簍rue
        const userAllowed = userSection
          ? userSection[moduleKey] !== false
          : true;

        result[sectionKey][moduleKey] =
          adminAllowed && userAllowed && sectionEnabled;
      });
    });

    return result;
  }, [adminConfig, userConfig]);

  // 妫€鏌ョ壒瀹氬姛鑳芥槸鍚﹀簲璇ユ樉绀?
  const isModuleVisible = (sectionKey, moduleKey = null) => {
    // 鐗规畩澶勭悊锛氫細鍛樺崌绾у姛鑳介渶瑕侀澶栨鏌ュ紑鍏?
    if (sectionKey === 'personal' && moduleKey === 'member_upgrade') {
      const baseVisible = finalConfig[sectionKey]?.[moduleKey] === true;
      if (!baseVisible) return false;

      // 妫€鏌?MemberUpgradeEnabled 寮€鍏?
      const memberUpgradeEnabled = statusState?.status?.MemberUpgradeEnabled;
      if (memberUpgradeEnabled === 'false' || memberUpgradeEnabled === false) {
        return false;
      }

      // 妫€鏌?MemberUpgradeAdminOnly 寮€鍏?
      const memberUpgradeAdminOnly = statusState?.status?.MemberUpgradeAdminOnly;
      const userRole = userState?.user?.role;


      if (memberUpgradeAdminOnly === 'true' || memberUpgradeAdminOnly === true) {
        // 鍙湁绠＄悊鍛樺彲瑙?
        return userRole === 100; // 100 鏄鐞嗗憳瑙掕壊
      }

      return true;
    }

    if (moduleKey) {
      return finalConfig[sectionKey]?.[moduleKey] === true;
    } else {
      return finalConfig[sectionKey]?.enabled === true;
    }
  };

  // 妫€鏌ュ尯鍩熸槸鍚︽湁浠讳綍鍙鐨勫姛鑳?
  const hasSectionVisibleModules = (sectionKey) => {
    const section = finalConfig[sectionKey];
    if (!section?.enabled) return false;

    return Object.keys(section).some(
      (key) => key !== 'enabled' && section[key] === true,
    );
  };

  // 鑾峰彇鍖哄煙鐨勫彲瑙佸姛鑳藉垪琛?
  const getVisibleModules = (sectionKey) => {
    const section = finalConfig[sectionKey];
    if (!section?.enabled) return [];

    return Object.keys(section).filter(
      (key) => key !== 'enabled' && section[key] === true,
    );
  };

  return {
    loading,
    adminConfig,
    userConfig,
    finalConfig,
    isModuleVisible,
    hasSectionVisibleModules,
    getVisibleModules,
    refreshUserConfig,
  };
};
