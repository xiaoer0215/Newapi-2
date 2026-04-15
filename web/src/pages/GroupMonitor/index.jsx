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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { InputNumber, Select, Spin, Switch } from '@douyinfe/semi-ui';
import { API, isAdmin, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';

/* ─── Status config ─────────────────────────────────────────────────────────── */
const STATUS_STYLE = {
  green:  {
    blockColor:  '#10b981',
    badgeBg:     '#ecfdf5',
    badgeColor:  '#047857',
    badgeBorder: '#a7f3d0',
    dotColor:    '#10b981',
    metricColor: '#10b981',
  },
  orange: {
    blockColor:  '#f59e0b',
    badgeBg:     '#fffbeb',
    badgeColor:  '#b45309',
    badgeBorder: '#fcd34d',
    dotColor:    '#f59e0b',
    metricColor: '#f59e0b',
  },
  red:    {
    blockColor:  '#ef4444',
    badgeBg:     '#fef2f2',
    badgeColor:  '#b91c1c',
    badgeBorder: '#fecaca',
    dotColor:    '#ef4444',
    metricColor: '#ef4444',
  },
  empty:  {
    blockColor:  '#e2e8f0',
    badgeBg:     '#f8fafc',
    badgeColor:  '#64748b',
    badgeBorder: '#e2e8f0',
    dotColor:    '#94a3b8',
    metricColor: '#94a3b8',
  },
};

const getStatusLabel = (key, t) => {
  const labels = {
    green:  t('运行良好'),
    orange: t('状态降级'),
    red:    t('状态异常'),
    empty:  t('暂无数据'),
  };
  return labels[key] || key;
};

/* ─── Window config ─────────────────────────────────────────────────────────── */
const WINDOW_OPTIONS = [
  { label: '1小时', value: '1h' },
  { label: '6小时', value: '6h' },
  { label: '12小时', value: '12h' },
  { label: '24小时', value: '24h' },
];

// Bucket duration in seconds for each window (must match backend windowParams)
const BUCKET_SECS = { '1h': 60, '6h': 360, '12h': 1800, '24h': 3600 };

// How many of the last buckets represent ~1 hour
const LAST_HOUR_BUCKETS = { '1h': 60, '6h': 10, '12h': 2, '24h': 1 };

const getRecentHourStats = (buckets, windowKey) => {
  const lastN = LAST_HOUR_BUCKETS[windowKey] || 1;
  const tail = (buckets || []).slice(-lastN);
  const totalCount = tail.reduce((sum, bucket) => sum + (bucket?.total_count || 0), 0);
  const successCount = tail.reduce((sum, bucket) => sum + (bucket?.success_count || 0), 0);
  const errorCount = tail.reduce((sum, bucket) => sum + (bucket?.error_count || 0), 0);

  return {
    totalCount,
    successCount,
    errorCount,
    successRate: totalCount > 0 ? (successCount / totalCount * 100) : null,
  };
};

/* ─── Custom tooltip via Portal (avoids backdrop-filter stacking context) ───── */
function BlockTooltip({ content, children }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos]         = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
    setVisible(true);
  };

  const tooltip = visible && content ? ReactDOM.createPortal(
    <div style={{
      position: 'absolute',
      left: pos.x,
      top: pos.y - 9,
      transform: 'translate(-50%, -100%)',
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      color: '#f8fafc',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.5,
      whiteSpace: 'pre',
      pointerEvents: 'none',
      zIndex: 99999,
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      textAlign: 'center',
      minWidth: 130,
    }}>
      {content}
      <div style={{
        position: 'absolute',
        bottom: -5, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid rgba(15,23,42,0.95)',
      }} />
    </div>,
    document.body,
  ) : null;

  return (
    <div
      style={{ flex: 1, height: '100%' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {tooltip}
    </div>
  );
}

/* ─── Timeline blocks (renders buckets directly, no merging) ───────────────── */
function TrendMetric({ value, label, color, mini = false }) {
  return (
    <div style={{ textAlign: 'right', minWidth: mini ? 68 : 82 }}>
      <div style={{
        fontSize: mini ? 14 : 15,
        fontWeight: 700,
        lineHeight: 1.1,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        marginTop: 4,
        fontSize: mini ? 10 : 11,
        color: '#94a3b8',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
    </div>
  );
}

function TimelineBlocks({ buckets, baseTime, windowKey, mini }) {
  const { t } = useTranslation();
  const bucketSecs = BUCKET_SECS[windowKey] || 1440;
  const items = buckets || [];

  const timeLabels = {
    '1h':  [t('60m前'), t('30m前'), t('现在')],
    '6h':  [t('6小时前'), t('3小时前'), t('现在')],
    '12h': [t('12小时前'), t('6小时前'), t('现在')],
    '24h': [t('24小时前'), t('12小时前'), t('现在')],
  };
  const labels = timeLabels[windowKey] || timeLabels['24h'];

  const trackHeight = mini ? 20 : 32;

  return (
    <div>
      {/* Track */}
      <div className='gm-timeline-track' style={{
        display: 'flex',
        gap: mini ? 1.5 : 2,
        height: trackHeight,
        padding: mini ? 1.5 : 2,
        background: '#f8fafc',
        borderRadius: mini ? 4 : 6,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {items.map((h, i) => {
          const isEmpty = !h || h.total_count === 0;
          const cfg     = STATUS_STYLE[isEmpty ? 'empty' : (h?.status || 'empty')];

          let tip = '';
          if (baseTime != null) {
            const bStart = new Date((baseTime + i * bucketSecs) * 1000);
            const bEnd   = new Date((baseTime + (i + 1) * bucketSecs) * 1000);
            const fmt    = (d) => {
              const mo = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              return `${mo}/${dd} ${hh}:${mm}`;
            };
            if (isEmpty) {
              tip = `${fmt(bStart)} – ${fmt(bEnd)}\n${t('无请求')}`;
            } else {
              const errLine = `\n${t('失败')}  ${(h.error_count || 0).toLocaleString()} ${t('次')}`;
              tip = `${fmt(bStart)} – ${fmt(bEnd)}\n${t('成功率')}  ${h.success_rate.toFixed(1)}%${errLine}`;
            }
          }

          return (
            <BlockTooltip key={i} content={tip}>
              <div
                style={{
                  flex: 1,
                  height: '100%',
                  background: cfg.blockColor,
                  borderRadius: mini ? 3 : 4,
                  cursor: 'default',
                  transition: 'all 0.2s ease',
                  opacity: isEmpty ? 0.5 : 1,
                  boxShadow: isEmpty ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.filter = 'brightness(0.88)';
                  e.currentTarget.style.transform = 'scaleY(1.1)';
                  e.currentTarget.style.transformOrigin = 'center';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.filter = '';
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = isEmpty ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.2)';
                }}
              />
            </BlockTooltip>
          );
        })}
      </div>
      {/* Time labels */}
      {!mini && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 10, padding: '0 4px',
          fontSize: 12, color: '#64748b', fontWeight: 500,
        }}>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
          <span>{labels[2]}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Model sub-row ────────────────────────────────────────────────────────── */
function ModelRow({ ms, baseTime, windowKey }) {
  const { t } = useTranslation();
  const buckets = ms.buckets || [];
  const { errorCount, successRate: pct } = getRecentHourStats(buckets, windowKey);

  let statusKey = 'empty';
  if (pct !== null) {
    if (pct >= 80) statusKey = 'green';
    else if (pct >= 60) statusKey = 'orange';
    else statusKey = 'red';
  }
  const cfg = STATUS_STYLE[statusKey];

  return (
    <div style={{
      padding: '12px 0',
      borderTop: '1px solid #f1f5f9',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 6,
            fontSize: 12, fontWeight: 500,
            background: cfg.badgeBg, color: cfg.badgeColor,
            border: `1px solid ${cfg.badgeBorder}`,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: cfg.dotColor, display: 'inline-block', flexShrink: 0,
            }} />
            {getStatusLabel(statusKey, t)}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 500, color: '#334155',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400,
          }}>
            {ms.model_name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <TrendMetric
            value={pct !== null ? `${pct.toFixed(1)}%` : '-'}
            label={t('成功率 (1H)')}
            color={cfg.metricColor}
            mini
          />
          <TrendMetric
            value={errorCount.toLocaleString()}
            label={t('失败次数 (1H)')}
            color={errorCount > 0 ? '#ef4444' : '#94a3b8'}
            mini
          />
        </div>
      </div>
      <TimelineBlocks buckets={buckets} baseTime={baseTime} windowKey={windowKey} mini />
    </div>
  );
}

/* ─── Single group row (compact card) ──────────────────────────────────────── */
function GroupRow({ stat, modelStats, windowKey, showModelToggle }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const buckets  = stat.buckets || [];
  const baseTime = stat.updated_at ? stat.updated_at - (buckets.length * (BUCKET_SECS[windowKey] || 1440)) : null;

  const { errorCount, successRate: pct } = getRecentHourStats(buckets, windowKey);
  const pctStr   = pct !== null ? pct.toFixed(1) : '-';

  let overallStatus = 'empty';
  if (pct !== null) {
    if (pct >= 80) overallStatus = 'green';
    else if (pct >= 60) overallStatus = 'orange';
    else overallStatus = 'red';
  }

  const cfg = STATUS_STYLE[overallStatus];
  const hasModels = modelStats && modelStats.length > 0;

  return (
    <div
      className='gm-card'
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
        padding: '14px 16px',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Card header: icon + group name + badge ... percentage + count */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, gap: 8,
      }}>
        {/* Left: group icon + name + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {/* Group icon */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            background: '#f1f5f9',
            fontSize: 13,
          }}>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <rect x='3' y='3' width='7' height='7' /><rect x='14' y='3' width='7' height='7' /><rect x='14' y='14' width='7' height='7' /><rect x='3' y='14' width='7' height='7' />
            </svg>
          </span>
          <span style={{
            fontWeight: 600, fontSize: 14, color: '#0f172a', letterSpacing: '-0.1px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {stat.group}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
            padding: '2px 8px', borderRadius: 999,
            fontSize: 11, fontWeight: 500,
            background: cfg.badgeBg, color: cfg.badgeColor,
            border: `1px solid ${cfg.badgeBorder}`,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: cfg.dotColor, display: 'inline-block', flexShrink: 0,
            }} />
            {getStatusLabel(overallStatus, t)}
          </span>
        </div>

        {/* Right: recent 1H success rate + error count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <TrendMetric
            value={`${pctStr}${pct !== null ? '%' : ''}`}
            label={t('成功率 (1H)')}
            color={cfg.metricColor}
          />
          <div style={{
            width: 1,
            height: 30,
            background: '#e2e8f0',
            flexShrink: 0,
          }} />
          <TrendMetric
            value={errorCount.toLocaleString()}
            label={t('失败次数 (1H)')}
            color={errorCount > 0 ? '#ef4444' : '#94a3b8'}
          />
        </div>
      </div>

      {/* Timeline */}
      <TimelineBlocks buckets={buckets} baseTime={baseTime} windowKey={windowKey} />

      {/* Model expand toggle */}
      {showModelToggle && hasModels && (
        <>
          <div
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginTop: 12, padding: '4px 0',
              cursor: 'pointer', userSelect: 'none',
              fontSize: 12, fontWeight: 500, color: '#64748b',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#334155'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
          >
            <svg
              width='12' height='12' viewBox='0 0 24 24' fill='none'
              stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
              style={{
                transition: 'transform 0.2s ease',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <polyline points='9 18 15 12 9 6' />
            </svg>
            {expanded
              ? t('收起模型详情')
              : `${t('展开模型详情')} (${modelStats.length})`
            }
          </div>

          {expanded && (
            <div style={{ marginTop: 4 }}>
              {modelStats
                .sort((a, b) => b.total_count - a.total_count)
                .map((ms) => (
                  <ModelRow
                    key={ms.model_name}
                    ms={ms}
                    baseTime={baseTime}
                    windowKey={windowKey}
                  />
                ))
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Glass section wrapper (admin config) ──────────────────────────────────── */
function GlassSection({ title, icon, children }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '24px 28px',
      boxShadow: '0 1px 3px rgba(15,23,42,0.02)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg,#4F46E5,#818CF8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          boxShadow: '0 4px 10px rgba(79,70,229,0.25)',
        }}>{icon}</div>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */
export default function GroupMonitorPage() {
  const { t } = useTranslation();
  const admin = isAdmin();

  const [stats, setStats]                 = useState([]);
  const [modelDetail, setModelDetail]     = useState({});
  const [canSeeModelDetail, setCanSeeModelDetail] = useState(false);
  const [statsLoading, setStatsLoading]   = useState(false);
  const [windowKey, setWindowKey]         = useState(null);
  const [defaultWindowLoaded, setDefaultWindowLoaded] = useState(false);
  const [config, setConfig]               = useState({ enabled_groups: [], refresh_interval: 60, public_visible: false, model_detail_visible: false, default_window: '6h' });
  const [allGroups, setAllGroups]         = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [countdown, setCountdown]         = useState(0);
  const [lastUpdated, setLastUpdated]     = useState('');
  const timerRef     = useRef(null);
  const countdownRef = useRef(null);

  const fetchStats = useCallback(async (win) => {
    const w = win || windowKey || '6h';
    setStatsLoading(true);
    try {
      const params = new URLSearchParams({ window: w });
      params.set('model_detail', 'true');
      const res = await API.get(`/api/group_monitor/status?${params.toString()}`);
      if (res.data.success) {
        setStats(res.data.data ?? []);
        setModelDetail(res.data.model_detail ?? {});
        setCanSeeModelDetail(!!res.data.model_detail_visible);
        // On first load, use the server-configured default window
        if (!defaultWindowLoaded && res.data.default_window) {
          const dw = res.data.default_window;
          setWindowKey(dw);
          setDefaultWindowLoaded(true);
          // If the server default differs from what we just fetched, re-fetch with correct window
          if (dw !== w) {
            setStatsLoading(false);
            fetchStats(dw);
            return;
          }
        } else if (!defaultWindowLoaded) {
          setWindowKey('6h');
          setDefaultWindowLoaded(true);
        }
        const now = new Date();
        setLastUpdated(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`);
      } else {
        showError(res.data.message);
      }
    } catch { showError(t('获取分组监控数据失败')); }
    finally { setStatsLoading(false); }
  }, [windowKey, defaultWindowLoaded, admin, t]);

  const fetchConfig = useCallback(async () => {
    if (!admin) return;
    setConfigLoading(true);
    try {
      const [cfgRes, grpRes] = await Promise.all([
        API.get('/api/group_monitor/admin/config'),
        API.get('/api/group/'),
      ]);
      if (cfgRes.data.success) setConfig(cfgRes.data.data);
      if (grpRes.data.success) setAllGroups(grpRes.data.data ?? []);
    } catch { showError(t('获取配置失败')); }
    finally { setConfigLoading(false); }
  }, [admin, t]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await API.put('/api/group_monitor/admin/config', config);
      if (res.data.success) { showSuccess(t('配置已保存')); setTimeout(() => fetchStats(), 800); }
      else showError(res.data.message);
    } catch { showError(t('保存配置失败')); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    fetchStats();
    if (admin) fetchConfig();
  }, []); // eslint-disable-line

  // Re-fetch when window changes (skip initial null)
  useEffect(() => {
    if (windowKey) fetchStats(windowKey);
  }, [windowKey]); // eslint-disable-line

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const ms = Math.max(10, config.refresh_interval ?? 60) * 1000;
    setCountdown(Math.round(ms / 1000));

    timerRef.current = setInterval(() => {
      fetchStats();
      setCountdown(Math.round(ms / 1000));
    }, ms);

    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [config.refresh_interval, fetchStats]);

  return (
    <div style={{
      padding: '48px 24px 64px',
      margin: '60px auto 0',
      minHeight: 'calc(100dvh - 60px)',
      maxWidth: 1200,
      boxSizing: 'border-box',
    }}>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 36, gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            margin: '0 0 6px 0', fontSize: 26, fontWeight: 700,
            color: '#0f172a', letterSpacing: '-0.5px',
          }}>
            {t('分组状态监控')}
          </h1>
          <p style={{
            margin: 0, color: '#64748b', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400,
          }}>
            <span className='gm-pulse-dot' />
            {stats.length > 0
              ? `${t('实时同步中')} · ${t('共监控')} ${stats.length} ${t('个分组')}`
              : t('监控说明')
            }
            {lastUpdated && ` · ${t('最后更新')} ${lastUpdated}`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Time window selector */}
          <Select
            value={windowKey || '6h'}
            onChange={setWindowKey}
            optionList={WINDOW_OPTIONS.map(o => ({ ...o, label: t(o.label) }))}
            style={{ width: 110 }}
            size='default'
          />

          <button
            className='gm-refresh-btn'
            onClick={() => { fetchStats(); setCountdown(config.refresh_interval ?? 60); }}
            disabled={statsLoading}
          >
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
              style={{ animation: statsLoading ? 'gm-spin 0.7s linear infinite' : 'none' }}>
              <polyline points='23 4 23 10 17 10'/>
              <path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10'/>
            </svg>
            {countdown > 0 ? `${countdown}s · ` : ''}{t('同步数据')}
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 20,
        padding: '0 4px', flexWrap: 'wrap',
      }}>
        {[
          { key: 'green',  label: t('状态正常'), color: '#10b981' },
          { key: 'orange', label: t('状态降级'), color: '#f59e0b' },
          { key: 'red',    label: t('状态异常'), color: '#ef4444' },
          { key: 'empty',  label: t('无请求'),   color: '#cbd5e1' },
        ].map(({ key, label, color }) => (
          <span key={key} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, color: '#64748b',
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: color, display: 'inline-block', flexShrink: 0,
            }} />
            {label}
          </span>
        ))}
      </div>

      {/* ── Group rows ── */}
      {statsLoading && stats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size='large' />
        </div>
      ) : stats.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          color: '#94a3b8', fontSize: 14,
        }}>
          <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'
            style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }}>
            <path d='M22 12h-4l-3 9L9 3l-3 9H2'/>
          </svg>
          {admin ? t('暂无监控数据，请在下方配置要监控的分组后保存') : t('暂无监控数据')}
        </div>
      ) : (
        <div className='gm-grid' style={{ marginBottom: 40 }}>
          {stats.map((stat) => (
            <GroupRow
              key={stat.group}
              stat={stat}
              modelStats={modelDetail[stat.group]}
              windowKey={windowKey}
              showModelToggle={admin || canSeeModelDetail}
            />
          ))}
        </div>
      )}

      {/* ── Admin config ── */}
      {admin && (
        <GlassSection
          title={t('监控配置')}
          icon={
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'/>
              <circle cx='12' cy='12' r='3'/>
            </svg>
          }
        >
          {configLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                  {t('监控分组')}
                </div>
                <Select
                  multiple maxTagCount={8}
                  style={{ width: '100%', maxWidth: 560 }}
                  optionList={(allGroups ?? []).map((g) => ({ label: g, value: g }))}
                  placeholder={t('选择要监控的分组')}
                  value={config.enabled_groups ?? []}
                  onChange={(v) => setConfig((c) => ({ ...c, enabled_groups: v }))}
                />
              </div>
              <div>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                  {t('刷新间隔（秒）')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <InputNumber min={10} max={3600} style={{ width: 140 }}
                    value={config.refresh_interval ?? 60}
                    onChange={(v) => setConfig((c) => ({ ...c, refresh_interval: v }))}
                  />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('最小 10 秒')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{t('公开可见')}</span>
                <Switch
                  checked={config.public_visible ?? false}
                  onChange={(v) => setConfig((c) => ({ ...c, public_visible: v }))}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('开启后普通用户也可查看')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{t('用户端模型详情')}</span>
                <Switch
                  checked={config.model_detail_visible ?? false}
                  onChange={(v) => setConfig((c) => ({ ...c, model_detail_visible: v }))}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('开启后普通用户可展开查看模型详情')}</span>
              </div>
              <div>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                  {t('默认时间窗口')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Select
                    value={config.default_window || '6h'}
                    onChange={(v) => setConfig((c) => ({ ...c, default_window: v }))}
                    optionList={WINDOW_OPTIONS.map(o => ({ ...o, label: t(o.label) }))}
                    style={{ width: 140 }}
                  />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('用户打开页面时默认显示的时间范围')}</span>
                </div>
              </div>
              <div>
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    height: 40, padding: '0 24px', borderRadius: 10,
                    background: 'linear-gradient(135deg,#4F46E5,#6366F1)',
                    color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(79,70,229,0.30)',
                    opacity: saving ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/>
                    <polyline points='17 21 17 13 7 13 7 21'/>
                    <polyline points='7 3 7 8 15 8'/>
                  </svg>
                  {saving ? t('保存中...') : t('保存配置')}
                </button>
              </div>
            </div>
          )}
        </GlassSection>
      )}

      <style>{`
        @keyframes gm-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes gm-pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.5; }
          80%  { transform: scale(2);   opacity: 0;   }
          100% { transform: scale(2);   opacity: 0;   }
        }

        .gm-pulse-dot {
          display: inline-block;
          width: 6px; height: 6px;
          background: #10b981;
          border-radius: 50%;
          position: relative;
          flex-shrink: 0;
        }
        .gm-pulse-dot::after {
          content: '';
          position: absolute;
          top: -3px; left: -3px; right: -3px; bottom: -3px;
          border-radius: 50%;
          border: 1px solid #10b981;
          animation: gm-pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .gm-card:hover {
          border-color: rgba(0,0,0,0.10) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03);
          transform: translateY(-1px);
        }

        .gm-refresh-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .gm-refresh-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04);
          transform: translateY(-1px);
        }
        .gm-refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes gm-shine-sweep {
          0%   { left: -40%; opacity: 0; }
          10%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { left: 120%; opacity: 0; }
        }

        .gm-timeline-track {
          position: relative;
          overflow: hidden;
        }
        .gm-timeline-track::after {
          content: '';
          position: absolute;
          top: 0;
          left: -40%;
          width: 30%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.08) 20%,
            rgba(255,255,255,0.28) 50%,
            rgba(255,255,255,0.08) 80%,
            transparent 100%
          );
          border-radius: inherit;
          animation: gm-shine-sweep 4s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }

        .gm-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .gm-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
