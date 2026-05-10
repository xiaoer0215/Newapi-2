import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  API,
  showError,
  stringToColor,
  timestamp2string,
} from '../../helpers';
import { formatSubscriptionDuration } from '../../helpers/subscriptionFormat';
import UserGroupIcon from '../common/UserGroupIcon';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import { resolveUserGroupIconValue } from '../../helpers/userGroupIcon';
import SubscriptionPlansCard from '../topup/SubscriptionPlansCard';

const formatCnyPrice = (value) => {
  const amount = Number(value || 0);
  return amount.toFixed(Number.isInteger(amount) ? 0 : 2);
};

const pickLatestSubscription = (subscriptions) => {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return null;
  }

  return subscriptions.reduce((latest, current) => {
    if (!latest) {
      return current;
    }
    const latestEndTime = Number(latest?.subscription?.end_time || 0);
    const currentEndTime = Number(current?.subscription?.end_time || 0);
    return currentEndTime > latestEndTime ? current : latest;
  }, null);
};

const pickFirstText = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

const getAvatarText = (value) => {
  const normalized = String(value || '')
    .replace(/\s+/g, '')
    .trim();

  if (!normalized) {
    return 'U';
  }

  return normalized.slice(0, 2).toUpperCase();
};

const getDateTimeParts = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return {
      primary: '--',
      secondary: '',
    };
  }

  const [datePart, timePart] = normalized.split(' ');
  return {
    primary: datePart || normalized,
    secondary: timePart || '',
  };
};

const HOUR_SECONDS = 3600;
const DAY_SECONDS = 24 * HOUR_SECONDS;
const MONTH_SECONDS = 30 * DAY_SECONDS;
const YEAR_SECONDS = 365 * DAY_SECONDS;

const isWithinRange = (value, target, tolerance) =>
  Math.abs(Number(value || 0) - target) <= tolerance;

const getPlanDurationSeconds = (plan) => {
  const unit = String(plan?.duration_unit || 'month').trim().toLowerCase();
  const value = Number(plan?.duration_value || 1);

  if (unit === 'year') {
    return value * YEAR_SECONDS;
  }
  if (unit === 'month') {
    return value * MONTH_SECONDS;
  }
  if (unit === 'day') {
    return value * DAY_SECONDS;
  }
  if (unit === 'hour') {
    return value * HOUR_SECONDS;
  }
  if (unit === 'custom') {
    return Number(plan?.custom_seconds || 0);
  }

  return value;
};

const normalizePlanKeywordText = (...values) =>
  values
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).toLowerCase().replace(/\s+/g, '').trim())
    .filter(Boolean)
    .join('|');

const getPlanKeywordText = (plan) =>
  normalizePlanKeywordText(
    plan?.title,
    plan?.name,
    plan?.label,
    plan?.subtitle,
    plan?.description,
    plan?.desc,
    plan?.remark,
    plan?.duration_text,
    plan?.durationText,
  );

const hasPlanKeyword = (keywordText, keywords) =>
  keywords.some((keyword) => keywordText.includes(keyword));

const detectPlanCategory = (plan) => {
  const unit = String(plan?.duration_unit || 'month').trim().toLowerCase();
  const value = Number(plan?.duration_value || 1);
  const seconds = getPlanDurationSeconds(plan);
  const keywordText = getPlanKeywordText(plan);

  if (
    unit === 'year' ||
    (unit === 'month' && value === 12) ||
    (unit === 'day' && isWithinRange(value, 365, 10)) ||
    isWithinRange(seconds, YEAR_SECONDS, 10 * DAY_SECONDS)
  ) {
    return 'year';
  }

  if (
    (unit === 'month' && value === 6) ||
    (unit === 'day' && isWithinRange(value, 180, 10)) ||
    isWithinRange(seconds, 6 * MONTH_SECONDS, 10 * DAY_SECONDS)
  ) {
    return 'half_year';
  }

  if (
    (unit === 'month' && value === 3) ||
    (unit === 'day' && isWithinRange(value, 90, 5)) ||
    isWithinRange(seconds, 3 * MONTH_SECONDS, 5 * DAY_SECONDS)
  ) {
    return 'quarter';
  }

  if (
    (unit === 'month' && value === 1) ||
    (unit === 'day' && isWithinRange(value, 30, 3)) ||
    isWithinRange(seconds, MONTH_SECONDS, 3 * DAY_SECONDS)
  ) {
    return 'month';
  }

  if (
    (unit === 'day' && isWithinRange(value, 7, 1)) ||
    isWithinRange(seconds, 7 * DAY_SECONDS, DAY_SECONDS)
  ) {
    return 'week';
  }

  if (
    (unit === 'day' && value === 1) ||
    (unit === 'hour' && value === 24) ||
    isWithinRange(seconds, DAY_SECONDS, 6 * HOUR_SECONDS)
  ) {
    return 'day';
  }

  if (
    hasPlanKeyword(keywordText, [
      '年卡',
      '包年',
      '年度',
      '1年',
      '一年',
      '12个月',
      '12月',
      '365天',
      '365日',
      'year',
      'yearly',
      'annual',
      'annually',
      '1year',
      '1yr',
      '12month',
      '12months',
      '365day',
      '365days',
    ])
  ) {
    return 'year';
  }

  if (
    hasPlanKeyword(keywordText, [
      '半年',
      '半年卡',
      '半年度',
      '6个月',
      '6月',
      '180天',
      'halfyear',
      'half-year',
      'semiannual',
      'semi-annually',
      '6month',
      '6months',
      '180day',
      '180days',
    ])
  ) {
    return 'half_year';
  }

  if (
    hasPlanKeyword(keywordText, [
      '季卡',
      '季度',
      '3个月',
      '3月',
      '90天',
      'quarter',
      'quarterly',
      '3month',
      '3months',
      '90day',
      '90days',
    ])
  ) {
    return 'quarter';
  }

  if (
    hasPlanKeyword(keywordText, [
      '月卡',
      '月度',
      '包月',
      '1个月',
      '一个月',
      '30天',
      '31天',
      '28天',
      '29天',
      'month',
      'monthly',
      '1month',
      '1months',
      '30day',
      '30days',
      '31day',
      '31days',
    ])
  ) {
    return 'month';
  }

  if (
    hasPlanKeyword(keywordText, [
      '周卡',
      '周度',
      '7天',
      'week',
      'weekly',
      '7day',
      '7days',
    ])
  ) {
    return 'week';
  }

  if (
    hasPlanKeyword(keywordText, [
      '日卡',
      '单日',
      '1天',
      '一天',
      '24小时',
      'day',
      'daily',
      '1day',
      '1days',
      '24hour',
      '24hours',
    ])
  ) {
    return 'day';
  }

  if (hasPlanKeyword(keywordText, ['小时', 'hour', 'hours'])) {
    return 'short_term';
  }

  if (seconds > 0 && seconds < 7 * DAY_SECONDS) {
    return 'short_term';
  }

  return 'custom';
};

