import React, { useEffect, useMemo, useState } from 'react';
import UserGroupIcon from '../common/UserGroupIcon';
import { normalizeUserGroupText } from '../../helpers/userGroupIcon';
import { API } from '../../helpers';

const LAST_GROUP_STORAGE_PREFIX = 'user_group_welcome_last_group';
const LAST_SIGNATURE_STORAGE_PREFIX = 'user_group_welcome_last_signature';
const LAST_SHOWN_AT_STORAGE_PREFIX = 'user_group_welcome_last_shown_at';
const MAX_WELCOME_OVERLAY_DURATION_SECONDS = 7 * 24 * 60 * 60;

const normalizeWelcomeOverlayConfig = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const svg = String(value.svg || '').trim();
  if (!svg) {
    return null;
  }

  const autoCloseSeconds = Math.max(
    0,
    Math.min(
      MAX_WELCOME_OVERLAY_DURATION_SECONDS,
      Number.parseInt(value.auto_close_seconds, 10) || 0,
    ),
  );
  const repeatIntervalSeconds = Math.max(
    0,
    Math.min(
      MAX_WELCOME_OVERLAY_DURATION_SECONDS,
      Number.parseInt(value.repeat_interval_seconds, 10) || 0,
    ),
  );

  return {
    svg,
    autoCloseSeconds,
    repeatIntervalSeconds,
  };
};

const resolveWelcomeOverlayConfig = ({
  currentGroup,
  currentGroupDisplayName,
  overlays,
  userUsableGroups,
}) => {
  const overlayMap = overlays || {};
  const normalizedMap = new Map(
    Object.entries(overlayMap).map(([key, value]) => [
      normalizeUserGroupText(key),
      normalizeWelcomeOverlayConfig(value),
    ]),
  );

  const pickOverlay = (candidate) => {
    const directOverlay = normalizeWelcomeOverlayConfig(overlayMap?.[candidate]);
    if (directOverlay) {
      return directOverlay;
    }
    return normalizedMap.get(normalizeUserGroupText(candidate)) || null;
  };

  const candidates = [currentGroup, currentGroupDisplayName];
  Object.entries(userUsableGroups || {}).forEach(([groupKey, groupLabel]) => {
    const normalizedCurrent = normalizeUserGroupText(currentGroup);
    const normalizedDisplay = normalizeUserGroupText(currentGroupDisplayName);
    const normalizedKey = normalizeUserGroupText(groupKey);
    const normalizedLabel = normalizeUserGroupText(groupLabel);
    if (
      normalizedKey === normalizedCurrent ||
      normalizedLabel === normalizedCurrent ||
      normalizedKey === normalizedDisplay ||
      normalizedLabel === normalizedDisplay
    ) {
      candidates.push(groupKey, groupLabel);
    }
  });

  for (const candidate of candidates) {
    const matched = pickOverlay(candidate);
    if (matched) {
      return matched;
    }
  }

  return null;
};

