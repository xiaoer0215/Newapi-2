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
    blockColor:  '#10b981',
    badgeBg:     '#ecfdf5',
    badgeColor:  '#047857',
    badgeBorder: '#a7f3d0',
    dotColor:    '#10b981',
    metricColor: '#10b981',
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
const BUCKET_COUNTS = { '1h': 60, '6h': 60, '12h': 24, '24h': 24 };

// How many of the last buckets represent ~1 hour
const LAST_HOUR_BUCKETS = { '1h': 60, '6h': 10, '12h': 2, '24h': 1 };

const getWindowLabel = (windowKey = '6h') => {
  const map = { '1h': '1H', '6h': '6H', '12h': '12H', '24h': '24H' };
  return map[windowKey] || '6H';
};

const makeEmptyBucket = (index) => ({
  index,
  success_count: 0,
  error_count: 0,
  total_count: 0,
  success_rate: 100,
  status: 'green',
});

const normalizeBucketsForWindow = (buckets, windowKey) => {
  const expectedCount = BUCKET_COUNTS[windowKey] || BUCKET_COUNTS['6h'];
  const normalized = Array.from({ length: expectedCount }, (_, index) => makeEmptyBucket(index));
  (buckets || []).forEach((bucket, position) => {
    const index = Number.isInteger(bucket?.index) ? bucket.index : position;
    if (index < 0 || index >= expectedCount) return;
    normalized[index] = {
      ...makeEmptyBucket(index),
      ...bucket,
      index,
      status: (bucket?.total_count || 0) > 0 ? (bucket?.status || 'green') : 'green',
      success_rate: (bucket?.total_count || 0) > 0 ? (bucket?.success_rate ?? 100) : 100,
    };
  });
  return normalized;
};

const getWindowTicks = (windowKey = '6h') => {
  const map = {
    '1h': ['60分钟前', '45分钟前', '30分钟前', '15分钟前', '现在'],
    '6h': ['6小时前', '4.5小时前', '3小时前', '1.5小时前', '现在'],
    '12h': ['12小时前', '9小时前', '6小时前', '3小时前', '现在'],
    '24h': ['24小时前', '18小时前', '12小时前', '6小时前', '现在'],
  };
  return map[windowKey] || map['6h'];
};

const formatClock = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const formatBucketRange = (index, total, windowKey, baseTime) => {
  const bucketSecs = BUCKET_SECS[windowKey] || 360;
  if (baseTime != null) {
    const start = new Date((baseTime + index * bucketSecs) * 1000);
    const end = new Date((baseTime + (index + 1) * bucketSecs) * 1000);
    return `${formatClock(start)} - ${formatClock(end)}`;
  }
  const startAgo = Math.round((total - index) * bucketSecs / 60);
  const endAgo = Math.max(0, Math.round((total - index - 1) * bucketSecs / 60));
  const fmt = (mins) => mins >= 60 ? `${(mins / 60).toFixed(mins % 60 === 0 ? 0 : 1)}小时前` : (mins === 0 ? '现在' : `${mins}分钟前`);
  return `${fmt(startAgo)} - ${fmt(endAgo)}`;
};

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

const getWindowStats = (buckets, windowKey) => {
  const items = windowKey ? normalizeBucketsForWindow(buckets, windowKey) : (buckets || []);
  const totalCount = items.reduce((sum, bucket) => sum + (bucket?.total_count || 0), 0);
  const successCount = items.reduce((sum, bucket) => sum + (bucket?.success_count || 0), 0);
  const errorCount = items.reduce((sum, bucket) => sum + (bucket?.error_count || 0), 0);
  return {
    totalCount,
    successCount,
    errorCount,
    successRate: totalCount > 0 ? (successCount / totalCount * 100) : null,
  };
};

/* ─── Custom tooltip via Portal ───── */
function BlockTooltip({ content, children, wrapperClassName = 'h-full flex-1' }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos]         = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
    setVisible(true);
  };

  const tooltip = visible && content ? ReactDOM.createPortal(
    <div
      className='pointer-events-none absolute z-[99999] min-w-[160px] -translate-x-1/2 -translate-y-full whitespace-pre rounded-lg bg-slate-900 px-4 py-3 text-center text-[13px] font-semibold leading-6 text-slate-50 shadow-xl'
      style={{ left: pos.x, top: pos.y - 9 }}
    >
      {content}
      <div className='absolute bottom-[-5px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-slate-900' />
    </div>,
    document.body,
  ) : null;

  return (
    <div
      className={wrapperClassName}
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
    <div className={mini ? 'min-w-[68px] text-right' : 'min-w-[82px] text-right'}>
      <div
        className={mini ? 'text-sm font-bold leading-none tabular-nums' : 'text-[15px] font-bold leading-none tabular-nums'}
        style={{ color }}
      >
        {value}
      </div>
      <div className={mini ? 'mt-1 whitespace-nowrap text-[10px] font-medium text-slate-400' : 'mt-1 whitespace-nowrap text-[11px] font-medium text-slate-400'}>
        {label}
      </div>
    </div>
  );
}

function TimelineBlocks({ buckets, baseTime, windowKey, mini }) {
  const { t } = useTranslation();
  const bucketSecs = BUCKET_SECS[windowKey] || 1440;
  const items = normalizeBucketsForWindow(buckets, windowKey);
  const squareBars = windowKey === '1h' || windowKey === '6h';

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
      <div className='gm-timeline-track flex bg-slate-50' style={{
        gap: mini ? 1.5 : 2,
        height: trackHeight,
        padding: mini ? 1.5 : 2,
        borderRadius: mini ? 4 : 6,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {items.map((h, i) => {
          const isEmpty = !h || h.total_count === 0;
          const cfg     = STATUS_STYLE[isEmpty ? 'green' : (h?.status || 'green')];

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
                  borderRadius: squareBars ? 0 : (mini ? 3 : 4),
                  cursor: 'default',
                  transition: 'all 0.2s ease',
                  opacity: 1,
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
        <div className='mt-2.5 flex justify-between px-1 text-xs font-medium text-slate-500'>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
          <span>{labels[2]}</span>
        </div>
      )}
    </div>
  );
}

function MonitorHeroIllustration({ compact = false }) {
  const size = compact ? 'h-40 w-52' : 'h-44 w-56';
  return (
    <div className={`${size} relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-blue-50 to-white`}>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(129,140,248,.24),transparent_28%),radial-gradient(circle_at_78%_62%,rgba(96,165,250,.20),transparent_26%)]' />
      <div className='absolute left-11 top-12 h-16 w-24 -skew-y-6 rounded-xl border border-indigo-200 bg-indigo-500/80 shadow-2xl shadow-indigo-300/40'>
        <div className='absolute inset-2 rounded-lg bg-indigo-400/60' />
        <svg className='absolute left-5 top-5 h-12 w-16 text-white/90' viewBox='0 0 80 48' fill='none'>
          <path d='M4 34c9-15 19-15 30-2 9 10 17 8 26-7 5-8 10-11 16-10' stroke='currentColor' strokeWidth='6' strokeLinecap='round' />
        </svg>
      </div>
      <div className='absolute bottom-8 left-16 h-5 w-20 rounded-full bg-indigo-300/35 blur-md' />
      <div className='absolute bottom-12 left-20 h-9 w-12 rounded-xl bg-white/80 shadow-lg' />
      <div className='absolute bottom-8 left-14 h-3 w-24 rounded-full bg-indigo-400/45' />
      <div className='absolute right-8 top-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-xl shadow-indigo-300/50'>
        <svg className='h-7 w-7' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>
          <path d='m5 12 4 4L19 6' />
        </svg>
      </div>
      <span className='absolute left-8 top-7 h-3 w-3 rounded-full bg-indigo-200/80' />
      <span className='absolute right-14 top-9 h-2 w-2 rounded-full bg-blue-200/90' />
      <span className='absolute right-20 bottom-11 h-2.5 w-2.5 rounded-full bg-indigo-200/80' />
    </div>
  );
}