const getPlanDisplayMeta = (plan, t) => {
  const category = detectPlanCategory(plan);
  const durationTextMap = {
    month: `1 ${t('个月')}`,
    quarter: `3 ${t('个月')}`,
    half_year: `6 ${t('个月')}`,
    year: `1 ${t('年')}`,
    week: `7 ${t('天')}`,
    day: `1 ${t('天')}`,
  };

  const categoryMetaMap = {
    month: {
      title: '月卡',
      badge: '入门方案',
      actionLabel: '选择月卡',
      sortOrder: 10,
      bullets: [
        '轻量开通，适合先试用',
        '开通即享会员身份与权益',
        '有效期清晰可见，使用更直观',
        '适合先感受再决定是否长期保留',
      ],
    },
    quarter: {
      title: '季卡',
      badge: '推荐方案',
      actionLabel: '立即开通季卡',
      sortOrder: 20,
      bullets: [
        '兼顾体验与周期，适合作为主力选择',
        '三个月持续有效，减少重复操作',
        '会员状态与到期信息同步展示',
        '适合想稳定使用但暂不考虑年付的用户',
      ],
    },
    half_year: {
      title: '半年卡',
      badge: '稳定方案',
      actionLabel: '选择半年卡',
      sortOrder: 30,
      bullets: [
        '适合中长期稳定使用',
        '减少续期频率带来的打断',
        '身份展示与到期信息统一在上方查看',
        '比短期方案更省心',
      ],
    },
    year: {
      title: '年卡',
      badge: '长期方案',
      actionLabel: '选择年卡',
      sortOrder: 40,
      bullets: [
        '长期会员方案，适合持续使用',
        '全年有效，省去多次续费麻烦',
        '身份展示与权益状态长期保持',
        '适合重视稳定性与连续体验的用户',
      ],
    },
    week: {
      title: '周卡',
      badge: '灵活方案',
      actionLabel: '选择周卡',
      sortOrder: 50,
      bullets: [
        '适合短周期灵活体验',
        '开通后同样会同步显示会员有效期',
        '到期后自动恢复普通用户展示',
        '更适合按需开通',
      ],
    },
    day: {
      title: '日卡',
      badge: '灵活方案',
      actionLabel: '选择日卡',
      sortOrder: 60,
      bullets: [
        '适合临时使用或快速体验',
        '开通后仍会同步显示会员有效期',
        '到期后自动恢复普通用户展示',
        '按需开通更灵活',
      ],
    },
    short_term: {
      title: '短时方案',
      badge: '短时方案',
      actionLabel: '选择方案',
      sortOrder: 70,
    },
    custom: {
      title: '自定义方案',
      badge: '自定义方案',
      actionLabel: '选择方案',
      sortOrder: 80,
    },
  };

  const currentMeta = categoryMetaMap[category] || categoryMetaMap.custom;
  const durationText =
    durationTextMap[category] || formatSubscriptionDuration(plan, t);

  const genericBullets = [
    `当前时长为 ${durationText}，适合灵活体验或特殊场景`,
    '开通后会同步显示会员有效期',
    '到期后自动恢复普通用户展示',
    '按需开通更灵活',
  ];

  return {
    category,
    durationText,
    durationSeconds: getPlanDurationSeconds(plan),
    title: currentMeta.title,
    badge: currentMeta.badge,
    actionLabel: currentMeta.actionLabel,
    sortOrder: currentMeta.sortOrder,
    bullets: currentMeta.bullets || genericBullets,
  };
};

const SectionIntro = ({ title, description, align = 'center' }) => (
  <div className={align === 'left' ? '' : 'text-center'}>
    <h2 className='m-0 text-[clamp(26px,3vw,34px)] font-extrabold leading-[1.18] text-[#111418]'>
      {title}
    </h2>
    <p
      className={`mt-3 text-[15px] leading-[1.8] text-[#949ba6] ${
        align === 'left' ? 'max-w-none' : 'mx-auto max-w-[720px]'
      }`}
    >
      {description}
    </p>
  </div>
);

const LoadingCard = ({ rows = 4, className = '' }) => (
  <div
    className={`rounded-[20px] bg-white p-6 shadow-[0_8px_30px_rgba(17,20,24,0.05)] ${className}`}
  >
    <Skeleton active placeholder={<Skeleton.Paragraph rows={rows} />} />
  </div>
);

const StatusChip = ({ children, danger = false }) => (
  <span
    className={`inline-flex min-h-[30px] items-center rounded-[10px] px-3 text-[12px] font-semibold ring-1 ${
      danger
        ? 'bg-[#fff1f2] text-[#ef4444] ring-[rgba(239,68,68,0.08)]'
        : 'bg-white/85 text-[#6b7280] ring-[rgba(17,20,24,0.06)]'
    }`}
  >
    {children}
  </span>
);

const DetailItem = ({
  label,
  value,
  description = '',
  danger = false,
  accent = 'neutral',
  className = '',
}) => {
  const toneClasses = danger
    ? 'border-[rgba(239,68,68,0.2)] bg-[#fff7f7]'
    : accent === 'warm'
      ? 'border-[rgba(227,185,106,0.22)] bg-[#fffcf4]'
      : 'border-[rgba(17,20,24,0.08)] bg-white';

  const labelClasses = danger
    ? 'text-[#ef4444]'
    : accent === 'warm'
      ? 'text-[#9a6d1e]'
      : 'text-[#949ba6]';

  return (
    <div
      className={`rounded-[18px] border px-5 py-4 shadow-[0_8px_22px_rgba(17,20,24,0.04)] ${toneClasses} ${className}`}
    >
      <p
        className={`mb-3 text-[12px] font-semibold tracking-[0.04em] ${labelClasses}`}
      >
        {label}
      </p>
      <div
        className={`text-[18px] font-semibold leading-[1.45] ${
          danger ? 'text-[#ef4444]' : 'text-[#111418]'
        }`}
      >
        {value}
      </div>
      {description ? (
        <p
          className={`mt-3 text-[13px] leading-[1.75] ${
            danger ? 'text-[#ef4444]' : 'text-[#626773]'
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
};

const GroupLogoStage = ({ value, alt, fallback, compact = false }) => (
  <div
    className={`flex items-center justify-center ${
      compact ? 'h-[120px]' : 'mx-auto h-[160px] w-full max-w-[280px]'
    }`}
  >
    {value ? (
      <UserGroupIcon
        value={value}
        alt={alt}
        wrapperClassName='flex h-full w-full items-center justify-center overflow-hidden'
        imgClassName='block h-full w-full object-contain'
        svgClassName='block h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full'
      />
    ) : (
      <div className='flex h-full w-full items-center justify-center text-[16px] font-bold text-[#7a808a]'>
        {fallback}
      </div>
    )}
  </div>
);

const ProfileAvatarStage = ({ src, name, username, badgeText }) => (
  <div className='relative h-[148px] w-[148px] flex-shrink-0 rounded-[28px] border border-[rgba(255,255,255,0.78)] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fa_100%)] p-[4px] shadow-[0_18px_40px_rgba(17,20,24,0.12)]'>
    <div className='relative h-full w-full overflow-hidden rounded-[24px] bg-[#eef2f6]'>
      {src ? (
        <img
          src={src}
          alt={name || username || '用户头像'}
          className='block h-full w-full object-cover'
        />
      ) : (
        <div
          className='flex h-full w-full items-center justify-center text-[46px] font-bold tracking-[0.04em] text-white'
          style={{
            background: `linear-gradient(135deg, ${stringToColor(
              username || name || 'user',
            )} 0%, #0f172a 145%)`,
          }}
        >
          {getAvatarText(name || username)}
        </div>
      )}
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(17,20,24,0.24)_100%)]' />
      <span className='absolute left-3 top-3 inline-flex min-h-[26px] items-center rounded-full bg-black/34 px-2.5 text-[10px] font-semibold tracking-[0.06em] text-white backdrop-blur-[10px]'>
        {badgeText}
      </span>
    </div>
  </div>
);