const UserGroupWelcomeOverlay = ({ isConsoleRoute, user, status }) => {
  const [visible, setVisible] = useState(false);
  const [verifiedGroup, setVerifiedGroup] = useState('');
  const [groupVerified, setGroupVerified] = useState(false);
  const cachedStatus = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('status') || '{}');
    } catch (_) {
      return {};
    }
  }, [status]);

  const currentGroup = user?.group || 'default';
  const currentUserId = user?.id || 'guest';
  const effectiveGroup = groupVerified ? verifiedGroup || currentGroup : '';
  const userUsableGroups = {
    ...(status?.user_usable_groups || {}),
    ...(cachedStatus?.user_usable_groups || {}),
  };
  const currentGroupDisplayName =
    userUsableGroups?.[effectiveGroup] || effectiveGroup;
  const welcomeOverlays = {
    ...(status?.user_group_welcome_overlays || {}),
    ...(cachedStatus?.user_group_welcome_overlays || {}),
  };

  useEffect(() => {
    let alive = true;

    if (!isConsoleRoute || !currentUserId || currentUserId === 'guest') {
      setVerifiedGroup(currentGroup || '');
      setGroupVerified(true);
      return () => {
        alive = false;
      };
    }

    setGroupVerified(false);
    API.get('/api/user/self', {
      skipErrorHandler: true,
      disableDuplicate: true,
    })
      .then((res) => {
        if (!alive) {
          return;
        }
        if (res.data?.success) {
          setVerifiedGroup(String(res.data.data?.group || '').trim() || 'default');
          return;
        }
        setVerifiedGroup(currentGroup || '');
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setVerifiedGroup(currentGroup || '');
      })
      .finally(() => {
        if (alive) {
          setGroupVerified(true);
        }
      });

    return () => {
      alive = false;
    };
  }, [currentGroup, currentUserId, isConsoleRoute]);

  const overlayConfig = useMemo(
    () =>
      resolveWelcomeOverlayConfig({
        currentGroup: effectiveGroup,
        currentGroupDisplayName,
        overlays: welcomeOverlays,
        userUsableGroups,
      }),
    [effectiveGroup, currentGroupDisplayName, userUsableGroups, welcomeOverlays],
  );

  const overlaySignature = useMemo(() => {
    if (!overlayConfig?.svg) {
      return '';
    }
    return JSON.stringify({
      group: normalizeUserGroupText(effectiveGroup),
      svg: overlayConfig.svg,
      autoCloseSeconds: overlayConfig.autoCloseSeconds,
      repeatIntervalSeconds: overlayConfig.repeatIntervalSeconds,
    });
  }, [effectiveGroup, overlayConfig]);

  useEffect(() => {
    if (!isConsoleRoute || !effectiveGroup) {
      setVisible(false);
      return;
    }

    const now = Date.now();
    const normalizedCurrentGroup = normalizeUserGroupText(effectiveGroup);
    const groupStorageKey = `${LAST_GROUP_STORAGE_PREFIX}_${currentUserId}`;
    const signatureStorageKey = `${LAST_SIGNATURE_STORAGE_PREFIX}_${currentUserId}`;
    const lastShownAtStorageKey = `${LAST_SHOWN_AT_STORAGE_PREFIX}_${currentUserId}`;
    const lastGroup = normalizeUserGroupText(
      localStorage.getItem(groupStorageKey),
    );
    const lastSignature = localStorage.getItem(signatureStorageKey) || '';
    const lastShownAt = Number.parseInt(
      localStorage.getItem(lastShownAtStorageKey) || '0',
      10,
    );
    const hasGroupChanged = lastGroup !== normalizedCurrentGroup;
    const hasOverlayChanged =
      Boolean(overlaySignature) && lastSignature !== overlaySignature;

    localStorage.setItem(groupStorageKey, normalizedCurrentGroup);

    if (!overlaySignature) {
      setVisible(false);
      return;
    }

    if (hasGroupChanged || hasOverlayChanged) {
      localStorage.setItem(signatureStorageKey, overlaySignature);
      localStorage.setItem(lastShownAtStorageKey, String(now));
      setVisible(true);
      return;
    }

    if (!overlayConfig?.repeatIntervalSeconds) {
      return;
    }

    const repeatIntervalMs = overlayConfig.repeatIntervalSeconds * 1000;
    if (!lastShownAt || now - lastShownAt >= repeatIntervalMs) {
      localStorage.setItem(signatureStorageKey, overlaySignature);
      localStorage.setItem(lastShownAtStorageKey, String(now));
      setVisible(true);
    }
  }, [
    currentUserId,
    effectiveGroup,
    isConsoleRoute,
    overlayConfig?.repeatIntervalSeconds,
    overlaySignature,
  ]);

  useEffect(() => {
    if (
      !isConsoleRoute ||
      !effectiveGroup ||
      !overlaySignature ||
      !overlayConfig?.repeatIntervalSeconds ||
      visible
    ) {
      return undefined;
    }

    const lastShownAtStorageKey = `${LAST_SHOWN_AT_STORAGE_PREFIX}_${currentUserId}`;
    const signatureStorageKey = `${LAST_SIGNATURE_STORAGE_PREFIX}_${currentUserId}`;
    const lastShownAt = Number.parseInt(
      localStorage.getItem(lastShownAtStorageKey) || '0',
      10,
    );
    const repeatIntervalMs = overlayConfig.repeatIntervalSeconds * 1000;
    const delayMs = lastShownAt
      ? Math.max(0, repeatIntervalMs - (Date.now() - lastShownAt))
      : 0;

    const timer = window.setTimeout(() => {
      localStorage.setItem(signatureStorageKey, overlaySignature);
      localStorage.setItem(lastShownAtStorageKey, String(Date.now()));
      setVisible(true);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    currentUserId,
    effectiveGroup,
    isConsoleRoute,
    overlayConfig?.repeatIntervalSeconds,
    overlaySignature,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !overlayConfig?.autoCloseSeconds) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, overlayConfig.autoCloseSeconds * 1000);

    return () => window.clearTimeout(timer);
  }, [visible, overlayConfig]);

  if (!visible || !overlayConfig?.svg || !isConsoleRoute) {
    return null;
  }

  return (
    <div
      className='fixed inset-0 z-[1000] cursor-pointer overflow-hidden'
      onClick={() => setVisible(false)}
    >
      <div className='flex h-full w-full items-center justify-center overflow-hidden'>
        <UserGroupIcon
          value={overlayConfig.svg}
          alt={`${effectiveGroup || 'group'}-welcome`}
          wrapperClassName='flex h-full w-full items-center justify-center overflow-hidden'
          imgClassName='h-full w-full object-contain'
          svgClassName='block h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full'
        />
      </div>
    </div>
  );
};

export default UserGroupWelcomeOverlay;