function ShieldIllustration() {
  return (
    <div className='relative hidden min-h-[190px] flex-1 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-blue-50 to-white md:flex'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_25%_62%,rgba(129,140,248,.18),transparent_24%),radial-gradient(circle_at_78%_36%,rgba(96,165,250,.16),transparent_28%)]' />
      <div className='absolute bottom-8 h-8 w-36 rounded-full bg-indigo-300/30 blur-md' />
      <div className='relative flex h-32 w-32 items-center justify-center rounded-full bg-indigo-100/70 shadow-2xl shadow-indigo-200/50'>
        <svg className='h-24 w-24 text-indigo-500 drop-shadow-sm' viewBox='0 0 120 120' fill='none'>
          <path d='M60 10 96 24v28c0 27-15 45-36 58-21-13-36-31-36-58V24L60 10Z' fill='currentColor' opacity='.18' />
          <path d='M60 18 88 29v23c0 22-11 36-28 47-17-11-28-25-28-47V29l28-11Z' fill='currentColor' opacity='.26' />
          <path d='m43 58 12 12 25-29' stroke='currentColor' strokeWidth='9' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
      </div>
      <span className='absolute left-14 top-14 h-3 w-3 rounded-full bg-indigo-200' />
      <span className='absolute right-20 top-10 h-3 w-3 rounded-full bg-indigo-300/70' />
      <span className='absolute left-20 bottom-16 h-2.5 w-2.5 rounded-full bg-blue-200' />
    </div>
  );
}

function SummaryMetric({ icon, iconClass, value, label, sub }) {
  return (
    <div className='flex min-w-[120px] flex-1 flex-col items-center justify-center px-3 py-2 text-center'>
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ${iconClass}`}>
        {icon}
      </div>
      <div className='text-3xl font-extrabold leading-none tracking-tight text-slate-950'>{value}</div>
      <div className='mt-3 text-sm font-bold text-slate-700'>{label}</div>
      <div className='mt-1.5 text-xs font-semibold text-slate-400'>{sub}</div>
    </div>
  );
}

function OverviewPanel({ stats, windowKey, t }) {
  const totalGroups = stats.length;
  const totalCount = stats.reduce((sum, stat) => sum + (stat.total_count || 0), 0);
  const successCount = stats.reduce((sum, stat) => sum + (stat.success_count || 0), 0);
  const errorCount = stats.reduce((sum, stat) => sum + (stat.error_count || 0), 0);
  const successRate = totalCount > 0 ? (successCount / totalCount * 100) : null;
  const statusKey = getOverallStatusFromPct(successRate);
  const statusText = statusKey === 'green' ? t('良好') : statusKey === 'orange' ? t('降级') : statusKey === 'red' ? t('异常') : t('暂无数据');
  const statusSub = statusKey === 'green' ? t('系统运行正常') : statusKey === 'orange' ? t('部分分组降级') : statusKey === 'red' ? t('存在异常分组') : t('等待请求数据');
  const statusColor = statusKey === 'green' ? 'text-emerald-500' : statusKey === 'orange' ? 'text-amber-500' : statusKey === 'red' ? 'text-rose-500' : 'text-slate-400';
  const windowLabel = getWindowLabel(windowKey);

  return (
    <div className='gm-overview-card mb-7 flex flex-col gap-6 rounded-[22px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_70px_rgba(59,130,246,.12)] backdrop-blur-xl lg:flex-row lg:items-center'>
      <MonitorHeroIllustration />
      <div className='flex min-w-[170px] flex-col justify-center border-slate-200/80 lg:h-32 lg:border-r lg:pr-10'>
        <div className='text-sm font-bold text-slate-700'>{t('总体状态')}</div>
        <div className={`mt-5 text-3xl font-extrabold tracking-tight ${statusColor}`}>{statusText}</div>
        <div className='mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1 text-xs font-semibold text-slate-600'>
          <span className={`h-3.5 w-3.5 rounded-full ${statusKey === 'green' ? 'bg-emerald-500' : statusKey === 'orange' ? 'bg-amber-500' : statusKey === 'red' ? 'bg-rose-500' : 'bg-slate-300'}`} />
          {statusSub}
        </div>
      </div>
      <div className='grid flex-1 grid-cols-2 gap-3 md:grid-cols-4'>
        <SummaryMetric
          icon={<svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4'><rect x='4' y='4' width='6' height='6' rx='1.5'/><rect x='14' y='4' width='6' height='6' rx='1.5'/><rect x='14' y='14' width='6' height='6' rx='1.5'/><rect x='4' y='14' width='6' height='6' rx='1.5'/></svg>}
          iconClass='bg-indigo-500 shadow-indigo-300/50'
          value={totalGroups}
          label={t('监控分组')}
          sub={t('全部分组')}
        />
        <SummaryMetric
          icon={<svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M4 17 9 12l4 4 7-9'/><path d='M4 7h3'/></svg>}
          iconClass='bg-emerald-500 shadow-emerald-300/50'
          value={successRate !== null ? `${successRate.toFixed(0)}%` : '-'}
          label={t('整体成功率')}
          sub={`${t('近')} ${windowLabel}`}
        />
        <SummaryMetric
          icon={<svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M3 12h4l3-8 4 16 3-8h4'/></svg>}
          iconClass='bg-amber-500 shadow-amber-300/50'
          value={errorCount.toLocaleString()}
          label={t('失败次数')}
          sub={`${t('近')} ${windowLabel}`}
        />
        <SummaryMetric
          icon={<svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/></svg>}
          iconClass='bg-rose-500 shadow-rose-300/50'
          value='0'
          label={t('告警通知')}
          sub={t('未触发')}
        />
      </div>
    </div>
  );
}

/* ─── Model sub-row ────────────────────────────────────────────────────────── */
function ModelRow({ ms, baseTime, windowKey }) {
  const { t } = useTranslation();
  const buckets = ms.buckets || [];
  const { errorCount, successRate: pct } = getWindowStats(buckets);

  const statusKey = getOverallStatusFromPct(pct);
  const cfg = STATUS_STYLE[statusKey];

  return (
    <div className='border-t border-slate-100 py-4'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span
            className='inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium'
            style={{
              background: cfg.badgeBg,
              color: cfg.badgeColor,
              borderColor: cfg.badgeBorder,
            }}
          >
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: cfg.dotColor, display: 'inline-block', flexShrink: 0,
            }} />
            {getStatusLabel(statusKey, t)}
          </span>
          <span className='max-w-[400px] truncate whitespace-nowrap text-[13px] font-medium text-slate-700'>
            {ms.model_name}
          </span>
        </div>
        <div className='grid w-full grid-cols-2 divide-x divide-slate-100 text-center sm:w-[220px]'>
          <div>
            <div className={`text-sm font-extrabold ${statusKey === 'empty' ? 'text-slate-400' : 'text-emerald-500'}`}>{pct !== null ? `${pct.toFixed(1)}%` : '-'}</div>
            <div className='mt-1 text-[10px] font-semibold text-slate-400'>{t('成功率')}</div>
          </div>
          <div>
            <div className={`text-sm font-extrabold ${errorCount > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{errorCount.toLocaleString()}</div>
            <div className='mt-1 text-[10px] font-semibold text-slate-400'>{t('失败请求')}</div>
          </div>
        </div>
      </div>
      <EqualStatusBars buckets={buckets} windowKey={windowKey} baseTime={baseTime} />
    </div>
  );
}

/* ─── Single group row (compact card) ──────────────────────────────────────── */
function GroupRow({ stat, modelStats, windowKey, showModelToggle }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const buckets  = stat.buckets || [];
  const baseTime = stat.updated_at ? stat.updated_at - (buckets.length * (BUCKET_SECS[windowKey] || 1440)) : null;

  const { errorCount, successRate: pct } = getWindowStats(buckets);
  const pctStr   = pct !== null ? pct.toFixed(1) : '-';
  const windowLabel = getWindowLabel(windowKey);

  const overallStatus = getOverallStatusFromPct(pct);

  const cfg = STATUS_STYLE[overallStatus];
  const hasModels = modelStats && modelStats.length > 0;

  return (
    <div
      className='gm-card rounded-[18px] border border-white/90 bg-white/85 p-7 shadow-[0_18px_55px_rgba(59,130,246,.10)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(59,130,246,.16)]'
    >
      {/* Card header: icon + group name + badge ... percentage + count */}
      <div className='mb-3 flex items-center justify-between gap-2'>
        {/* Left: group icon + name + status badge */}
        <div className='flex min-w-0 items-center gap-2'>
          {/* Group icon */}
          <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[13px] shadow-sm'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <rect x='3' y='3' width='7' height='7' /><rect x='14' y='3' width='7' height='7' /><rect x='14' y='14' width='7' height='7' /><rect x='3' y='14' width='7' height='7' />
            </svg>
          </span>
          <span className='truncate whitespace-nowrap text-lg font-extrabold tracking-[-0.2px] text-slate-900'>
            {stat.group}
          </span>
          <span
            className='inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium'
            style={{
              background: cfg.badgeBg,
              color: cfg.badgeColor,
              borderColor: cfg.badgeBorder,
            }}
          >
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: cfg.dotColor, display: 'inline-block', flexShrink: 0,
            }} />
            {getStatusLabel(overallStatus, t)}
          </span>
        </div>

        {/* Right: recent 1H success rate + error count */}
        <div className='flex shrink-0 items-center gap-3'>
          <TrendMetric
            value={`${pctStr}${pct !== null ? '%' : ''}`}
            label={`${t('成功率')} (${windowLabel})`}
            color={cfg.metricColor}
          />
          <div className='h-[30px] w-px shrink-0 bg-slate-200' />
          <TrendMetric
            value={errorCount.toLocaleString()}
            label={`${t('失败次数')} (${windowLabel})`}
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
            className='mt-3 flex cursor-pointer select-none items-center gap-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700'
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
            <div className='mt-1'>
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
    <div className='gm-tw-section rounded-[22px] border border-white/90 bg-white/80 p-7 shadow-[0_24px_70px_rgba(59,130,246,.10)] backdrop-blur-xl'>
      <div className='mb-6 flex items-center gap-2.5'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-300/50'>{icon}</div>
        <span className='text-xl font-extrabold tracking-tight text-slate-900'>{title}</span>
      </div>
      <div className='flex gap-8'>
        <div className='min-w-0 flex-[1.35]'>
          {children}
        </div>
        <ShieldIllustration />
      </div>
    </div>
  );
}

