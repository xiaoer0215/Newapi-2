import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Crown,
  Gift,
  HandCoins,
  History,
  Link as LinkIcon,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  UsersRound,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  API,
  copy,
  getQuotaPerUnit as getRawQuotaPerUnit,
  isAdmin,
  renderQuota,
  showError,
  showSuccess,
} from '../../helpers';
import { UserContext } from '../../context/User';

const { Text, Title, Paragraph } = Typography;
const PAGE_SIZE = 10;

const affiliateStyles = `
.affiliate-page { position: relative; min-height: calc(100vh - 72px); padding: 18px 0 42px; color: #0f172a; overflow: hidden; background: #eef6ff; }
.affiliate-bg { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 16% 10%, rgba(96,165,250,.26), transparent 28%), radial-gradient(circle at 86% 18%, rgba(125,211,252,.22), transparent 30%), linear-gradient(180deg, #eef6ff 0%, #f7fbff 48%, #eef6ff 100%); }
.affiliate-bg::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(37,99,235,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.035) 1px, transparent 1px); background-size: 34px 34px; mask-image: linear-gradient(180deg, rgba(0,0,0,.86), transparent 88%); -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,.86), transparent 88%); }
.affiliate-content { position: relative; z-index: 1; width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 18px; border-radius: 32px; border: 1px solid rgba(198,216,242,.72); background: rgba(255,255,255,.66); box-shadow: 0 30px 90px rgba(37,99,235,.12); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.affiliate-hero { position: relative; overflow: hidden; border: 1px solid rgba(191,219,254,.85); border-radius: 28px; padding: 34px; margin-bottom: 18px; background: linear-gradient(135deg, #e3f0ff 0%, #f7fbff 58%, #eaf6ff 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.95), 0 20px 58px rgba(37,99,235,.12); }
.affiliate-hero::before { content: ''; position: absolute; right: 230px; top: -110px; width: 320px; height: 320px; border-radius: 999px; background: rgba(59,130,246,.14); filter: blur(8px); pointer-events: none; }
.affiliate-hero::after { content: ''; position: absolute; right: -88px; bottom: -120px; width: 360px; height: 360px; border-radius: 999px; background: rgba(14,165,233,.16); filter: blur(6px); pointer-events: none; }
.affiliate-hero-main { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr) 230px 292px; gap: 26px; align-items: center; }
.affiliate-badge { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; border-radius: 999px; background: rgba(255,255,255,.76); border: 1px solid rgba(96,165,250,.36); color: #1d4ed8; font-weight: 800; font-size: 13px; box-shadow: 0 10px 26px rgba(37,99,235,.08); }
.affiliate-title { margin: 16px 0 12px !important; font-size: clamp(34px, 4.5vw, 56px) !important; line-height: 1.06 !important; letter-spacing: -0.052em; color: #0f172a; }
.affiliate-gradient-text { background: linear-gradient(90deg, #2563eb 0%, #0ea5e9 56%, #38bdf8 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.affiliate-hero-note { max-width: 600px; color: #475569; font-size: 15px; line-height: 1.75; margin: 0 !important; }
.affiliate-hero .semi-button, .affiliate-mobile-actions .semi-button { border-radius: 999px; font-weight: 700; }
.affiliate-hero-illustration { position: relative; height: 230px; display: flex; align-items: center; justify-content: center; overflow: visible; }
.affiliate-illus-orbit { position: absolute; width: 182px; height: 182px; border: 1px dashed rgba(37,99,235,.22); border-radius: 999px; transform: rotate(-12deg); }
.affiliate-gift { position: relative; width: 148px; height: 136px; border-radius: 30px; background: linear-gradient(145deg, #2563eb 0%, #38bdf8 100%); box-shadow: 0 28px 46px rgba(37,99,235,.28); transform: rotate(-8deg); }
.affiliate-gift::before { content: ''; position: absolute; left: 61px; top: 0; bottom: 0; width: 24px; background: linear-gradient(180deg, rgba(255,255,255,.9), rgba(219,234,254,.7)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.38); }
.affiliate-gift::after { content: ''; position: absolute; left: -12px; right: -12px; top: 44px; height: 24px; background: rgba(255,255,255,.88); box-shadow: 0 10px 20px rgba(15,23,42,.08); }
.affiliate-gift-lid { position: absolute; left: -15px; right: -15px; top: -26px; height: 46px; border-radius: 24px 24px 16px 16px; background: linear-gradient(135deg, #60a5fa, #1d4ed8); box-shadow: 0 18px 28px rgba(37,99,235,.22); }
.affiliate-float-card { position: absolute; display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 12px; border-radius: 16px; background: rgba(255,255,255,.92); border: 1px solid rgba(219,234,254,.95); box-shadow: 0 14px 32px rgba(37,99,235,.14); color: #1d4ed8; font-size: 12px; font-weight: 800; white-space: nowrap; z-index: 2; }
.affiliate-float-card.one { left: 6px; top: 34px; }
.affiliate-float-card.two { right: 0; bottom: 26px; color: #0f766e; }
.affiliate-hero-card { position: relative; z-index: 1; min-height: 218px; padding: 22px; border-radius: 24px; border: 1px solid rgba(219,234,254,.95); background: rgba(255,255,255,.9); box-shadow: 0 22px 48px rgba(37,99,235,.14), inset 0 1px 0 rgba(255,255,255,.95); }
.affiliate-hero-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.affiliate-tier-percent { font-size: 46px; font-weight: 950; color: #2563eb; letter-spacing: -0.06em; margin-top: 12px; line-height: 1; }
.affiliate-tier-subtitle { color: #64748b; font-size: 13px; margin-top: 6px; }
.affiliate-progress-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0 8px; color: #64748b; font-size: 12px; }
.affiliate-stat-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
.affiliate-stat-card, .affiliate-panel { border-radius: 24px !important; border: 1px solid rgba(219,234,254,.92) !important; background: rgba(255,255,255,.94) !important; box-shadow: 0 18px 46px rgba(37,99,235,.08) !important; }
.affiliate-stat-card { transition: transform .18s ease, box-shadow .18s ease; }
.affiliate-stat-card:hover { transform: translateY(-2px); box-shadow: 0 24px 58px rgba(37,99,235,.12) !important; }
.affiliate-stat-card .semi-card-body { padding: 20px !important; }
.affiliate-stat-icon { width: 48px; height: 48px; border-radius: 17px; display: flex; align-items: center; justify-content: center; flex: none; }
.affiliate-stat-value { font-size: 24px; font-weight: 900; letter-spacing: -0.035em; margin-top: 4px; color: #0f172a; }
.affiliate-panel .semi-card-body { padding: 24px !important; }
.affiliate-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
.affiliate-panel-title { display: flex; align-items: center; gap: 9px; font-weight: 850; font-size: 16px; color: #0f172a; }
.affiliate-link-box { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; align-items: start; }
.affiliate-link-input { margin-top: 12px; }
.affiliate-link-input .semi-input-wrapper { border-radius: 16px; background: #f8fbff; border-color: rgba(191,219,254,.9); }
.affiliate-link-hint { display: block; margin-top: 10px; color: #64748b; }
.affiliate-mobile-actions { display: flex; gap: 10px; justify-content: flex-start; flex-wrap: wrap; padding-bottom: 2px; }
.affiliate-tier-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
.affiliate-tier-card { position: relative; overflow: hidden; border-radius: 18px; border: 1px solid rgba(219,234,254,.95); padding: 16px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); transition: all .18s ease; min-height: 112px; }
.affiliate-tier-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(37,99,235,.08), transparent 55%); opacity: 0; transition: opacity .18s ease; }
.affiliate-tier-card.active { border-color: rgba(37,99,235,.58); background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%); box-shadow: 0 16px 34px rgba(37,99,235,.13); transform: translateY(-1px); }
.affiliate-tier-card.active::before { opacity: 1; }
.affiliate-leaderboard { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.affiliate-rank-card { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 14px; border-radius: 18px; border: 1px solid rgba(219,234,254,.95); background: linear-gradient(180deg, #fff 0%, #f8fbff 100%); }
.affiliate-rank-no { width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex: none; font-weight: 900; color: #2563eb; background: #eff6ff; border: 1px solid rgba(191,219,254,.95); }
.affiliate-rank-name { font-weight: 850; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.affiliate-toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 14px; }
.affiliate-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.affiliate-setting-box { border-radius: 18px; border: 1px solid rgba(219,234,254,.95); background: #f8fbff; padding: 16px; }
.affiliate-tier-editor { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.affiliate-tier-editor-item { border-radius: 18px; border: 1px solid rgba(219,234,254,.95); background: #fff; padding: 14px; }
.affiliate-tabs .semi-tabs-bar { display: flex !important; width: 100% !important; max-width: 100%; margin: 0 auto 14px !important; padding: 4px !important; gap: 2px !important; justify-content: center !important; flex-wrap: wrap !important; border-radius: 14px !important; background: #f1f7ff !important; border: 1px solid rgba(219,234,254,.9) !important; overflow: visible !important; scrollbar-width: none !important; -ms-overflow-style: none !important; }
.affiliate-tabs .semi-tabs-bar::before,
.affiliate-tabs .semi-tabs-bar::after,
.affiliate-tabs .semi-tabs-tab::before,
.affiliate-tabs .semi-tabs-tab::after,
.affiliate-tabs .semi-tabs-tab-button::before,
.affiliate-tabs .semi-tabs-tab-button::after { display: none !important; content: none !important; width: 0 !important; height: 0 !important; border: 0 !important; box-shadow: none !important; }
.affiliate-tabs .semi-tabs-bar *,
.affiliate-tabs .semi-tabs-bar { scrollbar-width: none !important; -ms-overflow-style: none !important; }
.affiliate-tabs .semi-tabs-bar *::-webkit-scrollbar,
.affiliate-tabs .semi-tabs-bar::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; background: transparent !important; }
.affiliate-tabs .semi-tabs-bar-overflow-list,
.affiliate-tabs .semi-overflow-list,
.affiliate-tabs .semi-overflow-list-scroll-wrapper,
.affiliate-tabs .semi-overflow-list-content { display: flex !important; align-items: center !important; justify-content: center !important; flex-wrap: wrap !important; gap: 2px !important; overflow: visible !important; max-width: 100% !important; }
.affiliate-tabs .semi-tabs-bar-button.semi-tabs-bar-top .semi-tabs-tab:not(:last-of-type) { margin-right: 2px !important; }
.affiliate-tabs .semi-tabs-tab,
.affiliate-tabs .semi-tabs-tab-button { flex: 0 0 auto !important; min-width: 0 !important; height: 34px !important; margin: 0 !important; padding: 0 12px !important; border: 1px solid transparent !important; border-radius: 11px !important; background: transparent !important; background-color: transparent !important; box-shadow: none !important; color: #64748b !important; text-align: center !important; }
.affiliate-tabs .semi-tabs-tab.semi-tabs-tab-active,
.affiliate-tabs .semi-tabs-tab[aria-selected='true'] { background: #ffffff !important; background-color: #ffffff !important; color: #2563eb !important; border: 1px solid rgba(147,197,253,.95) !important; box-shadow: 0 8px 20px rgba(37,99,235,.12) !important; }
.affiliate-tabs .semi-tabs-tab-active .semi-tabs-tab-button,
.affiliate-tabs .semi-tabs-tab[aria-selected='true'] .semi-tabs-tab-button { background: transparent !important; background-color: transparent !important; border: 0 !important; box-shadow: none !important; color: #2563eb !important; }
.affiliate-tabs .semi-tabs-tab-button > div { width: 100%; display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; }
.affiliate-tabs .semi-tabs-tab-button:hover { background: transparent !important; background-color: transparent !important; }
.affiliate-tabs .semi-tabs-tab:not(.semi-tabs-tab-active):not([aria-selected='true']) { background: transparent !important; background-color: transparent !important; box-shadow: none !important; border-color: transparent !important; color: #64748b !important; }
.affiliate-tabs .semi-tabs-tab:not(.semi-tabs-tab-active):not([aria-selected='true']) .semi-tabs-tab-button { background: transparent !important; background-color: transparent !important; box-shadow: none !important; }
.affiliate-tab-label { height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0 !important; background: transparent !important; color: #334155; font-weight: 800; white-space: nowrap; box-sizing: border-box; box-shadow: none !important; }
.affiliate-tab-label.is-active,
.affiliate-tabs .semi-tabs-tab-active .affiliate-tab-label,
.affiliate-tabs .semi-tabs-tab[aria-selected='true'] .affiliate-tab-label { background: transparent !important; background-color: transparent !important; color: #2563eb !important; border: 0 !important; box-shadow: none !important; }
.affiliate-tabs .semi-tabs-tab:hover .affiliate-tab-label:not(.is-active) { background: transparent !important; color: #1d4ed8; }
.affiliate-tabs .semi-tabs-content { padding-top: 2px; }
.affiliate-tabs .semi-table-container { border-radius: 18px; overflow: hidden; border: 1px solid rgba(226,232,240,.9); }
.affiliate-tabs .semi-table-thead > .semi-table-row > .semi-table-row-head { background: #f8fbff; color: #475569; font-weight: 800; }
@media (max-width: 1120px) { .affiliate-hero-main { grid-template-columns: minmax(0, 1fr) 292px; } .affiliate-hero-illustration { display: none; } .affiliate-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .affiliate-leaderboard { grid-template-columns: repeat(2, minmax(0, 1fr)); } .affiliate-settings-grid { grid-template-columns: 1fr; } .affiliate-tier-editor { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .affiliate-page { padding-top: 10px; } .affiliate-content { width: min(100% - 18px, 1180px); padding: 12px; border-radius: 24px; } .affiliate-hero { padding: 24px; border-radius: 22px; } .affiliate-hero-main { grid-template-columns: 1fr; } .affiliate-hero-card { min-height: auto; } .affiliate-stat-grid, .affiliate-tier-grid, .affiliate-tier-editor, .affiliate-leaderboard { grid-template-columns: 1fr; } .affiliate-link-box { grid-template-columns: 1fr; } .affiliate-mobile-actions { justify-content: flex-start; } .affiliate-panel .semi-card-body { padding: 18px !important; } .affiliate-title { font-size: clamp(30px, 10vw, 40px) !important; } }
`;


