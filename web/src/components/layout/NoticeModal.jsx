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

import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  Button,
  Modal,
  Empty,
  Tabs,
  TabPane,
  Timeline,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError, getRelativeTime } from '../../helpers';
import { marked } from 'marked';
import {
  IllustrationNoContent,
  IllustrationNoContentDark,
} from '@douyinfe/semi-illustrations';
import { StatusContext } from '../../context/Status';
import { Bell, Megaphone } from 'lucide-react';

const NoticeModal = ({
  visible,
  onClose,
  isMobile,
  defaultTab = 'inApp',
  unreadKeys = [],
  claudeStyle = false,
  onlyInApp = false,
}) => {
  const { t } = useTranslation();
  const [noticeContent, setNoticeContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [statusState] = useContext(StatusContext);

  const announcements = statusState?.status?.announcements || [];

  const unreadSet = useMemo(() => new Set(unreadKeys), [unreadKeys]);

  const getKeyForItem = (item) =>
    `${item?.publishDate || ''}-${(item?.content || '').slice(0, 30)}`;

  const getPublishTimestamp = (item) => {
    if (!item?.publishDate) return 0;
    const ts = new Date(item.publishDate).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  };

  const formatPublishDate = (publishDate) => {
    if (!publishDate) return '';
    const pubDate = new Date(publishDate);
    if (Number.isNaN(pubDate.getTime())) return publishDate;
    return `${pubDate.getFullYear()}年${pubDate.getMonth() + 1}月${pubDate.getDate()}日`;
  };

  const formatPublishTime = (publishDate) => {
    if (!publishDate) return '';
    const pubDate = new Date(publishDate);
    if (Number.isNaN(pubDate.getTime())) return publishDate;
    return `${pubDate.getFullYear()}-${String(pubDate.getMonth() + 1).padStart(2, '0')}-${String(pubDate.getDate()).padStart(2, '0')} ${String(pubDate.getHours()).padStart(2, '0')}:${String(pubDate.getMinutes()).padStart(2, '0')}`;
  };

  const processedAnnouncements = useMemo(() => {
    return (announcements || [])
      .slice()
      .sort((a, b) => getPublishTimestamp(b) - getPublishTimestamp(a))
      .slice(0, 20)
      .map((item) => ({
        key: getKeyForItem(item),
        type: item.type || 'default',
        publishDate: item.publishDate,
        publishDateLabel: formatPublishDate(item.publishDate),
        time: formatPublishTime(item.publishDate),
        content: item.content,
        extra: item.extra,
        relative: getRelativeTime(item.publishDate),
        isUnread: unreadSet.has(getKeyForItem(item)),
      }));
  }, [announcements, unreadSet]);

  const latestAnnouncement = processedAnnouncements[0];

  const displayNotice = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/notice');
      const { success, message, data } = res.data;
      if (success) {
        if (data !== '') {
          const htmlNotice = marked.parse(data);
          setNoticeContent(htmlNotice);
        } else {
          setNoticeContent('');
        }
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;

    if (claudeStyle) {
      setNoticeContent('');
      setLoading(false);
      return;
    }

    displayNotice();
  }, [visible, claudeStyle]);

  useEffect(() => {
    if (visible) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, visible]);

  const renderEmpty = (description) => (
    <div className='py-12'>
      <Empty
        image={<IllustrationNoContent style={{ width: 150, height: 150 }} />}
        darkModeImage={
          <IllustrationNoContentDark style={{ width: 150, height: 150 }} />
        }
        description={description}
      />
    </div>
  );

  const renderMarkdownNotice = () => {
    if (loading) {
      return (
        <div className='py-12'>
          <Empty description={t('加载�?..')} />
        </div>
      );
    }

    if (!noticeContent) {
      return renderEmpty(t('暂无公告'));
    }

    return (
      <div
        dangerouslySetInnerHTML={{ __html: noticeContent }}
        className='claude-notice-scroll notice-content-scroll claude-notice-markdown'
      />
    );
  };

  const renderAnnouncementArticle = (item, featured = false) => {
    const htmlContent = marked.parse(item.content || '');
    const htmlExtra = item.extra ? marked.parse(item.extra) : '';
    const timeText = `${item.relative ? item.relative + ' · ' : ''}${item.time}`;

    return (
      <article
        key={item.key}
        className={
          featured ? 'claude-announcement-featured' : 'claude-announcement-mini'
        }
      >
        <div className='claude-announcement-meta'>
          <span
            className={`claude-announcement-dot claude-announcement-dot-${item.type}`}
          />
          <span>{timeText}</span>
          {item.isUnread && (
            <span className='claude-announcement-new'>NEW</span>
          )}
        </div>
        <div
          className={`claude-notice-markdown ${item.isUnread ? 'shine-text' : ''}`}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        {htmlExtra && (
          <div
            className='claude-announcement-note'
            dangerouslySetInnerHTML={{ __html: htmlExtra }}
          />
        )}
      </article>
    );
  };

  const renderAnnouncementTimeline = () => {
    if (processedAnnouncements.length === 0) {
      return renderEmpty(t('暂无系统公告'));
    }

    const olderAnnouncements = processedAnnouncements.slice(1);

    return (
      <div className='claude-notice-scroll notice-content-scroll'>
        {renderAnnouncementArticle(latestAnnouncement, true)}
        {olderAnnouncements.length > 0 && (
          <div className='claude-announcement-history'>
            <div className='claude-announcement-history-title'>
              {t('历史公告')}
            </div>
            <div className='claude-announcement-history-list'>
              {olderAnnouncements.map((item) =>
                renderAnnouncementArticle(item),
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLatestSystemAnnouncement = () => {
    if (!latestAnnouncement) {
      return renderEmpty(t('\u6682\u65e0\u7cfb\u7edf\u516c\u544a'));
    }

    const htmlContent = marked.parse(latestAnnouncement.content || '');
    const htmlExtra = latestAnnouncement.extra
      ? marked.parse(latestAnnouncement.extra)
      : '';

    return (
      <div className='claude-notice-scroll notice-content-scroll'>
        <div
          className='claude-notice-markdown'
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        {htmlExtra && (
          <div
            className='claude-announcement-note'
            dangerouslySetInnerHTML={{ __html: htmlExtra }}
          />
        )}
      </div>
    );
  };

  const renderLegacyMarkdownNotice = () => {
    if (loading) {
      return (
        <div className='py-12'>
          <Empty description={t('加载�?..')} />
        </div>
      );
    }

    if (!noticeContent) {
      return renderEmpty(t('暂无公告'));
    }

    return (
      <div
        dangerouslySetInnerHTML={{ __html: noticeContent }}
        className='notice-content-scroll max-h-[55vh] overflow-y-auto pr-2'
      />
    );
  };

  const renderLegacyAnnouncementTimeline = () => {
    if (processedAnnouncements.length === 0) {
      return renderEmpty(t('暂无系统公告'));
    }

    return (
      <div className='max-h-[55vh] overflow-y-auto pr-2 card-content-scroll'>
        <Timeline mode='left'>
          {processedAnnouncements.map((item, idx) => {
            const htmlContent = marked.parse(item.content || '');
            const htmlExtra = item.extra ? marked.parse(item.extra) : '';
            return (
              <Timeline.Item
                key={idx}
                type={item.type}
                time={`${item.relative ? item.relative + ' ' : ''}${item.time}`}
                extra={
                  item.extra ? (
                    <div
                      className='text-xs text-gray-500'
                      dangerouslySetInnerHTML={{ __html: htmlExtra }}
                    />
                  ) : null
                }
              >
                <div>
                  <div
                    className={item.isUnread ? 'shine-text' : ''}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </div>
    );
  };

  const renderBody = () => {
    if (activeTab === 'inApp') {
      return renderMarkdownNotice();
    }
    return renderAnnouncementTimeline();
  };

  const modalTime = latestAnnouncement?.time || latestAnnouncement?.publishDateLabel || '';

  if (!claudeStyle) {
    return (
      <Modal
        title={t('系统公告')}
        visible={visible}
        onCancel={onClose}
        footer={
          <div className='flex justify-end'>
            <Button type='primary' onClick={onClose}>
              {t('关闭公告')}
            </Button>
          </div>
        }
        size={isMobile ? 'full-width' : 'large'}
      >
        {!onlyInApp && (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type='button'
            style={{ marginBottom: 16 }}
          >
            <TabPane
              tab={
                <span className='flex items-center gap-1'>
                  <Bell size={14} /> {t('通知')}
                </span>
              }
              itemKey='inApp'
            />
            <TabPane
              tab={
                <span className='flex items-center gap-1'>
                  <Megaphone size={14} /> {t('系统公告')}
                </span>
              }
              itemKey='system'
            />
          </Tabs>
        )}
        {onlyInApp || activeTab === 'inApp'
          ? renderLegacyMarkdownNotice()
          : renderLegacyAnnouncementTimeline()}
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <div className='claude-notice-title-wrap'>
          <div className='claude-notice-title-row'>
            <div className='claude-notice-title-icon'>
              <Megaphone size={24} />
            </div>
            <div className='claude-notice-title-area'>
              <div className='claude-notice-title-text'>{t('\u7cfb\u7edf\u516c\u544a')}</div>
              {modalTime && (
                <div className='claude-notice-title-time'>
                  <span className='claude-notice-time-dot' />
                  {modalTime}
                </div>
              )}
            </div>
          </div>
        </div>
      }
      visible={visible}
      onCancel={onClose}
      footer={
        <div className='claude-notice-footer'>
          <Button
            theme='solid'
            type='primary'
            className='claude-notice-primary-btn'
            onClick={onClose}
          >
            {t('我知道了')}
          </Button>
        </div>
      }
      size={isMobile ? 'full-width' : 'large'}
      className='claude-notice-modal'
      maskClosable={false}
      closeOnEsc={false}
      maskStyle={{
        background: 'rgba(255, 255, 255, 0.34)',
        backdropFilter: 'blur(10px) saturate(125%)',
        WebkitBackdropFilter: 'blur(10px) saturate(125%)',
      }}
      style={
        isMobile
          ? { maxWidth: 'calc(100vw - 24px)' }
          : { width: 520, maxWidth: 'calc(100vw - 32px)' }
      }
      bodyStyle={{ padding: '0 32px 16px' }}
    >
      {renderLatestSystemAnnouncement()}
    </Modal>

  );
};

export default NoticeModal;