const OutlineIcon = ({ children }) => (
  <div className='grid h-14 w-14 place-items-center rounded-[14px] bg-[#fdf8ec] text-[#a67c27]'>
    <svg
      viewBox='0 0 24 24'
      aria-hidden='true'
      className='h-7 w-7 stroke-current'
      fill='none'
      strokeWidth='1.9'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {children}
    </svg>
  </div>
);

const DiamondIcon = () => (
  <OutlineIcon>
    <path d='M7 8.5L12 3l5 5.5-5 12-5-12z' />
    <path d='M7 8.5h10' />
    <path d='M10 8.5L12 20.5l2-12' />
  </OutlineIcon>
);

const TrendIcon = () => (
  <OutlineIcon>
    <path d='M4 7h16' />
    <path d='M7 7l4 4 3-3 6 6' />
    <path d='M20 14v4h-4' />
  </OutlineIcon>
);

const CalendarIcon = () => (
  <OutlineIcon>
    <rect x='3' y='5' width='18' height='16' rx='3' />
    <path d='M16 3v4' />
    <path d='M8 3v4' />
    <path d='M3 10h18' />
  </OutlineIcon>
);

const ShieldIcon = () => (
  <OutlineIcon>
    <path d='M12 3l7 3v5c0 5-3.2 8.1-7 10-3.8-1.9-7-5-7-10V6l7-3z' />
    <path d='M9.5 12.5l1.8 1.8 3.7-4' />
  </OutlineIcon>
);

const MessageIcon = () => (
  <OutlineIcon>
    <path d='M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z' />
    <path d='M8 9h8' />
    <path d='M8 13h5' />
  </OutlineIcon>
);

const GiftIcon = () => (
  <OutlineIcon>
    <path d='M5 10h14v10H5z' />
    <path d='M12 10v10' />
    <path d='M4 6h16v4H4z' />
    <path d='M12 6c0-2 1-3 2.5-3S17 4 17 6' />
    <path d='M12 6c0-2-1-3-2.5-3S7 4 7 6' />
  </OutlineIcon>
);

const LightbulbIcon = () => (
  <svg
    viewBox='0 0 24 24'
    aria-hidden='true'
    className='h-8 w-8 stroke-current'
    fill='none'
    strokeWidth='1.9'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M9 18h6' />
    <path d='M10 22h4' />
    <path d='M12 2a7 7 0 0 0-4.6 12.3c.8.7 1.4 1.5 1.8 2.7h5.6c.4-1.2 1-2 1.8-2.7A7 7 0 0 0 12 2z' />
  </svg>
);

const BenefitCard = ({ icon, title, description }) => (
  <article className='rounded-[12px] bg-white px-6 py-8 shadow-[0_2px_10px_rgba(17,20,24,0.03)] transition-all duration-200 hover:-translate-y-[4px] hover:shadow-[0_8px_30px_rgba(17,20,24,0.05)]'>
    {icon}
    <div className='mt-4'>
      <h4 className='m-0 text-[20px] font-semibold text-[#111418]'>{title}</h4>
      <p className='mt-3 text-[14px] leading-[1.7] text-[#626773]'>
        {description}
      </p>
    </div>
  </article>
);

const FaqItem = ({ question, answer }) => (
  <div>
    <h4 className='mb-2 flex items-start gap-2 text-[16px] font-semibold text-[#111418]'>
      <span className='font-extrabold text-[#e3b96a]'>Q:</span>
      <span>{question}</span>
    </h4>
    <p className='pl-[26px] text-[14px] leading-[1.75] text-[#626773]'>
      {answer}
    </p>
  </div>
);

