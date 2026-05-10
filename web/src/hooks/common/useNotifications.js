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

import { useState, useEffect, useCallback, useMemo } from 'react';

export const useNotifications = (statusState) => {
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const announcements = statusState?.status?.announcements || [];

  // Helper functions
  const getAnnouncementKey = useCallback((a) =>
    `${a?.publishDate || ''}-${(a?.content || '').slice(0, 30)}`, []);

  const getAnnouncementTimestamp = useCallback((announcement) => {
    if (!announcement?.publishDate) return 0;
    const timestamp = new Date(announcement.publishDate).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }, []);

  const getStoredReadKeys = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('notice_read_keys')) || [];
    } catch (_) {
      return [];
    }
  }, []);

  const saveReadKeys = useCallback((keys) => {
    localStorage.setItem('notice_read_keys', JSON.stringify(keys));
  }, []);

  const sortedAnnouncements = useMemo(
    () =>
      announcements
        .slice()
        .sort(
          (a, b) => getAnnouncementTimestamp(b) - getAnnouncementTimestamp(a),
        ),
    [announcements, getAnnouncementTimestamp],
  );

  const latestAnnouncement = sortedAnnouncements[0] || null;
  const latestAnnouncementKey = latestAnnouncement
    ? getAnnouncementKey(latestAnnouncement)
    : '';
  const latestAnnouncementReadSet = new Set(getStoredReadKeys());

  const calculateUnreadCount = useCallback(() => {
    if (!announcements.length) return 0;
    const readKeys = getStoredReadKeys();
    const readSet = new Set(readKeys);
    return announcements.filter((a) => !readSet.has(getAnnouncementKey(a)))
      .length;
  }, [announcements, getAnnouncementKey, getStoredReadKeys]);

  const getUnreadKeys = useCallback(() => {
    if (!announcements.length) return [];
    const readKeys = getStoredReadKeys();
    const readSet = new Set(readKeys);
    return announcements
      .filter((a) => !readSet.has(getAnnouncementKey(a)))
      .map(getAnnouncementKey);
  }, [announcements, getAnnouncementKey, getStoredReadKeys]);

  const isLatestAnnouncementUnread =
    !!latestAnnouncementKey &&
    !latestAnnouncementReadSet.has(latestAnnouncementKey);

  const markAnnouncementsAsRead = useCallback(
    (keys = []) => {
      if (!keys.length) return;
      const mergedKeys = Array.from(
        new Set([...getStoredReadKeys(), ...keys.filter(Boolean)]),
      );
      saveReadKeys(mergedKeys);
      setUnreadCount(calculateUnreadCount());
    },
    [calculateUnreadCount, getStoredReadKeys, saveReadKeys],
  );

  // Effects
  useEffect(() => {
    setUnreadCount(calculateUnreadCount());
  }, [calculateUnreadCount]);

  // Actions
  const handleNoticeOpen = useCallback(() => {
    setNoticeVisible(true);
  }, []);

  const handleNoticeClose = useCallback(() => {
    setNoticeVisible(false);
    if (announcements.length) {
      markAnnouncementsAsRead(announcements.map(getAnnouncementKey));
    }
  }, [announcements, getAnnouncementKey, markAnnouncementsAsRead]);

  const handleLatestAnnouncementClose = useCallback(() => {
    setNoticeVisible(false);
    if (latestAnnouncementKey) {
      markAnnouncementsAsRead([latestAnnouncementKey]);
    }
  }, [latestAnnouncementKey, markAnnouncementsAsRead]);

  return {
    noticeVisible,
    unreadCount,
    announcements,
    latestAnnouncement,
    latestAnnouncementKey,
    isLatestAnnouncementUnread,
    handleNoticeOpen,
    handleNoticeClose,
    handleLatestAnnouncementClose,
    getUnreadKeys,
  };
};
