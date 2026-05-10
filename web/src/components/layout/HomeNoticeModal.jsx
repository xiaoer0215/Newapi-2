import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API, setStatusData } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import NoticeModal from './NoticeModal';

const HomeNoticeModal = () => {
  const isMobile = useIsMobile();
  const [legacyNotice, setLegacyNotice] = useState('');
  const [loadedLegacyNotice, setLoadedLegacyNotice] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const closedKeyRef = useRef('');
  const legacyKey = useMemo(
    () => `legacy-${(legacyNotice || '').slice(0, 80)}`,
    [legacyNotice],
  );
  const legacyReadKey = `home_notice_read_${legacyKey}`;

  useEffect(() => {
    let cancelled = false;

    async function loadHomeNoticeData() {
      try {
        const statusRes = await API.get('/api/status');
        if (!cancelled && statusRes.data?.success) {
          setStatusData(statusRes.data.data);
        }

        const noticeRes = await API.get('/api/notice');
        if (!cancelled && noticeRes.data?.success) {
          setLegacyNotice(noticeRes.data.data || '');
        }
      } finally {
        if (!cancelled) {
          setLoadedLegacyNotice(true);
        }
      }
    }

    loadHomeNoticeData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      loadedLegacyNotice &&
      legacyNotice.trim() &&
      !localStorage.getItem(legacyReadKey) &&
      !noticeVisible &&
      closedKeyRef.current !== legacyKey
    ) {
      setNoticeVisible(true);
    }
  }, [
    legacyNotice,
    legacyReadKey,
    loadedLegacyNotice,
    noticeVisible,
    legacyKey,
  ]);

  const closeHomeNotice = () => {
    if (legacyNotice.trim()) {
      localStorage.setItem(legacyReadKey, '1');
    }
    closedKeyRef.current = legacyKey;
    setNoticeVisible(false);
  };

  if (!legacyNotice.trim()) {
    return null;
  }

  return (
    <NoticeModal
      visible={noticeVisible}
      onClose={closeHomeNotice}
      isMobile={isMobile}
      defaultTab='inApp'
      unreadKeys={[]}
      claudeStyle={false}
      onlyInApp
    />
  );
};

export default HomeNoticeModal;