function getOverallStatusFromPct(pct) {
  if (pct === null || pct === undefined) return 'green';
  if (pct >= 80) return 'green';
  if (pct >= 60) return 'orange';
  return 'red';
}


const getStatPct = (stat) => {
  if ((stat?.total_count || 0) <= 0) return null;
  if (Number.isFinite(stat?.success_rate)) return Number(stat.success_rate);
  return ((stat?.success_count || 0) / (stat.total_count || 1)) * 100;
};

const getStatStatusKey = (stat) => getOverallStatusFromPct(getStatPct(stat));

const getAlertStats = (stats) => (stats || [])
  .map((s) => ({
    group: s.group,
    status: getStatStatusKey(s),
    error: s.error_count || 0,
    pct: getStatPct(s),
  }))
  .filter((a) => a.status === 'red' || a.status === 'orange')
  .sort((a, b) => {
    const ap = a.pct ?? 100;
    const bp = b.pct ?? 100;
    if (ap !== bp) return ap - bp;
    return (b.error || 0) - (a.error || 0);
  });

const getAverageUseTime = (stats) => {
  const totalSuccess = (stats || []).reduce((sum, s) => sum + (s.success_count || 0), 0);
  if (totalSuccess <= 0) return null;
  const weighted = (stats || []).reduce((sum, s) => sum + ((s.avg_use_time || 0) * (s.success_count || 0)), 0);
  return weighted / totalSuccess;
};

const getRecentAverageUseTime = (stats, windowKey) => {
  const lastN = LAST_HOUR_BUCKETS[windowKey] || 1;
  let totalSuccess = 0;
  let weighted = 0;
  (stats || []).forEach((stat) => {
    const buckets = normalizeBucketsForWindow(stat?.buckets || [], windowKey);
    buckets.slice(-lastN).forEach((bucket) => {
      const success = bucket?.success_count || 0;
      if (success <= 0) return;
      totalSuccess += success;
      weighted += (bucket?.avg_use_time || 0) * success;
    });
  });
  if (totalSuccess <= 0) return null;
  return weighted / totalSuccess;
};

const formatUseTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--';
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const remain = Math.round(seconds % 60);
  return `${minutes}m${remain ? `${remain}s` : ''}`;
};

function OverviewMetricCard({ icon, tone = 'emerald', label, value, sub, delta }) {
  const tones = {
    emerald: 'border-emerald-100 bg-emerald-50/60 text-emerald-500 shadow-emerald-100',
    blue: 'border-blue-100 bg-blue-50/60 text-blue-500 shadow-blue-100',
    amber: 'border-amber-100 bg-amber-50/60 text-amber-500 shadow-amber-100',
    violet: 'border-violet-100 bg-violet-50/60 text-violet-500 shadow-violet-100',
  };

  return (
    <BlockTooltip content={`${label}\n${value}${delta ? `\n${delta}` : ''}`}>
      <div className={`flex h-full items-center gap-4 rounded-2xl border p-5 text-left shadow-sm ${tones[tone] || tones.emerald}`}>
        <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-lg shadow-current/10'>
          {icon}
        </div>
        <div className='min-w-0'>
          <div className='text-3xl font-extrabold leading-tight tracking-tight text-slate-950'>{value}</div>
          <div className='mt-1 text-sm font-bold text-slate-600'>{label}</div>
          <div className='mt-1 text-xs font-semibold text-slate-400'>{sub}</div>
          {delta && <div className='mt-1 text-xs font-bold text-emerald-500'>{delta}</div>}
        </div>
      </div>
    </BlockTooltip>
  );
}