const statusMap = {
  pending: { color: 'orange', text: '待处理' },
  approved: { color: 'blue', text: '已通过,待打款' },
  rejected: { color: 'red', text: '已拒绝' },
  paid: { color: 'green', text: '已打款' },
};

const historyStatusMap = {
  pending: { color: 'orange', text: '待审核' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已驳回' },
  none: { color: 'grey', text: '未开启' },
  first_invite_used: { color: 'grey', text: '已用首邀' },
};

const defaultTiers = [
  { level: 1, min_invites: 0, percentage: 0 },
  { level: 2, min_invites: 10, percentage: 0 },
  { level: 3, min_invites: 30, percentage: 0 },
  { level: 4, min_invites: 100, percentage: 0 },
];

function safeQuotaPerUnit() {
  const value = Number(getRawQuotaPerUnit());
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function formatTime(value) {
  const ts = Number(value);
  if (!Number.isFinite(ts) || ts <= 0) return '-';
  return new Date(ts * 1000).toLocaleString();
}

function getItems(data) {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function getTotal(data, fallback = 0) {
  const total = Number(data?.total ?? data?.data?.total);
  return Number.isFinite(total) ? total : fallback;
}

function getPage(data, fallback = 1) {
  const page = Number(data?.page ?? data?.data?.page);
  return Number.isFinite(page) && page > 0 ? page : fallback;
}

function normalizeTiers(tiers) {
  const source = Array.isArray(tiers) && tiers.length > 0 ? tiers : defaultTiers;
  return defaultTiers.map((fallback, index) => {
    const tier = source[index] || fallback;
    return {
      level: index + 1,
      min_invites: Number(tier.min_invites ?? tier.MinInvites ?? fallback.min_invites) || 0,
      percentage: Number(tier.percentage ?? tier.Percentage ?? fallback.percentage) || 0,
    };
  });
}

function toBool(value) {
  return value === true || value === 'true' || value === '1';
}


function maskText(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.includes('@')) {
    const [name, domain] = text.split('@');
    const head = name.slice(0, Math.min(2, name.length));
    return `${head}***@${domain || ''}`;
  }
  if (text.length <= 2) return `${text[0] || ''}***`;
  if (text.length <= 4) return `${text.slice(0, 1)}***${text.slice(-1)}`;
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function inviteeName(row) {
  return row?.invitee_display_name || row?.invitee_username || row?.invitee_email || `User #${row?.invitee_id || '-'}`;
}

function inviterName(row) {
  return row?.inviter_display_name || row?.inviter_username || `User #${row?.inviter_id || '-'}`;
}

function leaderboardName(row) {
  return row?.inviter_display_name || row?.inviter_username || `User #${row?.inviter_id || '-'}`;
}

function accountWithId(username, id) {
  const account = String(username || '').trim() || '-';
  const userId = id || '-';
  return `${account}（ID: ${userId}）`;
}

function renderMoney(value) {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
}

const StatusTag = ({ status }) => {
  const item = statusMap[status] || { color: 'grey', text: status || '-' };
  return <Tag color={item.color}>{item.text}</Tag>;
};

const HistoryStatusTag = ({ status }) => {
  const item = historyStatusMap[status] || { color: 'grey', text: status || '-' };
  return <Tag color={item.color}>{item.text}</Tag>;
};

const StatCard = ({ icon, label, value, hint, color }) => (
  <Card className='affiliate-stat-card' bordered={false}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div className='affiliate-stat-icon' style={{ color, background: `${color}14` }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <Text type='tertiary'>{label}</Text>
        <div className='affiliate-stat-value'>{value}</div>
        {hint ? <Text type='quaternary' size='small'>{hint}</Text> : null}
      </div>
    </div>
  </Card>
);

const TierCard = ({ tier, active }) => (
  <div className={`affiliate-tier-card${active ? ' active' : ''}`}>
    <Space align='center' style={{ justifyContent: 'space-between', width: '100%' }}>
      <Tag color={active ? 'blue' : 'grey'}>Lv.{tier.level}</Tag>
      {active ? <BadgeCheck size={16} color='#2563eb' /> : null}
    </Space>
    <div style={{ fontSize: 24, fontWeight: 850, marginTop: 8 }}>
      {Number(tier.percentage || 0).toFixed(2)}%
    </div>
    <Text type='tertiary' size='small'>邀请满 {tier.min_invites || 0} 人</Text>
  </div>
);

const Affiliate = () => {
  const [userState] = useContext(UserContext);
  const adminUser = useMemo(() => {
    const contextRole = Number(userState?.user?.role || 0);
    if (contextRole >= 10) return true;
    return isAdmin();
  }, [userState?.user?.role]);
  const canManageAffiliateSettings = adminUser;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  const [records, setRecords] = useState([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [invitees, setInvitees] = useState([]);
  const [inviteesTotal, setInviteesTotal] = useState(0);
  const [inviteesPage, setInviteesPage] = useState(1);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);

  const [transferVisible, setTransferVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [transferQuota, setTransferQuota] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: 0,
    account_type: '支付宝',
    account_no: '',
    account_name: '',
    note: '',
  });

  const [adminWithdrawals, setAdminWithdrawals] = useState([]);
  const [adminWithdrawalsTotal, setAdminWithdrawalsTotal] = useState(0);
  const [adminWithdrawalsPage, setAdminWithdrawalsPage] = useState(1);
  const [adminWithdrawalsStatus, setAdminWithdrawalsStatus] = useState('pending');
  const [adminWithdrawalsKeyword, setAdminWithdrawalsKeyword] = useState('');
  const [reviewDialog, setReviewDialog] = useState({
    visible: false,
    record: null,
    status: 'approved',
    note: '',
  });

  const [adminRecords, setAdminRecords] = useState([]);
  const [adminRecordsTotal, setAdminRecordsTotal] = useState(0);
  const [adminRecordsPage, setAdminRecordsPage] = useState(1);
  const [adminRecordsKeyword, setAdminRecordsKeyword] = useState('');
  const [adminRelations, setAdminRelations] = useState([]);
  const [adminRelationsTotal, setAdminRelationsTotal] = useState(0);
  const [adminRelationsPage, setAdminRelationsPage] = useState(1);
  const [adminRelationsKeyword, setAdminRelationsKeyword] = useState('');
  const [adminTotalRanks, setAdminTotalRanks] = useState([]);
  const [adminTotalRanksTotal, setAdminTotalRanksTotal] = useState(0);
  const [adminTotalRanksPage, setAdminTotalRanksPage] = useState(1);
  const [adminTotalRanksKeyword, setAdminTotalRanksKeyword] = useState('');

  const [historyRewards, setHistoryRewards] = useState([]);
  const [historyRewardsTotal, setHistoryRewardsTotal] = useState(0);
  const [historyRewardsPage, setHistoryRewardsPage] = useState(1);
  const [historyRewardsStatus, setHistoryRewardsStatus] = useState('pending_any');
  const [historyRewardsKeyword, setHistoryRewardsKeyword] = useState('');
  const [historyReviewDialog, setHistoryReviewDialog] = useState({
    visible: false,
    record: null,
    review_type: 'register',
    action: 'approve',
    reject_reason: '',
  });

  const [optionsLoading, setOptionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('invitees');
  const tabsNavRef = useRef(null);

  const [settings, setSettings] = useState({
    AffiliateTransferEnabled: true,
    AffiliateWithdrawEnabled: true,
    AffiliateMinWithdrawQuota: safeQuotaPerUnit(),
    AffiliateBackfillHistoricalTopupEnabled: false,
    AffiliateLeaderboardEnabled: true,
    AffiliateCommissionTiers: defaultTiers,
  });

  const inviteLink = useMemo(() => {
    if (!summary?.aff_code) return '';
    return `${window.location.origin}/register?aff=${summary.aff_code}`;
  }, [summary?.aff_code]);

  const tiers = normalizeTiers(summary?.affiliate_commission_tiers);
  const currentTier = summary?.current_affiliate_tier;
  const nextTier = summary?.next_affiliate_tier;
  const maxTier = tiers[tiers.length - 1] || defaultTiers[defaultTiers.length - 1];
  const nextProgressTarget = nextTier?.min_invites || maxTier.min_invites || Math.max(summary?.aff_count || 0, 1);
  const progressPercent = nextTier
    ? Math.min(100, ((summary?.aff_count || 0) / Math.max(nextProgressTarget, 1)) * 100)
    : 100;

  const loadSummary = useCallback(async () => {
    const res = await API.get('/api/user/affiliate/summary');
    if (!res.data?.success) throw new Error(res.data?.message || '获取推广概览失败');
    const data = res.data.data || {};
    setSummary(data);
    setSettings((old) => ({
      AffiliateTransferEnabled: toBool(data.affiliate_transfer_enabled ?? old.AffiliateTransferEnabled),
      AffiliateWithdrawEnabled: toBool(data.affiliate_withdraw_enabled ?? old.AffiliateWithdrawEnabled),
      AffiliateMinWithdrawQuota: Number(data.affiliate_min_withdraw_quota ?? old.AffiliateMinWithdrawQuota),
      AffiliateBackfillHistoricalTopupEnabled: toBool(data.affiliate_backfill_historical_topup_enabled ?? old.AffiliateBackfillHistoricalTopupEnabled),
      AffiliateLeaderboardEnabled: toBool(data.affiliate_leaderboard_enabled ?? old.AffiliateLeaderboardEnabled),
      AffiliateCommissionTiers: normalizeTiers(data.affiliate_commission_tiers ?? old.AffiliateCommissionTiers),
    }));
    const minTransfer = safeQuotaPerUnit();
    setTransferQuota((old) => (old > 0 ? old : minTransfer));
    setWithdrawForm((old) => ({
      ...old,
      amount: old.amount > 0 ? old.amount : Number(data.affiliate_min_withdraw_quota || minTransfer),
    }));
  }, []);

  const loadRecords = useCallback(async (page = recordsPage) => {
    const res = await API.get('/api/user/affiliate/records', { params: { p: page, page_size: PAGE_SIZE } });
    if (!res.data?.success) throw new Error(res.data?.message || '获取分成记录失败');
    const data = res.data.data;
    const items = getItems(data);
    setRecords(items);
    setRecordsTotal(getTotal(data, items.length));
    setRecordsPage(getPage(data, page));
  }, [recordsPage]);

  const loadLeaderboard = useCallback(async () => {
    const res = await API.get('/api/user/affiliate/leaderboard', { params: { limit: 10 } });
    if (!res.data?.success) throw new Error(res.data?.message || '获取排行榜失败');
    setLeaderboard(getItems(res.data.data));
  }, []);

  const loadInvitees = useCallback(async (page = inviteesPage) => {
    const res = await API.get('/api/user/affiliate/invitees', { params: { p: page, page_size: PAGE_SIZE } });
    if (!res.data?.success) throw new Error(res.data?.message || '获取邀请用户失败');
    const data = res.data.data;
    const items = getItems(data);
    setInvitees(items);
    setInviteesTotal(getTotal(data, items.length));
    setInviteesPage(getPage(data, page));
  }, [inviteesPage]);

  const loadWithdrawals = useCallback(async (page = withdrawalsPage) => {
    const res = await API.get('/api/user/affiliate/withdrawals', { params: { p: page, page_size: PAGE_SIZE } });
    if (!res.data?.success) throw new Error(res.data?.message || '获取提现记录失败');
    const data = res.data.data;
    const items = getItems(data);
    setWithdrawals(items);
    setWithdrawalsTotal(getTotal(data, items.length));
    setWithdrawalsPage(getPage(data, page));
  }, [withdrawalsPage]);

  const loadAdminWithdrawals = useCallback(async (page = adminWithdrawalsPage, overrides = {}) => {
    if (!adminUser) return;
    const status = overrides.status ?? adminWithdrawalsStatus;
    const keyword = overrides.keyword ?? adminWithdrawalsKeyword;
    const res = await API.get('/api/user/admin/affiliate/withdrawals', {
      params: { p: page, page_size: PAGE_SIZE, status: status === 'all' ? '' : status, keyword },
    });
    if (!res.data?.success) throw new Error(res.data?.message || '获取提现审核列表失败');
    const data = res.data.data;
    const items = getItems(data);
    setAdminWithdrawals(items);
    setAdminWithdrawalsTotal(getTotal(data, items.length));
    setAdminWithdrawalsPage(getPage(data, page));
  }, [adminUser, adminWithdrawalsKeyword, adminWithdrawalsPage, adminWithdrawalsStatus]);

  const loadAdminRecords = useCallback(async (page = adminRecordsPage, overrides = {}) => {
    if (!adminUser) return;
    const keyword = overrides.keyword ?? adminRecordsKeyword;
    const res = await API.get('/api/user/admin/affiliate/records', {
      params: { p: page, page_size: PAGE_SIZE, keyword },
    });
    if (!res.data?.success) throw new Error(res.data?.message || '获取后台分成记录失败');
    const data = res.data.data;
    const items = getItems(data);
    setAdminRecords(items);
    setAdminRecordsTotal(getTotal(data, items.length));
    setAdminRecordsPage(getPage(data, page));
  }, [adminRecordsKeyword, adminRecordsPage, adminUser]);

  const loadAdminRelations = useCallback(async (page = adminRelationsPage, overrides = {}) => {
    if (!adminUser) return;
    const keyword = overrides.keyword ?? adminRelationsKeyword;
    const res = await API.get('/api/user/admin/affiliate/invite-relations', {
      params: { p: page, page_size: PAGE_SIZE, keyword },
    });
    if (!res.data?.success) throw new Error(res.data?.message || '获取邀请关系失败');
    const data = res.data.data;
    const items = getItems(data);
    setAdminRelations(items);
    setAdminRelationsTotal(getTotal(data, items.length));
    setAdminRelationsPage(getPage(data, page));
  }, [adminRelationsKeyword, adminRelationsPage, adminUser]);

  const loadAdminTotalRanks = useCallback(async (page = adminTotalRanksPage, overrides = {}) => {
    if (!adminUser) return;
    const keyword = overrides.keyword ?? adminTotalRanksKeyword;
    const res = await API.get('/api/user/admin/affiliate/total-ranking', {
      params: { p: page, page_size: PAGE_SIZE, keyword },
    });
    if (!res.data?.success) throw new Error(res.data?.message || '获取推广总榜失败');
    const data = res.data.data;
    const items = getItems(data);
    setAdminTotalRanks(items);
    setAdminTotalRanksTotal(getTotal(data, items.length));
    setAdminTotalRanksPage(getPage(data, page));
  }, [adminTotalRanksKeyword, adminTotalRanksPage, adminUser]);

  const loadHistoryRewards = useCallback(async (page = historyRewardsPage, overrides = {}) => {
    if (!adminUser) return;
    const status = overrides.status ?? historyRewardsStatus;
    const keyword = overrides.keyword ?? historyRewardsKeyword;
    const res = await API.get('/api/user/aff/rewards', {
      params: { p: page, page_size: PAGE_SIZE, status: status === 'all' ? '' : status, keyword },
    });
    if (!res.data?.success) throw new Error(res.data?.message || '获取历史邀请审核失败');
    const data = res.data.data;
    const items = getItems(data);
    setHistoryRewards(items);
    setHistoryRewardsTotal(getTotal(data, items.length));
    setHistoryRewardsPage(getPage(data, page));
  }, [adminUser, historyRewardsKeyword, historyRewardsPage, historyRewardsStatus]);

  const loadOptions = useCallback(async () => {
    if (!canManageAffiliateSettings) return;
    setOptionsLoading(true);
    try {
      const res = await API.get('/api/user/admin/affiliate/settings');
      if (!res.data?.success) throw new Error(res.data?.message || '获取分成设置失败');
      const data = res.data.data || {};
      setSettings({
        AffiliateTransferEnabled: toBool(data.affiliate_transfer_enabled ?? true),
        AffiliateWithdrawEnabled: toBool(data.affiliate_withdraw_enabled ?? true),
        AffiliateMinWithdrawQuota: Number(data.affiliate_min_withdraw_quota || safeQuotaPerUnit()),
        AffiliateBackfillHistoricalTopupEnabled: toBool(data.affiliate_backfill_historical_topup_enabled ?? false),
        AffiliateLeaderboardEnabled: toBool(data.affiliate_leaderboard_enabled ?? true),
        AffiliateCommissionTiers: normalizeTiers(data.affiliate_commission_tiers),
      });
    } catch (error) {
      showError(error.message || error);
    } finally {
      setOptionsLoading(false);
    }
  }, [canManageAffiliateSettings]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSummary(),
        loadRecords(recordsPage),
        loadLeaderboard(),
        loadInvitees(inviteesPage),
        loadWithdrawals(withdrawalsPage),
        adminUser ? loadAdminWithdrawals(adminWithdrawalsPage) : Promise.resolve(),
        adminUser ? loadAdminRecords(adminRecordsPage) : Promise.resolve(),
        adminUser ? loadAdminRelations(adminRelationsPage) : Promise.resolve(),
        adminUser ? loadAdminTotalRanks(adminTotalRanksPage) : Promise.resolve(),
        adminUser ? loadHistoryRewards(historyRewardsPage) : Promise.resolve(),
      ]);
    } catch (error) {
      showError(error.message || error);
    } finally {
      setLoading(false);
    }
  }, [
    adminRecordsPage,
    adminRelationsPage,
    adminTotalRanksPage,
    adminUser,
    adminWithdrawalsPage,
    historyRewardsPage,
    inviteesPage,
    loadAdminRecords,
    loadAdminRelations,
    loadAdminTotalRanks,
    loadAdminWithdrawals,
    loadHistoryRewards,
    loadInvitees,
    loadLeaderboard,
    loadRecords,
    loadSummary,
    loadWithdrawals,
    recordsPage,
    withdrawalsPage,
  ]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!adminUser && (activeTab === 'settings' || activeTab.startsWith('admin'))) {
      setActiveTab('invitees');
    }
  }, [activeTab, adminUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const root = tabsNavRef.current;
      if (!root) return;

      const activeNode = root.querySelector('.semi-tabs-tab-active, .semi-tabs-tab-button.semi-tabs-tab-active');
      const activeTabNode = activeNode?.closest?.('.semi-tabs-tab') || activeNode;
      if (!activeTabNode?.scrollIntoView) return;

      activeTabNode.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }, 30);

    return () => window.clearTimeout(timer);
  }, [activeTab, adminUser]);

  const renderTabLabel = useCallback((key, label) => (
    <span className={`affiliate-tab-label${activeTab === key ? ' is-active' : ''}`}>{label}</span>
  ), [activeTab]);

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await copy(inviteLink);
    showSuccess('推广链接已复制');
  };

  const handleTransfer = async () => {
    if (!summary?.affiliate_transfer_enabled) return showError('收益划转未开启');
    if (Number(transferQuota) < safeQuotaPerUnit()) return showError(`划转额度最低为 ${renderQuota(safeQuotaPerUnit())}`);
    setSubmitting(true);
    try {
      const res = await API.post('/api/user/affiliate/transfer', { quota: Number(transferQuota) });
      if (res.data?.success) {
        showSuccess('划转成功');
        setTransferVisible(false);
        await refreshAll();
      } else {
        showError(res.data?.message || '划转失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!summary?.affiliate_withdraw_enabled) return showError('收益提现未开启');
    if (Number(withdrawForm.amount) < Number(summary?.affiliate_min_withdraw_quota || 0)) {
      return showError(`提现最低为 ${renderQuota(summary?.affiliate_min_withdraw_quota || 0)}`);
    }
    setSubmitting(true);
    try {
      const res = await API.post('/api/user/affiliate/withdraw', {
        ...withdrawForm,
        account_type: '支付宝',
        amount: Number(withdrawForm.amount),
      });
      if (res.data?.success) {
        showSuccess('提现申请已提交，等待管理员审核');
        setWithdrawVisible(false);
        await refreshAll();
      } else {
        showError(res.data?.message || '提现申请失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitWithdrawalReview = async () => {
    if (!reviewDialog.record?.id) return;
    setSubmitting(true);
    try {
      const res = await API.post(`/api/user/admin/affiliate/withdrawals/${reviewDialog.record.id}/review`, {
        status: reviewDialog.status,
        review_note: reviewDialog.note,
      });
      if (res.data?.success) {
        showSuccess('审核状态已更新');
        setReviewDialog({ visible: false, record: null, status: 'approved', note: '' });
        await Promise.all([loadAdminWithdrawals(adminWithdrawalsPage), loadAdminTotalRanks(adminTotalRanksPage), loadWithdrawals(withdrawalsPage), loadSummary()]);
      } else {
        showError(res.data?.message || '审核失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitHistoryReview = async () => {
    if (!historyReviewDialog.record?.id) return;
    if (historyReviewDialog.action === 'reject' && !historyReviewDialog.reject_reason.trim()) {
      return showError('驳回时请填写原因');
    }
    setSubmitting(true);
    try {
      const res = await API.post(`/api/user/aff/rewards/${historyReviewDialog.record.id}/review`, {
        review_type: historyReviewDialog.review_type,
        action: historyReviewDialog.action,
        reject_reason: historyReviewDialog.reject_reason,
      });
      if (res.data?.success) {
        showSuccess('历史奖励审核已更新');
        setHistoryReviewDialog({ visible: false, record: null, review_type: 'register', action: 'approve', reject_reason: '' });
        await loadHistoryRewards(historyRewardsPage);
      } else {
        showError(res.data?.message || '审核失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateTier = (index, key, value) => {
    setSettings((old) => {
      const next = normalizeTiers(old.AffiliateCommissionTiers);
      next[index] = { ...next[index], [key]: Number(value || 0) };
      return { ...old, AffiliateCommissionTiers: next };
    });
  };

  const saveSettings = async () => {
    if (!canManageAffiliateSettings) {
      showError('只有管理员可以保存分成设置');
      return;
    }
    const normalized = normalizeTiers(settings.AffiliateCommissionTiers);
    setOptionsLoading(true);
    try {
      const res = await API.put('/api/user/admin/affiliate/settings', {
        affiliate_transfer_enabled: !!settings.AffiliateTransferEnabled,
        affiliate_withdraw_enabled: !!settings.AffiliateWithdrawEnabled,
        affiliate_min_withdraw_quota: Number(settings.AffiliateMinWithdrawQuota || 0),
        affiliate_backfill_historical_topup_enabled: !!settings.AffiliateBackfillHistoricalTopupEnabled,
        affiliate_leaderboard_enabled: !!settings.AffiliateLeaderboardEnabled,
        affiliate_commission_tiers: normalized,
      });
      if (!res.data?.success) throw new Error(res.data?.message || '分成设置保存失败');
      const backfilledCount = Number(res.data?.data?.affiliate_backfilled_count || 0);
      showSuccess(backfilledCount > 0 ? `分成设置已保存，已补算 ${backfilledCount} 笔历史订单` : '分成设置已保存');
      setSettings((old) => ({ ...old, AffiliateCommissionTiers: normalized }));
      await Promise.all([loadSummary(), loadLeaderboard(), loadOptions()]);
    } catch (error) {
      showError(error.message || error);
    } finally {
      setOptionsLoading(false);
    }
  };

  const recordColumns = [
    { title: '订单号', dataIndex: 'trade_no', render: (text) => <Text copyable={text ? { content: text } : false}>{text || '-'}</Text> },
    { title: '好友实际支付', dataIndex: 'top_up_money', render: (v) => renderMoney(v) },
    { title: '分成比例', dataIndex: 'commission_percentage_snapshot', render: (v) => <Tag color='blue'>{Number(v || 0).toFixed(2)}%</Tag> },
    { title: '分成收益', dataIndex: 'commission_quota', render: (v) => <Text strong>{renderQuota(v || 0)}</Text> },
    { title: '结算时间', dataIndex: 'created_at', render: formatTime },
  ];

  const inviteeColumns = [
    { title: '好友用户', dataIndex: 'invitee_username', render: (_, row) => maskText(inviteeName(row)) },
    { title: '邮箱', dataIndex: 'invitee_email', render: (v) => maskText(v) },
  ];

  const withdrawalColumns = [
    { title: '金额', dataIndex: 'amount', render: (v) => <Text strong>{renderQuota(v || 0)}</Text> },
    { title: '状态', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: '收款账户', dataIndex: 'account_no', render: (_, row) => `${row.account_type || '-'} / ${row.account_no || '-'}` },
    { title: '审核备注', dataIndex: 'review_note', render: (v) => v || '-' },
    { title: '申请时间', dataIndex: 'created_at', render: formatTime },
  ];

  const adminWithdrawalColumns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '用户ID', dataIndex: 'user_id', width: 90 },
    { title: '金额', dataIndex: 'amount', render: (v) => <Text strong>{renderQuota(v || 0)}</Text> },
    { title: '状态', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: '收款方式', dataIndex: 'account_type', render: (v) => v || '-' },
    { title: '收款账号', dataIndex: 'account_no', render: (v) => <Text copyable={v ? { content: v } : false}>{v || '-'}</Text> },
    { title: '收款姓名', dataIndex: 'account_name', render: (v) => v || '-' },
    { title: '申请时间', dataIndex: 'created_at', render: formatTime },
    {
      title: '审核操作',
      dataIndex: 'operate',
      fixed: 'right',
      render: (_, row) => (
        <Space wrap>
          <Button size='small' type='primary' disabled={row.status === 'rejected' || row.status === 'paid'} onClick={() => setReviewDialog({ visible: true, record: row, status: 'approved', note: '审核通过' })}>通过</Button>
          <Button size='small' type='danger' disabled={row.status === 'rejected' || row.status === 'paid'} onClick={() => setReviewDialog({ visible: true, record: row, status: 'rejected', note: '资料不符合要求' })}>拒绝</Button>
          <Button size='small' disabled={row.status === 'rejected' || row.status === 'paid'} onClick={() => setReviewDialog({ visible: true, record: row, status: 'paid', note: '已打款' })}>标记打款</Button>
        </Space>
      ),
    },
  ];

  const adminRecordColumns = [
    { title: '订单号', dataIndex: 'trade_no', render: (v) => <Text copyable={v ? { content: v } : false}>{v || '-'}</Text> },
    { title: '充值用户账号', dataIndex: 'user_username', render: (_, row) => <Text copyable={{ content: accountWithId(row.user_username, row.user_id) }}>{accountWithId(row.user_username, row.user_id)}</Text> },
    { title: '推广人账号', dataIndex: 'inviter_username', render: (_, row) => <Text copyable={{ content: accountWithId(row.inviter_username, row.inviter_id) }}>{accountWithId(row.inviter_username, row.inviter_id)}</Text> },
    { title: '实际支付金额', dataIndex: 'top_up_money', render: (v) => renderMoney(v) },
    { title: '分成比例', dataIndex: 'commission_percentage_snapshot', render: (v) => `${Number(v || 0).toFixed(2)}%` },
    { title: '分成收益', dataIndex: 'commission_quota', render: (v) => <Text strong>{renderQuota(v || 0)}</Text> },
    { title: '结算时间', dataIndex: 'created_at', render: formatTime },
  ];

  const adminTotalRankColumns = [
    { title: '排名', dataIndex: 'rank', width: 80, render: (v) => <Tag color={Number(v || 0) <= 3 ? 'orange' : 'blue'}>#{v || '-'}</Tag> },
    { title: '用户账号', dataIndex: 'username', render: (_, row) => <Text copyable={{ content: accountWithId(row.username, row.user_id) }}>{accountWithId(row.username, row.user_id)}</Text> },
    { title: '邀请人数', dataIndex: 'invite_count', render: (v) => Number(v || 0) },
    { title: '累计收益', dataIndex: 'aff_history_quota', render: (v) => <Text strong>{renderQuota(v || 0)}</Text> },
    { title: '可用收益', dataIndex: 'aff_quota', render: (v) => renderQuota(v || 0) },
    { title: '提现中', dataIndex: 'withdraw_pending_quota', render: (_, row) => renderQuota(Number(row.withdraw_pending_quota || 0) + Number(row.withdraw_approved_quota || 0)) },
    { title: '已提现', dataIndex: 'withdraw_paid_quota', render: (v) => renderQuota(v || 0) },
    { title: '提现合计', dataIndex: 'withdraw_total_quota', render: (v) => renderQuota(v || 0) },
    { title: '已转余额', dataIndex: 'transferred_quota', render: (v) => renderQuota(v || 0) },
    { title: '分成笔数', dataIndex: 'commission_count', render: (v) => Number(v || 0) },
    { title: '好友支付', dataIndex: 'top_up_money', render: (v) => renderMoney(v) },
  ];

  const relationColumns = [
    { title: '推广人账号', dataIndex: 'inviter_username', render: (_, row) => <Text copyable={{ content: accountWithId(row.inviter_username, row.inviter_id) }}>{accountWithId(row.inviter_username, row.inviter_id)}</Text> },
    { title: '被邀请用户账号', dataIndex: 'invitee_username', render: (_, row) => <Text copyable={{ content: accountWithId(row.invitee_username, row.invitee_id) }}>{accountWithId(row.invitee_username, row.invitee_id)}</Text> },
    { title: '邮箱', dataIndex: 'invitee_email', render: (v) => v ? <Text copyable={{ content: v }}>{v}</Text> : '-' },
    { title: '好友实际支付', dataIndex: 'top_up_money', render: (v) => renderMoney(v) },
    { title: '累计分成', dataIndex: 'commission_quota', render: (v) => <Text strong>{renderQuota(v || 0)}</Text> },
    { title: '分成笔数', dataIndex: 'commission_count', render: (v) => Number(v || 0) },
    { title: '绑定时间', dataIndex: 'created_at', render: formatTime },
  ];

  const historyColumns = [
    { title: '邀请人', dataIndex: 'inviter_username', render: (_, row) => maskText(row.inviter_username || `#${row.inviter_id}`) },
    { title: '被邀请用户', dataIndex: 'invitee_username', render: (_, row) => maskText(row.invitee_display || row.invitee_username || `#${row.invitee_id}`) },
    { title: '首次邀请奖励', dataIndex: 'register_reward_status', render: (v, row) => <Space><HistoryStatusTag status={v} />{row.register_reward_quota ? <Text type='tertiary'>{renderQuota(row.register_reward_quota)}</Text> : null}</Space> },
    { title: '首充奖励', dataIndex: 'first_topup_reward_status', render: (v, row) => <Space><HistoryStatusTag status={v} />{row.first_topup_reward_quota ? <Text type='tertiary'>{renderQuota(row.first_topup_reward_quota)}</Text> : null}</Space> },
    { title: '首充金额', dataIndex: 'first_topup_amount', render: (v) => v || '-' },
    { title: '创建时间', dataIndex: 'created_time', render: formatTime },
    {
      title: '历史审核',
      dataIndex: 'operate',
      render: (_, row) => (
        <Space wrap>
          <Button size='small' disabled={row.register_reward_status !== 'pending'} onClick={() => setHistoryReviewDialog({ visible: true, record: row, review_type: 'register', action: 'approve', reject_reason: '' })}>首邀通过</Button>
          <Button size='small' type='danger' disabled={row.register_reward_status !== 'pending'} onClick={() => setHistoryReviewDialog({ visible: true, record: row, review_type: 'register', action: 'reject', reject_reason: '' })}>首邀驳回</Button>
          <Button size='small' disabled={row.first_topup_reward_status !== 'pending'} onClick={() => setHistoryReviewDialog({ visible: true, record: row, review_type: 'first_topup', action: 'approve', reject_reason: '' })}>首充通过</Button>
          <Button size='small' type='danger' disabled={row.first_topup_reward_status !== 'pending'} onClick={() => setHistoryReviewDialog({ visible: true, record: row, review_type: 'first_topup', action: 'reject', reject_reason: '' })}>首充驳回</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className='affiliate-page'>
      <style>{affiliateStyles}</style>
      <div className='affiliate-bg' />
      <div className='affiliate-content'>
        <Spin spinning={loading}>
          <section className='affiliate-hero'>
            <div className='affiliate-hero-main'>
              <div className='affiliate-hero-copy'>
                <div className='affiliate-badge'><Sparkles size={16} /> 推广中心</div>
                <Title heading={1} className='affiliate-title'>邀请好友，获得 <span className='affiliate-gradient-text'>充值分成</span></Title>
                <Paragraph className='affiliate-hero-note'>分享你的专属链接，好友注册并充值后，收益按当前档位自动结算。</Paragraph>
                <Space wrap style={{ marginTop: 20 }}>
                  <Button type='primary' theme='solid' icon={<Copy size={16} />} onClick={copyInviteLink}>复制推广链接</Button>
                  <Button icon={<RefreshCw size={16} />} onClick={refreshAll}>刷新数据</Button>
                </Space>
              </div>

              <div className='affiliate-hero-illustration' aria-hidden='true'>
                <div className='affiliate-illus-orbit' />
                <div className='affiliate-float-card one'><UsersRound size={15} /> 好友注册</div>
                <div className='affiliate-gift'><div className='affiliate-gift-lid' /></div>
                <div className='affiliate-float-card two'><HandCoins size={15} /> 自动分成</div>
              </div>

              <div className='affiliate-hero-card'>
                <div className='affiliate-hero-card-head'>
                  <Text strong>当前档位</Text>
                  <Tag color='blue'>Lv.{currentTier?.level || 1}</Tag>
                </div>
                <div className='affiliate-tier-percent'>
                  {Number(summary?.affiliate_commission_percentage || 0).toFixed(2)}%
                </div>
                <div className='affiliate-tier-subtitle'>好友充值后的结算比例</div>
                <div className='affiliate-progress-meta'>
                  <span>邀请人数：{summary?.aff_count || 0}</span>
                  <span>{nextTier ? `距离 Lv.${nextTier.level} 还差 ${summary?.remaining_invites_for_next_level || 0} 人` : '已达到最高档'}</span>
                </div>
                <Progress percent={progressPercent} stroke='#2563eb' showInfo={false} />
              </div>
            </div>
          </section>

          <div className='affiliate-stat-grid'>
            <StatCard icon={<Wallet size={22} />} color='#2563eb' label='可用推广收益' value={renderQuota(summary?.aff_quota || 0)} hint='可划转 / 可提现' />
            <StatCard icon={<Gift size={22} />} color='#0ea5e9' label='提现中' value={renderQuota(summary?.affiliate_withdrawing_quota || 0)} hint='待审核 / 待打款' />
            <StatCard icon={<TrendingUp size={22} />} color='#7c3aed' label='历史累计收益' value={renderQuota(summary?.aff_history_quota || 0)} hint='累计结算收益' />
            <StatCard icon={<UsersRound size={22} />} color='#059669' label='邀请人数' value={summary?.aff_count || 0} hint='当前有效邀请' />
            <StatCard icon={<HandCoins size={22} />} color='#ea580c' label='当前分成比例' value={`${Number(summary?.affiliate_commission_percentage || 0).toFixed(2)}%`} hint='当前档位比例' />
          </div>

          <Card className='affiliate-panel' bordered={false} style={{ marginBottom: 16 }}>
            <div className='affiliate-link-box'>
              <div>
                <div className='affiliate-panel-head' style={{ marginBottom: 0 }}>
                  <div className='affiliate-panel-title'><LinkIcon size={20} color='#2563eb' />推广链接</div>
                  <Tag color='green'>专属链接</Tag>
                </div>
                <Input
                  className='affiliate-link-input'
                  value={inviteLink}
                  readOnly
                  suffix={<Button icon={<Copy size={14} />} theme='solid' onClick={copyInviteLink}>复制</Button>}
                />
                <Text type='tertiary' size='small' className='affiliate-link-hint'>好友通过链接注册后自动绑定关系。</Text>
              </div>
              <div className='affiliate-mobile-actions'>
                <Button icon={<Copy size={16} />} onClick={copyInviteLink}>复制链接</Button>
                {summary?.affiliate_transfer_enabled ? (
                  <Button type='primary' theme='solid' icon={<Wallet size={16} />} disabled={!summary?.aff_quota} onClick={() => setTransferVisible(true)}>划转到余额</Button>
                ) : null}
                {summary?.affiliate_withdraw_enabled ? (
                  <Button icon={<Gift size={16} />} disabled={!summary?.aff_quota} onClick={() => setWithdrawVisible(true)}>申请提现</Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className='affiliate-panel' bordered={false} style={{ marginBottom: 16 }}>
            <div className='affiliate-panel-head'>
              <div className='affiliate-panel-title'><Crown size={20} color='#2563eb' />分成档位</div>
              {adminUser ? <Tag color='blue'>可配置</Tag> : <Tag color='grey'>当前规则</Tag>}
            </div>
            <div className='affiliate-tier-grid'>
              {tiers.map((tier) => <TierCard key={tier.level} tier={tier} active={(currentTier?.level || 1) === tier.level} />)}
            </div>
          </Card>

          {summary?.affiliate_leaderboard_enabled ? (
            <Card className='affiliate-panel' bordered={false} style={{ marginBottom: 16 }}>
              <div className='affiliate-panel-head'>
                <div className='affiliate-panel-title'><Trophy size={20} color='#f59e0b' />推广排行榜</div>
                <Tag color='orange'>Top 10</Tag>
              </div>
              {leaderboard.length > 0 ? (
                <div className='affiliate-leaderboard'>
                  {leaderboard.map((item, index) => (
                    <div className='affiliate-rank-card' key={`${item.inviter_id}-${index}`}>
                      <div className='affiliate-rank-no'>#{index + 1}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className='affiliate-rank-name'>{maskText(leaderboardName(item))}</div>
                        <Text type='tertiary' size='small'>邀请 {item.invite_count || 0} 人 · 收益 {renderQuota(item.commission_quota || 0)}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description='暂无排行榜数据' />
              )}
            </Card>
          ) : null}

          <Card className='affiliate-panel' bordered={false}>
            <div ref={tabsNavRef}>
            <Tabs className='affiliate-tabs' type='button' activeKey={activeTab} onChange={setActiveTab}>
              <Tabs.TabPane tab={renderTabLabel('invitees', '邀请用户')} itemKey='invitees'>
                <div className='affiliate-toolbar'>
                  <Text type='tertiary'>共邀请 {summary?.aff_count || inviteesTotal || 0} 个好友，好友信息已打码显示。</Text>
                </div>
                <Table rowKey='invitee_id' columns={inviteeColumns} dataSource={invitees} empty={<Empty description='暂无邀请用户' />} pagination={{ currentPage: inviteesPage, pageSize: PAGE_SIZE, total: inviteesTotal, onPageChange: (page) => loadInvitees(page) }} />
              </Tabs.TabPane>
              <Tabs.TabPane tab={renderTabLabel('withdrawals', '我的提现记录')} itemKey='withdrawals'>
                <Table rowKey='id' columns={withdrawalColumns} dataSource={withdrawals} empty={<Empty description='暂无提现记录' />} pagination={{ currentPage: withdrawalsPage, pageSize: PAGE_SIZE, total: withdrawalsTotal, onPageChange: (page) => loadWithdrawals(page) }} />
              </Tabs.TabPane>


              {adminUser ? (
                <Tabs.TabPane tab={renderTabLabel('settings', '分成设置')} itemKey='settings'>
                  <Spin spinning={optionsLoading}>
                    <div className='affiliate-settings-grid'>
                      <div className='affiliate-setting-box'>
                        <Space align='center' style={{ justifyContent: 'space-between', width: '100%' }}>
                          <div><Text strong>是否可转余额</Text><br /><Text type='tertiary' size='small'>关闭后用户不能把推广收益转入余额</Text></div>
                          <Switch disabled={!canManageAffiliateSettings} checked={settings.AffiliateTransferEnabled} onChange={(v) => setSettings((old) => ({ ...old, AffiliateTransferEnabled: v }))} />
                        </Space>
                      </div>
                      <div className='affiliate-setting-box'>
                        <Space align='center' style={{ justifyContent: 'space-between', width: '100%' }}>
                          <div><Text strong>是否可提现</Text><br /><Text type='tertiary' size='small'>关闭后用户不能提交支付宝提现</Text></div>
                          <Switch disabled={!canManageAffiliateSettings} checked={settings.AffiliateWithdrawEnabled} onChange={(v) => setSettings((old) => ({ ...old, AffiliateWithdrawEnabled: v }))} />
                        </Space>
                      </div>
                      <div className='affiliate-setting-box'>
                        <Text strong>最低提现额度</Text>
                        <InputNumber disabled={!canManageAffiliateSettings} style={{ width: '100%', marginTop: 10 }} min={0} value={settings.AffiliateMinWithdrawQuota} onChange={(v) => setSettings((old) => ({ ...old, AffiliateMinWithdrawQuota: Number(v || 0) }))} />
                        <Text type='tertiary' size='small'>当前显示：{renderQuota(settings.AffiliateMinWithdrawQuota || 0)}</Text>
                      </div>
                      <div className='affiliate-setting-box'>
                        <Space align='center' style={{ justifyContent: 'space-between', width: '100%' }}>
                          <div><Text strong>历史已充值补算分成</Text><br /><Text type='tertiary' size='small'>关闭时不补算历史订单，后续充值正常结算</Text></div>
                          <Switch disabled={!canManageAffiliateSettings} checked={settings.AffiliateBackfillHistoricalTopupEnabled} onChange={(v) => setSettings((old) => ({ ...old, AffiliateBackfillHistoricalTopupEnabled: v }))} />
                        </Space>
                      </div>
                      <div className='affiliate-setting-box'>
                        <Space align='center' style={{ justifyContent: 'space-between', width: '100%' }}>
                          <div><Text strong>推广排行榜展示</Text><br /><Text type='tertiary' size='small'>开启后普通用户可看到推广排行榜</Text></div>
                          <Switch disabled={!canManageAffiliateSettings} checked={settings.AffiliateLeaderboardEnabled} onChange={(v) => setSettings((old) => ({ ...old, AffiliateLeaderboardEnabled: v }))} />
                        </Space>
                      </div>
                    </div>
                    <div className='affiliate-tier-editor'>
                      {normalizeTiers(settings.AffiliateCommissionTiers).map((tier, index) => (
                        <div className='affiliate-tier-editor-item' key={tier.level}>
                          <Space align='center' style={{ justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                            <Text strong>Lv.{tier.level}</Text>
                            <Tag color='blue'>{Number(tier.percentage || 0).toFixed(2)}%</Tag>
                          </Space>
                          <Text type='tertiary' size='small'>最低邀请人数</Text>
                          <InputNumber style={{ width: '100%', margin: '6px 0 12px' }} min={index === 0 ? 0 : 1} value={tier.min_invites} disabled={!canManageAffiliateSettings || index === 0} onChange={(v) => updateTier(index, 'min_invites', v)} />
                          <Text type='tertiary' size='small'>分成比例（%）</Text>
                          <InputNumber disabled={!canManageAffiliateSettings} style={{ width: '100%', marginTop: 6 }} min={0} max={100} value={tier.percentage} onChange={(v) => updateTier(index, 'percentage', v)} />
                        </div>
                      ))}
                    </div>
                    <Space style={{ marginTop: 16 }}>
                      <Button type='primary' theme='solid' icon={<Settings2 size={16} />} loading={optionsLoading} disabled={!canManageAffiliateSettings} onClick={saveSettings}>保存分成设置</Button>
                      <Button disabled={!canManageAffiliateSettings} onClick={loadOptions}>重新读取</Button>
                    </Space>
                  </Spin>
                </Tabs.TabPane>
              ) : null}

              {adminUser ? (
                <Tabs.TabPane tab={renderTabLabel('admin-user-records', '我的收益记录')} itemKey='admin-user-records'>
                  <Table rowKey='id' columns={recordColumns} dataSource={records} empty={<Empty description='暂无分成记录' />} pagination={{ currentPage: recordsPage, pageSize: PAGE_SIZE, total: recordsTotal, onPageChange: (page) => loadRecords(page) }} />
                </Tabs.TabPane>
              ) : null}

              {adminUser ? (
                <Tabs.TabPane tab={renderTabLabel('admin-total-rank', '管理：推广总榜')} itemKey='admin-total-rank'>
                  <div className='affiliate-toolbar'>
                    <Space wrap>
                      <Input style={{ width: 260 }} placeholder='搜索用户名/用户ID' value={adminTotalRanksKeyword} onChange={setAdminTotalRanksKeyword} onEnterPress={() => loadAdminTotalRanks(1, { keyword: adminTotalRanksKeyword })} />
                      <Button icon={<RefreshCw size={15} />} onClick={() => loadAdminTotalRanks(1, { keyword: adminTotalRanksKeyword })}>查询</Button>
                    </Space>
                    <Text type='tertiary'>累计收益含历史首邀奖励和充值分成；已转余额为按当前数据推算值。</Text>
                  </div>
                  <Table rowKey='user_id' columns={adminTotalRankColumns} dataSource={adminTotalRanks} scroll={{ x: 1180 }} empty={<Empty description='暂无推广总榜数据' />} pagination={{ currentPage: adminTotalRanksPage, pageSize: PAGE_SIZE, total: adminTotalRanksTotal, onPageChange: (page) => loadAdminTotalRanks(page) }} />
                </Tabs.TabPane>
              ) : null}

              {adminUser ? (
                <Tabs.TabPane tab={renderTabLabel('admin-withdrawals', '管理：提现审核')} itemKey='admin-withdrawals'>
                  <div className='affiliate-toolbar'>
                    <Space wrap>
                      <Select style={{ width: 130 }} value={adminWithdrawalsStatus} onChange={(v) => { setAdminWithdrawalsStatus(v); setAdminWithdrawalsPage(1); loadAdminWithdrawals(1, { status: v }); }}>
                        <Select.Option value='pending'>待处理</Select.Option>
                        <Select.Option value='approved'>已通过,待打款</Select.Option>
                        <Select.Option value='paid'>已打款</Select.Option>
                        <Select.Option value='rejected'>已拒绝</Select.Option>
                        <Select.Option value='all'>全部</Select.Option>
                      </Select>
                      <Input style={{ width: 220 }} placeholder='搜索账号/姓名' value={adminWithdrawalsKeyword} onChange={setAdminWithdrawalsKeyword} onEnterPress={() => loadAdminWithdrawals(1, { keyword: adminWithdrawalsKeyword })} />
                      <Button icon={<RefreshCw size={15} />} onClick={() => loadAdminWithdrawals(1, { keyword: adminWithdrawalsKeyword })}>查询</Button>
                    </Space>
                  </div>
                  <Table rowKey='id' columns={adminWithdrawalColumns} dataSource={adminWithdrawals} scroll={{ x: 1120 }} empty={<Empty description='暂无提现审核数据' />} pagination={{ currentPage: adminWithdrawalsPage, pageSize: PAGE_SIZE, total: adminWithdrawalsTotal, onPageChange: (page) => loadAdminWithdrawals(page) }} />
                </Tabs.TabPane>
              ) : null}

              {adminUser ? (
                <Tabs.TabPane tab={renderTabLabel('admin-records', '管理：全站分成')} itemKey='admin-records'>
                  <div className='affiliate-toolbar'>
                    <Space wrap>
                      <Input style={{ width: 260 }} placeholder='搜索订单/用户/推广人' value={adminRecordsKeyword} onChange={setAdminRecordsKeyword} onEnterPress={() => loadAdminRecords(1, { keyword: adminRecordsKeyword })} />
                      <Button icon={<RefreshCw size={15} />} onClick={() => loadAdminRecords(1, { keyword: adminRecordsKeyword })}>查询</Button>
                    </Space>
                  </div>
                  <Table rowKey='id' columns={adminRecordColumns} dataSource={adminRecords} empty={<Empty description='暂无后台分成记录' />} pagination={{ currentPage: adminRecordsPage, pageSize: PAGE_SIZE, total: adminRecordsTotal, onPageChange: (page) => loadAdminRecords(page) }} />
                </Tabs.TabPane>
              ) : null}

              {adminUser ? (
                <Tabs.TabPane tab={renderTabLabel('relations', '管理：邀请关系')} itemKey='relations'>
                  <div className='affiliate-toolbar'>
                    <Space wrap>
                      <Input style={{ width: 260 }} placeholder='搜索推广人/被邀请用户' value={adminRelationsKeyword} onChange={setAdminRelationsKeyword} onEnterPress={() => loadAdminRelations(1, { keyword: adminRelationsKeyword })} />
                      <Button icon={<RefreshCw size={15} />} onClick={() => loadAdminRelations(1, { keyword: adminRelationsKeyword })}>查询</Button>
                    </Space>
                  </div>
                  <Table rowKey={(row) => `${row.inviter_id}-${row.invitee_id}`} columns={relationColumns} dataSource={adminRelations} empty={<Empty description='暂无邀请关系' />} pagination={{ currentPage: adminRelationsPage, pageSize: PAGE_SIZE, total: adminRelationsTotal, onPageChange: (page) => loadAdminRelations(page) }} />
                </Tabs.TabPane>
              ) : null}

              {adminUser ? (
                <Tabs.TabPane tab={renderTabLabel('history-review', '管理：历史首邀审核')} itemKey='history-review'>
                  <div className='affiliate-toolbar'>
                    <Space wrap>
                      <Select style={{ width: 160 }} value={historyRewardsStatus} onChange={(v) => { setHistoryRewardsStatus(v); setHistoryRewardsPage(1); loadHistoryRewards(1, { status: v }); }}>
                        <Select.Option value='pending_any'>全部待审核</Select.Option>
                        <Select.Option value='pending_register'>首邀待审核</Select.Option>
                        <Select.Option value='pending_first_topup'>首充待审核</Select.Option>
                        <Select.Option value='approved_any'>已通过</Select.Option>
                        <Select.Option value='rejected_any'>已驳回</Select.Option>
                        <Select.Option value='all'>全部</Select.Option>
                      </Select>
                      <Input style={{ width: 240 }} placeholder='搜索邀请人/被邀请用户' value={historyRewardsKeyword} onChange={setHistoryRewardsKeyword} onEnterPress={() => loadHistoryRewards(1, { keyword: historyRewardsKeyword })} />
                      <Button icon={<RefreshCw size={15} />} onClick={() => loadHistoryRewards(1, { keyword: historyRewardsKeyword })}>查询</Button>
                    </Space>
                  </div>
                  <Table rowKey='id' columns={historyColumns} dataSource={historyRewards} scroll={{ x: 1120 }} empty={<Empty description='暂无历史邀请奖励数据' />} pagination={{ currentPage: historyRewardsPage, pageSize: PAGE_SIZE, total: historyRewardsTotal, onPageChange: (page) => loadHistoryRewards(page) }} />
                </Tabs.TabPane>
              ) : null}
            </Tabs>
            </div>
          </Card>
        </Spin>
      </div>

      <Modal title='划转推广收益' visible={transferVisible} onCancel={() => setTransferVisible(false)} onOk={handleTransfer} confirmLoading={submitting} okText='确认划转'>
        <Space vertical align='start' style={{ width: '100%' }}>
          <Text>可用收益：<Text strong>{renderQuota(summary?.aff_quota || 0)}</Text></Text>
          <div style={{ width: '100%' }}>
            <Text type='tertiary'>划转额度</Text>
            <InputNumber style={{ width: '100%', marginTop: 8 }} min={safeQuotaPerUnit()} value={transferQuota} onChange={(v) => setTransferQuota(Number(v || 0))} />
          </div>
        </Space>
      </Modal>

      <Modal title='申请提现' visible={withdrawVisible} onCancel={() => setWithdrawVisible(false)} onOk={handleWithdraw} confirmLoading={submitting} okText='提交申请'>
        <Space vertical align='start' style={{ width: '100%' }}>
          <div style={{ width: '100%' }}>
            <Text type='tertiary'>提现金额</Text>
            <InputNumber style={{ width: '100%', marginTop: 8 }} min={summary?.affiliate_min_withdraw_quota || 1} value={withdrawForm.amount} onChange={(v) => setWithdrawForm((old) => ({ ...old, amount: Number(v || 0) }))} />
            <Text type='quaternary' size='small'>最低提现：{renderQuota(summary?.affiliate_min_withdraw_quota || 0)}</Text>
          </div>
          <Input prefix='方式' value='支付宝' readOnly />
          <Input prefix='支付宝账号' placeholder='请输入支付宝账号' value={withdrawForm.account_no} onChange={(v) => setWithdrawForm((old) => ({ ...old, account_no: v }))} />
          <Input prefix='姓名' placeholder='支付宝实名姓名' value={withdrawForm.account_name} onChange={(v) => setWithdrawForm((old) => ({ ...old, account_name: v }))} />
          <TextArea placeholder='备注，可填写打款说明' value={withdrawForm.note} onChange={(v) => setWithdrawForm((old) => ({ ...old, note: v }))} />
        </Space>
      </Modal>

      <Modal title='提现审核' visible={reviewDialog.visible} onCancel={() => setReviewDialog({ visible: false, record: null, status: 'approved', note: '' })} onOk={submitWithdrawalReview} confirmLoading={submitting} okText='提交审核'>
        <Space vertical align='start' style={{ width: '100%' }}>
          <Text>用户 #{reviewDialog.record?.user_id}，提现金额：<Text strong>{renderQuota(reviewDialog.record?.amount || 0)}</Text></Text>
          <Select style={{ width: '100%' }} value={reviewDialog.status} onChange={(v) => setReviewDialog((old) => ({ ...old, status: v }))}>
            <Select.Option value='approved'><Space><CheckCircle2 size={14} />通过</Space></Select.Option>
            <Select.Option value='rejected'><Space><XCircle size={14} />拒绝并退回收益</Space></Select.Option>
            <Select.Option value='paid'><Space><ShieldCheck size={14} />已打款</Space></Select.Option>
          </Select>
          <TextArea placeholder='审核备注' value={reviewDialog.note} onChange={(v) => setReviewDialog((old) => ({ ...old, note: v }))} />
        </Space>
      </Modal>

      <Modal title='历史邀请奖励审核' visible={historyReviewDialog.visible} onCancel={() => setHistoryReviewDialog({ visible: false, record: null, review_type: 'register', action: 'approve', reject_reason: '' })} onOk={submitHistoryReview} confirmLoading={submitting} okText='提交审核'>
        <Space vertical align='start' style={{ width: '100%' }}>
          <Text>记录 #{historyReviewDialog.record?.id} · {historyReviewDialog.review_type === 'register' ? '首次邀请奖励' : '首充奖励'}</Text>
          <Select style={{ width: '100%' }} value={historyReviewDialog.action} onChange={(v) => setHistoryReviewDialog((old) => ({ ...old, action: v }))}>
            <Select.Option value='approve'><Space><CheckCircle2 size={14} />通过</Space></Select.Option>
            <Select.Option value='reject'><Space><XCircle size={14} />驳回</Space></Select.Option>
          </Select>
          <TextArea placeholder='驳回原因，通过时可不填' value={historyReviewDialog.reject_reason} onChange={(v) => setHistoryReviewDialog((old) => ({ ...old, reject_reason: v }))} />
        </Space>
      </Modal>
    </div>
  );
};

export default Affiliate;