const PlanPreviewCard = ({
  badge,
  title,
  priceText,
  bullets,
  featured = false,
  actionLabel,
  onClick,
}) => (
  <article
    className={`relative flex min-h-full flex-col rounded-[20px] border p-6 shadow-[0_2px_10px_rgba(17,20,24,0.03)] ${
      featured
        ? 'translate-y-[-8px] border-[rgba(227,185,106,0.5)] bg-[#fffbf0] shadow-[0_16px_40px_rgba(216,166,73,0.15)] max-[900px]:translate-y-0'
        : 'border-transparent bg-white'
    }`}
  >
    <span
      className={`inline-flex min-h-[28px] items-center self-start rounded-[6px] px-3 text-[12px] font-bold ${
        featured
          ? 'bg-[linear-gradient(135deg,#F0D290_0%,#D8A649_100%)] text-white'
          : 'bg-[#f3f4f6] text-[#949ba6]'
      }`}
    >
      {badge}
    </span>
    <div className='mb-6 mt-4 border-b border-[#f3f4f6] pb-6'>
      <h3
        className={`m-0 mb-3 text-[18px] font-semibold ${
          featured ? 'text-[#a67c27]' : 'text-[#626773]'
        }`}
      >
        {title}
      </h3>
      <div className={`text-[36px] font-extrabold ${featured ? 'text-[#a67c27]' : 'text-[#111418]'}`}>
        {priceText}
      </div>
    </div>
    <ul className='mb-8 flex-1 list-none space-y-3 text-left'>
      {bullets.map((item) => (
        <li key={item} className='flex gap-3 text-[14px] leading-[1.75] text-[#626773]'>
          <span
            className={`mt-[10px] block h-[6px] w-[6px] flex-shrink-0 rounded-full ${
              featured ? 'bg-[#e3b96a]' : 'bg-[#d1d5db]'
            }`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
    <button
      type='button'
      onClick={onClick}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-[8px] px-5 text-[15px] font-semibold transition-all duration-200 hover:-translate-y-[1px] ${
        featured
          ? 'bg-[linear-gradient(135deg,#F0D290_0%,#D8A649_100%)] text-white shadow-[0_8px_20px_rgba(216,166,73,0.3)]'
          : 'border border-[#e3b96a] bg-transparent text-[#a67c27] hover:bg-[#fdf8ec]'
      }`}
    >
      {actionLabel}
    </button>
  </article>
);

const MemberUpgradePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userState] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [plans, setPlans] = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [enableOnlineTopUp, setEnableOnlineTopUp] = useState(false);
  const [enableStripeTopUp, setEnableStripeTopUp] = useState(false);
  const [enableCreemTopUp, setEnableCreemTopUp] = useState(false);
  const [billingPreference, setBillingPreference] =
    useState('subscription_first');
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [allSubscriptions, setAllSubscriptions] = useState([]);
  const [quickOpenRequest, setQuickOpenRequest] = useState({
    signal: 0,
    planId: '',
  });

  // 权限检查
  useEffect(() => {
    const memberUpgradeEnabled = statusState?.status?.MemberUpgradeEnabled;
    if (memberUpgradeEnabled === 'false' || memberUpgradeEnabled === false) {
      showError(t('会员升级功能已关闭'));
      setHasPermission(false);
      setTimeout(() => navigate('/'), 100);
      return;
    }

    const memberUpgradeAdminOnly = statusState?.status?.MemberUpgradeAdminOnly;
    if (memberUpgradeAdminOnly === 'true' || memberUpgradeAdminOnly === true) {
      const userRole = userState?.user?.role || 0;
      if (userRole < 10) {
        showError(t('会员升级功能仅管理员可用'));
        setHasPermission(false);
        setTimeout(() => navigate('/'), 100);
        return;
      }
    }
    setHasPermission(true);
  }, [statusState?.status, userState?.user?.role, navigate, t]);

  const currentGroup = String(userState?.user?.group || 'default').trim();
  const groupIcons = statusState?.status?.user_group_icons || {};
  const userUsableGroups = statusState?.status?.user_usable_groups || {};

  const getGroupDisplayName = (group) => {
    const key = String(group || '').trim();
    if (!key || key.toLowerCase() === 'default') {
      return '普通用户';
    }
    return userUsableGroups?.[key] || key;
  };

  const loadTopupInfo = async () => {
    const res = await API.get('/api/user/topup/info');
    if (!res.data?.success) {
      throw new Error(res.data?.message || t('获取支付配置失败'));
    }

    const data = res.data.data || {};
    let methods = data.pay_methods || [];
    if (typeof methods === 'string') {
      try {
        methods = JSON.parse(methods);
      } catch (_) {
        methods = [];
      }
    }

    methods = (methods || []).filter((method) => method?.name && method?.type);
    setPayMethods(methods);
    setEnableOnlineTopUp(Boolean(data.enable_online_topup));
    setEnableStripeTopUp(Boolean(data.enable_stripe_topup));
    setEnableCreemTopUp(Boolean(data.enable_creem_topup));
  };

  const loadSubscriptionPlans = async () => {
    const res = await API.get('/api/subscription/plans');
    if (!res.data?.success) {
      throw new Error(res.data?.message || t('获取会员升级套餐失败'));
    }
    setPlans(res.data.data || []);
  };

  const loadSubscriptionSelf = async () => {
    const res = await API.get('/api/subscription/self');
    if (!res.data?.success) {
      return;
    }
    setBillingPreference(
      res.data.data?.billing_preference || 'subscription_first',
    );
    setActiveSubscriptions(res.data.data?.subscriptions || []);
    setAllSubscriptions(res.data.data?.all_subscriptions || []);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadTopupInfo(),
          loadSubscriptionPlans(),
          loadSubscriptionSelf(),
        ]);
      } catch (error) {
        if (!cancelled) {
          showError(error?.message || t('加载会员升级页面失败'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const memberPlans = useMemo(
    () =>
      (plans || []).filter((item) => {
        if (item?.plan?.show_in_member_upgrade !== true) {
          return false;
        }
        return (
          String(item?.plan?.upgrade_group || '').trim().toLowerCase() ===
          'svip'
        );
      }),
    [plans],
  );

  const memberPlanIdSet = useMemo(
    () => new Set(memberPlans.map((item) => item?.plan?.id).filter(Boolean)),
    [memberPlans],
  );

  const activeMemberSubscriptions = useMemo(
    () =>
      (activeSubscriptions || []).filter((item) =>
        memberPlanIdSet.has(item?.subscription?.plan_id),
      ),
    [activeSubscriptions, memberPlanIdSet],
  );

  const allMemberSubscriptions = useMemo(
    () =>
      (allSubscriptions || []).filter((item) =>
        memberPlanIdSet.has(item?.subscription?.plan_id),
      ),
    [allSubscriptions, memberPlanIdSet],
  );

  const currentGroupName = useMemo(
    () => getGroupDisplayName(currentGroup),
    [currentGroup, userUsableGroups],
  );

  const userSettings = useMemo(() => {
    try {
      const parsed = JSON.parse(userState?.user?.setting || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }, [userState?.user?.setting]);

  const displayUserName =
    pickFirstText(userState?.user?.display_name, userState?.user?.username) ||
    '用户';
  const loginUserName =
    pickFirstText(userState?.user?.username, displayUserName) || 'user';
  const userAvatarSrc = pickFirstText(
    userState?.user?.avatar,
    userState?.user?.avatar_url,
    userState?.user?.avatarUrl,
    userState?.user?.picture,
    userState?.user?.image,
    userState?.user?.photo_url,
    userState?.user?.photoUrl,
    userSettings?.avatar,
    userSettings?.avatar_url,
    userSettings?.avatarUrl,
    userSettings?.picture,
    userSettings?.image,
    userSettings?.photo_url,
    userSettings?.photoUrl,
  );

  const isSvipGroup = currentGroup.toLowerCase() === 'svip';
  const hasActiveMemberSubscription = activeMemberSubscriptions.length > 0;
  const isCurrentSvip = isSvipGroup && hasActiveMemberSubscription;

  const latestActiveMemberSubscription = useMemo(
    () => pickLatestSubscription(activeMemberSubscriptions),
    [activeMemberSubscriptions],
  );

  const latestMemberSubscription = useMemo(
    () => pickLatestSubscription(allMemberSubscriptions),
    [allMemberSubscriptions],
  );

  const activeMemberEndTime = Number(
    latestActiveMemberSubscription?.subscription?.end_time || 0,
  );
  const latestMemberEndTime = Number(
    latestMemberSubscription?.subscription?.end_time || 0,
  );

  const displayPlans = useMemo(() => {
    if (isCurrentSvip) {
      return [];
    }

    return (memberPlans || [])
      .map((item) => ({
        ...item,
        planMeta: getPlanDisplayMeta(item?.plan || {}, t),
      }))
      .sort((left, right) => {
        const leftMeta = left?.planMeta || {};
        const rightMeta = right?.planMeta || {};
        if (leftMeta.sortOrder !== rightMeta.sortOrder) {
          return Number(leftMeta.sortOrder || 0) - Number(rightMeta.sortOrder || 0);
        }
        if (leftMeta.durationSeconds !== rightMeta.durationSeconds) {
          return Number(leftMeta.durationSeconds || 0) - Number(rightMeta.durationSeconds || 0);
        }
        return Number(left?.plan?.price_amount || 0) - Number(right?.plan?.price_amount || 0);
      });
  }, [isCurrentSvip, memberPlans, t]);

  const membershipExpireInfo = useMemo(() => {
    if (hasActiveMemberSubscription && activeMemberEndTime > 0) {
      const formatted = timestamp2string(activeMemberEndTime);
      return {
        ...getDateTimeParts(formatted),
        tag: '',
        danger: false,
      };
    }

    if (latestMemberEndTime > 0) {
      const formatted = timestamp2string(latestMemberEndTime);
      return {
        ...getDateTimeParts(formatted),
        tag: '已到期',
        danger: true,
      };
    }

    return {
      primary: '未开通',
      secondary: '开通后显示有效期',
      tag: '',
      danger: false,
    };
  }, [
    activeMemberEndTime,
    hasActiveMemberSubscription,
    latestMemberEndTime,
  ]);

  const currentStatusSummary = isCurrentSvip
    ? '当前会员已生效'
    : latestMemberEndTime > 0
      ? '当前会员已过期，请及时续费'
      : '当前未开通会员';

  const currentStatusDescription = isCurrentSvip
    ? '会员权益生效中，当前已享受 SVIP 展示与专属优惠费率。'
    : latestMemberEndTime > 0
      ? '您的会员权益已失效，如需继续享受 SVIP 展示与优惠费率，请及时续费。'
      : '开通后即可显示 SVIP 身份，并享受更优惠的费率。';

  const latestMemberPlan = latestMemberSubscription?.subscription?.plan_id
    ? memberPlans.find(
        (item) => item?.plan?.id === latestMemberSubscription.subscription.plan_id,
      )
    : null;
  const latestMemberPlanMeta = latestMemberPlan
    ? getPlanDisplayMeta(latestMemberPlan.plan || {}, t)
    : null;
  const latestMemberPlanTitle =
    latestMemberPlanMeta?.title || latestMemberPlan?.plan?.title || 'SVIP 会员';
  const latestMemberDurationText =
    latestMemberPlanMeta?.durationText ||
    (latestMemberPlan ? formatSubscriptionDuration(latestMemberPlan.plan, t) : '');
  const effectiveStatusValue = isCurrentSvip
    ? '生效中'
    : latestMemberEndTime > 0
      ? '已失效'
      : '未开通';
  const effectiveStatusHint = isCurrentSvip
    ? '当前身份展示、费率和有效期都处于生效状态'
    : latestMemberEndTime > 0
      ? '会员已结束，当前页面已恢复普通用户展示'
      : '开通后这里会同步显示会员身份状态';
  const currentRateText = isCurrentSvip ? 'SVIP 优惠费率' : '标准费率';
  const expireAfterText = isCurrentSvip
    ? '到期后恢复普通用户'
    : latestMemberEndTime > 0
      ? '已恢复普通用户展示'
      : '开通后到期自动恢复';
  const expireAfterHint = isCurrentSvip
    ? '不会清空数据，也不会影响历史记录'
    : latestMemberEndTime > 0
      ? '只是身份与费率恢复默认，不影响现有数据'
      : '身份展示和费率会自动回到普通用户状态';

  const defaultIcon = useMemo(
    () =>
      resolveUserGroupIconValue({
        currentGroup: 'default',
        currentGroupDisplayName: '普通用户',
        groupIcons,
        userUsableGroups,
      }),
    [groupIcons, userUsableGroups],
  );

  const currentDisplayName = isCurrentSvip ? 'SVIP' : '普通用户';

  // 头部信息标签显示变量
  const expiryTimeDisplay = isCurrentSvip && activeMemberEndTime > 0
    ? timestamp2string(activeMemberEndTime)
    : latestMemberEndTime > 0
      ? timestamp2string(latestMemberEndTime)
      : '未开通';

  const currentPlanDisplay = isCurrentSvip
    ? latestMemberPlanTitle
    : '未开通';

  const currentRateDisplay = isCurrentSvip ? 'SVIP 优惠费率' : '标准费率';



  const svipIcon = useMemo(
    () =>
      resolveUserGroupIconValue({
        currentGroup: 'svip',
        currentGroupDisplayName: 'SVIP',
        groupIcons,
        userUsableGroups,
      }),
    [groupIcons, userUsableGroups],
  );

  const normalUserIcon = useMemo(
    () =>
      resolveUserGroupIconValue({
        currentGroup: 'default',
        currentGroupDisplayName: '普通用户',
        groupIcons,
        userUsableGroups,
      }),
    [groupIcons, userUsableGroups],
  );

  const featuredPlanIndex = useMemo(() => {
    const preferredCategories = ['quarter', 'half_year', 'month', 'year'];
    for (const category of preferredCategories) {
      const targetIndex = displayPlans.findIndex(
        (item) => item?.planMeta?.category === category,
      );
      if (targetIndex >= 0) {
        return targetIndex;
      }
    }
    return displayPlans.length > 0 ? 0 : -1;
  }, [displayPlans]);
  const featuredPlanId =
    displayPlans[featuredPlanIndex]?.plan?.id || displayPlans[0]?.plan?.id || '';

  const scrollToSection = (sectionId) => {
    if (typeof document === 'undefined') {
      return;
    }
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openPlanModal = (planId) => {
    if (!planId) {
      scrollToSection('pricing');
      return;
    }
    scrollToSection('pricing');
    setQuickOpenRequest((prev) => ({
      signal: prev.signal + 1,
      planId,
    }));
  };

  const openPrimaryPlan = () => {
    if (isCurrentSvip) {
      scrollToSection('comparison');
      return;
    }
    // 直接滚动到定价区域，让用户自行选择套餐
    scrollToSection('pricing');
  };

  const reloadSubscriptionSelf = async () => {
    await loadSubscriptionSelf();
  };

  const pricingEmptyText = isCurrentSvip
    ? '当前会员已生效，页面会保持 SVIP 展示，购买入口会自动隐藏。'
    : '当前暂无可购买套餐，请稍后再试或检查套餐配置。';
  const primaryActionLabel = isCurrentSvip ? '查看当前权益' : '开通会员';
  const mobileActionHint = isCurrentSvip
    ? '点这里查看当前会员状态'
    : latestMemberEndTime > 0
      ? '当前会员已过期，请及时续费'
      : '点这里直达会员套餐';

  // 从后端配置读取FAQ和余额换算说明（无默认值）
  const memberUpgradeFAQ = useMemo(() => {
    try {
      const faqData = statusState?.status?.MemberUpgradeFAQ;
      if (typeof faqData === 'string' && faqData.trim()) {
        return JSON.parse(faqData);
      }
      if (Array.isArray(faqData)) {
        return faqData;
      }
    } catch (_) {}
    return null;
  }, [statusState?.status?.MemberUpgradeFAQ]);

  const balanceConversionTitle = useMemo(() => {
    const title = statusState?.status?.MemberBalanceConversionTitle;
    return (typeof title === 'string' && title.trim()) ? title : null;
  }, [statusState?.status?.MemberBalanceConversionTitle]);

  const balanceConversionContent = useMemo(() => {
    const content = statusState?.status?.MemberBalanceConversionContent;
    return (typeof content === 'string' && content.trim()) ? content : null;
  }, [statusState?.status?.MemberBalanceConversionContent]);
  const statusBadgeClasses = isCurrentSvip
    ? 'bg-[#fff6de] text-[#a67c27]'
    : latestMemberEndTime > 0
      ? 'bg-[#fff0f0] text-[#ef4444]'
      : 'bg-[#f3f4f6] text-[#6b7280]';
  const topBannerClasses = isCurrentSvip
    ? 'bg-[linear-gradient(135deg,#EFFDF4_0%,#DCFCE7_100%)] text-[#166534]'
    : latestMemberEndTime > 0
      ? 'bg-[linear-gradient(135deg,#FEF2F2_0%,#FEE2E2_100%)] text-[#7f1d1d]'
      : 'bg-[linear-gradient(135deg,#F8FAFC_0%,#F1F5F9_100%)] text-[#475569]';
  const topBannerIconClasses = isCurrentSvip
    ? 'stroke-[#22c55e]'
    : latestMemberEndTime > 0
      ? 'stroke-[#ef4444]'
      : 'stroke-[#94a3b8]';

  // 如果没有权限，返回null（正在跳转）
  if (!hasPermission) {
    return null;
  }

  if (loading) {
    return (
      <div className='member-upgrade-page bg-white px-3 pb-[120px] pt-0'>
        <div className='mx-auto max-w-[1100px] space-y-6'>
          <LoadingCard rows={3} />
          <div className='text-center'>
            <div className='mx-auto h-10 w-[320px] max-w-full rounded bg-white shadow-[0_2px_10px_rgba(17,20,24,0.03)]' />
            <div className='mx-auto mt-4 h-5 w-[560px] max-w-full rounded bg-white shadow-[0_2px_10px_rgba(17,20,24,0.03)]' />
          </div>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <LoadingCard rows={3} />
            <LoadingCard rows={3} />
            <LoadingCard rows={3} />
            <LoadingCard rows={3} />
          </div>
          <LoadingCard rows={8} />
          <LoadingCard rows={6} />
          <LoadingCard rows={3} />
          <LoadingCard rows={6} />
        </div>
      </div>
    );
  }

  return (
    <div className='member-upgrade-page bg-white px-3 pb-[120px] pt-0'>
      <div className='mx-auto max-w-[1100px] space-y-6'>
        {/* 金色渐变头部 */}
        <section className='overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)]'>
          <div className='flex items-center justify-between gap-6 bg-[linear-gradient(135deg,#F0D290_0%,#E8C470_50%,#D8A649_100%)] px-7 py-6 max-[640px]:flex-col max-[640px]:items-start'>
            <div className='flex min-w-0 flex-1 items-center gap-4'>
              <div
                className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-[20px] font-semibold text-white'
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {getAvatarText(displayUserName)}
              </div>
              <div className='min-w-0 flex-1'>
                <div className='mb-2 flex items-center gap-2.5'>
                  <span className='text-[20px] font-semibold leading-none tracking-tight text-[#422006]'>
                    {loginUserName}
                  </span>
                  <div className='flex items-center' style={{ height: '20px' }}>
                    <UserGroupIcon
                      value={isCurrentSvip ? svipIcon : normalUserIcon}
                      alt={isCurrentSvip ? 'SVIP' : '普通用户'}
                      wrapperClassName='flex items-center justify-center'
                      imgClassName='block h-[20px] w-auto object-contain'
                      svgClassName='block h-[20px] w-auto [&>svg]:block [&>svg]:h-[20px] [&>svg]:w-auto'
                    />
                  </div>
                </div>
                <div className='flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-[13px] max-[640px]:overflow-visible max-[640px]:whitespace-normal min-[641px]:flex-nowrap min-[641px]:overflow-x-auto min-[641px]:whitespace-nowrap min-[641px]:pr-1 min-[641px]:[scrollbar-width:none] min-[641px]:[&::-webkit-scrollbar]:hidden'>
                  <div className='inline-flex items-center gap-1.5 min-[641px]:flex-shrink-0'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4 flex-shrink-0 stroke-[#78350f] opacity-70' fill='none' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <rect x='3' y='4' width='18' height='18' rx='2'/>
                      <path d='M16 2v4'/>
                      <path d='M8 2v4'/>
                      <path d='M3 10h18'/>
                    </svg>
                    <span className='text-[#78350f] opacity-80'>到期时间</span>
                    <span className='font-semibold text-[#422006]'>{expiryTimeDisplay}</span>
                  </div>
                  <div className='hidden h-4 w-px flex-shrink-0 bg-gradient-to-b from-transparent via-[#d97706] to-transparent opacity-30 min-[641px]:block'></div>
                  <div className='inline-flex items-center gap-1.5 min-[641px]:flex-shrink-0'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4 flex-shrink-0 stroke-[#78350f] opacity-70' fill='none' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M20 7h-9'/>
                      <path d='M14 17H5'/>
                      <circle cx='17' cy='17' r='3'/>
                      <circle cx='7' cy='7' r='3'/>
                    </svg>
                    <span className='text-[#78350f] opacity-80'>当前套餐</span>
                    <span className='font-semibold text-[#422006]'>{currentPlanDisplay}</span>
                  </div>
                  <div className='hidden h-4 w-px flex-shrink-0 bg-gradient-to-b from-transparent via-[#d97706] to-transparent opacity-30 min-[641px]:block'></div>
                  <div className='inline-flex items-center gap-1.5 min-[641px]:flex-shrink-0'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4 flex-shrink-0 stroke-[#78350f] opacity-70' fill='none' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'/>
                    </svg>
                    <span className='text-[#78350f] opacity-80'>当前费率</span>
                    <span className='font-semibold text-[#422006]'>{currentRateDisplay}</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`flex flex-shrink-0 gap-2.5 max-[640px]:w-full ${
                isCurrentSvip ? 'min-[641px]:flex-nowrap' : ''
              }`}
            >
              <button
                type='button'
                onClick={openPrimaryPlan}
                className='inline-flex h-[42px] flex-shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#6366f1_100%)] px-6 text-[14px] font-semibold text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)] transition-all hover:opacity-90 hover:shadow-[0_4px_12px_rgba(124,58,237,0.4)] max-[640px]:flex-1'
              >
                {primaryActionLabel}
              </button>
              <button
                type='button'
                onClick={() => scrollToSection('faq')}
                className='inline-flex h-[42px] flex-shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-[rgba(120,53,15,0.2)] bg-white px-6 text-[14px] font-semibold text-[#422006] transition-all hover:border-[rgba(120,53,15,0.3)] hover:bg-[#fffbeb] max-[640px]:flex-1'
              >
                查看说明
              </button>
            </div>
          </div>
          {/* 状态提示横幅 */}
          <div className={`flex items-start gap-3 px-7 py-4 ${topBannerClasses}`}>
            <svg viewBox='0 0 24 24' className={`mt-0.5 h-5 w-5 flex-shrink-0 ${topBannerIconClasses}`} fill='none' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              {latestMemberEndTime > 0 && !isCurrentSvip ? (
                <>
                  <circle cx='12' cy='12' r='10'/>
                  <path d='M12 8v4'/>
                  <path d='M12 16h.01'/>
                </>
              ) : (
                <>
                  <circle cx='12' cy='12' r='10'/>
                  <path d='M12 16h.01'/>
                  <path d='M12 12v-4'/>
                </>
              )}
            </svg>
            <p className='text-[14px] leading-[1.7]'>
              {currentStatusDescription}
            </p>
          </div>
        </section>

        {/* 引导标题 */}
        <header className='pt-8 text-center'>
          <h1 className='m-0 text-[clamp(30px,4.2vw,42px)] font-extrabold leading-[1.16] text-[#111418]'>
            点亮 SVIP 身份，让展示与消费同步升级
          </h1>
          <p className='mx-auto mt-4 max-w-[760px] text-[15px] leading-[1.9] text-[#626773]'>
            开通后，页面身份展示会切换为 SVIP，并在上方同步显示会员有效期。
            SVIP 基础单价更低，后续消费也会更优惠，适合希望长期保留身份展示和更优费率的用户。
          </p>
        </header>

        <section
          id='comparison'
          className='mx-auto grid max-w-[1060px] items-center gap-6 pt-2 xl:grid-cols-[1fr_72px_1fr]'
        >
          <article className='rounded-[28px] border border-[rgba(17,20,24,0.05)] bg-white px-8 py-10 text-center shadow-[0_18px_44px_rgba(17,20,24,0.06)] max-[900px]:px-6 max-[900px]:py-8'>
            <span className='inline-flex rounded-[6px] bg-[#f3f4f6] px-3 py-[6px] text-[12px] font-semibold text-[#949ba6]'>
              当前状态
            </span>
            <div className='mx-auto mt-7 max-w-[280px]'>
              <GroupLogoStage
                value={defaultIcon}
                alt='普通用户'
                fallback='普通用户'
                compact
              />
            </div>
            <h3 className='mb-6 mt-8 text-[20px] font-bold text-[#111418]'>
              普通用户
            </h3>
            <ul className='mx-auto max-w-[280px] rounded-[16px] bg-[#f7f8fb] p-5 text-left'>
              <li className='relative mb-3 pl-6 text-[14px] text-[#626773] before:absolute before:left-0 before:top-[-2px] before:text-[18px] before:text-[#d1d5db] before:content-["•"]'>
                页面保持普通用户展示
              </li>
              <li className='relative mb-3 pl-6 text-[14px] text-[#626773] before:absolute before:left-0 before:top-[-2px] before:text-[18px] before:text-[#d1d5db] before:content-["•"]'>
                按普通用户标准费率消费
              </li>
              <li className='relative pl-6 text-[14px] text-[#626773] before:absolute before:left-0 before:top-[-2px] before:text-[18px] before:text-[#d1d5db] before:content-["•"]'>
                有效期与状态信息展示较基础
              </li>
            </ul>
          </article>

          <div className='flex items-center justify-center max-xl:py-2'>
            <div className='grid h-11 w-11 place-items-center rounded-full bg-white text-[20px] font-bold text-[#c89b41] shadow-[0_12px_26px_rgba(17,20,24,0.08)] max-xl:rotate-90'>
              →
            </div>
          </div>

          <article className='relative rounded-[28px] border border-[rgba(227,185,106,0.28)] bg-[linear-gradient(180deg,#fffefb_0%,#ffffff_100%)] px-8 py-10 text-center shadow-[0_22px_50px_rgba(216,166,73,0.16)] max-[900px]:px-6 max-[900px]:py-8'>
            <span className='inline-flex rounded-[6px] bg-[#fdf8ec] px-3 py-[6px] text-[12px] font-semibold text-[#a67c27]'>
              开通即享
            </span>
            <div className='mx-auto mt-7 max-w-[280px]'>
              <GroupLogoStage value={svipIcon} alt='SVIP会员' fallback='SVIP' />
            </div>
            <h3 className='mb-6 mt-8 text-[20px] font-bold text-[#b68427]'>
              SVIP 尊享会员
            </h3>
            <ul className='mx-auto max-w-[280px] rounded-[16px] bg-[#fff9ec] p-5 text-left'>
              <li className='relative mb-3 pl-6 text-[14px] text-[#626773] before:absolute before:left-0 before:top-[2px] before:text-[14px] before:font-bold before:text-[#e3b96a] before:content-["✓"]'>
                页面身份展示切换为 SVIP
              </li>
              <li className='relative mb-3 pl-6 text-[14px] text-[#626773] before:absolute before:left-0 before:top-[2px] before:text-[14px] before:font-bold before:text-[#e3b96a] before:content-["✓"]'>
                基础单价更低，整体消费更优惠
              </li>
              <li className='relative mb-3 pl-6 text-[14px] text-[#626773] before:absolute before:left-0 before:top-[2px] before:text-[14px] before:font-bold before:text-[#e3b96a] before:content-["✓"]'>
                上方清晰显示会员有效期
              </li>
              <li className='relative pl-6 text-[14px] text-[#626773] before:absolute before:left-0 before:top-[2px] before:text-[14px] before:font-bold before:text-[#e3b96a] before:content-["✓"]'>
                到期后自动恢复普通用户展示
              </li>
            </ul>
          </article>
        </section>

        <div className='flex flex-wrap justify-center gap-3 pt-2'>
          <button
            type='button'
            onClick={openPrimaryPlan}
            className='inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#F0D290_0%,#D8A649_100%)] px-6 text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(216,166,73,0.26)] transition-all duration-200 hover:-translate-y-[1px]'
          >
            {primaryActionLabel}
          </button>
          <button
            type='button'
            onClick={() => scrollToSection('faq')}
            className='inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[rgba(227,185,106,0.3)] bg-white px-6 text-[14px] font-medium text-[#8a6b24] transition-colors hover:bg-[#fff8eb]'
          >
            查看说明
          </button>
        </div>

        <section>
          <SectionIntro
            title='会员专属权益'
            description='开通会员后，您将享受以下特权'
          />
          <div className='mt-10 grid gap-6 lg:grid-cols-3'>
            <BenefitCard
              icon={<DiamondIcon />}
              title='专属身份标识'
              description='个人中心和相关页面显示 SVIP 会员标识，彰显尊贵身份'
            />
            <BenefitCard
              icon={<TrendIcon />}
              title='优惠消费倍率'
              description='会员期间享受专属消费倍率，降低 API 调用成本'
            />
            <BenefitCard
              icon={<CalendarIcon />}
              title='每日签到奖励'
              description='每日签到可获得随机额度奖励，持续使用更划算'
            />
            <BenefitCard
              icon={<ShieldIcon />}
              title='优先体验权益'
              description='新功能上线时，会员用户可优先体验测试'
            />
            <BenefitCard
              icon={<MessageIcon />}
              title='会员数据看板'
              description='实时查看会员状态、消费统计和使用分析'
            />
            <BenefitCard
              icon={<GiftIcon />}
              title='优先技术支持'
              description='会员用户享受更快速的问题响应和技术支持服务'
            />
          </div>
        </section>

        {/* FAQ区域 - 仅在有配置时显示 */}
        {memberUpgradeFAQ && memberUpgradeFAQ.length > 0 && (
          <section id='faq' className='rounded-[20px] bg-white p-10 shadow-[0_2px_10px_rgba(17,20,24,0.03)] max-[900px]:p-6'>
            <SectionIntro
              title='关于升级的常见问题'
              description='这些是开通前最容易关心的几个问题，页面里先直接说清楚。'
              align='left'
            />
            <div className='mt-8 grid gap-8 lg:grid-cols-2'>
              {memberUpgradeFAQ.map((item, index) => (
                <FaqItem
                  key={index}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          </section>
        )}

        {/* 余额换算说明 - 仅在有配置时显示 */}
        {balanceConversionTitle && balanceConversionContent && (
          <section className='flex items-start gap-6 rounded-[12px] border-l-4 border-[#e3b96a] bg-white p-6 shadow-[0_2px_10px_rgba(17,20,24,0.03)] max-[640px]:flex-col'>
            <div className='flex h-8 w-8 items-center justify-center text-[#a67c27]'>
              <LightbulbIcon />
            </div>
            <div>
              <h4 className='m-0 text-[16px] font-semibold text-[#a67c27]'>
                {balanceConversionTitle}
              </h4>
              <p
                className='mt-2 text-[14px] leading-[1.8] text-[#626773]'
                dangerouslySetInnerHTML={{ __html: balanceConversionContent }}
              />
            </div>
          </section>
        )}

        <section id='pricing' className='scroll-mt-[88px]'>
          <SectionIntro
            title='选择适合您的开通方案'
            description='月卡适合先点亮身份展示，季卡适合作为主推方案，年卡适合长期保持 SVIP 状态。'
          />

          <div className='mt-10 grid gap-6 lg:grid-cols-3'>
            {!loading && displayPlans.length > 0 ? (
              displayPlans.map((item, index) => {
                const plan = item?.plan || {};
                const planMeta = item?.planMeta || getPlanDisplayMeta(plan, t);
                const priceText = `￥${formatCnyPrice(
                  plan?.price_amount,
                )} / ${planMeta.durationText}`;

                return (
                  <PlanPreviewCard
                    key={plan?.id || `${plan?.title}-${index}`}
                    badge={
                      index === featuredPlanIndex
                        ? '推荐方案'
                        : planMeta.badge
                    }
                    title={planMeta.title}
                    priceText={priceText}
                    bullets={planMeta.bullets}
                    featured={index === featuredPlanIndex}
                    actionLabel={
                      index === featuredPlanIndex
                        ? ['custom', 'short_term'].includes(planMeta.category)
                          ? '立即开通该方案'
                          : `立即开通${planMeta.title}`
                        : planMeta.actionLabel
                    }
                    onClick={() => openPlanModal(plan?.id)}
                  />
                );
              })
            ) : (
              <div className='rounded-[20px] border border-[rgba(227,185,106,0.3)] bg-[#fffbf0] px-6 py-8 text-center shadow-[0_2px_10px_rgba(17,20,24,0.03)] lg:col-span-3'>
                <div className='text-[28px] font-extrabold text-[#111418]'>
                  {isCurrentSvip ? 'SVIP 已生效' : '当前暂无可购买套餐'}
                </div>
                <p className='mx-auto mt-3 max-w-[720px] text-[14px] leading-[1.8] text-[#626773]'>
                  {pricingEmptyText}
                </p>
              </div>
            )}
          </div>

          {displayPlans.length > 0 ? (
            <SubscriptionPlansCard
              t={t}
              loading={loading}
              plans={displayPlans}
              payMethods={payMethods}
              enableOnlineTopUp={enableOnlineTopUp}
              enableStripeTopUp={enableStripeTopUp}
              enableCreemTopUp={enableCreemTopUp}
              billingPreference={billingPreference}
              onChangeBillingPreference={setBillingPreference}
              activeSubscriptions={activeMemberSubscriptions}
              allSubscriptions={allMemberSubscriptions}
              reloadSubscriptionSelf={reloadSubscriptionSelf}
              quickOpenPlanSignal={quickOpenRequest.signal}
              quickOpenPlanId={quickOpenRequest.planId}
              modalOnly
              withCard={false}
            />
          ) : null}
        </section>
      </div>

      <div className='fixed bottom-3 left-3 right-3 z-30 hidden items-center justify-between gap-3 rounded-[18px] border border-[rgba(227,185,106,0.2)] bg-[rgba(255,255,255,0.96)] p-3 shadow-[0_18px_34px_rgba(17,20,24,0.14)] backdrop-blur-[12px] max-[760px]:flex'>
        <div>
          <strong className='block text-[14px] text-[#111418]'>
            {currentStatusSummary}
          </strong>
          <span className='mt-1 block text-[12px] leading-[1.5] text-[#949ba6]'>
            {mobileActionHint}
          </span>
        </div>
        <button
          type='button'
          onClick={openPrimaryPlan}
          className='inline-flex min-h-12 min-w-[128px] items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#F0D290_0%,#D8A649_100%)] px-5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(216,166,73,0.3)]'
        >
          {primaryActionLabel}
        </button>
      </div>
    </div>
  );
};

export default MemberUpgradePage;