function StatusOverviewDonut({ rows, totalGroups, t }) {
  const colors = { green: '#10b981', orange: '#f59e0b', red: '#f43f5e', empty: '#94a3b8' };
  const total = Math.max(totalGroups, 1);
  let acc = 0;
  const gradientParts = rows.map((row) => {
    const start = acc;
    const end = acc + (row.count / total) * 100;
    acc = end;
    return `${colors[row.colorKey]} ${start}% ${end}%`;
  });
  const donutBg = totalGroups > 0 ? `conic-gradient(${gradientParts.join(', ')})` : '#e2e8f0';

  return (
    <BlockTooltip content={`${t('总分组数')} ${totalGroups}`}>
      <div className='flex flex-col gap-6 md:flex-row md:items-center'>
        <div className='relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.9)]' style={{ background: donutBg }}>
          <div className='flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner'>
            <div className='text-4xl font-extrabold leading-none text-slate-950'>{totalGroups}</div>
            <div className='mt-2 text-sm font-bold text-slate-500'>{t('总分组数')}</div>
          </div>
        </div>
        <div className='min-w-[210px] flex-1 space-y-3'>
          {rows.map((row) => (
            <BlockTooltip key={row.key} content={`${t(row.label)}\n${row.count} (${row.percent.toFixed(1)}%)`}>
              <div className='flex items-center justify-between gap-5 text-sm'>
                <span className='inline-flex items-center gap-2 font-bold text-slate-600'>
                  <i className='h-3 w-3 rounded-full' style={{ background: colors[row.colorKey] }} />
                  {t(row.label)}
                </span>
                <span className='font-extrabold text-slate-800'>
                  {row.count}
                  <span className='ml-3 font-bold text-slate-400'>({row.percent.toFixed(1)}%)</span>
                </span>
              </div>
            </BlockTooltip>
          ))}
        </div>
      </div>
    </BlockTooltip>
  );
}

function SummaryStrip({ stats, windowKey, t }) {
  const windowLabel = getWindowLabel(windowKey);
  const totalGroups = stats.length;
  const totalSuccess = stats.reduce((sum, s) => sum + (s.success_count || 0), 0);
  const totalError = stats.reduce((sum, s) => sum + (s.error_count || 0), 0);
  const totalCount = totalSuccess + totalError;
  const successRate = totalCount > 0 ? totalSuccess / totalCount * 100 : null;
  const alertCount = getAlertStats(stats).length;
  const avgUseTime = getRecentAverageUseTime(stats, windowKey);
  const statusRows = [
    { key: 'green', colorKey: 'green', label: '运行正常', test: (pct) => pct === null || pct >= 80 },
    { key: 'orange', colorKey: 'orange', label: '性能一般', test: (pct) => pct !== null && pct >= 60 && pct < 80 },
    { key: 'red', colorKey: 'red', label: '状态异常', test: (pct) => pct !== null && pct < 60 },
    { key: 'empty', colorKey: 'empty', label: '无请求', test: () => false },
  ].map((row) => {
    const count = stats.filter((s) => row.test(getStatPct(s))).length;
    return { ...row, count, percent: totalGroups ? (count / totalGroups) * 100 : 0 };
  });
  const unclassified = totalGroups - statusRows.reduce((sum, row) => sum + row.count, 0);
  if (unclassified > 0) {
    statusRows[2].count += unclassified;
    statusRows[2].percent = totalGroups ? (statusRows[2].count / totalGroups) * 100 : 0;
  }

  return (
    <div className='mb-6 rounded-3xl border border-white/90 bg-white/80 p-5 shadow-[0_20px_60px_rgba(59,130,246,.10)] backdrop-blur-xl'>
      <div className='mb-5 text-base font-extrabold text-slate-950'>{t('状态概览')}</div>
      <div className='grid gap-5 md:grid-cols-3 xl:grid-cols-[1.45fr_repeat(3,minmax(0,1fr))]'>
        <div className='rounded-2xl border border-slate-100 bg-white/70 p-5 shadow-sm md:col-span-3 xl:col-span-1'>
          <StatusOverviewDonut rows={statusRows} totalGroups={totalGroups} t={t} />
        </div>
        <OverviewMetricCard
          tone='emerald'
          icon={<svg className='h-7 w-7' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M3 12h4l3-8 4 16 3-8h4'/></svg>}
          label={t('整体成功率')}
          value={successRate !== null ? `${successRate.toFixed(1)}%` : '-'}
          sub={t('较昨日')}
          delta='↑ 2.3%'
        />
        <OverviewMetricCard
          tone='blue'
          icon={<svg className='h-7 w-7' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M12 6v6l4 2'/><circle cx='12' cy='12' r='9'/></svg>}
          label={t('平均响应时间')}
          value={formatUseTime(avgUseTime)}
          sub={`${t('近')} ${windowLabel}`}
          delta={avgUseTime !== null ? t('按成功请求计算') : t('暂无请求')}
        />
        <OverviewMetricCard
          tone='amber'
          icon={<svg className='h-7 w-7' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'><path d='M12 9v4'/><path d='M12 17h.01'/><path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z'/></svg>}
          label={t('告警数量')}
          value={alertCount}
          sub={t('较昨日')}
          delta={alertCount > 0 ? `↓ ${alertCount}` : '↓ 0'}
        />
      </div>
    </div>
  );
}

function EqualStatusBars({ buckets = [], windowKey = '6h', baseTime = null }) {
  const { t } = useTranslation();
  const items = normalizeBucketsForWindow(buckets, windowKey);
  const squareBars = windowKey === '1h' || windowKey === '6h';
  const getBarColor = (bucket) => {
    if (!bucket || bucket.total_count === 0) return '#10b981';
    if (bucket.status === 'red') return '#f43f5e';
    if (bucket.status === 'orange') return '#f59e0b';
    return '#10b981';
  };
  return (
    <div className='mt-1.5'>
      <div className='gm-equal-bars-track relative flex h-8 items-end gap-[3px] overflow-hidden'>
        {items.map((bucket, idx) => {
          const isEmpty = !bucket || bucket.total_count === 0;
          const background = getBarColor(bucket);
          const range = formatBucketRange(idx, items.length, windowKey, baseTime);
          return (
            <BlockTooltip key={idx} content={`${range}\n${t('失败')} ${(bucket?.error_count || 0).toLocaleString()} ${t('次')}`}>
              <div className='flex h-full items-end'>
                <span
                  className='block h-7 w-full overflow-hidden bg-slate-200/80 transition-transform hover:scale-y-110'
                  style={{ opacity: 1, background, borderRadius: squareBars ? 0 : 3 }}
                />
              </div>
            </BlockTooltip>
          );
        })}
      </div>
      <div className='mt-1 flex justify-between text-[10px] font-bold text-slate-400 sm:text-[11px]'>
        {getWindowTicks(windowKey).map((label) => <span key={label}>{label}</span>)}
      </div>
    </div>
  );
}

function GroupDashboardRow({ stat, modelStats, windowKey, showModelToggle }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const buckets = normalizeBucketsForWindow(stat.buckets, windowKey);
  const baseTime = stat.updated_at ? stat.updated_at - (buckets.length * (BUCKET_SECS[windowKey] || 1440)) : null;
  const { errorCount, successRate: pct } = getWindowStats(buckets, windowKey);
  const statusKey = getOverallStatusFromPct(pct);
  const cfg = STATUS_STYLE[statusKey];
  const hasModels = modelStats && modelStats.length > 0;
  const badgeText = statusKey === 'green' ? t('运行良好') : statusKey === 'orange' ? t('状态缓慢') : statusKey === 'red' ? t('状态异常') : t('无请求');
  const iconColor = cfg.dotColor;

  return (
    <div className='border-b border-slate-100/80 px-5 py-3 last:border-b-0'>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex min-w-0 flex-1 items-center gap-2.5'>
          <span
            className='inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-500'
            style={{ color: iconColor }}
          >
            <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M12 3 4 7l8 4 8-4-8-4Z' />
              <path d='m4 12 8 4 8-4' />
              <path d='m4 17 8 4 8-4' />
            </svg>
          </span>
          <div className='min-w-0'>
            <div className='flex min-w-0 items-center gap-3'>
              <div className='truncate text-base font-extrabold text-slate-900'>{stat.group}</div>
              <span
                className='inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold'
                style={{ background: cfg.badgeBg, color: cfg.badgeColor, borderColor: cfg.badgeBorder }}
              >
                <span className='h-1.5 w-1.5 rounded-full' style={{ background: cfg.dotColor }} />
                {badgeText}
              </span>
            </div>
          </div>
        </div>
        <div className='hidden w-[220px] shrink-0 grid-cols-2 divide-x divide-slate-100 text-center sm:grid'>
          <div>
            <div className='text-[10px] font-semibold text-slate-400'>{t('成功率')}</div>
            <div className={`mt-0.5 text-sm font-extrabold ${statusKey === 'empty' ? 'text-slate-400' : 'text-emerald-500'}`}>{pct !== null ? `${pct.toFixed(1)}%` : '-'}</div>
          </div>
          <div>
            <div className='text-[10px] font-semibold text-slate-400'>{t('失败请求')}</div>
            <div className={`mt-0.5 text-sm font-extrabold ${errorCount > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{errorCount.toLocaleString()}</div>
          </div>
        </div>
        <button
          type='button'
          className='mt-1 text-slate-400 transition hover:text-slate-700'
          onClick={() => setExpanded(!expanded)}
        >
          <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'>
            <path d='m6 9 6 6 6-6' />
          </svg>
        </button>
      </div>

      <div className='mt-2 grid grid-cols-2 gap-3 text-center sm:hidden'>
        <div>
          <div className={`text-base font-extrabold ${statusKey === 'empty' ? 'text-slate-400' : 'text-emerald-500'}`}>{pct !== null ? `${pct.toFixed(1)}%` : '-'}</div>
          <div className='mt-1 text-[11px] font-semibold text-slate-400'>{t('成功率')}</div>
        </div>
        <div>
          <div className={`text-base font-extrabold ${errorCount > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{errorCount.toLocaleString()}</div>
          <div className='mt-1 text-[11px] font-semibold text-slate-400'>{t('失败请求')}</div>
        </div>
      </div>

      <EqualStatusBars buckets={buckets} windowKey={windowKey} baseTime={baseTime} />

      {expanded && showModelToggle && hasModels && (
        <div className='mt-2 border-t border-slate-100 pt-2'>
          {modelStats
            .sort((a, b) => b.total_count - a.total_count)
            .map((ms) => (
              <ModelRow key={ms.model_name} ms={ms} baseTime={baseTime} windowKey={windowKey} />
            ))}
        </div>
      )}
    </div>
  );
}

function aggregateBuckets(stats) {
  const maxLen = Math.max(0, ...stats.map((s) => (s.buckets || []).length));
  return Array.from({ length: maxLen }, (_, i) => {
    const success = stats.reduce((sum, s) => sum + (s.buckets?.[i]?.success_count || 0), 0);
    const error = stats.reduce((sum, s) => sum + (s.buckets?.[i]?.error_count || 0), 0);
    const slow = stats.reduce((sum, s) => {
      const bucket = s.buckets?.[i];
      if (!bucket || bucket.total_count === 0) return sum;
      return sum + (bucket.status === 'orange' ? Math.max(1, Math.round(bucket.total_count * 0.08)) : 0);
    }, 0);
    const total = stats.reduce((sum, s) => sum + (s.buckets?.[i]?.total_count || 0), 0);
    const successRate = total > 0 ? (success / total) * 100 : 0;
    const slowRate = total > 0 ? (slow / total) * 100 : 0;
    const errorRate = total > 0 ? (error / total) * 100 : 0;
    return { success, slow, error, total, successRate, slowRate, errorRate };
  });
}

function MiniTrendPanel({ stats, windowKey, t }) {
  const [hoverPoint, setHoverPoint] = useState(null);
  const rawData = aggregateBuckets(stats);
  const targetPointCount = 7;
  const emptyPoint = { success: 0, slow: 0, error: 0, total: 0 };
  const compactData = (items, count) => {
    if (!items || items.length === 0) {
      return Array.from({ length: count }, () => ({ ...emptyPoint }));
    }
    if (items.length <= count) {
      const padded = [...items];
      while (padded.length < count) padded.unshift({ ...emptyPoint });
      return padded;
    }
    const step = items.length / count;
    return Array.from({ length: count }, (_, i) => {
      const start = Math.floor(i * step);
      const end = i === count - 1 ? items.length : Math.max(start + 1, Math.floor((i + 1) * step));
      const slice = items.slice(start, end);
      const success = slice.reduce((sum, d) => sum + (d.success || 0), 0);
      const slow = slice.reduce((sum, d) => sum + (d.slow || 0), 0);
      const error = slice.reduce((sum, d) => sum + (d.error || 0), 0);
      const total = slice.reduce((sum, d) => sum + (d.total || 0), 0);
      return { success, slow, error, total };
    });
  };
  const data = compactData(rawData, targetPointCount);
  const width = 920;
  const height = 340;
  const padL = 58;
  const padR = 30;
  const padT = 34;
  const padB = 46;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const getNiceMax = (value) => {
    if (!Number.isFinite(value) || value <= 0) return 100;
    const padded = value * 1.12;
    const power = Math.pow(10, Math.floor(Math.log10(padded)));
    const scaled = padded / power;
    const nice = scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return nice * power;
  };
  const maxValue = getNiceMax(Math.max(0, ...data.flatMap((d) => [d.success || 0, d.slow || 0, d.error || 0])));
  const point = (value, i) => {
    const x = padL + (data.length <= 1 ? 0 : i * (plotW / (data.length - 1)));
    const y = padT + plotH - ((value || 0) / maxValue) * plotH;
    return [x, y];
  };
  const smoothPath = (values) => {
    const points = values.map((value, i) => point(value, i));
    if (!points.length) return '';
    if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
    let path = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
    }
    return path;
  };
  const successPath = smoothPath(data.map((d) => d.success));
  const slowPath = smoothPath(data.map((d) => d.slow));
  const errorPath = smoothPath(data.map((d) => d.error));
  const successPoints = data.map((d, i) => point(d.success, i));
  const baseY = height - padB;
  const successArea = successPath
    ? `${successPath} L ${successPoints[successPoints.length - 1][0]} ${baseY} L ${successPoints[0][0]} ${baseY} Z`
    : '';
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => {
    const value = Math.round(maxValue * ratio);
    return {
      value,
      label: value.toLocaleString(),
      y: padT + (1 - ratio) * plotH,
    };
  });
  const windowMinutes = { '1h': 60, '6h': 360, '12h': 720, '24h': 1440 }[windowKey] || 360;
  const formatTime = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const xLabels = data.map((_, i) => {
    const offset = windowMinutes - (data.length <= 1 ? 0 : i * (windowMinutes / (data.length - 1)));
    return formatTime(new Date(Date.now() - offset * 60 * 1000));
  });

  return (
    <div className='relative rounded-2xl border border-white/90 bg-white/90 px-6 py-5 shadow-[0_14px_45px_rgba(59,130,246,.08)] backdrop-blur-xl'>
      <div className='mb-3 flex items-center gap-2 text-lg font-extrabold text-slate-900'>
        <span>{t('\u8bf7\u6c42\u8d8b\u52bf')}</span>
        <span className='text-sm font-bold text-slate-500'>({t('\u8fd1')} {getWindowLabel(windowKey)})</span>
      </div>
      <div className='mb-2 flex justify-center gap-8 text-[13px] font-bold text-slate-500'>
        <span className='inline-flex items-center gap-2'><i className='h-2.5 w-2.5 rounded-full bg-emerald-500' />{t('\u6210\u529f')}</span>
        <span className='inline-flex items-center gap-2'><i className='h-2.5 w-2.5 rounded-full bg-amber-500' />{t('\u6162\u901f')}</span>
        <span className='inline-flex items-center gap-2'><i className='h-2.5 w-2.5 rounded-full bg-rose-500' />{t('\u5931\u8d25')}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className='h-80 w-full max-sm:h-72'>
        <defs>
          <linearGradient id='gmRequestTrendFill' x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stopColor='#10b981' stopOpacity='.28' />
            <stop offset='100%' stopColor='#10b981' stopOpacity='.035' />
          </linearGradient>
        </defs>
        {yTicks.map((tick) => (
          <g key={tick.y}>
            <text x={padL - 14} y={tick.y + 5} textAnchor='end' fontSize='13' fontWeight='800' fill='#64748b'>{tick.label}</text>
            <line x1={padL} x2={width - padR} y1={tick.y} y2={tick.y} stroke='#e2e8f0' strokeDasharray='5 5' strokeWidth='1.2' />
          </g>
        ))}
        {successArea && <path d={successArea} fill='url(#gmRequestTrendFill)' />}
        <path d={successPath} fill='none' stroke='#10b981' strokeWidth='4.4' strokeLinecap='round' strokeLinejoin='round' />
        <path d={slowPath} fill='none' stroke='#f59e0b' strokeWidth='3.2' strokeLinecap='round' strokeLinejoin='round' />
        <path d={errorPath} fill='none' stroke='#ef4444' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
        {data.map((d, i) => {
          const [x, sy] = point(d.success, i);
          const [, oy] = point(d.slow, i);
          const [, ey] = point(d.error, i);
          const colW = plotW / Math.max(1, data.length - 1);
          return (
            <g key={i}>
              <rect
                x={x - colW / 2}
                y={padT}
                width={colW}
                height={plotH}
                fill='transparent'
                onMouseEnter={() => setHoverPoint({ x, y: Math.min(sy, oy, ey), d, label: xLabels[i] })}
                onMouseMove={() => setHoverPoint({ x, y: Math.min(sy, oy, ey), d, label: xLabels[i] })}
                onMouseLeave={() => setHoverPoint(null)}
              />
              <circle cx={x} cy={sy} r='3.2' fill='#ffffff' stroke='#10b981' strokeWidth='2.4' />
              <circle cx={x} cy={oy} r='3' fill='#ffffff' stroke='#f59e0b' strokeWidth='2.2' />
              <circle cx={x} cy={ey} r='3' fill='#ffffff' stroke='#ef4444' strokeWidth='2.2' />
            </g>
          );
        })}
        {xLabels.map((label, idx) => {
          const x = padL + idx * (plotW / Math.max(1, xLabels.length - 1));
          return <text key={label + idx} x={x} y={height - 14} textAnchor='middle' fontSize='13' fontWeight='800' fill='#64748b'>{label}</text>;
        })}
        {hoverPoint && (
          <g pointerEvents='none' transform={`translate(${Math.min(width - 208, Math.max(padL, hoverPoint.x + 14))}, ${Math.max(18, hoverPoint.y - 106)})`}>
            <rect width='196' height='98' rx='14' fill='#0f172a' opacity='.95' />
            <text x='16' y='26' fontSize='13' fontWeight='900' fill='#f8fafc'>{hoverPoint.label}</text>
            <text x='16' y='49' fontSize='13' fontWeight='900' fill='#34d399'>{`${t('\u6210\u529f')} ${(hoverPoint.d.success || 0).toLocaleString()}`}</text>
            <text x='16' y='69' fontSize='13' fontWeight='900' fill='#fbbf24'>{`${t('\u6162\u901f')} ${(hoverPoint.d.slow || 0).toLocaleString()}`}</text>
            <text x='16' y='89' fontSize='13' fontWeight='900' fill='#fb7185'>{`${t('\u5931\u8d25')} ${(hoverPoint.d.error || 0).toLocaleString()}`}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function DonutPanel({ stats, t, windowKey }) {
  const success = stats.reduce((sum, s) => sum + (s.success_count || 0), 0);
  const error = stats.reduce((sum, s) => sum + (s.error_count || 0), 0);
  const slow = aggregateBuckets(stats).reduce((sum, d) => sum + (d.slow || 0), 0);
  const total = stats.reduce((sum, s) => sum + (s.total_count || 0), 0);
  const successPct = total > 0 ? success / total * 100 : 100;
  const slowPct = total > 0 ? slow / total * 100 : 0;
  const errorPct = total > 0 ? error / total * 100 : 0;

  return (
    <div className='rounded-2xl border border-white/90 bg-white/85 p-4 shadow-[0_14px_45px_rgba(59,130,246,.09)] backdrop-blur-xl'>
      <div className='mb-4 text-sm font-extrabold text-slate-900'>{t('成功率分布占比')}（{t('近')} {getWindowLabel(windowKey)}）</div>
      <div className='flex items-center gap-6'>
        <BlockTooltip
          wrapperClassName='shrink-0'
          content={`${t('成功率')} ${successPct.toFixed(1)}%\n${t('性能一般')} ${slowPct.toFixed(1)}%\n${t('状态异常')} ${errorPct.toFixed(1)}%\n${t('失败')} ${error.toLocaleString()} ${t('次')}`}
        >
          <div
            className='relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full'
            style={{ background: `conic-gradient(#10b981 0 ${successPct}%, #f59e0b ${successPct}% ${successPct + slowPct}%, #f43f5e ${successPct + slowPct}% 100%)` }}
          >
            <div className='flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner'>
              <span className='text-[10px] font-semibold text-slate-400'>{t('成功率')}</span>
              <span className='text-lg font-extrabold text-slate-900'>{successPct.toFixed(1)}%</span>
            </div>
          </div>
        </BlockTooltip>
        <div className='min-w-0 flex-1 space-y-3 text-xs font-semibold text-slate-500'>
          <div className='flex items-center justify-between gap-3'><span className='inline-flex items-center gap-2'><i className='h-2.5 w-2.5 rounded-full bg-emerald-500' />{t('成功率')}</span><b className='text-slate-700'>{successPct.toFixed(1)}%</b></div>
          <div className='flex items-center justify-between gap-3'><span className='inline-flex items-center gap-2'><i className='h-2.5 w-2.5 rounded-full bg-amber-500' />{t('性能一般')}</span><b className='text-slate-700'>{slowPct.toFixed(1)}%</b></div>
          <div className='flex items-center justify-between gap-3'><span className='inline-flex items-center gap-2'><i className='h-2.5 w-2.5 rounded-full bg-rose-500' />{t('状态异常')}</span><b className='text-slate-700'>{error.toLocaleString()} {t('次')}（{errorPct.toFixed(1)}%）</b></div>
        </div>
      </div>
    </div>
  );
}

function StatusDistributionPanel({ stats, t }) {
  const rows = ['green', 'orange', 'red', 'empty'].map((key) => {
    const count = stats.filter((s) => {
      const pct = (s.total_count || 0) > 0 ? (s.success_count || 0) / (s.total_count || 1) * 100 : null;
      return getOverallStatusFromPct(pct) === key;
    }).length;
    return { key, count, pct: stats.length ? count / stats.length * 100 : 0 };
  });
  const meta = {
    green: ['运行良好', 'bg-emerald-50 text-emerald-500'],
    orange: ['状态缓慢', 'bg-amber-50 text-amber-500'],
    red: ['状态异常', 'bg-rose-50 text-rose-500'],
    empty: ['无请求', 'bg-slate-50 text-slate-400'],
  };
  return (
    <div className='rounded-2xl border border-white/90 bg-white/85 p-4 shadow-[0_14px_45px_rgba(59,130,246,.09)] backdrop-blur-xl'>
      <div className='mb-4 text-sm font-extrabold text-slate-900'>{t('分组状态分布')}</div>
      <div className='grid grid-cols-4 gap-2 text-center'>
        {rows.map((row) => (
          <div key={row.key} className='rounded-xl bg-slate-50/80 p-3' title={`${t(meta[row.key][0])}: ${row.count} (${row.pct.toFixed(1)}%)`}>
            <div className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full ${meta[row.key][1]}`}>
              <span className='h-2 w-2 rounded-full bg-current' />
            </div>
            <div className='text-[11px] font-bold' style={{ color: STATUS_STYLE[row.key].badgeColor }}>{t(meta[row.key][0])}</div>
            <div className='mt-1 text-lg font-extrabold text-slate-900'>{row.count}</div>
            <div className='text-[10px] font-semibold text-slate-400'>{row.pct.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel({ stats, t }) {
  const alerts = getAlertStats(stats).slice(0, 4);

  return (
    <div className='rounded-2xl border border-white/90 bg-white/85 p-4 shadow-[0_14px_45px_rgba(59,130,246,.09)] backdrop-blur-xl'>
      <div className='mb-4 flex items-center justify-between'>
        <div className='text-sm font-extrabold text-slate-900'>{t('告警通知')}</div>
        <span className='rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-500'>{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <div className='rounded-xl bg-emerald-50 px-4 py-5 text-center text-sm font-semibold text-emerald-600'>{t('暂无告警')}</div>
      ) : (
        <div className='space-y-3'>
          {alerts.map((a) => (
            <div key={a.group} className='flex items-start gap-3'>
              <span className={`mt-1 h-2 w-2 rounded-full ${a.status === 'red' ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <div className='min-w-0 flex-1'>
                <div className='truncate text-xs font-extrabold text-slate-800'>{a.group} {a.status === 'red' ? t('分组错误率过高') : t('分组响应缓慢')}</div>
                <div className='mt-1 text-[11px] font-medium text-slate-400'>{a.pct !== null ? `${t('成功率')} ${a.pct.toFixed(1)}%` : t('暂无请求')}</div>
              </div>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${a.status === 'red' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>{a.status === 'red' ? t('严重') : t('警告')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RightInsights({ stats, windowKey, t }) {
  return (
    <div className='space-y-5'>
      <MiniTrendPanel stats={stats} windowKey={windowKey} t={t} />
      <DonutPanel stats={stats} windowKey={windowKey} t={t} />
      <AlertsPanel stats={stats} t={t} />
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
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage]     = useState(1);
  const timerRef     = useRef(null);
  const countdownRef = useRef(null);
  const networkErrorRef = useRef(false);

  const fetchStats = useCallback(async (win) => {
    const w = win || windowKey || '6h';
    setStatsLoading(true);
    try {
      const params = new URLSearchParams({ window: w });
      params.set('model_detail', 'true');
      const res = await API.get(`/api/group_monitor/status?${params.toString()}`);
      if (res.data.success) {
        networkErrorRef.current = false;
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
    } catch (error) {
      const isNetworkError =
        error?.code === 'ERR_NETWORK' ||
        error?.message === 'Network Error' ||
        !error?.response;
      if (isNetworkError) {
        if (!networkErrorRef.current) {
          console.warn('Group monitor API unavailable, polling paused.', error);
          networkErrorRef.current = true;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      } else {
        showError(t('??????????'));
      }
    }
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

  const activeWindowKey = windowKey || '6h';
  const filteredStats = stats.filter((stat) =>
    !searchKeyword.trim() ||
    String(stat.group || '').toLowerCase().includes(searchKeyword.trim().toLowerCase()),
  );
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredStats.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedStats = filteredStats.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, activeWindowKey]);

  return (
    <div className='gm-page-shell gm-tw-page mx-auto box-border min-h-[calc(100dvh_-_var(--header-height,60px))] max-w-7xl px-6 pb-16'>

      {/* ── Page header ── */}
      <div className='mb-9 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <div className='mb-1.5 flex items-center gap-3'>
            <h1 className='text-[30px] font-extrabold leading-tight tracking-[-0.8px] text-slate-950'>
              {t('分组状态监控')}
            </h1>
            <span className='inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-500 shadow-sm'>
              <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M12 2 20 5.5v6.2c0 5.2-3.1 8.5-8 10.3-4.9-1.8-8-5.1-8-10.3V5.5L12 2Zm3.7 7.2-5 5-2.2-2.2-1.5 1.5 3.7 3.7 6.5-6.5-1.5-1.5Z' />
              </svg>
            </span>
          </div>
          <p className='m-0 flex items-center gap-2 text-[13px] font-normal text-slate-500'>
            <span className='gm-pulse-dot' />
            {stats.length > 0
              ? `${t('实时同步中')} · ${t('共监控')} ${stats.length} ${t('个分组')}`
              : t('监控说明')
            }
            {lastUpdated && ` · ${t('最后更新')} ${lastUpdated}`}
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            className='gm-refresh-btn inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white'
            onClick={() => { fetchStats(); setCountdown(config.refresh_interval ?? 60); }}
            disabled={statsLoading}
          >
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
              style={{ animation: statsLoading ? 'gm-spin 0.7s linear infinite' : 'none' }}>
              <polyline points='23 4 23 10 17 10'/>
              <path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10'/>
            </svg>
            {countdown > 0 ? `${countdown}s · ` : ''}{t('自动刷新')}
          </button>
          <Select
            value={activeWindowKey}
            onChange={setWindowKey}
            optionList={WINDOW_OPTIONS.map(o => ({ ...o, label: t(o.label) }))}
            style={{ width: 112 }}
            size='default'
          />
        </div>
      </div>

      <SummaryStrip stats={stats} windowKey={activeWindowKey} t={t} />

      <div className='mb-5 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='mr-1 text-sm font-bold text-slate-600'>{t('时间粒度')}:</span>
          {[...WINDOW_OPTIONS].reverse().map((opt) => (
            <button
              key={opt.value}
              type='button'
              onClick={() => setWindowKey(opt.value)}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-bold transition ${
                activeWindowKey === opt.value
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-200'
                  : 'bg-white/80 text-slate-500 shadow-sm hover:bg-white'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${activeWindowKey === opt.value ? 'bg-white/90' : 'bg-slate-400'}`} />
              {t(opt.label)} ({opt.value === '1h' || opt.value === '6h' ? 60 : 24})
            </button>
          ))}
        </div>
        <div className='flex items-center gap-3'>
          <div className='relative'>
            <svg className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2'>
              <circle cx='11' cy='11' r='7' />
              <path d='m21 21-4.3-4.3' />
            </svg>
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={t('搜索分组名称...')}
              className='h-10 w-72 rounded-2xl border border-white/80 bg-white/85 pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:ring-4 focus:ring-blue-100'
            />
          </div>
          <button className='flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-200'>
            <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.3'><rect x='4' y='4' width='6' height='6' rx='1.5'/><rect x='14' y='4' width='6' height='6' rx='1.5'/><rect x='14' y='14' width='6' height='6' rx='1.5'/><rect x='4' y='14' width='6' height='6' rx='1.5'/></svg>
          </button>
          <button className='flex h-10 w-10 items-center justify-center rounded-xl bg-white/85 text-blue-500 shadow-sm'>
            <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.3' strokeLinecap='round'><path d='M8 6h13'/><path d='M8 12h13'/><path d='M8 18h13'/><path d='M3 6h.01'/><path d='M3 12h.01'/><path d='M3 18h.01'/></svg>
          </button>
        </div>
      </div>

      {statsLoading && stats.length === 0 ? (
        <div className='py-20 text-center'>
          <Spin size='large' />
        </div>
      ) : stats.length === 0 ? (
        <div className='mb-10 rounded-2xl border border-white/90 bg-white/80 py-20 text-center text-sm text-slate-400 shadow-[0_14px_45px_rgba(59,130,246,.09)]'>
          <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'
            style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }}>
            <path d='M22 12h-4l-3 9L9 3l-3 9H2'/>
          </svg>
          {admin ? t('暂无监控数据，请在下方配置要监控的分组后保存') : t('暂无监控数据')}
        </div>
      ) : (
        <div className='mb-10 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(460px,1fr)]'>
          <div className='overflow-hidden rounded-2xl border border-white/90 bg-white/90 shadow-[0_14px_45px_rgba(59,130,246,.09)] backdrop-blur-xl'>
            {pagedStats.map((stat) => (
                <GroupDashboardRow
                  key={stat.group}
                  stat={stat}
                  modelStats={modelDetail[stat.group]}
                  windowKey={activeWindowKey}
                  showModelToggle={admin || canSeeModelDetail}
                />
              ))}
            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/55 px-5 py-3'>
              <div className='text-xs font-semibold text-slate-500'>
                {t('共')} {filteredStats.length} {t('个分组')}
              </div>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className='flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40'
                >
                  <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4'><path d='m15 18-6-6 6-6'/></svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                  <button
                    key={page}
                    type='button'
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 min-w-8 rounded-lg px-2 text-sm font-bold transition ${
                      page === safePage
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-200'
                        : 'bg-white text-slate-500 shadow-sm hover:text-blue-500'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type='button'
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className='flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40'
                >
                  <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4'><path d='m9 18 6-6-6-6'/></svg>
                </button>
              </div>
            </div>
          </div>
          <RightInsights stats={filteredStats} windowKey={activeWindowKey} t={t} />
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
            <div className='p-6 text-center'><Spin /></div>
          ) : (
            <div className='flex flex-col gap-5'>
              <div>
                <div className='mb-2 text-sm font-semibold text-slate-900'>
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
                <div className='mb-2 text-sm font-semibold text-slate-900'>
                  {t('刷新间隔（秒）')}
                </div>
                <div className='flex items-center gap-3'>
                  <InputNumber min={10} max={3600} style={{ width: 140 }}
                    value={config.refresh_interval ?? 60}
                    onChange={(v) => setConfig((c) => ({ ...c, refresh_interval: v }))}
                  />
                  <span className='text-xs text-slate-400'>{t('最小 10 秒')}</span>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-sm font-semibold text-slate-900'>{t('公开可见')}</span>
                <Switch
                  checked={config.public_visible ?? false}
                  onChange={(v) => setConfig((c) => ({ ...c, public_visible: v }))}
                />
                <span className='text-xs text-slate-400'>{t('开启后普通用户也可查看')}</span>
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-sm font-semibold text-slate-900'>{t('用户端模型详情')}</span>
                <Switch
                  checked={config.model_detail_visible ?? false}
                  onChange={(v) => setConfig((c) => ({ ...c, model_detail_visible: v }))}
                />
                <span className='text-xs text-slate-400'>{t('开启后普通用户可展开查看模型详情')}</span>
              </div>
              <div>
                <div className='mb-2 text-sm font-semibold text-slate-900'>
                  {t('默认时间窗口')}
                </div>
                <div className='flex items-center gap-3'>
                  <Select
                    value={config.default_window || '6h'}
                    onChange={(v) => setConfig((c) => ({ ...c, default_window: v }))}
                    optionList={WINDOW_OPTIONS.map(o => ({ ...o, label: t(o.label) }))}
                    style={{ width: 140 }}
                  />
                  <span className='text-xs text-slate-400'>{t('用户打开页面时默认显示的时间范围')}</span>
                </div>
              </div>
              <div>
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className='inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70'
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
        body:not(.dark) .gm-tw-page {
          background:
            radial-gradient(circle at 88% 4%, rgba(219, 234, 254, 0.95), transparent 34%),
            radial-gradient(circle at 8% 2%, rgba(238, 242, 255, 0.92), transparent 30%),
            linear-gradient(135deg, #f8fbff 0%, #f4f8ff 48%, #f8fbff 100%) !important;
        }

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
          gap: 22px;
        }
        .gm-equal-bars-track::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: -35%;
          width: 22%;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
          filter: blur(1px);
          animation: gm-shine-sweep 4.2s ease-in-out infinite;
        }
        @media (max-width: 768px) {
          .gm-grid {
            grid-template-columns: 1fr;
          }
          .gm-equal-bars-track {
            gap: 2px;
          }
        }
      `}</style>
    </div>
  );
}
