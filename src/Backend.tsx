import React, { useState, useEffect } from 'react';
import { db, COURSES, Member, Order, MemberLevel, timeToMins, minsToTime, Gender, ALL_TIME_SLOTS, sortOrderItems, TherapistAvailability, Promotion } from './store';
import { Trash2, TrendingUp, Users, Calendar, DollarSign, Clock, Search, CheckCircle, XCircle, CalendarDays, Lock, LogOut, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Plus, User, X, Send } from 'lucide-react';

const parseBirthdayString = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{8}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    const mi = parseInt(m, 10);
    const di = parseInt(d, 10);
    if (mi >= 1 && mi <= 12 && di >= 1 && di <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  const match = trimmed.match(/^(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    const mi = parseInt(m, 10);
    const di = parseInt(d, 10);
    if (mi >= 1 && mi <= 12 && di >= 1 && di <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  return trimmed;
};

const getZodiacSign = (dateStr: string) => {
  if (!dateStr) return '';
  const parsed = parseBirthdayString(dateStr);
  if (!parsed || !parsed.includes('-')) return '';
  const [year, month, day] = parsed.split('-').map(Number);
  if (!month || !day) return '';
  const signs = ["摩羯座", "水瓶座", "雙魚座", "牡羊座", "金牛座", "雙子座", "巨蟹座", "獅子座", "處女座", "天秤座", "天蠍座", "射手座", "摩羯座"];
  const cutoffs = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 22, 22];
  return (day >= cutoffs[month - 1]) ? signs[month] : signs[month - 1];
};

const getAge = (dateStr: string) => {
  if (!dateStr) return '';
  const parsed = parseBirthdayString(dateStr);
  if (!parsed || !parsed.includes('-')) return '';
  const [year, month, day] = parsed.split('-').map(Number);
  if (!year || !month || !day) return '';
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = (today.getMonth() + 1) - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age >= 0 ? `${age}歲` : '';
};

const stripGender = (name: string) => name ? name.replace(/\(男\)|\(女\)|（男）|（女）/g, '').trim() : '';

const getWeekDay = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return weekdays[d.getDay()];
};

const memberNameCollator = new Intl.Collator('zh-Hant-TW-u-co-stroke', {
  sensitivity: 'base',
  numeric: true
});
const sortMembers = (list: Member[]) => [...list].sort((a, b) =>
  memberNameCollator.compare((a.name || '').trim(), (b.name || '').trim()) ||
  a.id.localeCompare(b.id)
);
const sortOrders = (list: Order[]) => [...list].sort((a,b) => b.createdAt - a.createdAt);
const formatPaymentMethod = (method?: string) => (method || '未註記').replace(/\s*[（(].*?[）)]\s*/g, '');

const IDENTITY_LABELS: Record<string, string> = {
  admin: '管理員',
  therapist_in: '店內按摩師',
  coach_in: '店內教練',
  therapist_rent: '場租按摩師',
  coach_rent: '場租教練',
  member_normal: '一般顧客',
  gold: '金卡會員',
  black: '黑卡會員'
};

const getMemberIdentityLabels = (member: Member) => {
  if (member.selectedIdentities?.length) {
    const identityPriority: Record<string, number> = {
      admin: 0,
      therapist_in: 1,
      coach_in: 2,
      therapist_rent: 3,
      coach_rent: 4,
      black: 5,
      gold: 6,
      member_normal: 7
    };
    const identityIds = [...member.selectedIdentities];
    if ((member.role === 'admin' || member.roles?.includes('admin')) && !identityIds.includes('admin')) {
      identityIds.push('admin');
    }
    return identityIds
      .sort((a, b) => (identityPriority[a] ?? 99) - (identityPriority[b] ?? 99))
      .map(id => IDENTITY_LABELS[id] || id);
  }

  if (member.role === 'admin' || member.roles?.includes('admin')) return ['管理員'];

  return [member.memberLevel || member.level];
};

const formatDurationLabel = (minutes?: number) => {
  if (!minutes) return '';
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}小時` : `${hours.toFixed(1)}小時`;
};

const getVenueRoomLabel = (order: Order) => {
  if (order.massageRoom) return order.massageRoom;
  const itemName = order.items?.find(item => /ZEN1|ZEN2|SPA1|SPA2/.test(item.name))?.name || '';
  return itemName.match(/ZEN1|ZEN2|SPA1|SPA2/)?.[0] || '';
};

const THERAPISTS_W_GENDER = ['男按摩師即可', '女按摩師即可', '阿翰', 'Alice', 'Kenny', 'Kelly', 'Mark', 'Miki', 'Ricky'];
const ALL_THERAPIST_CATEGORIES = ['不指定按摩師', ...THERAPISTS_W_GENDER];

const consolidateAvailability = (selectedStartTimes: string[]): {start: string, end: string}[] => {
  if (selectedStartTimes.length === 0) return [];
  
  const minutes = selectedStartTimes.map(timeToMins).sort((a, b) => a - b);
  const ranges: {start: string, end: string}[] = [];
  
  if (minutes.length === 0) return [];

  let currentStart = minutes[0];
  let currentEnd = minutes[0] + 30;
  
  for (let i = 1; i < minutes.length; i++) {
    if (minutes[i] === currentEnd) {
      currentEnd = minutes[i] + 30;
    } else {
      ranges.push({ start: minsToTime(currentStart), end: minsToTime(currentEnd) });
      currentStart = minutes[i];
      currentEnd = minutes[i] + 30;
    }
  }
  ranges.push({ start: minsToTime(currentStart), end: minsToTime(currentEnd) });
  
  return ranges;
};

export default function Backend() {
  const [authedUser, setAuthedUser] = useState<{ role: 'admin' | 'therapist', name?: string, phone?: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zf_authed_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  const [forgotStep, setForgotStep] = useState<number>(0); // 0: closed, 1: input, 2: options
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotResult, setForgotResult] = useState<Member | null>(null);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [tab, setTab] = useState<'orders' | 'members' | 'calendar' | 'therapist' | 'venueStatus' | 'history' | 'promotions'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zf_authed_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.role === 'therapist') {
            return 'therapist';
          }
        } catch (e) {}
      }
    }
    return 'calendar';
  });
  const [venueStatusRoom, setVenueStatusRoom] = useState<'ZEN1' | 'ZEN2' | 'SPA1' | 'SPA2'>('ZEN1');
  const [venueStatusDate, setVenueStatusDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [venueStatusViewMonth, setVenueStatusViewMonth] = useState<Date>(new Date());
  const [orderViewMode, setOrderViewMode] = useState<'list' | 'byTherapist' | 'history'>('list');
  const [orderMonth, setOrderMonth] = useState(new Date().toISOString().slice(0, 7));
  const [unlockedOrderMonths, setUnlockedOrderMonths] = useState<string[]>([]);
  const [viewingTherapistStats, setViewingTherapistStats] = useState<{therapist: string, orders: Order[]} | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [showMemberSpendingId, setShowMemberSpendingId] = useState<string | null>(null);
  const [logMonthFilter, setLogMonthFilter] = useState<string>('');
  const [bonusModal, setBonusModal] = useState<{ therapist: string, kind: 'introduction' | 'gold' | 'black', month: string } | null>(null);
  const defaultTherapistPortal = '阿翰';

  const [selectedTherapistPortal, setSelectedTherapistPortal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zf_authed_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.role === 'therapist' && parsed.name) {
            return parsed.name;
          }
          if (parsed.role === 'admin') {
            return defaultTherapistPortal;
          }
        } catch (e) {}
      }
    }
    return defaultTherapistPortal;
  });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [promotionForm, setPromotionForm] = useState({
    code: '', name: '', discountType: 'fixed' as 'fixed' | 'percentage', discountValue: '',
    appliesTo: 'all' as 'all' | 'massage' | 'fitness', startDate: '', endDate: '',
    minimumSpend: '0', memberUsageLimit: '1', enabled: true
  });
  const [isTherapistNavOpen, setIsTherapistNavOpen] = useState(false);
  const [therapistNavCategory, setTherapistNavCategory] = useState<'maleMassage' | 'femaleMassage' | 'maleCoach' | 'femaleCoach'>('maleMassage');
  const therapistNavRef = React.useRef<HTMLDivElement | null>(null);
  const [isVenueStatusNavOpen, setIsVenueStatusNavOpen] = useState(false);
  const venueStatusNavRef = React.useRef<HTMLDivElement | null>(null);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [editingAvailability, setEditingAvailability] = useState<{ date: string, slots: {start: string, end: string}[] } | null>(null);
  const [showPortalStats, setShowPortalStats] = useState(false);
  const [viewingAppts, setViewingAppts] = useState<'today' | 'all' | null>(null);
  const [therapistHistoryMonth, setTherapistHistoryMonth] = useState<string | null>(null);
  const [isTherapistHistoryOpen, setIsTherapistHistoryOpen] = useState(false);
  const [isTherapistSalaryOpen, setIsTherapistSalaryOpen] = useState(false);
  const [therapistSalaryMonth, setTherapistSalaryMonth] = useState('');
  const [editingServiceLogOrderId, setEditingServiceLogOrderId] = useState<string | null>(null);
  const [copyTargetDates, setCopyTargetDates] = useState<string[]>([]);
  const [showCopyCalendar, setShowCopyCalendar] = useState(false);
  const [copyMonthView, setCopyMonthView] = useState(new Date());

  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [adminSelectedCategory, setAdminSelectedCategory] = useState<string>('');
  const [adminSubTab, setAdminSubTab] = useState<'venue' | 'massage' | 'fitness'>('venue');
  const lastAutoAdminSubTabRef = React.useRef<'venue' | 'massage' | 'fitness' | null>(null);
  const [bookingFontSize, setBookingFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm?: () => void} | null>(null);
  const [showFormulaIds, setShowFormulaIds] = useState<Set<string>>(new Set());
  const [expandedTherapists, setExpandedTherapists] = useState<Set<string>>(new Set());
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [expandedHistoryOrderIds, setExpandedHistoryOrderIds] = useState<Set<string>>(new Set());

  const toggleTherapistExpand = (name: string) => {
    setExpandedTherapists(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleOrderExpand = (id: string) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleHistoryOrderExpand = (id: string) => {
    setExpandedHistoryOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleFormula = (id: string) => {
    setShowFormulaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('zf_authed_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAuthedUser(parsed);
      if (parsed.role === 'therapist') {
        setTab('therapist');
        if (parsed.name) setSelectedTherapistPortal(parsed.name);
      } else if (parsed.role === 'admin') {
        setSelectedTherapistPortal(defaultTherapistPortal);
      }
    }
  }, []);

  useEffect(() => {
    if (authedUser?.role === 'therapist' && authedUser.name) {
      setTab('therapist');
      setSelectedTherapistPortal(authedUser.name);
    }
  }, [authedUser]);

  useEffect(() => {
    if (!isTherapistNavOpen && !isVenueStatusNavOpen) return;

    const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && therapistNavRef.current?.contains(target)) return;
      if (target && venueStatusNavRef.current?.contains(target)) return;
      setIsTherapistNavOpen(false);
      setIsVenueStatusNavOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTherapistNavOpen(false);
        setIsVenueStatusNavOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('touchstart', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('touchstart', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isTherapistNavOpen, isVenueStatusNavOpen]);

  useEffect(() => {
    const closeMemberIdentityMenus = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('details.member-identity-details')) return;
      document.querySelectorAll('details.member-identity-details[open]').forEach(details => {
        details.removeAttribute('open');
      });
    };

    document.addEventListener('pointerdown', closeMemberIdentityMenus);
    return () => document.removeEventListener('pointerdown', closeMemberIdentityMenus);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = loginPhone.trim();
    const pass = loginPass.trim();

    if (!pass) {
      setConfirmAction({ message: '請輸入密碼' });
      return;
    }

    // Admin check (hardcoded fallback OR database check)
    const adminAccount = members.find(m => m.id === phone && m.password === pass && (m.role === 'admin' || m.roles?.includes('admin')));
    if (adminAccount || ((phone === 'admin' || phone === '') && pass === '123456')) {
      const user = { 
        role: 'admin' as const,
        name: adminAccount?.therapistName || (phone === 'admin' ? '系統管理員' : ''),
        phone: adminAccount?.id || (phone === 'admin' ? 'admin' : '')
      };
      setAuthedUser(user);
      localStorage.setItem('zf_authed_user', JSON.stringify(user));
      localStorage.setItem('zf_login_phone', user.phone);
      setSelectedTherapistPortal(defaultTherapistPortal);
      setLoginPass('');
      setLoginPhone('');
      return;
    }

    // Therapist login
    const member = members.find(m => m.id === phone && m.password === pass && (m.role === 'therapist' || m.roles?.includes('therapist')));
    if (member) {
      const user = { role: 'therapist' as const, name: member.therapistName, phone: member.id };
      setAuthedUser(user);
      localStorage.setItem('zf_authed_user', JSON.stringify(user));
      localStorage.setItem('zf_login_phone', member.id);
      setTab('therapist');
      if (member.therapistName) {
        setSelectedTherapistPortal(member.therapistName);
      }
      setLoginPass('');
      setLoginPhone('');
    } else {
      setConfirmAction({ message: '帳號或密碼錯誤，請重新輸入。' });
    }
  };

  const handleLogout = () => {
    if (authedUser?.role === 'admin' || authedUser?.role === 'therapist') {
      try {
        const parsedUsers = JSON.parse(localStorage.getItem('zf_staff_remembered_users') || '[]');
        const storedUsers = Array.isArray(parsedUsers) ? parsedUsers : [];
        const normalizedUser = authedUser.role === 'admin'
          ? { ...authedUser, name: authedUser.name || '管理員', phone: authedUser.phone || 'admin' }
          : authedUser;
        const nextUsers = [...storedUsers.filter(user => user.phone !== normalizedUser.phone), normalizedUser];
        localStorage.setItem('zf_staff_remembered_users', JSON.stringify(nextUsers));
      } catch (e) {
        // A malformed local preference should never block logout.
      }
    }
    localStorage.removeItem('zf_authed_user');
    localStorage.removeItem('zf_login_phone');
    setAuthedUser(null);
  };

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const isOrderMonthLocked = orderMonth !== currentMonthStr && !unlockedOrderMonths.includes(orderMonth);
  const unlockOrderMonth = () => {
    const pass = window.prompt('此月份資料已上鎖，請輸入管理員密碼後再編輯。');
    if (!pass) return;
    const adminAccount = members.find(m => m.password === pass && (m.role === 'admin' || m.roles?.includes('admin')));
    if (pass === '123456' || adminAccount) {
      setUnlockedOrderMonths(prev => prev.includes(orderMonth) ? prev : [...prev, orderMonth]);
      return;
    }
    setConfirmAction({ message: '管理員密碼錯誤，無法解鎖此月份資料。' });
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = forgotPhone.trim();
    if (!p) {
      setConfirmAction({ message: '請輸入註冊手機號碼' });
      return;
    }
    const found = members.find(m => m.id === p);
    if (!found) {
      setConfirmAction({ message: '此手機號碼尚未在系統中註冊！請確認輸入是否正確。' });
      return;
    }
    setForgotResult(found);
    setForgotStep(2);
  };

  const handleShare = (o: Order) => {
    const m = members.find(x => x.id === o.memberId);
    const endTime = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
    
    const itemDurations: Record<string, number> = {};
    (o.items || []).forEach(item => {
      itemDurations[item.name] = (itemDurations[item.name] || 0) + item.duration;
    });
    const itemsText = Object.entries(itemDurations)
      .map(([name, duration]) => `☑️${name}(${duration}分)`)
      .join('\n');

    const noteText = o.note ? `\n⭐當日服務注意事項：${o.note}` : '';
    const discomfortText = o.discomfortAreas && o.discomfortAreas.length > 0 
      ? `\n⚠️今日不適部位：${o.discomfortAreas.join(', ')}` 
      : '';
    const dateStr = o.date.replace(/-/g, '/');
    const shareText = `【ZEN FLOW 預約通知】\n📆日期：${dateStr}\n⏰時間：${o.time}~${endTime}(${o.totalDuration}分鐘)\n😃客人：${m?.name || '未知顧客'}\n🔹預約項目：\n${itemsText}${noteText}${discomfortText}`;
    
    // Attempt to copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      setConfirmAction({ message: '已複製預約資訊, 請轉貼給按摩師!!' });
    }).catch(err => {
      setConfirmAction({ message: '複製失敗，請手動複製以下內容：\n\n' + shareText });
    });
  };

  // local state for editing note
  const [editingNote, setEditingNote] = useState<string>('');
  
  const [editName, setEditName] = useState('');
  const [editLineId, setEditLineId] = useState('');
  const [editGender, setEditGender] = useState<any>('女');
  const [editBirthday, setEditBirthday] = useState('');
  const [editBirthdayText, setEditBirthdayText] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLevel, setEditLevel] = useState<MemberLevel>('一般');
  const [editMemberLevel, setEditMemberLevel] = useState<'一般' | '金卡' | '黑卡' | undefined>(undefined);
  const [editReferredBy, setEditReferredBy] = useState('');
  const [editReferredMonth, setEditReferredMonth] = useState('');
  const [editReferrerType, setEditReferrerType] = useState<'staff' | 'gold' | 'black' | ''>('');
  const [editReferrerId, setEditReferrerId] = useState('');
  const [editPrimaryTherapist, setEditPrimaryTherapist] = useState('');
  const [editPrimaryCoach, setEditPrimaryCoach] = useState('');
  const [editSecondaryCoach, setEditSecondaryCoach] = useState('');
  const [editFitnessPlan, setEditFitnessPlan] = useState('');
  const [editMembershipStartDate, setEditMembershipStartDate] = useState('');
  const [editMembershipEndDate, setEditMembershipEndDate] = useState('');
  const [editRole, setEditRole] = useState<'member' | 'therapist' | 'admin'>('member');
  const [editRoles, setEditRoles] = useState<('member' | 'therapist' | 'admin')[]>(['member']);
  const [editTherapistName, setEditTherapistName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSelectedIdentities, setEditSelectedIdentities] = useState<string[]>([]);

  // Polling to simulate real-time updates from LocalStorage
  useEffect(() => {
    // Initial sync
    db.syncMembers().then(data => setMembers(sortMembers(data)));
    db.syncOrders().then(data => setOrders(sortOrders(data)));
    db.syncAvailability().then(setAvailabilities);
    db.syncPromotions().then(data => setPromotions(data.sort((a, b) => b.updatedAt - a.updatedAt)));

    const fetchData = () => {
      const freshOrders = sortOrders(db.getOrders());
      setOrders(prev => {
        if (JSON.stringify(prev) === JSON.stringify(freshOrders)) return prev;
        return freshOrders;
      });

      const freshMembers = sortMembers(db.getMembers());
      setMembers(prev => {
        if (JSON.stringify(prev) === JSON.stringify(freshMembers)) return prev;
        return freshMembers;
      });

      const freshAvail = db.getAvailability();
      setAvailabilities(prev => {
        if (JSON.stringify(prev) === JSON.stringify(freshAvail)) return prev;
        return freshAvail;
      });

      const freshPromotions = db.getPromotions().sort((a, b) => b.updatedAt - a.updatedAt);
      setPromotions(prev => JSON.stringify(prev) === JSON.stringify(freshPromotions) ? prev : freshPromotions);
    };
    const interval = setInterval(fetchData, 2000); 
    return () => clearInterval(interval);
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (editingAvailability || viewingAppts || bonusModal || confirmAction || reschedulingId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [editingAvailability, viewingAppts, bonusModal, confirmAction, reschedulingId]);

  const nowObj = new Date();
  const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
  const maxAllowedDateStr = (() => {
    const endOfNextMonth = new Date(nowObj.getFullYear(), nowObj.getMonth() + 2, 0);
    const endY = endOfNextMonth.getFullYear();
    const endM = String(endOfNextMonth.getMonth() + 1).padStart(2, '0');
    const endD = String(endOfNextMonth.getDate()).padStart(2, '0');
    return `${endY}-${endM}-${endD}`;
  })();
  const filterDateStr = todayStr; // Simplified for now, could add date picker
  
  // scheduledOrders are orders that are scheduled for today (for the calendar view)
  const todaysOrders = orders.filter(o => o.date === filterDateStr && o.status !== 'cancelled');
  
  // Orders created today (for revenue metrics if desired, though normally revenue is based on scheduled date)
  // Let's base revenue on today's non-cancelled scheduled orders
  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + o.finalPrice, 0);
  const revenueMonthStr = todayStr.slice(0, 7);
  const monthlyRevenue = orders
    .filter(o => o.date?.startsWith(revenueMonthStr) && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.finalPrice || 0), 0);
  
  const handleDeleteOrder = (id: string) => {
    setConfirmAction({
      message: '確定要刪除這筆訂單嗎？',
      onConfirm: () => {
        db.deleteOrder(id);
        setOrders(sortOrders(db.getOrders()));
      }
    });
  };

  const handleCompleteOrder = (id: string) => {
    setConfirmAction({
      message: '確定要將這筆預約標記為「已完成」嗎？',
      onConfirm: () => {
        db.updateOrder(id, { status: 'completed' });
        setOrders(db.getOrders());
      }
    });
  };

  const toggleOrderStatus = (id: string, isCompleted: boolean) => {
    db.updateOrder(id, { status: isCompleted ? 'completed' : 'pending' });
    setOrders(db.getOrders());
  };

  const handleCancelOrder = (id: string) => {
    setConfirmAction({
      message: '確定要取消這筆預約嗎？',
      onConfirm: () => {
        db.updateOrder(id, { status: 'cancelled' });
        setOrders(db.getOrders());
      }
    });
  };

  const submitReschedule = (id: string) => {
    if (!rescheduleDate || !rescheduleTime) {
      setConfirmAction({ message: '請輸入有效日期與時間' });
      return;
    }
    db.updateOrder(id, { date: rescheduleDate, time: rescheduleTime });
    setOrders(sortOrders(db.getOrders()));
    setReschedulingId(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  const handleLevelChange = (id: string, lvl: MemberLevel) => {
    db.updateMemberLevel(id, lvl);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, level: lvl } : m));
  };

  const openCustomerModal = (m: Member | undefined) => {
    if (!m) return;
    setTab('members');
    setExpandedMemberId(m.id);
    setEditingNote(m.note || '');
    setEditName(m.name);
    setEditLineId(m.lineId || '');
    setEditGender(m.gender || '女');
    setEditBirthday(m.birthday || '');
    setEditBirthdayText(m.birthday ? m.birthday.replace(/-/g, '/') : '');
    setEditPhone(m.id);
    setEditLevel(m.level);
    
    // Slight delay to ensure the DOM has updated before trying to scroll
    setTimeout(() => {
      const el = document.getElementById(`member-row-${m.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSaveAvailability = (date: string, selectedSlots: {start: string, end: string}[]) => {
    if (!selectedTherapistPortal) return;
    const availability: TherapistAvailability = {
      id: `${selectedTherapistPortal}_${date}`,
      therapistName: selectedTherapistPortal,
      date: date,
      slots: selectedSlots
    };
    db.saveAvailability(availability);
    setAvailabilities(db.getAvailability());
    setEditingAvailability(null);
  };

  const handleBatchCopyAvailability = () => {
    if (!editingAvailability || copyTargetDates.length === 0 || !selectedTherapistPortal) return;
    
    const consolidated = consolidateAvailability(editingAvailability.slots.map(s => s.start));
    copyTargetDates.forEach(date => {
        const availability: TherapistAvailability = {
            id: `${selectedTherapistPortal}_${date}`,
            therapistName: selectedTherapistPortal,
            date: date,
            slots: consolidated
        };
        db.saveAvailability(availability);
    });
    
    setAvailabilities(db.getAvailability());
    setShowCopyCalendar(false);
    setEditingAvailability(null);
    setCopyTargetDates([]);
  };

  const handleExpand = (m: Member) => {
    if (expandedMemberId === m.id) {
      setExpandedMemberId(null);
      setShowMemberSpendingId(null);
    } else {
      setExpandedMemberId(m.id);
      setShowMemberSpendingId(null);
      setEditingNote(m.note || '');
      setEditName(m.name);
      setEditLineId(m.lineId || '');
      setEditGender(m.gender || '女');
      setEditBirthday(m.birthday || '');
      setEditBirthdayText(m.birthday ? m.birthday.replace(/-/g, '/') : '');
      setEditPhone(m.id);
      setEditLevel(m.level);
      setEditMemberLevel(m.memberLevel);
      setEditReferredBy(m.referredBy || '');
      setEditReferredMonth(m.referredMonth || '');
      setEditReferrerType(m.referrerType || '');
      setEditReferrerId(m.referrerId || '');
      setEditPrimaryTherapist(m.primaryTherapist || '');
      setEditPrimaryCoach(m.primaryCoach || '');
      setEditSecondaryCoach(m.secondaryCoach || '');
      setEditFitnessPlan(m.fitnessPlan || '');
      setEditMembershipStartDate(m.membershipStartDate || '');
      setEditMembershipEndDate(m.membershipEndDate || '');
      setEditRole(m.role || 'member');
      setEditRoles(m.roles || (m.role ? [m.role] : ['member']));
      setEditTherapistName(m.therapistName || '');
      setEditPassword(m.password || '');
      
      let initialIds: string[] = [];
      if (m.selectedIdentities) {
        initialIds = [...m.selectedIdentities];
      } else {
        if (m.roles?.includes('admin') || m.role === 'admin') {
          initialIds.push('admin');
        }
        if (m.level === '店內按摩師') {
          initialIds.push('therapist_in');
        } else if (m.level === '店內教練') {
          initialIds.push('coach_in');
        } else if (m.level === '場租按摩師') {
          initialIds.push('therapist_rent');
        } else if (m.level === '場租教練') {
          initialIds.push('coach_rent');
        }

        const mLevel = m.memberLevel || (['一般', '金卡', '黑卡'].includes(m.level) ? m.level as any : '一般');
        if (mLevel === '黑卡') {
          initialIds.push('black');
        } else if (mLevel === '金卡') {
          initialIds.push('gold');
        } else {
          initialIds.push('member_normal');
        }
      }
      setEditSelectedIdentities(initialIds);
    }
  };

  const handleNoteSave = (id: string) => {
    db.updateMemberNote(id, editingNote);
    setMembers(sortMembers(db.getMembers()));
  };

  const handleInfoSave = (oldId: string, overrides: any = {}) => {
    const finalPhone = overrides.phone ?? editPhone;
    const m = members.find(x => x.id === oldId);
    if (!m) return;

    db.updateMemberInfo(
      oldId, 
      overrides.name ?? editName, 
      overrides.gender ?? editGender, 
      overrides.birthday ?? editBirthday, 
      finalPhone, 
      overrides.level ?? editLevel,
      overrides.lineId ?? editLineId,
      overrides.referredBy ?? editReferredBy,
      overrides.referredMonth ?? editReferredMonth,
      overrides.primaryTherapist ?? editPrimaryTherapist,
      overrides.membershipStartDate ?? editMembershipStartDate,
      overrides.membershipEndDate ?? editMembershipEndDate,
      overrides.role ?? editRole,
      overrides.password ?? editPassword,
      overrides.therapistName ?? editTherapistName,
      overrides.roles ?? editRoles,
      overrides.memberLevel ?? editMemberLevel,
      overrides.selectedIdentities ?? editSelectedIdentities,
      overrides.fitnessPlan ?? editFitnessPlan,
      overrides.primaryCoach ?? editPrimaryCoach,
      overrides.secondaryCoach ?? editSecondaryCoach
    );

    // Update local state immediately without full re-fetch/sort
    setMembers(prev => {
      const next = prev.map(item => {
        if (item.id === oldId) {
          const updated = { ...item, ...overrides };
          if (finalPhone !== oldId) updated.id = finalPhone;
          return updated;
        }
        return item;
      });
      return sortMembers(next);
    });

    if (finalPhone !== oldId) {
      setExpandedMemberId(finalPhone);
    }
  };

  const handleDeleteMember = (id: string) => {
    setConfirmAction({
      message: '注意：刪除會員後將無法復原，確定要以此操作嗎？',
      onConfirm: () => {
        db.deleteMember(id);
        setMembers(sortMembers(db.getMembers()));
        setExpandedMemberId(null);
      }
    });
  };

  const generalCategories = ['不指定按摩師', '男按摩師即可', '女按摩師即可'];
  const portalMaleTherapists = ['阿翰', 'Kenny', 'Mark', 'Ricky'];
  const portalFemaleTherapists = ['Alice', 'Kelly', 'Miki'];
  const linkedMassageMembers = members.filter(m =>
    !!m.therapistName && (
      m.selectedIdentities?.includes('therapist_in') ||
      (!m.selectedIdentities?.length && m.level === '店內按摩師')
    )
  );
  const maleTherapists = linkedMassageMembers.filter(m => m.gender === '男').map(m => m.therapistName as string);
  const femaleTherapists = linkedMassageMembers.filter(m => m.gender === '女').map(m => m.therapistName as string);

  const coachMembers = members.filter(m =>
    !!m.therapistName && (
      m.selectedIdentities?.includes('coach_in') ||
      (!m.selectedIdentities?.length && m.level === '店內教練')
    )
  );
  const maleCoaches = coachMembers.filter(m => m.gender === '男').map(m => m.therapistName as string);
  const femaleCoaches = coachMembers.filter(m => m.gender === '女').map(m => m.therapistName as string);
  const linkedStaffNames = Array.from(new Set([...maleTherapists, ...femaleTherapists, ...maleCoaches, ...femaleCoaches]));
  const getStaffPortalRoleTitle = (name: string) => {
    const staffMember = members.find(m => (m.therapistName || m.name) === name);
    const isTherapist = staffMember
      ? staffMember.level?.includes('按摩師') || staffMember.selectedIdentities?.some(id => id.includes('therapist'))
      : THERAPISTS_W_GENDER.filter(t => !t.includes('即可')).includes(name);
    const isCoach = staffMember
      ? staffMember.level?.includes('教練') || staffMember.selectedIdentities?.some(id => id.includes('coach'))
      : coachMembers.some(m => (m.therapistName || m.name) === name);
    return isTherapist && isCoach ? '老師/教練' : isCoach ? '教練' : '老師';
  };
  const getStaffPortalTitle = (name: string) => {
    return `${name}${getStaffPortalRoleTitle(name)} 專屬頁面`;
  };
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '早安';
    if (hour >= 12 && hour < 18) return '午安';
    return '晚安';
  };

  const getAdminSubTabOrders = (subTab: string, catId: string) => {
    return orders.filter(o => {
      if (o.date < todayStr || o.status === 'cancelled') return false;

      const orderItems = o.items || [];

      if (subTab === 'massage') {
        const isFitnessOrder = o.isFitness || o.therapistPreference?.includes('教練') || orderItems.some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item');
        const isVenueOrder = o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || orderItems.some(i => i.name.includes('場地租借'));
        if (isFitnessOrder || isVenueOrder) return false;

        if (catId === '不指定按摩師') {
          return (!o.therapistPreference || o.therapistPreference === '不指定' || o.therapistPreference === '不指定按摩師') && o.therapistPreference !== '男按摩師即可' && o.therapistPreference !== '女按摩師即可';
        }
        if (catId === '男按摩師即可') {
          return o.therapistPreference === '男按摩師即可';
        }
        if (catId === '女按摩師即可') {
          return o.therapistPreference === '女按摩師即可';
        }
        return o.therapistPreference === catId;
      }

      if (subTab === 'venue') {
        const isVenueOrder = o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || orderItems.some(i => i.name.includes('場地租借'));
        if (!isVenueOrder) return false;

        if (catId === 'all_rooms') {
          return !o.massageRoom || (o.massageRoom !== 'ZEN1' && o.massageRoom !== 'ZEN2' && o.massageRoom !== 'SPA1' && o.massageRoom !== 'SPA2');
        }
        return o.massageRoom === catId || orderItems.some(i => i.name.includes(catId));
      }

      if (subTab === 'fitness') {
        const isFitnessOrder = o.isFitness || o.therapistPreference?.includes('教練') || orderItems.some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item');
        if (!isFitnessOrder) return false;

        if (catId === '不指定教練') {
          return !o.therapistPreference || o.therapistPreference === '不指定' || o.therapistPreference === '不指定教練' || o.therapistPreference === '不指定按摩師';
        }
        if (catId === '男即可教練') {
          return o.therapistPreference === '男即可' || o.therapistPreference === '男按摩師即可';
        }
        if (catId === '女即可教練') {
          return o.therapistPreference === '女即可' || o.therapistPreference === '女按摩師即可';
        }
        return o.therapistPreference === catId;
      }

      return false;
    });
  };

  const roomCategories = ['ZEN1', 'ZEN2', 'SPA1', 'SPA2'];
  const massageStaffCategories = [...maleTherapists, ...femaleTherapists];
  const coachStaffCategories = [...maleCoaches, ...femaleCoaches];
  const getMostBookedCategory = (subTab: 'venue' | 'massage' | 'fitness') => {
    const fallback = subTab === 'venue' ? 'ZEN1' : '阿翰';
    const candidates = subTab === 'venue' ? roomCategories : subTab === 'massage' ? massageStaffCategories : coachStaffCategories;
    if (!candidates.length) return fallback;

    const counts = candidates.map(id => ({ id, count: getAdminSubTabOrders(subTab, id).length }));
    const maxCount = Math.max(...counts.map(item => item.count));
    const tied = counts.filter(item => item.count === maxCount).map(item => item.id);
    if (maxCount === 0 || tied.length > 1) {
      return candidates.includes(fallback) ? fallback : candidates[0];
    }
    return counts.find(item => item.count === maxCount)?.id || fallback;
  };

  const isCategoryValidForSubTab = (subTab: 'venue' | 'massage' | 'fitness', category: string) => {
    if (!category) return false;
    if (subTab === 'venue') return roomCategories.includes(category);
    if (subTab === 'massage') return ['不指定按摩師', '男按摩師即可', '女按摩師即可', ...massageStaffCategories].includes(category);
    return ['不指定教練', '男即可教練', '女即可教練', ...coachStaffCategories].includes(category);
  };

  useEffect(() => {
    const switchedSubTab = lastAutoAdminSubTabRef.current !== adminSubTab;
    const invalidSelection = !isCategoryValidForSubTab(adminSubTab, adminSelectedCategory);
    if (switchedSubTab || invalidSelection) {
      setAdminSelectedCategory(getMostBookedCategory(adminSubTab));
      lastAutoAdminSubTabRef.current = adminSubTab;
    }
  }, [adminSubTab, adminSelectedCategory, orders, members]);

  const resetPromotionForm = () => {
    setEditingPromotionId(null);
    setPromotionForm({
      code: '', name: '', discountType: 'fixed', discountValue: '', appliesTo: 'all',
      startDate: '', endDate: '', minimumSpend: '0', memberUsageLimit: '1', enabled: true
    });
  };

  const editPromotion = (promotion: Promotion) => {
    setEditingPromotionId(promotion.id);
    setPromotionForm({
      code: promotion.code,
      name: promotion.name,
      discountType: promotion.discountType,
      discountValue: String(promotion.discountValue),
      appliesTo: promotion.appliesTo,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      minimumSpend: String(promotion.minimumSpend),
      memberUsageLimit: String(promotion.memberUsageLimit),
      enabled: promotion.enabled
    });
  };

  const savePromotion = () => {
    const code = promotionForm.code.trim().toUpperCase();
    const name = promotionForm.name.trim();
    const discountValue = Math.max(0, Number(promotionForm.discountValue) || 0);
    if (!code || !name || discountValue <= 0 || !promotionForm.startDate || !promotionForm.endDate) {
      alert('請完整填寫優惠代碼、活動名稱、折扣內容與活動日期。');
      return;
    }
    if (promotionForm.endDate < promotionForm.startDate) {
      alert('活動結束日期不可早於開始日期。');
      return;
    }
    if (promotionForm.discountType === 'percentage' && discountValue > 100) {
      alert('百分比折扣不可超過 100%。');
      return;
    }
    const duplicate = promotions.some(item => item.code === code && item.id !== editingPromotionId);
    if (duplicate) {
      alert('此優惠代碼已存在，請使用其他代碼。');
      return;
    }
    const now = Date.now();
    const existing = promotions.find(item => item.id === editingPromotionId);
    db.savePromotion({
      id: editingPromotionId || `promo_${now}`,
      code,
      name,
      discountType: promotionForm.discountType,
      discountValue,
      appliesTo: promotionForm.appliesTo,
      startDate: promotionForm.startDate,
      endDate: promotionForm.endDate,
      minimumSpend: Math.max(0, Math.floor(Number(promotionForm.minimumSpend) || 0)),
      memberUsageLimit: Math.max(0, Math.floor(Number(promotionForm.memberUsageLimit) || 0)),
      enabled: promotionForm.enabled,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
    setPromotions(db.getPromotions().sort((a, b) => b.updatedAt - a.updatedAt));
    resetPromotionForm();
  };

  if (!authedUser) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zf_redirect_staff', 'true');
      window.location.href = '/';
    }
    return (
      <div className="bg-stone-50 min-h-screen text-stone-800 font-sans flex flex-col items-center justify-center p-6 gap-3">
        <div className="w-8 h-8 border-4 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-stone-500">正在重新導向至 ZEN FLOW 統一登入頁面...</p>
      </div>
    );
  }

  const renderCategoryCard = (category: string) => {
    const categoryOrders = orders.filter(o => 
      o.date >= todayStr && 
      o.status !== 'cancelled' &&
      (category === '不指定按摩師' 
        ? ((!o.therapistPreference || o.therapistPreference === '不指定按摩師') && o.therapistPreference !== '男按摩師即可' && o.therapistPreference !== '女按摩師即可')
        : o.therapistPreference === category)
    ).sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

    const isExpanded = expandedTherapists.has(category) || (!isAdmin && category === authedUser?.name);

    return (
      <div key={category} className="border border-sage-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300">
        <button 
            onClick={() => toggleTherapistExpand(category)}
            className={`w-full flex items-center justify-between py-3 px-4 text-left transition-colors ${isExpanded ? 'bg-sage-50/60' : 'hover:bg-sage-50/30'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${categoryOrders.length > 0 ? 'bg-sage-500 animate-pulse' : 'bg-stone-300'}`}></div>
                <span className="font-bold text-stone-800 text-sm md:text-[15px] tracking-tight">{stripGender(category)}</span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${categoryOrders.length > 0 ? 'bg-sage-100 text-sage-800' : 'bg-stone-100 text-stone-400'}`}>
                    {categoryOrders.length} 筆
                </span>
            </div>
            <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
        
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[5000px] opacity-100 border-t border-sage-50' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 space-y-3 bg-sage-50/10">
                {categoryOrders.length === 0 ? (
                    <p className="text-xs text-stone-400 py-6 text-center">目前沒有預約</p>
                ) : (
                    categoryOrders.map(o => {
                        const m = members.find(x => x.id === o.memberId);
                        const endTime = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                        return (
                            <div key={o.id} className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col hover:border-sage-300 transition-all ${o.status === 'completed' ? 'opacity-50 grayscale border-stone-100' : 'border-stone-200'}`}>
                              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex flex-col gap-2 shrink-0">
                                    <div className="bg-sage-800 text-white px-2 py-1 rounded-lg text-[11px] font-bold text-center tracking-wider">
                                      {o.date.replace(/-/g, '/')}
                                    </div>
                                    <div className="bg-sage-50/50 text-stone-700 px-2 py-1.5 rounded-lg text-xs md:text-sm text-center font-bold flex flex-col justify-center border border-sage-100">
                                      <span>{o.time}~{endTime}</span>
                                      <span className="text-[10px] md:text-xs text-stone-400 font-normal mt-0.5">({o.totalDuration}分)</span>
                                    </div>
                                    
                                    <div className="mt-1 flex flex-col gap-1.5">
                                      {(category === '不指定按摩師' || category === '男按摩師即可' || category === '女按摩師即可') && (
                                        <div className="text-[10px] flex flex-col gap-1 bg-amber-50/50 p-1.5 rounded-lg border border-amber-200">
                                          <span className="text-amber-800 font-bold">分派：</span>
                                          <select 
                                            className="bg-white border border-amber-200 outline-none rounded p-1 text-stone-700 cursor-pointer shadow-sm text-[10px] w-full font-bold"
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                db.updateOrder(o.id, { 
                                                  therapistPreference: e.target.value as any, 
                                                  isAssignedByShop: true,
                                                  originalTherapistPreference: o.originalTherapistPreference || o.therapistPreference || (category as any)
                                                });
                                                setOrders(db.getOrders());
                                              }
                                            }}
                                            value=""
                                          >
                                            <option value="" disabled>選擇安排</option>
                                            {(() => {
                                              if (category === '男按摩師即可') {
                                                return maleTherapists.map(t => (
                                                  <option key={t} value={t}>{t}</option>
                                                ));
                                              }
                                              if (category === '女按摩師即可') {
                                                return femaleTherapists.map(t => (
                                                  <option key={t} value={t}>{t}</option>
                                                ));
                                              }
                                              return [...maleTherapists, ...femaleTherapists].map(t => (
                                                <option key={t} value={t}>{t}</option>
                                              ));
                                            })()}
                                          </select>
                                        </div>
                                      )}
                                      
                                      {category !== '不指定按摩師' && category !== '男按摩師即可' && category !== '女按摩師即可' && (!o.status || o.status === 'pending') && (
                                        <div className="text-[10px] flex flex-col gap-1 bg-stone-50 p-1.5 rounded-lg border border-stone-200">
                                          <span className="text-stone-600 font-bold">代班：</span>
                                          <select 
                                            className="bg-white border border-stone-200 outline-none rounded p-1 text-stone-700 cursor-pointer shadow-sm text-[10px] w-full font-bold"
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                db.updateOrder(o.id, { 
                                                  therapistPreference: e.target.value as any,
                                                  originalTherapistPreference: o.originalTherapistPreference || o.therapistPreference
                                                });
                                                setOrders(db.getOrders());
                                              }
                                            }}
                                            value=""
                                          >
                                            <option value="" disabled>代班..</option>
                                            {(() => {
                                              const origPref = o.originalTherapistPreference || o.therapistPreference;
                                              if (origPref === '男按摩師即可') {
                                                return maleTherapists
                                                  .filter(t => t !== category)
                                                  .map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                  ));
                                              }
                                              if (origPref === '女按摩師即可') {
                                                return femaleTherapists
                                                  .filter(t => t !== category)
                                                  .map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                  ));
                                              }
                                              return [...maleTherapists, ...femaleTherapists]
                                                .filter(t => t !== category)
                                                .map(t => (
                                                  <option key={t} value={t}>{t}</option>
                                                ));
                                            })()}
                                          </select>
                                        </div>
                                      )}

                                      <div className="text-[10px] flex flex-col gap-1 bg-emerald-50/30 p-1.5 rounded-lg border border-emerald-200">
                                        <span className="text-emerald-800 font-bold">按摩場地：</span>
                                        <select 
                                          className="bg-white border border-emerald-200 outline-none rounded p-1 text-stone-700 cursor-pointer shadow-sm text-[10px] w-full font-bold"
                                          onChange={(e) => {
                                            db.updateOrder(o.id, { massageRoom: e.target.value });
                                            setOrders(sortOrders(db.getOrders()));
                                          }}
                                          value={o.massageRoom || ""}
                                        >
                                          <option value="">未指定</option>
                                          <option value="ZEN1">ZEN1</option>
                                          <option value="ZEN2">ZEN2</option>
                                          <option value="SPA1">SPA1</option>
                                          <option value="SPA2">SPA2</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <p className="text-base md:text-lg font-bold text-stone-800 cursor-pointer hover:underline truncate" onClick={() => openCustomerModal(m)}>
                                        {stripGender(m?.name || '未知客戶')}
                                      </p>
                                      <span className="text-stone-400 text-xs">{o.memberId}</span>
                                      {o.isAssignedByShop && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">店家分派</span>}
                                      {o.isAssignedByShop && (o.originalTherapistPreference === '男按摩師即可' || (!o.originalTherapistPreference && o.therapistPreference === '男按摩師即可')) && (
                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">男按摩師</span>
                                      )}
                                      {o.isAssignedByShop && (o.originalTherapistPreference === '女按摩師即可' || (!o.originalTherapistPreference && o.therapistPreference === '女按摩師即可')) && (
                                        <span className="text-[9px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-bold">女按摩師</span>
                                      )}
                                      {o.massageRoom && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">🏠 {o.massageRoom}</span>}
                                    </div>

                                    <div className="space-y-1.5 mb-3">
                                      {sortOrderItems(o.items || []).map((i, idx) => (
                                        <p key={idx} className="flex items-center text-xs text-stone-600 font-medium">
                                          <Plus className="w-2.5 h-2.5 mr-2 text-stone-400" />
                                          {i.name} ({i.duration}分)
                                        </p>
                                      ))}
                                    </div>

                                    <textarea
                                      className="w-full text-[11px] p-2 border border-stone-200 rounded-lg resize-none focus:outline-none focus:border-stone-500 bg-stone-50/50 placeholder:text-stone-300 text-stone-700 h-14 transition-all"
                                      placeholder="服務注意事項..."
                                      defaultValue={o.note || ''}
                                      onBlur={(e) => {
                                        if (e.target.value !== o.note) {
                                          db.updateOrder(o.id, { note: e.target.value });
                                          setOrders(db.getOrders());
                                        }
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="xl:ml-4 flex flex-col justify-between items-start xl:items-end gap-3 shrink-0 w-full xl:w-auto">
                                  <div className="flex items-center gap-3 w-full xl:w-auto justify-between">
                                    <p className="text-base font-bold text-stone-900">NT$ {o.finalPrice}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {o.status === 'completed' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">已完成</span>}
                                      {o.status === 'cancelled' && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">已取消</span>}
                                      {o.isConfirmed && (!o.status || o.status === 'pending') && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">出席確認</span>}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-start xl:justify-end">
                                      {(!o.status || o.status === 'pending') && (
                                        <>
                                          {!o.isConfirmed && (
                                            <button onClick={() => {
                                                db.updateOrder(o.id, { isConfirmed: true });
                                                setOrders(db.getOrders());
                                              }} className="text-[11px] px-3 py-2 bg-sage-800 text-white font-bold rounded-lg hover:bg-sage-700 transition active:scale-95 shadow-sm">
                                              出席確認
                                            </button>
                                          )}
                                          <button onClick={() => {
                                              setRescheduleDate(o.date);
                                              setRescheduleTime(o.time);
                                              setReschedulingId(o.id);
                                            }} className="text-[11px] px-2.5 py-1.5 border border-stone-200 bg-white text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition active:scale-95 shadow-sm flex items-center">
                                            <CalendarDays className="w-3.5 h-3.5 mr-1 text-stone-400" />
                                            改期
                                          </button>
                                          <button onClick={() => handleCompleteOrder(o.id)} className="text-[11px] px-2.5 py-1.5 border border-stone-200 bg-white text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition active:scale-95 shadow-sm flex items-center">
                                            <CheckCircle className="w-3.5 h-3.5 mr-1 text-stone-400" />
                                            完成服務
                                          </button>
                                          <button onClick={() => handleShare(o)} className="text-[11px] px-2.5 py-1.5 border border-stone-200 bg-white text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition active:scale-95 shadow-sm flex items-center">
                                            <Send className="w-3.5 h-3.5 mr-1 text-stone-400" />
                                            通知按摩師
                                          </button>
                                          <button onClick={() => handleCancelOrder(o.id)} className="w-full xl:w-auto text-[10px] py-1 text-stone-400 hover:text-red-500 font-bold text-center">
                                            取消預約
                                          </button>
                                        </>
                                      )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-3">
                                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">不適部位：</span>
                                  <div className="flex flex-wrap gap-2">
                                    {['頭','頸','肩','上背','下背','臀','大腿','小腿','足','胸','腹','手'].map(area => (
                                      <label key={area} className={`flex items-center px-1.5 py-0.5 rounded cursor-pointer transition-colors border ${o.discomfortAreas?.includes(area) ? 'bg-sage-800 text-white border-sage-800' : 'bg-white text-stone-400 border-stone-100 hover:border-stone-200'}`}>
                                        <input 
                                          type="checkbox" 
                                          checked={o.discomfortAreas?.includes(area) || false} 
                                          onChange={e => {
                                            const current = o.discomfortAreas || [];
                                            db.updateOrder(o.id, { discomfortAreas: e.target.checked ? [...current, area] : current.filter(x => x !== area) });
                                            setOrders(db.getOrders());
                                          }}
                                          className="hidden" 
                                        />
                                        <span className="text-[10px] font-bold">{area}</span>
                                      </label>
                                    ))}
                                  </div>
                              </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>
    );
  };

  const isAdmin = authedUser.role === 'admin';

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-stone-800 font-sans">
      <div className="bg-[#20251E] text-sage-50 px-6 py-6 md:py-8 flex flex-col items-center shadow-lg gap-4 md:gap-6 border-b border-sage-900">
        <div className="w-full max-w-7xl flex justify-between items-center gap-2 border-b border-sage-800/60 pb-4 mb-2">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-5">
            <h1 className="shrink-0 text-xl min-[360px]:text-2xl md:text-[38px] font-serif tracking-widest md:leading-none text-white font-light flex items-center gap-4">
              <span>ZEN FLOW</span>
              <span className="text-sage-400 text-xs md:text-sm font-sans font-bold uppercase tracking-widest bg-sage-800/40 px-3 py-1 rounded-full md:inline hidden border border-sage-800/20">
                {isAdmin ? 'Management Center' : `${authedUser.name || 'Therapist'} 老師專區`}
              </span>
            </h1>
            {isAdmin && (
              <div className="flex min-w-0 items-center divide-x divide-sage-700/70 rounded-lg border border-sage-700/50 bg-white/[0.04] px-1.5 py-1.5 font-sans md:rounded-xl md:px-2.5 md:py-2">
                <div className="min-w-0 px-1.5 text-center md:px-3">
                  <div className="whitespace-nowrap text-[8px] font-bold tracking-wide text-sage-400 md:text-[11px]">今日營業額</div>
                  <div className="mt-0.5 whitespace-nowrap text-[10px] font-black leading-none text-white min-[390px]:text-[11px] md:text-sm">NT$ {todaysRevenue.toLocaleString()}</div>
                </div>
                <div className="min-w-0 px-1.5 text-center md:px-3">
                  <div className="whitespace-nowrap text-[8px] font-bold tracking-wide text-sage-400 md:text-[11px]">本月營業額</div>
                  <div className="mt-0.5 whitespace-nowrap text-[10px] font-black leading-none text-white min-[390px]:text-[11px] md:text-sm">NT$ {monthlyRevenue.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isAdmin && <span className="text-sage-300 text-xs md:text-sm font-medium mr-2">{authedUser.name} 老師</span>}
            <button onClick={handleLogout} className="p-2 md:p-2.5 text-sage-400 hover:text-white transition bg-white/5 hover:bg-white/10 rounded-xl border border-sage-800/30">
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
        
        <div className="w-full max-w-7xl grid grid-cols-3 gap-2.5">
          <button
            onClick={()=>setTab('calendar')}
            className={`backend-nav-tile ${isAdmin ? 'order-1' : 'order-2'} px-3 py-3 md:px-5 md:py-2.5 rounded-2xl ${isAdmin ? 'text-[15px] md:text-sm' : 'text-[14px] min-[390px]:text-[15px] md:text-base'} transition-all whitespace-nowrap font-black tracking-wide border backdrop-blur ${tab==='calendar'?'bg-sage-50 text-sage-900 shadow-lg shadow-black/10 border-sage-100':'bg-white/[0.03] text-sage-200 border-white/10 hover:text-white hover:bg-white/[0.08]'}`}
          >
            預約列表
          </button>

          {isAdmin && (
            <div className="contents">
              <button
                onClick={()=>setTab('orders')}
                className={`backend-nav-tile order-4 px-3 py-3 md:px-5 md:py-2.5 rounded-2xl text-[15px] md:text-sm transition-all whitespace-nowrap font-black tracking-wide border backdrop-blur ${tab==='orders'?'bg-sage-50 text-sage-900 shadow-lg shadow-black/10 border-sage-100':'bg-white/[0.03] text-sage-200 border-white/10 hover:text-white hover:bg-white/[0.08]'}`}
              >
                訂單管理
              </button>
              <button
                onClick={()=>setTab('members')}
                className={`backend-nav-tile order-3 px-3 py-3 md:px-5 md:py-2.5 rounded-2xl text-[15px] md:text-sm transition-all whitespace-nowrap font-black tracking-wide border backdrop-blur ${tab==='members'?'bg-sage-50 text-sage-900 shadow-lg shadow-black/10 border-sage-100':'bg-white/[0.03] text-sage-200 border-white/10 hover:text-white hover:bg-white/[0.08]'}`}
              >
                會員系統
              </button>
              <button
                onClick={()=>setTab('promotions')}
                className={`backend-nav-tile order-6 px-3 py-3 md:px-5 md:py-2.5 rounded-2xl text-[15px] md:text-sm transition-all whitespace-nowrap font-black tracking-wide border backdrop-blur ${tab==='promotions'?'bg-sage-50 text-sage-900 shadow-lg shadow-black/10 border-sage-100':'bg-white/[0.03] text-sage-200 border-white/10 hover:text-white hover:bg-white/[0.08]'}`}
              >
                優惠活動
              </button>
              <div ref={venueStatusNavRef} className="order-2 relative h-full">
                <button
                  type="button"
                  onClick={() => {
                    if (tab === 'venueStatus') {
                      setIsVenueStatusNavOpen(prev => !prev);
                    } else {
                      setTab('venueStatus');
                      setIsVenueStatusNavOpen(false);
                    }
                    setIsTherapistNavOpen(false);
                  }}
                  className={`backend-nav-tile w-full px-3 py-3 md:px-5 md:py-2.5 rounded-2xl text-[15px] md:text-sm transition-all whitespace-nowrap font-black tracking-wide border backdrop-blur flex items-center justify-center gap-1.5 ${tab==='venueStatus'?'bg-sage-50 text-sage-900 shadow-lg shadow-black/10 border-sage-100':'bg-white/[0.03] text-sage-200 border-white/10 hover:text-white hover:bg-white/[0.08]'}`}
                >
                  場地狀態
                  <ChevronDown className={`w-4 h-4 opacity-80 transition-transform ${isVenueStatusNavOpen ? 'rotate-180' : ''}`} />
                </button>
                {isVenueStatusNavOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-sage-100 bg-sage-50 shadow-2xl shadow-black/20">
                    {(['ZEN1', 'ZEN2', 'SPA1', 'SPA2'] as const).map(room => (
                      <button
                        key={room}
                        type="button"
                        onClick={() => {
                          setVenueStatusRoom(room);
                          setTab('venueStatus');
                          setIsVenueStatusNavOpen(false);
                        }}
                        className={`w-full px-2 py-2.5 text-center text-[12px] md:text-[13px] font-black tracking-normal transition whitespace-nowrap ${venueStatusRoom === room ? 'bg-sage-500 text-white' : 'text-sage-900 hover:bg-white'} ${room !== 'ZEN1' ? 'border-t border-sage-100' : ''}`}
                      >
                        {room}按摩室
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {isAdmin ? (
            <div ref={therapistNavRef} className="order-5 relative h-full">
              <button
                type="button"
                onClick={() => {
                  if (tab === 'therapist') {
                    setIsTherapistNavOpen(prev => !prev);
                  } else {
                    setTab('therapist');
                    setIsTherapistNavOpen(false);
                  }
                  setIsVenueStatusNavOpen(false);
                }}
                className={`backend-nav-tile w-full px-3 py-3 md:px-5 md:py-2.5 rounded-2xl text-[15px] md:text-sm transition-all whitespace-nowrap font-black tracking-wide border backdrop-blur flex items-center justify-center gap-1.5 ${tab==='therapist' ? 'bg-sage-50 text-sage-900 shadow-lg shadow-black/10 border-sage-100' : 'bg-white/[0.03] text-sage-200 border-white/10 hover:text-white hover:bg-white/[0.08]'}`}
              >
                師傅專區
                <ChevronDown className={`w-4 h-4 opacity-80 transition-transform ${isTherapistNavOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTherapistNavOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] max-w-[calc(100vw-28px)] overflow-hidden rounded-2xl border border-sage-100 bg-sage-50 shadow-2xl shadow-black/20 md:w-[380px]">
                  {(() => {
                    const groups = [
                      { id: 'maleMassage' as const, label: '男按摩師', names: portalMaleTherapists, suffix: '老師' },
                      { id: 'femaleMassage' as const, label: '女按摩師', names: portalFemaleTherapists, suffix: '老師' },
                      { id: 'maleCoach' as const, label: '男教練', names: maleCoaches, suffix: '教練' },
                      { id: 'femaleCoach' as const, label: '女教練', names: femaleCoaches, suffix: '教練' }
                    ];
                    const activeGroup = groups.find(group => group.id === therapistNavCategory) || groups[0];
                    return (
                      <div className="grid min-h-[166px] grid-cols-[96px_minmax(0,1fr)] md:min-h-[210px] md:grid-cols-[132px_minmax(0,1fr)]">
                        <div className="bg-sage-100/70 border-r border-sage-200">
                          {groups.map(group => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => setTherapistNavCategory(group.id)}
                              className={`w-full px-1.5 py-3 text-center text-[11px] font-black tracking-normal transition whitespace-nowrap md:px-2 md:py-3.5 md:text-[13px] ${therapistNavCategory === group.id ? 'bg-sage-500 text-white' : 'text-sage-900 hover:bg-white/80'} ${group.id !== 'maleMassage' ? 'border-t border-sage-200/70' : ''}`}
                            >
                              {group.label}
                            </button>
                          ))}
                        </div>
                        <div className="bg-sage-50">
                          <div className="px-1.5 py-2 text-[9.5px] font-black tracking-normal text-sage-700 border-b border-sage-100 text-center whitespace-nowrap md:px-3 md:py-2.5 md:text-[11px]">
                            {activeGroup.label}名單
                          </div>
                          <div>
                            {activeGroup.names.map(name => (
                              <button
                                key={`${activeGroup.id}-${name}`}
                                type="button"
                                onClick={() => {
                                  setSelectedTherapistPortal(name);
                                  setTab('therapist');
                                  setIsTherapistNavOpen(false);
                                }}
                                className={`w-full px-2 py-3 text-center text-[12px] font-black tracking-normal transition border-b border-sage-100 last:border-b-0 whitespace-nowrap md:px-3 md:py-3.5 md:text-[13px] ${selectedTherapistPortal === name ? 'bg-sage-500 text-white' : 'text-sage-900 hover:bg-white'}`}
                              >
                                {name}{activeGroup.suffix}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => setTab('therapist')}
                className={`backend-nav-tile order-1 px-2 py-3 md:px-5 md:py-2.5 rounded-2xl text-[14px] min-[390px]:text-[15px] md:text-base transition-all whitespace-nowrap font-black tracking-wide border backdrop-blur ${tab==='therapist' ? 'bg-sage-50 text-sage-900 shadow-lg shadow-black/10 border-sage-100' : 'bg-white/[0.03] text-sage-200 border-white/10 hover:text-white hover:bg-white/[0.08]'}`}
              >
                我的頁面
              </button>
              <button
                onClick={() => setTab('history')}
                className={`backend-nav-tile order-3 px-2 py-3 md:px-5 md:py-2.5 rounded-2xl text-[14px] min-[390px]:text-[15px] md:text-base transition-all whitespace-nowrap font-black tracking-wide border backdrop-blur ${tab==='history' ? 'bg-sage-50 text-sage-900 shadow-lg shadow-black/10 border-sage-100' : 'bg-white/[0.03] text-sage-200 border-white/10 hover:text-white hover:bg-white/[0.08]'}`}
              >
                歷史紀錄
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-10">
        {tab === 'calendar' && (
          <div className="space-y-8 animate-fadeIn">
              <div className={isAdmin ? "bg-white rounded-xl border border-sage-100 shadow-sm p-4 md:p-8 space-y-8" : "space-y-8"}>
                {!isAdmin ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[22px] font-black leading-8 tracking-normal text-stone-900 md:text-3xl md:leading-10">
                        {authedUser?.name}老師 即將到來的預約
                      </h3>
                    </div>
                  <div className="max-w-2xl mx-auto">
                    {authedUser?.name && renderCategoryCard(authedUser.name)}
                  </div>
                </div>
              ) : (
                <>
                  {/* Dropdowns for Categories */}
                  <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
                    {/* 主要分類標籤 - 排在同一列，位於白色框框那一層 */}
                    <div className="grid grid-cols-3 gap-2 md:gap-4 border-b border-stone-100 pb-0 w-full max-w-full min-w-0">
                      {[
                        { id: 'venue', label: '場地預約', count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && (o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借')))).length },
                        { id: 'massage', label: '按摩預約', count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && !(o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && !(o.isFitness || o.therapistPreference?.includes('教練') || (o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item'))).length },
                        { id: 'fitness', label: '健身預約', count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && (o.isFitness || o.therapistPreference?.includes('教練') || (o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item'))).length }
                      ].map(t => {
                        const isSubActive = adminSubTab === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setAdminSubTab(t.id as any);
                              setAdminSelectedCategory(getMostBookedCategory(t.id as 'venue' | 'massage' | 'fitness'));
                            }}
                            className={`min-w-0 justify-center text-[15px] sm:text-lg md:text-xl lg:text-[22px] font-bold pb-3 transition-all duration-200 cursor-pointer border-b-2 -mb-[2px] px-1 whitespace-nowrap flex items-center gap-1.5 ${
                              isSubActive 
                                ? 'text-sage-800 border-sage-600 font-extrabold' 
                                : 'text-stone-400 border-transparent hover:text-stone-700'
                            }`}
                          >
                            <span className="truncate">{t.label}</span>
                            <span className={`text-[11px] sm:text-xs md:text-[13px] font-bold px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-sage-100 text-sage-800' : 'bg-stone-100 text-stone-500'}`}>
                              {t.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Unified Filter Container Card */}
                    <div className="bg-sage-50/40 p-4 sm:p-6 rounded-2xl border border-sage-100/80 space-y-5 w-full max-w-full min-w-0 overflow-hidden">
                      {adminSubTab === 'massage' && (
                        <>
                          {/* Row 1: 不指定、男即可、女即可 */}
                          <div className="grid grid-cols-3 gap-2.5 md:gap-4 w-full max-w-full min-w-0">
                            {[
                              {
                                id: '不指定按摩師',
                                label: '不指定',
                                subLabel: '自由分派',
                                textColor: 'text-stone-700',
                                borderColor: 'border-stone-200 hover:border-stone-300',
                                bgColor: 'bg-white',
                                activeColor: 'bg-stone-800 border-stone-800 text-white',
                                count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && !o.isFitness && !o.therapistPreference?.includes('教練') && !(o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item') && !(o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && ((!o.therapistPreference || o.therapistPreference === '不指定按摩師') && o.therapistPreference !== '男按摩師即可' && o.therapistPreference !== '女按摩師即可')).length
                              },
                              {
                                id: '男按摩師即可',
                                label: '男即可',
                                subLabel: '男按摩師',
                                textColor: 'text-sky-800',
                                borderColor: 'border-sky-100 hover:border-sky-200',
                                bgColor: 'bg-sky-50/60',
                                activeColor: 'bg-sky-700 border-sky-700 text-white',
                                count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && !o.isFitness && !o.therapistPreference?.includes('教練') && !(o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item') && !(o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && o.therapistPreference === '男按摩師即可').length
                              },
                              {
                                id: '女按摩師即可',
                                label: '女即可',
                                subLabel: '女按摩師',
                                textColor: 'text-rose-800',
                                borderColor: 'border-rose-100 hover:border-rose-200',
                                bgColor: 'bg-rose-50/60',
                                activeColor: 'bg-rose-700 border-rose-700 text-white',
                                count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && !o.isFitness && !o.therapistPreference?.includes('教練') && !(o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item') && !(o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && o.therapistPreference === '女按摩師即可').length
                              }
                            ].map((item) => {
                              const isSelected = adminSelectedCategory === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setAdminSelectedCategory(prev => prev === item.id ? '' : item.id)}
                                  className={`min-w-0 min-h-[68px] flex flex-col items-center justify-center gap-1 rounded-2xl border text-center transition-all duration-200 font-bold cursor-pointer shadow-sm ${
                                    isSelected
                                      ? item.activeColor + ' shadow-sm'
                                      : `${item.bgColor} ${item.textColor} ${item.borderColor}`
                                  }`}
                                >
                                  <span className="text-[16px] md:text-lg font-black leading-tight tracking-normal whitespace-nowrap">{item.label}</span>
                                  <span className={`text-[11px] md:text-xs font-black leading-none ${isSelected ? 'text-white/80' : 'text-stone-500'}`}>
                                    {item.subLabel}
                                  </span>
                                  <span className={`text-[11px] md:text-xs px-2 py-0.5 rounded-full font-black ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200/50'
                                  }`}>
                                    {item.count} 筆
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Row 2: 男按摩師 & 女按摩師 */}
                          <div className="grid grid-cols-2 gap-2.5 md:gap-4 pt-4 border-t border-sage-100/60 w-full max-w-full min-w-0">
                            {/* Left Column: Male */}
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <label className="text-[13px] md:text-sm font-black text-sky-900 tracking-normal pl-0.5">
                                男按摩師
                              </label>
                              <select
                                value={maleTherapists.includes(adminSelectedCategory) ? adminSelectedCategory : ""}
                                onChange={(e) => {
                                  setAdminSelectedCategory(e.target.value || '');
                                }}
                                className={`w-full bg-white border border-sky-100 hover:border-sky-300 rounded-xl px-2 md:px-3 py-3 text-stone-800 font-black focus:outline-none focus:ring-2 focus:ring-sky-100 transition cursor-pointer appearance-none shadow-sm ${
                                  bookingFontSize === 'lg' ? 'text-[13px] md:text-base' : 'text-[13px] md:text-[15px]'
                                }`}
                                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundPosition: 'right 0.55rem center', backgroundSize: '0.85rem', backgroundRepeat: 'no-repeat', paddingRight: '1.55rem' }}
                              >
                                <option value="">-- 選擇男按摩師 --</option>
                                {maleTherapists.map(t => (
                                  <option key={t} value={t}>
                                    {t} ({orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && !o.isFitness && !o.therapistPreference?.includes('教練') && !(o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item') && !(o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && o.therapistPreference === t).length} 筆)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Right Column: Female */}
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <label className="text-[13px] md:text-sm font-black text-rose-900 tracking-normal pl-0.5">
                                女按摩師
                              </label>
                              <select
                                value={femaleTherapists.includes(adminSelectedCategory) ? adminSelectedCategory : ""}
                                onChange={(e) => {
                                  setAdminSelectedCategory(e.target.value || '');
                                }}
                                className={`w-full bg-white border border-rose-100 hover:border-rose-300 rounded-xl px-2 md:px-3 py-3 text-stone-800 font-black focus:outline-none focus:ring-2 focus:ring-rose-100 transition cursor-pointer appearance-none shadow-sm ${
                                  bookingFontSize === 'lg' ? 'text-[13px] md:text-base' : 'text-[13px] md:text-[15px]'
                                }`}
                                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundPosition: 'right 0.55rem center', backgroundSize: '0.85rem', backgroundRepeat: 'no-repeat', paddingRight: '1.55rem' }}
                              >
                                <option value="">-- 選擇女按摩師 --</option>
                                {femaleTherapists.map(t => (
                                  <option key={t} value={t}>
                                    {t} ({orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && !o.isFitness && !o.therapistPreference?.includes('教練') && !(o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item') && !(o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && o.therapistPreference === t).length} 筆)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {adminSubTab === 'venue' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-4 w-full max-w-full min-w-0">
                          {[
                            {
                              id: 'ZEN1',
                              label: 'ZEN1',
                              subLabel: '按摩室',
                              textColor: 'text-emerald-900',
                              borderColor: 'border-emerald-100 hover:border-emerald-200',
                              bgColor: 'bg-emerald-50/60',
                              activeColor: 'bg-emerald-700 border-emerald-700 text-white',
                              count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && (o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && (o.massageRoom === 'ZEN1' || (o.items || []).some(i => i.name.includes('ZEN1')))).length
                            },
                            {
                              id: 'ZEN2',
                              label: 'ZEN2',
                              subLabel: '按摩室',
                              textColor: 'text-emerald-900',
                              borderColor: 'border-emerald-100 hover:border-emerald-200',
                              bgColor: 'bg-emerald-50/60',
                              activeColor: 'bg-emerald-700 border-emerald-700 text-white',
                              count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && (o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && (o.massageRoom === 'ZEN2' || (o.items || []).some(i => i.name.includes('ZEN2')))).length
                            },
                            {
                              id: 'SPA1',
                              label: 'SPA1',
                              subLabel: '按摩室',
                              textColor: 'text-sky-900',
                              borderColor: 'border-sky-100 hover:border-sky-200',
                              bgColor: 'bg-sky-50/60',
                              activeColor: 'bg-sky-700 border-sky-700 text-white',
                              count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && (o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && (o.massageRoom === 'SPA1' || (o.items || []).some(i => i.name.includes('SPA1')))).length
                            },
                            {
                              id: 'SPA2',
                              label: 'SPA2',
                              subLabel: '按摩室',
                              textColor: 'text-sky-900',
                              borderColor: 'border-sky-100 hover:border-sky-200',
                              bgColor: 'bg-sky-50/60',
                              activeColor: 'bg-sky-700 border-sky-700 text-white',
                              count: orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && (o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || (o.items || []).some(i => i.name.includes('場地租借'))) && (o.massageRoom === 'SPA2' || (o.items || []).some(i => i.name.includes('SPA2')))).length
                            }
                          ].map(item => {
                            const isSelected = adminSelectedCategory === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setAdminSelectedCategory(prev => prev === item.id ? '' : item.id)}
                                className={`min-w-0 min-h-[76px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-3 py-2.5 text-center transition-all duration-200 font-bold cursor-pointer shadow-sm md:min-h-[82px] md:px-4 ${
                                  isSelected
                                    ? item.activeColor + ' shadow-sm'
                                    : `${item.bgColor} ${item.textColor} ${item.borderColor}`
                                }`}
                              >
                                <span className="flex min-w-0 flex-col items-center justify-center gap-1">
                                  <span className="text-[18px] md:text-xl font-black leading-none tracking-[0.02em] whitespace-nowrap">{item.label}</span>
                                  <span className={`text-[12px] md:text-[13px] font-black leading-none whitespace-nowrap ${isSelected ? 'text-white/80' : 'text-stone-500'}`}>
                                    {item.subLabel}
                                  </span>
                                </span>
                                <span className={`shrink-0 whitespace-nowrap text-[12px] md:text-[13px] px-2 py-1 rounded-md font-black ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200/50'
                                }`}>
                                  {item.count}筆
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {adminSubTab === 'fitness' && (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between px-0.5">
                            <h4 className="text-[13px] md:text-sm font-black text-stone-800 tracking-normal">
                              健身體驗課預約
                            </h4>
                          </div>
                          <div className="grid grid-cols-3 gap-2.5 md:gap-4 w-full max-w-full min-w-0">
                            {[
                              {
                                id: '不指定教練',
                                label: '不指定',
                                subLabel: '自由分派',
                                textColor: 'text-stone-700',
                                borderColor: 'border-stone-200 hover:border-stone-300',
                                bgColor: 'bg-white',
                                activeColor: 'bg-stone-800 border-stone-800 text-white',
                                count: getAdminSubTabOrders('fitness', '不指定教練').length
                              },
                              {
                                id: '男即可教練',
                                label: '男即可',
                                subLabel: '男教練',
                                textColor: 'text-sky-800',
                                borderColor: 'border-sky-100 hover:border-sky-200',
                                bgColor: 'bg-sky-50/60',
                                activeColor: 'bg-sky-700 border-sky-700 text-white',
                                count: getAdminSubTabOrders('fitness', '男即可教練').length
                              },
                              {
                                id: '女即可教練',
                                label: '女即可',
                                subLabel: '女教練',
                                textColor: 'text-rose-800',
                                borderColor: 'border-rose-100 hover:border-rose-200',
                                bgColor: 'bg-rose-50/60',
                                activeColor: 'bg-rose-700 border-rose-700 text-white',
                                count: getAdminSubTabOrders('fitness', '女即可教練').length
                              }
                            ].map((item) => {
                              const isSelected = adminSelectedCategory === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setAdminSelectedCategory(prev => prev === item.id ? '' : item.id)}
                                  className={`min-w-0 min-h-[68px] flex flex-col items-center justify-center gap-1 rounded-2xl border text-center transition-all duration-200 font-bold cursor-pointer shadow-sm ${
                                    isSelected
                                      ? item.activeColor + ' shadow-sm'
                                      : `${item.bgColor} ${item.textColor} ${item.borderColor}`
                                  }`}
                                >
                                  <span className="text-[16px] md:text-lg font-black leading-tight tracking-normal whitespace-nowrap">{item.label}</span>
                                  <span className={`text-[11px] md:text-xs font-black leading-none ${isSelected ? 'text-white/80' : 'text-stone-500'}`}>
                                    {item.subLabel}
                                  </span>
                                  <span className={`text-[11px] md:text-xs px-2 py-0.5 rounded-full font-black ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200/50'
                                  }`}>
                                    {item.count} 筆
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="space-y-3 pt-4 border-t border-sage-100/60">
                            <div className="flex items-center justify-between px-0.5">
                              <h4 className="text-[13px] md:text-sm font-black text-stone-800 tracking-normal">
                                1對1教練課預約
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 md:gap-4 w-full max-w-full min-w-0">
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <label className="text-[13px] md:text-sm font-black text-sky-900 tracking-normal pl-0.5">
                                男教練
                              </label>
                              <select
                                value={maleCoaches.includes(adminSelectedCategory) ? adminSelectedCategory : ""}
                                onChange={(e) => {
                                  setAdminSelectedCategory(e.target.value || '');
                                }}
                                className="w-full bg-white border border-sky-100 hover:border-sky-300 rounded-xl px-2 md:px-3 py-3 text-[13px] md:text-[15px] text-stone-800 font-black focus:outline-none focus:ring-2 focus:ring-sky-100 transition cursor-pointer appearance-none shadow-sm"
                                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundPosition: 'right 0.55rem center', backgroundSize: '0.85rem', backgroundRepeat: 'no-repeat', paddingRight: '1.55rem' }}
                              >
                                <option value="">-- 選擇男教練 --</option>
                                {maleCoaches.map(t => (
                                  <option key={t} value={t}>
                                    {t} ({orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && (o.isFitness || o.therapistPreference?.includes('教練') || (o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item')) && o.therapistPreference === t).length} 筆)
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5 min-w-0">
                              <label className="text-[13px] md:text-sm font-black text-rose-900 tracking-normal pl-0.5">
                                女教練
                              </label>
                              <select
                                value={femaleCoaches.includes(adminSelectedCategory) ? adminSelectedCategory : ""}
                                onChange={(e) => {
                                  setAdminSelectedCategory(e.target.value || '');
                                }}
                                className="w-full bg-white border border-rose-100 hover:border-rose-300 rounded-xl px-2 md:px-3 py-3 text-[13px] md:text-[15px] text-stone-800 font-black focus:outline-none focus:ring-2 focus:ring-rose-100 transition cursor-pointer appearance-none shadow-sm"
                                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundPosition: 'right 0.55rem center', backgroundSize: '0.85rem', backgroundRepeat: 'no-repeat', paddingRight: '1.55rem' }}
                              >
                                <option value="">-- 選擇女教練 --</option>
                                {femaleCoaches.map(t => (
                                  <option key={t} value={t}>
                                    {t} ({orders.filter(o => o.date >= todayStr && o.status !== 'cancelled' && (o.isFitness || o.therapistPreference?.includes('教練') || (o.items || []).some(i => i.courseId === 'fitness-plan' || i.id === 'fitness-plan-item')) && o.therapistPreference === t).length} 筆)
                                  </option>
                                ))}
                              </select>
                            </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Active Selected Category Content */}
                    {adminSelectedCategory && (
                      <div className="border border-sage-200 rounded-2xl overflow-hidden bg-white shadow-md transition-all duration-300">
                        <div className="bg-sage-800 text-white py-3.5 px-5 flex items-center justify-between font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-sm md:text-base">預約明細：{
                              adminSelectedCategory === '不指定按摩師' || adminSelectedCategory === '不指定教練' ? '不指定' :
                              adminSelectedCategory === '男按摩師即可' || adminSelectedCategory === '男即可教練' ? '男即可' :
                              adminSelectedCategory === '女按摩師即可' || adminSelectedCategory === '女即可教練' ? '女即可' :
                              adminSelectedCategory === 'all_rooms' ? '不指定場地' :
                              stripGender(adminSelectedCategory)
                            }</span>
                          </div>
                          <span className="text-xs bg-white/20 px-3 py-1 rounded-full text-white font-medium">
                            共 {getAdminSubTabOrders(adminSubTab, adminSelectedCategory).length} 筆
                          </span>
                        </div>
                        
                        <div className="p-5 space-y-4 bg-stone-50/30">
                          {(() => {
                            const categoryOrders = getAdminSubTabOrders(adminSubTab, adminSelectedCategory)
                              .sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

                            if (categoryOrders.length === 0) {
                              return <p className="text-sm text-stone-400 py-10 text-center">目前沒有預約</p>;
                            }

                            return categoryOrders.map(o => {
                              const m = members.find(x => x.id === o.memberId);
                              const endTime = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                               return (
                                 <div key={o.id} className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col hover:border-sage-400 transition-all ${o.status === 'completed' ? 'opacity-50 grayscale border-stone-100' : 'border-stone-200'}`}>
                                   <div className="flex flex-col gap-3">
                                     {/* Line 1: Date & Time (placed on the same line, no line break, with clean font size and spacing) */}
                                     <div className="flex items-center flex-nowrap gap-2 sm:gap-3 text-stone-900 font-bold text-xs sm:text-sm md:text-base tracking-wide whitespace-nowrap overflow-x-auto no-scrollbar">
                                       <span className="text-sage-800 font-black">{o.date.replace(/-/g, '/')}</span>
                                       <span className="text-stone-700 font-black">{o.time}~{endTime}</span>
                                       <span className="text-stone-500 font-medium text-[11px] sm:text-xs">
                                         ({o.totalDuration % 60 === 0 ? `${o.totalDuration / 60}小時` : `${o.totalDuration}分鐘`})
                                       </span>
                                     </div>

                                     {/* Line 2: Customer Name, Service, Phone, Price */}
                                     <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-semibold text-stone-700">
                                       <button 
                                         onClick={() => openCustomerModal(m)}
                                         className="font-black text-stone-900 hover:text-sage-800 underline decoration-stone-300 hover:decoration-sage-500 underline-offset-4 text-left transition text-xs sm:text-sm"
                                       >
                                         {m?.name || '未知客戶'}
                                       </button>
                                       <span className="text-stone-600 font-bold">
                                         {(o.items || []).map(item => item.name).join(' + ')}
                                       </span>
                                       <span className="text-stone-500">{m?.id || '無電話'}</span>
                                       <span className="bg-sage-50 text-sage-700 px-2 py-0.5 rounded font-bold border border-sage-100 text-[10px] sm:text-xs">
                                         NT$ {o.finalPrice}
                                       </span>
                                     </div>

                                     {/* Line 3: Assignment & Status side-by-side */}
                                     <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-stone-100/60">
                                       {/* Assignment selector (labeled 空間調整, 技師分派, or 教練分派 depending on the tab) */}
                                       <div className="flex items-center gap-2">
                                         {adminSubTab === 'massage' && (adminSelectedCategory === '不指定按摩師' || adminSelectedCategory === '男按摩師即可' || adminSelectedCategory === '女按摩師即可') && (
                                           <div className="flex items-center gap-2">
                                             <span className="text-stone-500 font-bold text-xs whitespace-nowrap">技師分派：</span>
                                             <select 
                                               className="bg-white border border-stone-200 outline-none rounded-lg p-1 text-stone-700 cursor-pointer shadow-sm text-xs font-bold"
                                               onChange={(e) => {
                                                 if (e.target.value) {
                                                   db.updateOrder(o.id, { 
                                                     therapistPreference: e.target.value as any, 
                                                     isAssignedByShop: true,
                                                     originalTherapistPreference: o.originalTherapistPreference || o.therapistPreference || (adminSelectedCategory as any)
                                                   });
                                                   setOrders(db.getOrders());
                                                 }
                                               }}
                                               value=""
                                             >
                                               <option value="" disabled>選擇安排</option>
                                               {(() => {
                                                 if (adminSelectedCategory === '男按摩師即可') {
                                                   return maleTherapists.map(t => (
                                                     <option key={t} value={t}>{t}</option>
                                                   ));
                                                 }
                                                 if (adminSelectedCategory === '女按摩師即可') {
                                                   return femaleTherapists.map(t => (
                                                     <option key={t} value={t}>{t}</option>
                                                   ));
                                                 }
                                                 return [...maleTherapists, ...femaleTherapists].map(t => (
                                                   <option key={t} value={t}>{t}</option>
                                                 ));
                                               })()}
                                             </select>
                                           </div>
                                         )}

                                         {adminSubTab === 'venue' && (
                                           <div className="flex items-center gap-2">
                                             <span className="text-stone-500 font-bold text-xs whitespace-nowrap">空間調整：</span>
                                             <select 
                                               className="bg-white border border-stone-200 outline-none rounded-lg p-1.5 text-stone-700 cursor-pointer shadow-sm text-xs font-bold"
                                               onChange={(e) => {
                                                 if (e.target.value) {
                                                   db.updateOrder(o.id, { 
                                                     massageRoom: e.target.value as any
                                                   });
                                                   setOrders(db.getOrders());
                                                 }
                                               }}
                                               value={o.massageRoom || ""}
                                             >
                                               <option value="">未指定</option>
                                               <option value="ZEN1">ZEN1</option>
                                               <option value="ZEN2">ZEN2</option>
                                               <option value="SPA1">SPA1</option>
                                               <option value="SPA2">SPA2</option>
                                             </select>
                                           </div>
                                         )}

                                         {adminSubTab === 'fitness' && (adminSelectedCategory === '不指定教練' || adminSelectedCategory === '男即可教練' || adminSelectedCategory === '女即可教練') && (
                                           <div className="flex items-center gap-2">
                                             <span className="text-stone-500 font-bold text-xs whitespace-nowrap">教練分派：</span>
                                             <select 
                                               className="bg-white border border-stone-200 outline-none rounded-lg p-1 text-stone-700 cursor-pointer shadow-sm text-xs font-bold"
                                               onChange={(e) => {
                                                 if (e.target.value) {
                                                   db.updateOrder(o.id, { 
                                                     therapistPreference: e.target.value as any, 
                                                     isAssignedByShop: true,
                                                     originalTherapistPreference: o.originalTherapistPreference || o.therapistPreference || (adminSelectedCategory as any)
                                                   });
                                                   setOrders(db.getOrders());
                                                 }
                                               }}
                                               value=""
                                             >
                                               <option value="" disabled>選擇教練</option>
                                               {(() => {
                                                 if (adminSelectedCategory === '男即可教練') {
                                                   return maleCoaches.map(t => (
                                                     <option key={t} value={t}>{t}</option>
                                                   ));
                                                 }
                                                 if (adminSelectedCategory === '女即可教練') {
                                                   return femaleCoaches.map(t => (
                                                     <option key={t} value={t}>{t}</option>
                                                   ));
                                                 }
                                                 return maleCoaches.concat(femaleCoaches).map(t => (
                                                   <option key={t} value={t}>{t}</option>
                                                 ));
                                               })()}
                                             </select>
                                           </div>
                                         )}
                                       </div>

                                       {/* Status dropdown */}
                                       <div className="flex items-center gap-2 ml-auto">
                                         <select 
                                           className="text-xs p-1.5 border border-stone-200 rounded-lg outline-none bg-white font-bold text-stone-600 focus:ring-1 focus:ring-sage-400 cursor-pointer shadow-sm"
                                           value={o.status} 
                                           onChange={(e) => {
                                             db.updateOrder(o.id, { status: e.target.value as any });
                                             setOrders(db.getOrders());
                                           }}
                                         >
                                           <option value="pending">待處理</option>
                                           <option value="completed">已完課</option>
                                           <option value="cancelled">已取消</option>
                                         </select>
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'venueStatus' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 md:px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div>
                <h2 className="backend-page-title">
                  {venueStatusRoom}按摩室本月份預約一覽
                </h2>
                <p className="backend-page-subtitle mt-1">查看並管理各空間的每日預約與場租排程</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-5 md:p-6">
              {/* Calendar Section */}
              <div className="lg:col-span-7 space-y-4 border-b lg:border-b-0 lg:border-r border-stone-100 pb-6 lg:pb-0 lg:pr-8">
                {/* Month Selector */}
                {(() => {
                  const year = venueStatusViewMonth.getFullYear();
                  const month = venueStatusViewMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

                  return (
                    <>
                      <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-150">
                        <span className="font-bold text-stone-800 text-base">
                          {year} 年 {month + 1} 月
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(venueStatusViewMonth);
                              d.setMonth(d.getMonth() - 1);
                              setVenueStatusViewMonth(d);
                            }}
                            className="p-1.5 hover:bg-stone-200 rounded-lg transition border border-stone-200 bg-white"
                          >
                            <ChevronLeft className="w-4 h-4 text-stone-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVenueStatusViewMonth(new Date());
                              const today = new Date();
                              setVenueStatusDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
                            }}
                            className="px-2.5 py-1 text-xs hover:bg-stone-200 rounded-lg transition border border-stone-200 bg-white text-stone-600 font-bold"
                          >
                            今天
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(venueStatusViewMonth);
                              d.setMonth(d.getMonth() + 1);
                              setVenueStatusViewMonth(d);
                            }}
                            className="p-1.5 hover:bg-stone-200 rounded-lg transition border border-stone-200 bg-white"
                          >
                            <ChevronRight className="w-4 h-4 text-stone-600" />
                          </button>
                        </div>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {weekdays.map(d => (
                          <div key={d} className="text-center text-xs font-bold text-stone-400 py-1.5 uppercase tracking-wider">{d}</div>
                        ))}
                        {(() => {
                          const cells = [];
                          for (let i = 0; i < firstDay; i++) {
                            cells.push(<div key={`empty-${i}`} className="aspect-square bg-stone-50/20" />);
                          }

                          for (let d = 1; d <= daysInMonth; d++) {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const isSelected = venueStatusDate === dateStr;
                            
                            // Check for bookings in this room on this date
                            const dayBookings = orders.filter(o => 
                              o.status !== 'cancelled' && 
                              o.massageRoom === venueStatusRoom && 
                              o.date === dateStr
                            );
                            const hasBookings = dayBookings.length > 0;

                            cells.push(
                              <button
                                key={dateStr}
                                type="button"
                                onClick={() => setVenueStatusDate(dateStr)}
                                className={`aspect-square p-1.5 rounded-xl flex flex-col items-center justify-between transition-all border relative ${
                                  isSelected 
                                    ? 'bg-stone-800 border-stone-800 text-white shadow-md z-10' 
                                    : hasBookings 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold hover:border-emerald-300' 
                                      : 'bg-white border-stone-100 hover:border-stone-300'
                                }`}
                              >
                                <span className="text-sm font-black md:text-base">{d}</span>
                                {hasBookings && (
                                  <div className={`w-1.5 h-1.5 rounded-full mb-0.5 ${isSelected ? 'bg-white' : 'bg-emerald-600'}`} />
                                )}
                              </button>
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    </>
                  );
                })()}

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-stone-400 font-medium px-1 pt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
                    <span>該空間已有預約</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-white border border-stone-200 rounded-sm"></div>
                    <span>無預約</span>
                  </div>
                </div>
              </div>

              {/* Day details section */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="font-bold text-stone-800 flex items-center gap-2">
                    <span className="text-stone-500">📅</span>
                    {venueStatusDate.replace(/-/g, '/')} (週{getWeekDay(venueStatusDate)}) 已接受之預約
                  </h3>
                </div>

                <div className="flex-1 space-y-3 min-h-[300px] max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {(() => {
                    const dayBookings = orders.filter(o => 
                      o.status !== 'cancelled' && 
                      o.massageRoom === venueStatusRoom && 
                      o.date === venueStatusDate
                    ).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                    if (dayBookings.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-20 text-stone-500 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                          <p className="text-base font-bold md:text-lg">目前沒有預約</p>
                        </div>
                      );
                    }

                    return dayBookings.map(o => {
                      const endTime = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                      const isVenueRent = (o.items || []).some(item => item.courseId === 'venue' || item.id === 'venue-rent') || o.id.startsWith('venue_');
                      
                      if (isVenueRent) {
                        const renter = members.find(m => m.id === o.memberId);
                        return (
                          <div key={o.id} className="p-4 rounded-xl border border-amber-150 bg-amber-50/20 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200/50">
                                {o.time} ~ {endTime}
                              </span>
                              <span className="text-[10px] font-bold text-amber-700 border border-amber-200 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                場地租借
                              </span>
                            </div>
                            <div className="text-xs text-stone-700 flex items-center flex-wrap gap-1">
                              <span className="font-medium">場租預約 (</span>
                              {renter ? (
                                <button
                                  type="button"
                                  onClick={() => openCustomerModal(renter)}
                                  className="text-amber-700 hover:text-amber-950 font-bold underline transition inline"
                                >
                                  {renter.name}
                                </button>
                              ) : (
                                <span className="font-bold text-stone-400">未知帳號</span>
                              )}
                              <span className="font-medium">租用)</span>
                            </div>
                            {o.note && o.note !== '場地預約' && (
                              <p className="text-[11px] text-stone-500 italic bg-white/70 p-1.5 rounded border border-stone-100">
                                {o.note.replace('【場地預約備註】', '')}
                              </p>
                            )}
                          </div>
                        );
                      } else {
                        const therapistName = o.therapistPreference || '不指定';
                        const therapistMember = members.find(m => m.therapistName === therapistName || m.name === therapistName);
                        return (
                          <div key={o.id} className="p-4 rounded-xl border border-emerald-150 bg-emerald-50/20 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200/50">
                                {o.time} ~ {endTime}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                按摩預約
                              </span>
                            </div>
                            <div className="text-xs text-stone-700 flex items-center flex-wrap gap-1">
                              <span className="font-medium">按摩預約 (</span>
                              {therapistMember ? (
                                <button
                                  type="button"
                                  onClick={() => openCustomerModal(therapistMember)}
                                  className="text-emerald-700 hover:text-emerald-950 font-bold underline transition inline"
                                >
                                  {therapistName}
                                </button>
                              ) : (
                                <span className="font-bold text-stone-800">{therapistName}</span>
                              )}
                              <span className="font-medium">服務)</span>
                            </div>
                            <div className="text-[11px] text-stone-500 bg-white/70 p-2 rounded border border-stone-100 space-y-1">
                              <div className="font-bold text-stone-600">項目：{(o.items || []).map(item => item.name).join(', ')}</div>
                              {o.note && <div className="text-stone-400 italic">備註: {o.note}</div>}
                            </div>
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="backend-page-title">預約紀錄</h2>
                <span className="text-[11px] md:text-xs font-bold text-stone-400 whitespace-nowrap">月份查詢與管理</span>
              </div>
              <div className="grid gap-2 w-full">
                <button onClick={() => { setOrderMonth(currentMonthStr); setOrderViewMode('list'); }} className={`min-h-[44px] px-3 md:px-4 text-[13px] md:text-sm rounded-lg border transition text-left font-black ${orderViewMode === 'list' ? 'bg-white border-sage-300 text-stone-900 shadow-sm' : 'bg-white/60 border-stone-200 text-stone-600'}`}>
                  本月份所有預約
                </button>
                <div className={`grid grid-cols-[minmax(0,1fr)_124px] md:grid-cols-[minmax(0,1fr)_148px] items-center min-h-[46px] rounded-lg border transition ${orderViewMode === 'history' ? 'bg-white border-sage-300 shadow-sm' : 'bg-white/60 border-stone-200 text-stone-600'}`}>
                  <button onClick={() => setOrderViewMode('history')} className="h-full min-w-0 px-3 md:px-4 text-left text-[13px] md:text-sm font-black leading-tight">
                    所有預約歷史記錄
                  </button>
                  <input
                    type="month"
                    aria-label="歷史預約月份"
                    value={orderMonth}
                    onFocus={() => setOrderViewMode('history')}
                    onClick={() => setOrderViewMode('history')}
                    onChange={e => { setOrderMonth(e.target.value); setOrderViewMode('history'); }}
                    className="order-month-picker mr-2 w-[116px] md:w-[140px] h-9 px-2 text-[12px] md:text-sm font-bold border border-stone-200 rounded-md outline-none bg-stone-50 text-stone-700"
                  />
                </div>
                <div className={`grid grid-cols-[minmax(0,1fr)_124px] md:grid-cols-[minmax(0,1fr)_148px] items-center min-h-[46px] rounded-lg border transition ${orderViewMode === 'byTherapist' ? 'bg-white border-sage-300 shadow-sm' : 'bg-white/60 border-stone-200 text-stone-600'}`}>
                  <button onClick={() => setOrderViewMode('byTherapist')} className="h-full min-w-0 px-3 md:px-4 text-left text-[13px] md:text-sm font-black leading-tight">
                    店內人員預約及薪資一覽
                  </button>
                  <input
                    type="month"
                    aria-label="薪資一覽月份"
                    value={orderMonth}
                    onFocus={() => setOrderViewMode('byTherapist')}
                    onClick={() => setOrderViewMode('byTherapist')}
                    onChange={e => { setOrderMonth(e.target.value); setOrderViewMode('byTherapist'); }}
                    className="order-month-picker mr-2 w-[116px] md:w-[140px] h-9 px-2 text-[12px] md:text-sm font-bold border border-stone-200 rounded-md outline-none bg-stone-50 text-stone-700"
                  />
                </div>
                {(orderViewMode === 'byTherapist' || orderViewMode === 'history') && orderMonth !== currentMonthStr && (
                  <div className="flex items-center justify-end gap-2 mt-0.5 px-1">
                    <span className={`text-[11px] font-black ${isOrderMonthLocked ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {isOrderMonthLocked ? '歷史月份已上鎖' : '此月份已解鎖'}
                    </span>
                    {isOrderMonthLocked && (
                      <button
                        type="button"
                        onClick={unlockOrderMonth}
                        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-800"
                      >
                        輸入管理員密碼解鎖
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {(orderViewMode === 'list' || orderViewMode === 'history') && (
              <div className="flex flex-col">
                 <div className="bg-stone-50/80 px-4 md:px-6 py-2 border-b border-stone-200 grid grid-cols-[58px_minmax(0,1fr)_50px_14px] md:grid-cols-[78px_minmax(0,1fr)_82px_22px] items-center text-[11px] font-bold text-stone-400 uppercase tracking-widest sticky top-0 z-10">
                   <div className="-translate-x-1 flex justify-center text-[10px]">預約狀態</div>
                   <div className="min-w-0 px-1 md:px-4 font-bold leading-tight flex flex-col">
                    <span className="text-[11px]">預約資訊</span>
                    <span className="text-[11px]">顧客 / 身分 / 電話</span>
                  </div>
                   <div className="translate-x-3 text-center text-[11px] font-bold whitespace-nowrap">服務人員</div>
                   <div></div>
                </div>
                <div className="divide-y divide-stone-100">
                  {orders
                    .filter(o => o.date.startsWith(orderMonth))
                    .sort((a,b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))
                    .map(o => {
                      const m = members.find(x => x.id === o.memberId);
                      const endTimeStr = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                      const isExpanded = expandedOrderIds.has(o.id);
                      const orderItems = o.items || [];
                      const isVenueOrder = o.note === '場地預約' || o.note?.startsWith('【場地預約備註】') || orderItems.some(i => i.name.includes('場地租借'));
                      const venueRoomLabel = getVenueRoomLabel(o);
                      const originalTherapist = o.originalTherapistPreference || o.therapistPreference;
                      const assignedTherapist = o.therapistPreference || '';
                      const therapistDisplay = (() => {
                        if (!assignedTherapist || assignedTherapist === '不指定按摩師') return '不指定';
                        if (originalTherapist === '男按摩師即可' && assignedTherapist !== '男按摩師即可') return `男即可(${assignedTherapist})`;
                        if (originalTherapist === '女按摩師即可' && assignedTherapist !== '女按摩師即可') return `女即可(${assignedTherapist})`;
                        if (assignedTherapist === '男按摩師即可') return '男即可';
                        if (assignedTherapist === '女按摩師即可') return '女即可';
                        return assignedTherapist;
                      })();
                      const massageServiceGroups = [
                        { label: '全身療程', items: sortOrderItems(orderItems.filter(item => COURSES.find(c => c.id === item.courseId)?.category === '全身療程')) },
                        { label: '局部療程', items: sortOrderItems(orderItems.filter(item => COURSES.find(c => c.id === item.courseId)?.category === '局部療程')) },
                        { label: '加購療程', items: sortOrderItems(orderItems.filter(item => COURSES.find(c => c.id === item.courseId)?.category === '加購療程')) }
                      ];

                      const nowMs = new Date().getTime();
                      const orderEndMs = new Date(`${o.date}T${endTimeStr || '23:59'}:00`).getTime();
                      const isPast = orderEndMs < nowMs;
                      const isHistoryEditLocked = orderViewMode === 'history' && isOrderMonthLocked;

                      return (
                         <div key={o.id} className={`transition-all ${o.status === 'completed' ? 'bg-emerald-50/20' : (o.status === 'cancelled' || o.status === 'no_show' || isPast) ? 'bg-stone-50/50 opacity-70' : 'bg-white'} hover:bg-stone-50 group`}>
                           <div className="grid grid-cols-[58px_minmax(0,1fr)_50px_14px] md:grid-cols-[78px_minmax(0,1fr)_82px_22px] items-center px-4 md:px-6 py-4 cursor-pointer" onClick={() => toggleOrderExpand(o.id)}>
                             <div className="-translate-x-1 flex justify-center" onClick={e => e.stopPropagation()}>
                               <select
                                 aria-label="預約狀態"
                                 value={o.status || 'pending'}
                                 disabled={isHistoryEditLocked}
                                 onChange={e => {
                                   db.updateOrder(o.id, { status: e.target.value as Order['status'] });
                                   setOrders(sortOrders(db.getOrders()));
                                 }}
                                 className={`h-8 w-full rounded-md border px-1 text-[10px] md:text-[11px] font-black outline-none transition disabled:cursor-not-allowed disabled:bg-stone-100 ${
                                   o.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                                   o.status === 'cancelled' ? 'border-red-200 bg-red-50 text-red-600' :
                                   o.status === 'no_show' ? 'border-amber-200 bg-amber-50 text-amber-800' :
                                   'border-stone-200 bg-white text-stone-600'
                                 }`}
                               >
                                 <option value="pending">預約中</option>
                                 <option value="completed">已完成</option>
                                 <option value="cancelled">取消</option>
                                 <option value="no_show">未到</option>
                               </select>
                             </div>
                             <div className="min-w-0 overflow-hidden px-1 md:px-4 flex flex-col gap-1">
                               <div className={`flex min-w-0 items-baseline gap-1 overflow-hidden whitespace-nowrap font-black font-sans tracking-tight ${o.status === 'completed' ? 'text-stone-400' : 'text-stone-900'}`}>
                                 <span className="text-[11px] min-[390px]:text-[12px] md:text-sm">{o.date.replace(/-/g, '/')} {o.time}{endTimeStr ? `~${endTimeStr}` : ''}</span>
                                 {o.totalDuration && (
                                   <span className={`text-[11px] md:text-[12px] font-bold ${o.status === 'completed' ? 'text-stone-300' : 'text-stone-500'}`}>({formatDurationLabel(o.totalDuration)})</span>
                                 )}
                              </div>
                              <div className="flex items-center gap-1 min-w-0 whitespace-nowrap">
                                <span className={`text-[13px] md:text-sm font-black whitespace-nowrap shrink-0 ${o.status === 'completed' ? 'text-stone-400' : 'text-stone-900'}`}>
                                  {m?.name || '未知客戶'}
                                </span>
                                {m?.level && (
                                  <span className={`text-[10px] font-bold whitespace-nowrap shrink-0 ${o.status === 'completed' ? 'text-stone-300' : 'text-stone-500'}`}>
                                    {m.level}
                                  </span>
                                )}
                                <span className={`text-[10px] font-medium whitespace-nowrap shrink-0 ${o.status === 'completed' ? 'text-stone-300' : 'text-stone-500'}`}>
                                  {m?.phoneNumber || o.memberId}
                                </span>
                              </div>
                            </div>
                             <div className="translate-x-3 flex flex-col items-center justify-center min-w-0 overflow-hidden">
                              {(() => {
                                const serviceLabel = isVenueOrder ? venueRoomLabel || '未指定' : therapistDisplay;
                                const assignedMatch = serviceLabel.match(/^(男即可|女即可)\((.+)\)$/);
                                return assignedMatch ? (
                                   <span className={`w-full py-1 text-center font-black leading-tight ${o.status === 'completed' ? 'text-stone-400' : 'text-stone-800'}`}>
                                    <span className="block text-[12px] md:text-[13px] whitespace-nowrap">{assignedMatch[1]}</span>
                                    <span className="block mt-0.5 text-[10px] md:text-[11px] whitespace-nowrap">({assignedMatch[2]})</span>
                                  </span>
                                ) : (
                                   <span className={`w-full py-2 text-center text-[12px] md:text-[13px] font-black whitespace-nowrap truncate ${o.status === 'completed' ? 'text-stone-400' : 'text-stone-800'}`}>
                                    {serviceLabel}
                                  </span>
                                );
                              })()}
                            </div>
                             <div className="translate-x-2 flex justify-end">
                              <ChevronRight className={`w-4 h-4 text-stone-300 transition-transform ${isExpanded ? 'rotate-90 text-stone-800' : 'group-hover:text-stone-500'}`} />
                            </div>
                          </div>
                          
                          {isExpanded && (
                             <div className={`grid grid-cols-1 ${isVenueOrder ? 'md:grid-cols-2 gap-3' : 'gap-3'} border-t border-stone-200 bg-white px-3 py-3`}>
                              <div className={isVenueOrder ? 'col-span-1 md:col-span-2 grid grid-cols-2 gap-3' : 'space-y-3'}>
                                {isVenueOrder ? (
                                  <>
                                     <div>
                                       <label className="mb-1.5 block text-[11px] font-black text-stone-500">場地調整</label>
                                      <select 
                                        onClick={e => e.stopPropagation()}
                                        value={o.massageRoom || ''} 
                                        disabled={isHistoryEditLocked}
                                        onChange={(e) => {
                                          db.updateOrder(o.id, { massageRoom: e.target.value });
                                          setOrders(sortOrders(db.getOrders()));
                                        }}
                                        className="w-full p-2 border border-stone-200 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-stone-400 shadow-sm font-bold text-stone-700 disabled:bg-stone-100 disabled:text-stone-400"
                                      >
                                        <option value="">未指定</option>
                                        <option value="ZEN1">ZEN1</option>
                                        <option value="ZEN2">ZEN2</option>
                                        <option value="SPA1">SPA1</option>
                                        <option value="SPA2">SPA2</option>
                                      </select>
                                    </div>
                                    <div>
                                       <label className="mb-1.5 block text-[11px] font-black text-stone-500">時長 / 金額</label>
                                      <div className="text-xs text-stone-900 font-bold py-2">{o.totalDuration}分鐘/{o.finalPrice}元</div>
                                    </div>
                                    <div>
                                       <label className="mb-1.5 block text-[11px] font-black text-stone-500">付款方式</label>
                                      <select
                                        onClick={e => e.stopPropagation()}
                                        value={o.paymentMethod || ''}
                                        disabled={isHistoryEditLocked}
                                        onChange={(e) => {
                                          db.updateOrder(o.id, { paymentMethod: e.target.value });
                                          setOrders(db.getOrders());
                                        }}
                                        className="w-full p-2 border border-stone-200 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-stone-400 shadow-sm disabled:bg-stone-100 disabled:text-stone-400"
                                      >
                                        <option value="">請選擇</option>
                                        <option value="現金">現金</option>
                                        <option value="線上刷卡">線上刷卡</option>
                                        <option value="LINE PAY">LINE PAY</option>
                                        <option value="街口支付">街口支付</option>
                                        <option value="全支付">全支付</option>
                                      </select>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                         <label className="mb-1.5 block text-[11px] font-black text-stone-500">服務按摩師</label>
                                        <span className="h-9 w-full inline-flex items-center text-xs font-bold text-stone-700 bg-white px-2.5 rounded-lg border border-stone-200 shadow-sm">
                                          {therapistDisplay}
                                        </span>
                                      </div>
                                      <div>
                                         <label className="mb-1.5 block text-[11px] font-black text-stone-500">按摩場地</label>
                                        <select 
                                          onClick={e => e.stopPropagation()}
                                          value={o.massageRoom || ''} 
                                          disabled={isHistoryEditLocked}
                                          onChange={(e) => {
                                            db.updateOrder(o.id, { massageRoom: e.target.value });
                                            setOrders(sortOrders(db.getOrders()));
                                          }}
                                          className="h-9 w-full px-2 border border-stone-200 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-stone-400 shadow-sm font-bold text-stone-700 disabled:bg-stone-100 disabled:text-stone-400"
                                        >
                                          <option value="">未指定</option>
                                          <option value="ZEN1">ZEN1</option>
                                          <option value="ZEN2">ZEN2</option>
                                          <option value="SPA1">SPA1</option>
                                          <option value="SPA2">SPA2</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                         <label className="mb-1.5 block text-[11px] font-black text-stone-500">時長 / 金額</label>
                                        <div className="h-9 flex items-center gap-1.5 text-xs text-stone-700 font-bold bg-white border border-stone-200 rounded-lg px-2.5 shadow-sm">
                                          <span className="text-stone-900">{o.totalDuration}分鐘/{o.finalPrice}元</span>
                                        </div>
                                      </div>
                                      <div>
                                         <label className="mb-1.5 block text-[11px] font-black text-stone-500">付款方式</label>
                                        <select 
                                          onClick={e => e.stopPropagation()}
                                          value={o.paymentMethod || ''} 
                                          disabled={isHistoryEditLocked}
                                          onChange={(e) => {
                                            db.updateOrder(o.id, { paymentMethod: e.target.value });
                                            setOrders(db.getOrders());
                                          }}
                                          className="h-9 w-full px-2 border border-stone-200 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-stone-400 shadow-sm font-bold text-stone-700 disabled:bg-stone-100 disabled:text-stone-400"
                                        >
                                          <option value="">請選擇</option>
                                          <option value="現金">現金</option>
                                          <option value="線上刷卡">線上刷卡</option>
                                          <option value="LINE PAY">LINE PAY</option>
                                          <option value="街口支付">街口支付</option>
                                          <option value="全支付">全支付</option>
                                        </select>
                                      </div>
                                     </div>
                                     <div>
                                       <label className="mb-1.5 block text-[11px] font-black text-stone-500">付款狀態</label>
                                       <div className="grid grid-cols-[116px_minmax(0,1fr)] sm:grid-cols-[136px_minmax(0,1fr)] gap-2">
                                         <select
                                           onClick={e => e.stopPropagation()}
                                           value={o.paymentStatus || 'other'}
                                           disabled={isHistoryEditLocked}
                                           onChange={e => {
                                             db.updateOrder(o.id, { paymentStatus: e.target.value as Order['paymentStatus'] });
                                             setOrders(sortOrders(db.getOrders()));
                                           }}
                                           className="h-9 min-w-0 rounded-lg border border-stone-200 bg-white px-2 text-[11px] font-bold text-stone-700 shadow-sm outline-none focus:ring-1 focus:ring-stone-400 disabled:bg-stone-100 disabled:text-stone-400"
                                         >
                                           <option value="paid_rescheduled">已付款(已改期)</option>
                                           <option value="refunded">已退款</option>
                                           <option value="refund_pending">待退款</option>
                                           <option value="other">其他</option>
                                         </select>
                                         <input
                                           type="text"
                                           aria-label="付款狀態紀錄"
                                           defaultValue={o.paymentStatusNote || ''}
                                           disabled={isHistoryEditLocked}
                                           placeholder="簡短紀錄"
                                           onClick={e => e.stopPropagation()}
                                           onBlur={e => {
                                             if (e.target.value !== (o.paymentStatusNote || '')) {
                                               db.updateOrder(o.id, { paymentStatusNote: e.target.value });
                                               setOrders(sortOrders(db.getOrders()));
                                             }
                                           }}
                                           className="h-9 min-w-0 rounded-lg border border-stone-200 bg-white px-2 text-[11px] font-bold text-stone-700 shadow-sm outline-none focus:ring-1 focus:ring-stone-400 disabled:bg-stone-100 disabled:text-stone-400"
                                         />
                                       </div>
                                     </div>
                                     <div>
                                       <label className="mb-1.5 block text-[11px] font-black text-stone-500">本次消費金額計算方式：</label>
                                      {o.discountAmount > 0 ? (
                                        <div className="bg-emerald-100/50 p-2 rounded-lg border border-emerald-200">
                                          <p className="text-[10px] text-emerald-700 leading-tight whitespace-pre-line font-medium">{o.discountFormula}</p>
                                     </div>
                                      ) : (
                                        <div className="text-[10px] text-stone-400 italic bg-white border border-stone-100 rounded-lg px-2.5 py-2">
                                          無折扣明細
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                       <label className="mb-1.5 block text-[11px] font-black text-stone-500">服務內容</label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {massageServiceGroups.map(group => (
                                          <div key={group.label} className="rounded-lg border border-stone-200 bg-white p-2 min-w-0">
                                            <div className="text-[10px] font-black text-stone-500 mb-1.5 text-center">{group.label}</div>
                                            <div className="space-y-1">
                                              {group.items.length === 0 ? (
                                                <div className="text-[10px] text-stone-300 text-center py-1">無</div>
                                              ) : group.items.map((item, i) => (
                                                <div key={`${group.label}-${i}`} className="rounded-md bg-stone-50 border border-stone-100 px-1.5 py-1.5 text-[10px] leading-snug font-bold text-stone-700 break-words">
                                                  {item.name}
                                                  {item.duration ? <span className="block text-stone-400">{item.duration}分</span> : null}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <div className={isVenueOrder ? 'space-y-4' : 'hidden'}>
                                <div className={isVenueOrder ? 'hidden' : ''}>
                                   <label className="mb-1.5 block text-[11px] font-black text-stone-500">服務內容</label>
                                  <div className="space-y-1">
                                    {sortOrderItems(o.items || []).map((item, i) => (
                                      <div key={i} className="flex items-center text-xs text-stone-600 bg-white px-2 py-1.5 rounded border border-stone-100 shadow-sm">
                                        <Plus className="w-2.5 h-2.5 mr-2 text-stone-300" />
                                        {item.name} ({item.duration}分)
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className={isVenueOrder ? 'hidden' : ''}>
                                   <label className="mb-1.5 block text-[11px] font-black text-stone-500">付款方式</label>
                                  <select 
                                    onClick={e => e.stopPropagation()}
                                    value={o.paymentMethod || ''} 
                                    disabled={isHistoryEditLocked}
                                    onChange={(e) => {
                                      db.updateOrder(o.id, { paymentMethod: e.target.value });
                                      setOrders(db.getOrders());
                                    }}
                                    className="w-full p-2 border border-stone-200 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-stone-400 shadow-sm disabled:bg-stone-100 disabled:text-stone-400"
                                  >
                                    <option value="">請選擇</option>
                                    <option value="現金">現金</option>
                                    <option value="線上刷卡">線上刷卡</option>
                                    <option value="LINE PAY">LINE PAY</option>
                                    <option value="街口支付">街口支付</option>
                                    <option value="全支付">全支付</option>
                                  </select>
                                </div>
                              </div>

                              <div className={isVenueOrder ? 'space-y-3' : 'space-y-4'}>
                                <div>
                                   <label className="mb-1.5 block text-[11px] font-black text-stone-500">{isVenueOrder ? '場地使用紀錄' : '服務備註'}</label>
                                  <textarea
                                    onClick={e => e.stopPropagation()}
                                    disabled={isHistoryEditLocked}
                                    className={`w-full text-xs p-3 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white shadow-sm disabled:bg-stone-100 disabled:text-stone-400 ${isVenueOrder ? 'h-20' : 'h-24'}`}
                                    placeholder="備註資訊..."
                                    defaultValue={o.note || ''}
                                    onBlur={(e) => {
                                      if (e.target.value !== o.note) {
                                        db.updateOrder(o.id, { note: e.target.value });
                                        setOrders(sortOrders(db.getOrders()));
                                      }
                                    }}
                                  />
                                </div>
                               </div>
                               <div className={isVenueOrder ? 'md:col-span-2' : ''}>
                                 <button
                                   type="button"
                                   disabled={isHistoryEditLocked}
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (isHistoryEditLocked) return;
                                     handleDeleteOrder(o.id);
                                   }}
                                   className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-stone-100 disabled:bg-stone-50 disabled:text-stone-300"
                                 >
                                   <Trash2 className="h-3.5 w-3.5" />
                                   刪除此筆預約
                                 </button>
                               </div>
                             </div>
                          )}
                        </div>
                      )
                    })}
                  {orders.filter(o => o.date.startsWith(orderMonth)).length === 0 && (
                    <div className="px-6 py-12 text-center text-stone-400 font-medium bg-stone-50/30">目前月份無訂單紀錄</div>
                  )}
                </div>
              </div>
            )}
            
            {orderViewMode === 'byTherapist' && (
              <div>
                <table className="w-full table-fixed text-left text-[9.5px] md:text-xs">
                  <thead className="bg-stone-50/50 text-stone-600 border-b border-stone-100">
                    <tr>
                      <th className="pl-5 md:pl-6 pr-1 py-2 font-black w-[21%] leading-tight">
                        <span className="block whitespace-nowrap">按摩師/教練</span>
                        <span className="block mt-0.5 whitespace-nowrap">本月份薪資</span>
                      </th>
                      <th className="pl-1 pr-0 py-2 font-black text-right w-[11%] leading-tight">預約<br />時數</th>
                      <th className="px-0.5 py-2 font-black text-right w-[16%] leading-tight">基本<br />薪資</th>
                      <th className="px-0.5 py-2 font-black text-right w-[15%] leading-tight">完課<br />獎金</th>
                      <th className="pl-0 pr-1 py-2 font-black text-right w-[13%] leading-tight">介紹<br />獎金</th>
                      <th className="pl-1 pr-4 md:pr-6 py-2 font-black text-right w-[24%] leading-tight">締結<br />獎金</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {linkedStaffNames.map(therapist => {
                    const linkedStaffMember = members.find(m => m.therapistName === therapist);
                    const fallbackRealNames: Record<string, string> = { '阿翰': '鍾政翰', 'Alice': '黃齡慧' };
                    const staffRealName = linkedStaffMember?.name || fallbackRealNames[therapist] || '';
                    const therapistOrdersRaw = orders.filter(o => 
                      o.date.startsWith(orderMonth) && 
                      o.status !== 'cancelled' &&
                      (therapist === '不指定按摩師' 
                        ? ((!o.therapistPreference || o.therapistPreference === '不指定按摩師') && o.therapistPreference !== '男按摩師即可' && o.therapistPreference !== '女按摩師即可')
                        : o.therapistPreference === therapist)
                    ).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
                    
                    const therapistOrders = therapistOrdersRaw.map(o => {
                      const itemsFiltered = (o.items || []).filter(item => item.courseId !== 'venue');
                      const durationFiltered = itemsFiltered.reduce((sum, item) => sum + (item.duration || 0), 0);
                      return {
                        ...o,
                        items: itemsFiltered,
                        totalDuration: durationFiltered
                      };
                    }).filter(o => (o.items || []).length > 0);
                    
                    const totalCount = therapistOrders.length;
                    const totalMins = therapistOrders.reduce((sum, o) => sum + o.totalDuration, 0);
                    const totalHours = totalMins / 60;
                    const totalHoursDisplay = totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1);
                    
                    let massageMins = 0;
                    let inbodyMins = 0;
                    therapistOrders.forEach(o => {
                      (o.items || []).forEach(item => {
                        if (item.name.includes('InBody')) {
                          inbodyMins += item.duration || 0;
                        } else {
                          massageMins += item.duration || 0;
                        }
                      });
                    });
                    const massageHours = massageMins / 60;
                    const inbodyHours = inbodyMins / 60;
                    const baseSalary = (massageHours * 600) + (inbodyHours * 200);

                    let hoursBonus = 0;
                    if (totalHours >= 96) hoursBonus = 10500;
                    else if (totalHours >= 48) hoursBonus = 4500;
                    else if (totalHours >= 24) hoursBonus = 1500;

                    const goldMembers = members.filter(m => m.level === '金卡' && m.referredBy === therapist && m.referredMonth === orderMonth);
                    const blackMembers = members.filter(m => m.level === '黑卡' && m.referredBy === therapist && m.referredMonth === orderMonth);
                    
                    const goldBonus = goldMembers.length * 1200;
                    const blackBonus = blackMembers.length * 3000;
                    const closingBonusTotal = goldBonus + blackBonus;
                    const introducedMembers = members.filter(m => m.referredBy === therapist && m.referredMonth === orderMonth);
                    const introductionBonus = introducedMembers.length * 500;

                    const totalSalary = baseSalary + hoursBonus + introductionBonus + closingBonusTotal;

                    return (
                      <React.Fragment key={therapist}>
                        <tr className="hover:bg-stone-50/50 transition">
                          <td className="pl-5 md:pl-6 pr-1 py-3 leading-tight break-words">
                            <div className="text-[9px] md:text-sm font-black text-stone-800 whitespace-nowrap">
                              {therapist}{staffRealName && staffRealName !== therapist ? `(${staffRealName})` : ''}
                            </div>
                            <div className="mt-1 text-[10px] md:text-xs font-black text-emerald-700 whitespace-nowrap">{totalSalary.toLocaleString()}元</div>
                          </td>
                          <td className="pl-1 pr-0 py-3 text-right leading-tight">
                            {therapistOrders.length > 0 ? (
                              <details className="group cursor-pointer relative inline-block">
                                <summary className="hover:text-stone-800 select-none outline-none inline-flex items-center justify-end text-emerald-600 font-bold">
                                  <span>{totalCount}筆</span>
                                  <ChevronRight className="w-2.5 h-2.5 ml-0.5 transition-transform group-open:rotate-90" />
                                </summary>
                                <div className="absolute z-50 right-0 md:left-0 md:right-auto mt-2 w-72 bg-white border border-stone-200 rounded-lg shadow-2xl p-3 text-left max-h-80 overflow-y-auto hidden group-open:block">
                                  {therapistOrders.map(o => {
                                    const m = members.find(x => x.id === o.memberId);
                                    const endTime = minsToTime(timeToMins(o.time) + o.totalDuration);
                                    const durationHours = o.totalDuration / 60;
                                    const dateObj = new Date(o.date);
                                    const dayNames = ['(日)', '(一)', '(二)', '(三)', '(四)', '(五)', '(六)'];
                                    const formattedDate = `${o.date.replace(/-/g, '/')}${dayNames[dateObj.getDay()]}`;
                                    
                                    return (
                                      <div key={o.id} className="text-xs text-stone-600 border-b border-stone-100 last:border-0 py-2 hover:bg-stone-50 rounded px-1">
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="font-medium text-stone-500">
                                            {formattedDate} {o.time}~{endTime} ({durationHours}小時)
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                           <button 
                                             onClick={() => openCustomerModal(m)}
                                             className="font-bold text-stone-800 hover:text-stone-600 underline decoration-stone-300 underline-offset-2"
                                           >
                                             {m?.name || '未知客戶'}
                                           </button>
                                         </div>
                                       </div>
                                     );
                                   })}
                                 </div>
                               </details>
                             ) : (
                               <span className="text-stone-500">{totalCount}筆</span>
                             )}
                             <div className="text-[9px] md:text-[10px] text-stone-400 font-medium">{totalHoursDisplay}小時</div>
                           </td>
                           <td className="px-0.5 py-3 text-right whitespace-nowrap font-medium">{baseSalary}元</td>
                           <td className="px-0.5 py-3 text-right whitespace-nowrap font-medium">{hoursBonus}元</td>
                           <td className="pl-0 pr-1 py-3 text-right leading-tight whitespace-nowrap">
                             <div className="font-bold">{introducedMembers.length}位</div>
                             <div className="mt-0.5 text-stone-500">{introductionBonus}元</div>
                           </td>
                           <td className="pl-1 pr-4 md:pr-6 py-3 text-right leading-tight text-[9px] md:text-xs">
                             <button disabled={isOrderMonthLocked} onClick={() => setBonusModal({ therapist, kind: 'gold', month: orderMonth })} className={`block ml-auto border-b border-dashed pb-0.5 whitespace-nowrap ${isOrderMonthLocked ? 'text-stone-300 border-stone-200 cursor-not-allowed' : 'hover:text-emerald-600 border-stone-300 hover:border-emerald-300'}`}>
                               金{goldMembers.length}張{goldBonus}元
                             </button>
                             <button disabled={isOrderMonthLocked} onClick={() => setBonusModal({ therapist, kind: 'black', month: orderMonth })} className={`block ml-auto border-b border-dashed pb-0.5 whitespace-nowrap ${isOrderMonthLocked ? 'text-stone-300 border-stone-200 cursor-not-allowed' : 'hover:text-emerald-600 border-stone-300 hover:border-emerald-300'}`}>
                               黑{blackMembers.length}張{blackBonus}元
                             </button>
                           </td>
                         </tr>
                       </React.Fragment>
                     );
                   })}
                   </tbody>
                 </table>
               </div>
             )}
           </div>
         )}
 
        {tab === 'promotions' && isAdmin && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
              <section className="h-fit rounded-2xl border border-sage-100 bg-white p-4 shadow-sm md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-black text-stone-900">{editingPromotionId ? '編輯優惠活動' : '新增優惠活動'}</h3>
                  {editingPromotionId && <button type="button" onClick={resetPromotionForm} className="text-sm font-black text-stone-500 hover:text-stone-800">取消編輯</button>}
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <label className="min-w-0 space-y-1.5 text-sm font-black text-stone-700">優惠代碼
                      <input value={promotionForm.code} onChange={e => setPromotionForm({...promotionForm, code: e.target.value.toUpperCase().replace(/\s/g, '')})} placeholder="例如 ZEN300" className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 font-black uppercase tracking-wide outline-none focus:border-sage-500" />
                    </label>
                    <label className="min-w-0 space-y-1.5 text-sm font-black text-stone-700">
                      <span className="flex items-center justify-between gap-1"><span>可用次數</span><span className="whitespace-nowrap text-[10px] font-bold text-stone-400 md:text-xs">0代表無限次</span></span>
                      <input type="number" min="0" value={promotionForm.memberUsageLimit} onChange={e => setPromotionForm({...promotionForm, memberUsageLimit: e.target.value})} className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 font-bold outline-none focus:border-sage-500" />
                    </label>
                  </div>
                  <label className="block space-y-1.5 text-sm font-black text-stone-700">活動名稱
                    <input value={promotionForm.name} onChange={e => setPromotionForm({...promotionForm, name: e.target.value})} placeholder="例如 十週年感謝優惠" className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 font-bold outline-none focus:border-sage-500" />
                  </label>
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <label className="min-w-0 space-y-1.5 text-sm font-black text-stone-700">折扣方式
                      <select value={promotionForm.discountType} onChange={e => setPromotionForm({...promotionForm, discountType: e.target.value as 'fixed' | 'percentage'})} className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 font-bold outline-none focus:border-sage-500">
                        <option value="fixed">固定金額折抵</option><option value="percentage">百分比折扣</option>
                      </select>
                    </label>
                    <label className="min-w-0 space-y-1.5 text-sm font-black text-stone-700">適用預約
                      <select value={promotionForm.appliesTo} onChange={e => setPromotionForm({...promotionForm, appliesTo: e.target.value as 'all' | 'massage' | 'fitness'})} className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 font-bold outline-none focus:border-sage-500">
                        <option value="all">按摩健身皆可</option><option value="massage">僅限按摩預約</option><option value="fitness">僅限健身預約</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <label className="min-w-0 space-y-1.5 text-sm font-black text-stone-700">{promotionForm.discountType === 'fixed' ? '折抵金額（元）' : '折扣比例（%）'}
                      <input type="number" min="0" max={promotionForm.discountType === 'percentage' ? 100 : undefined} value={promotionForm.discountValue} onChange={e => setPromotionForm({...promotionForm, discountValue: e.target.value})} placeholder={promotionForm.discountType === 'fixed' ? '300' : '10'} className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 font-bold outline-none focus:border-sage-500" />
                    </label>
                    <label className="min-w-0 space-y-1.5 text-sm font-black text-stone-700">最低消費金額
                      <input type="number" min="0" value={promotionForm.minimumSpend} onChange={e => setPromotionForm({...promotionForm, minimumSpend: e.target.value})} className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 font-bold outline-none focus:border-sage-500" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <label className="min-w-0 space-y-1.5 text-sm font-black text-stone-700">開始日期
                      <input type="date" value={promotionForm.startDate} onChange={e => setPromotionForm({...promotionForm, startDate: e.target.value})} className="h-10 w-[88%] min-w-0 max-w-[132px] rounded-lg border border-stone-200 bg-stone-50 px-1.5 text-[10px] font-bold outline-none focus:border-sage-500 sm:text-[11px] md:max-w-[145px] md:px-2 md:text-xs" />
                    </label>
                    <label className="min-w-0 space-y-1.5 text-sm font-black text-stone-700">結束日期
                      <input type="date" value={promotionForm.endDate} onChange={e => setPromotionForm({...promotionForm, endDate: e.target.value})} className="h-10 w-[88%] min-w-0 max-w-[132px] rounded-lg border border-stone-200 bg-stone-50 px-1.5 text-[10px] font-bold outline-none focus:border-sage-500 sm:text-[11px] md:max-w-[145px] md:px-2 md:text-xs" />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <label className="flex h-11 items-center gap-2 rounded-xl border border-sage-100 bg-sage-50 px-4 text-sm font-black text-sage-900">
                      <input type="checkbox" checked={promotionForm.enabled} onChange={e => setPromotionForm({...promotionForm, enabled: e.target.checked})} className="h-4 w-4 accent-sage-700" />啟用活動
                    </label>
                  </div>
                  <button type="button" onClick={savePromotion} className="h-12 w-full rounded-xl bg-sage-800 text-base font-black text-white shadow-sm transition hover:bg-sage-700">{editingPromotionId ? '儲存活動變更' : '建立優惠活動'}</button>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-end justify-between gap-3 px-1">
                  <div><h3 className="text-xl font-black text-stone-900">活動一覽</h3><p className="mt-1 text-sm font-bold text-stone-400">共 {promotions.length} 個活動</p></div>
                </div>
                {promotions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-sage-200 bg-white/60 py-16 text-center text-sm font-bold text-stone-400">尚未建立優惠活動</div>
                ) : promotions.map(promotion => {
                  const today = new Date().toISOString().slice(0, 10);
                  const expired = promotion.endDate < today;
                  const upcoming = promotion.startDate > today;
                  const statusLabel = !promotion.enabled ? '已停用' : expired ? '已結束' : upcoming ? '尚未開始' : '進行中';
                  const statusClass = promotion.enabled && !expired && !upcoming ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-stone-100 text-stone-500 border-stone-200';
                  return (
                    <article key={promotion.id} className="rounded-2xl border border-sage-100 bg-white p-4 shadow-sm md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-sage-800 px-2.5 py-1 font-black tracking-wide text-white">{promotion.code}</span><span className={`rounded-md border px-2 py-1 text-xs font-black ${statusClass}`}>{statusLabel}</span></div>
                          <h4 className="mt-3 text-lg font-black text-stone-900">{promotion.name}</h4>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button type="button" onClick={() => editPromotion(promotion)} className="rounded-lg border border-sage-100 bg-sage-50 px-3 py-2 text-sm font-black text-sage-800">編輯</button>
                          <button type="button" onClick={() => { if (window.confirm(`確定刪除「${promotion.name}」嗎？`)) { db.deletePromotion(promotion.id); setPromotions(db.getPromotions()); if (editingPromotionId === promotion.id) resetPromotionForm(); } }} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700">刪除</button>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stone-100 pt-4 text-sm md:grid-cols-3">
                        <div><p className="font-bold text-stone-400">優惠內容</p><p className="mt-0.5 font-black text-stone-800">{promotion.discountType === 'fixed' ? `折抵 NT$ ${promotion.discountValue.toLocaleString()}` : `${promotion.discountValue}% 折扣`}</p></div>
                        <div><p className="font-bold text-stone-400">適用服務</p><p className="mt-0.5 font-black text-stone-800">{{all:'按摩與健身',massage:'按摩預約',fitness:'健身預約'}[promotion.appliesTo]}</p></div>
                        <div><p className="font-bold text-stone-400">活動期間</p><p className="mt-0.5 font-black text-stone-800">{promotion.startDate.replace(/-/g, '/')}～{promotion.endDate.replace(/-/g, '/')}</p></div>
                        <div><p className="font-bold text-stone-400">最低消費</p><p className="mt-0.5 font-black text-stone-800">{promotion.minimumSpend ? `NT$ ${promotion.minimumSpend.toLocaleString()}` : '無限制'}</p></div>
                        <div><p className="font-bold text-stone-400">會員使用上限</p><p className="mt-0.5 font-black text-stone-800">{promotion.memberUsageLimit ? `${promotion.memberUsageLimit} 次` : '無限制'}</p></div>
                      </div>
                    </article>
                  );
                })}
              </section>
            </div>
          </div>
         )}

         {tab === 'members' && (
           <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-visible">
             <div className="px-5 md:px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
               <h2 className="backend-page-title">會員列表</h2>
               <span className="text-[11px] md:text-xs font-bold text-stone-400 whitespace-nowrap">依姓氏筆畫排序</span>
             </div>
             <div>
               <table className="member-list-table w-full text-left text-sm table-fixed">
                 <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100 whitespace-nowrap">
                   <tr>
                     <th className="member-name-cell pl-3 md:pl-6 pr-1 py-3 font-medium text-left w-[31%] md:w-[34%]">姓名</th>
                     <th className="px-1.5 py-3 font-medium w-[28%] md:w-[22%] text-left">LINE ID</th>
                     <th className="px-1 py-3 font-medium w-[33%] md:w-[36%] text-center text-stone-400">會員身分</th>
                     <th className="pr-4 md:pr-6 py-3 font-medium text-right w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sortMembers(members).map(m => {
                    const memberOrders = orders.filter(o => o.memberId === m.id);
                    const totalSpent = memberOrders.reduce((sum, o) => sum + o.finalPrice, 0);
                    const isExpanded = expandedMemberId === m.id;
                    const identityLabels = getMemberIdentityLabels(m);
                    const primaryIdentity = identityLabels[0] || m.level;
                    const hasMultipleIdentities = identityLabels.length > 1;
                    const isGoldIdentity = m.level === '金卡' || m.memberLevel === '金卡' || identityLabels.includes('金卡會員');
                    const isBlackIdentity = m.level === '黑卡' || m.memberLevel === '黑卡' || identityLabels.includes('黑卡會員');
                    const cumulativeReferralReward = members.filter(candidate =>
                      candidate.referrerId === m.id && (candidate.referrerType === 'gold' || candidate.referrerType === 'black')
                    ).length * 300;

                    const saveReferralDetails = (updates: Partial<Member>) => {
                      const nextMember = { ...m, ...updates } as Member;
                      Object.keys(nextMember).forEach(key => {
                        if (nextMember[key as keyof Member] === undefined) delete nextMember[key as keyof Member];
                      });
                      db.saveMember(nextMember);
                      setMembers(prev => sortMembers(prev.map(item => item.id === m.id ? nextMember : item)));
                    };

                    const handleIdentityToggle = (optionId: string) => {
                      const rentStaffIds = ['therapist_rent', 'coach_rent'];
                      const inHouseStaffIds = ['therapist_in', 'coach_in'];
                      const staffIds = [...rentStaffIds, ...inHouseStaffIds];
                      const memberIds = ['member_normal', 'gold', 'black'];
                      const isStaffOption = staffIds.includes(optionId);
                      const isMemberOption = memberIds.includes(optionId);
                      const isRentStaffOption = rentStaffIds.includes(optionId);
                      const isInHouseStaffOption = inHouseStaffIds.includes(optionId);
                      const isAdminOption = optionId === 'admin';

                      let nextSelected = [...editSelectedIdentities];
                      const wasSelected = nextSelected.includes(optionId);

                      if (wasSelected) {
                        nextSelected = nextSelected.filter(id => id !== optionId);
                      } else {
                        if (isStaffOption) {
                          nextSelected = nextSelected.filter(id => !memberIds.includes(id));
                          if (isRentStaffOption) {
                            nextSelected = nextSelected.filter(id => !inHouseStaffIds.includes(id) && id !== 'admin');
                          }
                          if (isInHouseStaffOption) {
                            nextSelected = nextSelected.filter(id => !rentStaffIds.includes(id));
                          }
                        }

                        if (isMemberOption) {
                          nextSelected = nextSelected.filter(id => !staffIds.includes(id) && !memberIds.includes(id) && id !== 'admin');
                        }

                        if (isAdminOption) {
                          nextSelected = nextSelected.filter(id => !rentStaffIds.includes(id) && !memberIds.includes(id));
                        }

                        nextSelected.push(optionId);
                      }

                      // We must ensure there is at least ONE option selected (if empty, select member_normal)
                      if (nextSelected.length === 0) {
                        nextSelected = ['member_normal'];
                      }

                      setEditSelectedIdentities(nextSelected);

                      // 1. Roles: ('member' | 'therapist' | 'admin')[]
                      let nextRoles: ('member' | 'therapist' | 'admin')[] = [];
                      if (nextSelected.includes('admin')) {
                        nextRoles.push('admin');
                      }
                      if (nextSelected.includes('therapist_in') || nextSelected.includes('coach_in') || nextSelected.includes('therapist_rent') || nextSelected.includes('coach_rent')) {
                        nextRoles.push('therapist');
                      }
                      if (nextSelected.includes('member_normal') || nextSelected.includes('gold') || nextSelected.includes('black')) {
                        nextRoles.push('member');
                      }
                      if (nextRoles.length === 0) {
                        nextRoles = ['member'];
                      }

                      // 2. Role (primary role)
                      let primaryRole: 'member' | 'therapist' | 'admin' = 'member';
                      if (nextRoles.includes('admin')) primaryRole = 'admin';
                      else if (nextRoles.includes('therapist')) primaryRole = 'therapist';

                      // 3. Level (primary level for backwards compatibility)
                      let nextLevel: MemberLevel = '一般';
                      if (nextSelected.includes('therapist_in')) nextLevel = '店內按摩師';
                      else if (nextSelected.includes('coach_in')) nextLevel = '店內教練';
                      else if (nextSelected.includes('therapist_rent')) nextLevel = '場租按摩師';
                      else if (nextSelected.includes('coach_rent')) nextLevel = '場租教練';
                      else if (nextSelected.includes('black')) nextLevel = '黑卡';
                      else if (nextSelected.includes('gold')) nextLevel = '金卡';
                      else nextLevel = '一般';

                      // 4. MemberLevel (membership level)
                      let nextMemberLevel: '一般' | '金卡' | '黑卡' = '一般';
                      if (nextSelected.includes('black')) nextMemberLevel = '黑卡';
                      else if (nextSelected.includes('gold')) nextMemberLevel = '金卡';

                      setEditRoles(nextRoles);
                      setEditRole(primaryRole);
                      setEditLevel(nextLevel);
                      setEditMemberLevel(nextMemberLevel);

                      const isTherapistStaff = nextSelected.includes('therapist_in') || nextSelected.includes('coach_in');
                      const nextTherapistName = isTherapistStaff ? editTherapistName : '';
                      const nextPassword = isTherapistStaff ? editPassword : '';

                      if (!isTherapistStaff) {
                        setEditTherapistName('');
                        setEditPassword('');
                      }

                      handleInfoSave(m.id, {
                        roles: nextRoles,
                        role: primaryRole,
                        level: nextLevel,
                        memberLevel: nextMemberLevel,
                        selectedIdentities: nextSelected,
                        therapistName: nextTherapistName,
                        password: nextPassword
                      });
                    };

                    return (
                    <React.Fragment key={m.id}>
                      <tr id={`member-row-${m.id}`} className={`hover:bg-stone-50/50 transition cursor-pointer ${isExpanded ? 'bg-stone-50' : ''}`} onClick={() => handleExpand(m)}>
                        <td className="member-name-cell pl-3 md:pl-6 pr-1 py-4 text-left min-w-0">
                          <div className="flex flex-col gap-1">
                            <div className="member-name-text flex items-baseline gap-1 leading-tight whitespace-nowrap">
                              <span className="font-bold text-stone-800 text-[15px]">{m.name}</span>
                              {m.therapistName && m.therapistName !== m.name && (
                                <span className="text-[10px] min-[390px]:text-[11px] font-medium text-stone-400">（{m.therapistName}）</span>
                              )}
                            </div>
                            <div className="md:hidden text-stone-500 text-[11px] leading-none">
                              {m.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-1.5 py-4 text-stone-600 text-[12px] min-[390px]:text-[13px] md:text-[13px] leading-snug text-left min-w-0 whitespace-normal break-all">
                          {m.lineId || <span className="text-stone-300">未填</span>}
                        </td>
                        <td className="px-1 py-4 text-center min-w-0">
                          {hasMultipleIdentities ? (
                            <details className="member-identity-details relative block w-full text-left group" onClick={(e) => e.stopPropagation()}>
                              <summary className={`member-identity-pill grid grid-cols-[minmax(0,1fr)_14px] w-full min-h-[36px] md:w-[172px] list-none items-center gap-1 px-2 py-1.5 rounded-md text-[12px] min-[390px]:text-[13px] md:text-sm leading-tight font-bold shadow-sm border cursor-pointer select-none transition ${
                            isGoldIdentity ? 'bg-amber-500 text-white border-amber-500' : 
                            isBlackIdentity ? 'bg-stone-800 text-stone-100 border-stone-800' : 
                            'bg-stone-50 text-stone-600 border-stone-200'
                          }`}>
                                <span className="min-w-0 truncate text-center">{primaryIdentity}</span>
                                <ChevronDown className="w-3.5 h-3.5 justify-self-center opacity-60 group-open:rotate-180 transition-transform" />
                              </summary>
                              <div className="absolute right-0 bottom-[calc(100%+8px)] md:bottom-auto md:top-full z-[80] w-[156px] md:mt-2 rounded-xl border border-stone-200 bg-white/95 p-1.5 shadow-xl shadow-stone-900/10 backdrop-blur">
                                {identityLabels.map(label => (
                                  <div key={label} className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-stone-600">
                                    {label}
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : (
                            <div className={`member-identity-pill flex w-full min-h-[36px] md:w-[172px] items-center justify-center px-2 py-1.5 rounded-md text-[12px] min-[390px]:text-[13px] md:text-sm leading-tight font-bold shadow-sm border ${
                            isGoldIdentity ? 'bg-amber-500 text-white border-amber-500' : 
                            isBlackIdentity ? 'bg-stone-800 text-stone-100 border-stone-800' : 
                            'bg-stone-50 text-stone-600 border-stone-200'
                          }`}>
                              <span className="min-w-0 truncate text-center">{primaryIdentity}</span>
                            </div>
                          )}
                        </td>
                        <td className="pr-4 md:pr-6 py-4 text-right w-8">
                          <ChevronRight className={`w-4 h-4 text-stone-300 transition-transform ${isExpanded ? 'rotate-90 text-stone-800' : ''}`} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-stone-50/40">
                          <td colSpan={4} className="px-0 py-0 border-b border-stone-200 overflow-hidden max-w-0">
                            <div className="member-detail-panel w-full max-w-full overflow-hidden px-4 md:px-6 py-5 md:py-6 space-y-5 md:space-y-6 animate-in slide-in-from-top-2 duration-300">
                              <div className="w-full max-w-full overflow-hidden bg-emerald-50/70 p-3.5 md:p-4 rounded-xl border border-emerald-200/70 shadow-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="rounded-lg bg-white/55 px-3 py-2 border border-emerald-100/70">
                                    <div className="text-[11px] text-emerald-950 font-black mb-1">年齡</div>
                                    <div className="text-sm font-black text-stone-800 whitespace-nowrap">
                                      {getAge(m.birthday) || '未設定'}
                                      {m.birthday && (() => {
                                        const norm = parseBirthdayString(m.birthday);
                                        const yr = norm ? parseInt(norm.split('-')[0], 10) : NaN;
                                        return !isNaN(yr) && yr > 1911 ? (
                                          <span className="text-[10px] font-bold text-stone-500 ml-1.5">
                                            ({yr - 1911}年次)
                                          </span>
                                        ) : null;
                                      })()}
                                    </div>
                                  </div>
                                  <div className="rounded-lg bg-white/55 px-3 py-2 border border-emerald-100/70">
                                    <div className="text-[11px] text-emerald-950 font-black mb-1">星座</div>
                                    <div className="text-sm font-black text-stone-800 whitespace-nowrap">
                                      {getZodiacSign(m.birthday) || '未設定'}
                                      {m.birthday && (() => {
                                        const norm = parseBirthdayString(m.birthday);
                                        const pts = norm ? norm.split('-') : [];
                                        return pts.length >= 3 ? (
                                          <span className="text-[10px] font-bold text-stone-500 ml-1.5">
                                            ({parseInt(pts[1], 10)}/{parseInt(pts[2], 10)})
                                          </span>
                                        ) : null;
                                      })()}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowMemberSpendingId(showMemberSpendingId === m.id ? null : m.id);
                                      setLogMonthFilter('');
                                    }}
                                    className={`rounded-lg px-3 py-2 text-left border transition ${showMemberSpendingId === m.id ? 'bg-white border-emerald-300 shadow-sm' : 'bg-white/55 border-emerald-100/70 hover:bg-white'}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[11px] text-emerald-950 font-black">消費次數</span>
                                      <ChevronDown className={`w-3.5 h-3.5 text-emerald-800 transition-transform ${showMemberSpendingId === m.id ? 'rotate-180' : ''}`} />
                                    </div>
                                    <div className="text-base font-black text-stone-900 whitespace-nowrap">{memberOrders.length}次</div>
                                  </button>
                                  <div className="rounded-lg bg-white/80 px-3 py-2 border border-emerald-100/70">
                                    <div className="text-[11px] text-emerald-950 font-black mb-1">累計消費</div>
                                    <div className="text-[17px] leading-tight font-black text-stone-950 whitespace-nowrap">NT${totalSpent.toLocaleString()}</div>
                                  </div>
                                  {(isGoldIdentity || isBlackIdentity) && (
                                    <div className="col-span-2 rounded-lg bg-white/80 px-3 py-2.5 border border-emerald-100/70 flex items-center justify-between gap-3">
                                      <div>
                                        <div className="text-[11px] text-emerald-950 font-black">累計感謝金</div>
                                        <div className="text-[10px] text-stone-400 font-bold mt-0.5">可於前台折抵消費</div>
                                      </div>
                                      <div className="text-[17px] leading-tight font-black text-emerald-800 whitespace-nowrap">{cumulativeReferralReward.toLocaleString()}元</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {showMemberSpendingId === m.id && (
                                <div className="w-full max-w-full overflow-hidden border border-emerald-100 rounded-xl p-3.5 bg-white shadow-sm flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                                  <div className="flex items-center justify-between gap-2 mb-3">
                                    <h3 className="text-sm font-black text-stone-900 shrink-0">在 ZEN FLOW 的足跡</h3>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <input
                                        type="month"
                                        value={logMonthFilter}
                                        onChange={e => setLogMonthFilter(e.target.value)}
                                        className="w-[112px] text-xs p-1 border border-stone-200 rounded text-stone-600 outline-none focus:border-emerald-400"
                                      />
                                      {logMonthFilter && <button onClick={()=>setLogMonthFilter('')} className="text-[10px] text-stone-400 hover:text-stone-600">清除</button>}
                                    </div>
                                  </div>
                                  {(() => {
                                    const filteredOrders = memberOrders.filter(mo => {
                                      if (logMonthFilter) {
                                        return mo.date.startsWith(logMonthFilter);
                                      }
                                      const d = new Date(mo.date);
                                      const sixMonthsAgo = new Date();
                                      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                                      return d.getTime() >= sixMonthsAgo.getTime();
                                    }).sort((a,b) => {
                                      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
                                      return diff !== 0 ? diff : b.createdAt - a.createdAt;
                                    });

                                    if (filteredOrders.length === 0) {
                                      return <p className="text-sm text-stone-400 py-2">該區間尚無消費紀錄</p>;
                                    }

                                    return (
                                      <ul className="space-y-2 min-w-0">
                                        {filteredOrders.map(mo => {
                                          const dateObj = new Date(mo.date);
                                           const formattedDate = isNaN(dateObj.getTime()) ? mo.date.replace(/-/g, '/') : `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2,'0')}/${String(dateObj.getDate()).padStart(2,'0')}`;
                                           const endTimeStr = mo.time && mo.totalDuration ? minsToTime(timeToMins(mo.time) + mo.totalDuration) : '';
                                           const durationHoursDisplay = mo.totalDuration ? ((mo.totalDuration / 60) % 1 === 0 ? `${mo.totalDuration / 60}` : (mo.totalDuration / 60).toFixed(1)) : '';
                                           const serviceItems = mo.items || [];
                                           const isSummaryExpanded = expandedHistoryOrderIds.has(mo.id);
                                           const serviceStaffDisplay = (() => {
                                             const assignedStaff = mo.therapistPreference || '';
                                             if (!assignedStaff || ['不指定', '不指定按摩師', '不指定教練', '男按摩師即可', '女按摩師即可', '男即可', '女即可'].includes(assignedStaff)) {
                                               return '尚未指派';
                                             }
                                             return assignedStaff.replace(/[（(]\s*[男女]\s*[）)]/g, '').trim();
                                           })();
                                           return (
                                             <li key={`summary-${mo.id}`} className="w-full max-w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-50/70">
                                               <button
                                                 type="button"
                                                 onClick={() => toggleHistoryOrderExpand(mo.id)}
                                                 className={`grid w-full grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-3 px-3 py-2 text-left transition ${isSummaryExpanded ? 'bg-white' : 'hover:bg-white/70'}`}
                                               >
                                                 <div className="min-w-0">
                                                   <div className="text-[12px] leading-snug font-black text-stone-900 break-words">{formattedDate}</div>
                                                   <div className="mt-0.5 text-[11px] leading-snug font-bold text-stone-500">
                                                     {mo.time}{endTimeStr ? `~${endTimeStr}` : ''}{durationHoursDisplay ? ` (${durationHoursDisplay}小時)` : ''}
                                                   </div>
                                                 </div>
                                                 <div className="shrink-0 text-right text-[12px] font-black text-stone-900">NT${mo.finalPrice.toLocaleString()}</div>
                                                 <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${isSummaryExpanded ? 'rotate-90 text-stone-700' : ''}`} />
                                               </button>

                                               {isSummaryExpanded && (
                                                 <div className="space-y-3 border-t border-stone-200 bg-white px-3 py-3">
                                                   <div>
                                                     <div className="mb-1.5 text-[11px] font-black text-stone-500">服務內容</div>
                                                     <div className="space-y-1.5">
                                                       {serviceItems.length === 0 ? (
                                                         <div className="text-xs font-bold text-stone-500">未記錄服務項目</div>
                                                       ) : serviceItems.map((item, idx) => (
                                                         <div key={`${mo.id}-service-${idx}`} className="break-words rounded-md border border-stone-100 bg-stone-50 px-2.5 py-2 text-xs font-bold leading-snug text-stone-700">
                                                           {item.name}
                                                           {item.duration ? <span className="ml-1 text-stone-400">({item.duration}分鐘)</span> : null}
                                                         </div>
                                                       ))}
                                                     </div>
                                                   </div>
                                                   <div className="flex items-center justify-between gap-3 rounded-md border border-stone-100 bg-stone-50 px-2.5 py-2 text-xs">
                                                     <span className="font-black text-stone-500">服務人員</span>
                                                     <span className="font-black text-stone-800">{serviceStaffDisplay}</span>
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-2 text-xs">
                                                     <div className="rounded-md bg-emerald-50 px-2.5 py-2">
                                                       <div className="text-[10px] font-black text-emerald-800">付款方式</div>
                                                       <div className="mt-0.5 font-black text-stone-800">{formatPaymentMethod(mo.paymentMethod)}</div>
                                                     </div>
                                                     <div className="rounded-md bg-emerald-50 px-2.5 py-2 text-right">
                                                       <div className="text-[10px] font-black text-emerald-800">消費金額</div>
                                                       <div className="mt-0.5 font-black text-stone-900">NT${mo.finalPrice.toLocaleString()}</div>
                                                     </div>
                                                   </div>
                                                   {mo.note && (
                                                     <div className="break-words rounded-md border border-stone-100 bg-stone-50 px-2.5 py-2 text-xs font-bold leading-snug text-stone-600">
                                                       {mo.note}
                                                     </div>
                                                   )}
                                                   {authedUser?.role === 'admin' && (
                                                     <button
                                                       type="button"
                                                       onClick={() => handleDeleteOrder(mo.id)}
                                                       className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                                                     >
                                                       <Trash2 className="h-3.5 w-3.5" />
                                                       刪除此筆消費紀錄
                                                     </button>
                                                   )}
                                                 </div>
                                               )}
                                             </li>
                                           );
                                        })}
                                      </ul>
                                    );
                                  })()}
                                </div>
                              )}
                              {/* Top Section: Info & Note */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm md:col-span-2">
                                  <div className="mb-4 flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-medium text-stone-800 flex items-center">
                                      編輯基本資料
                                    </h3>
                                    <button 
                                      onClick={() => handleDeleteMember(m.id)}
                                      className="text-[10px] md:text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1.5 transition bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      刪除此會員
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-5">
                                    {(() => {
                                      const fieldClass = "member-edit-field w-full h-10 min-h-10 box-border text-[13px] leading-none px-2 py-0 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition";
                                      const labelClass = "block text-[10px] font-bold text-stone-500 mb-1";
                                      
                                      // Exclude self (member m) from staff dropdowns if m is a coach or therapist
                                      const selfNames = new Set([m.name, m.therapistName, m.id].filter(Boolean));
                                      const coachNames = coachMembers
                                        .filter(cm => cm.id !== m.id && cm.name !== m.name && (!m.therapistName || cm.therapistName !== m.therapistName))
                                        .map(cm => cm.therapistName || cm.name)
                                        .filter((name): name is string => Boolean(name) && !selfNames.has(name));

                                      const therapistNamesForMember = linkedMassageMembers
                                        .filter(tm => tm.id !== m.id && tm.name !== m.name && (!m.therapistName || tm.therapistName !== m.therapistName))
                                        .map(tm => tm.therapistName || tm.name)
                                        .filter((name): name is string => Boolean(name) && !selfNames.has(name));

                                      const completedCoachOrders = memberOrders
                                        .filter(o => o.status === 'completed' && (o.items || []).some(item => item.name.includes('1對1教練課')))
                                        .sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

                                      return (
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-[0.85fr_0.65fr_1.5fr] gap-2">
                                            <div className="min-w-0">
                                              <label className={labelClass}>姓名</label>
                                              <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className={fieldClass} />
                                            </div>
                                            <div className="min-w-0">
                                              <label className={labelClass}>性別</label>
                                              <select value={editGender} onChange={e=>{
                                                const newGen = e.target.value as Gender;
                                                setEditGender(newGen);
                                                handleInfoSave(m.id, { gender: newGen });
                                              }} className={`${fieldClass} text-center`}>
                                                <option value="男">男</option>
                                                <option value="女">女</option>
                                              </select>
                                            </div>
                                            <div className="min-w-0">
                                              <label className={labelClass}>生日</label>
                                              <div className="relative flex items-center w-full bg-stone-50 border border-stone-200 rounded-lg focus-within:bg-white focus-within:border-stone-500 transition overflow-hidden">
                                                <input 
                                                  type="text" 
                                                  value={editBirthdayText} 
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditBirthdayText(val);
                                                    const parsed = parseBirthdayString(val);
                                                    if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
                                                      setEditBirthday(parsed);
                                                      handleInfoSave(m.id, { birthday: parsed });
                                                    } else {
                                                      setEditBirthday(val);
                                                    }
                                                  }}
                                                  onBlur={() => {
                                                    const parsed = parseBirthdayString(editBirthdayText);
                                                    if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
                                                      setEditBirthday(parsed);
                                                      setEditBirthdayText(parsed.replace(/-/g, '/'));
                                                      handleInfoSave(m.id, { birthday: parsed });
                                                    } else {
                                                      handleInfoSave(m.id, { birthday: editBirthdayText });
                                                    }
                                                  }}
                                                  placeholder="例: 1990/05/20 或點選日曆" 
                                                  className={`${fieldClass} border-0 bg-transparent flex-1 focus:bg-transparent min-w-0 font-medium`}
                                                />
                                                <div className="relative shrink-0 pr-2 flex items-center justify-center cursor-pointer">
                                                  <input 
                                                    type="date" 
                                                    value={editBirthday && /^\d{4}-\d{2}-\d{2}$/.test(editBirthday) ? editBirthday : ''} 
                                                    onChange={e => {
                                                      const val = e.target.value;
                                                      if (val) {
                                                        setEditBirthday(val);
                                                        setEditBirthdayText(val.replace(/-/g, '/'));
                                                        handleInfoSave(m.id, { birthday: val });
                                                      }
                                                    }} 
                                                    onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                    style={{ colorScheme: 'light' }}
                                                  />
                                                  <button type="button" className="p-1 text-stone-400 hover:text-stone-600 transition" title="開啟日曆選單">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-[0.85fr_1.35fr] gap-2">
                                            <div className="min-w-0">
                                              <label className={labelClass}>手機號碼</label>
                                              <input type="text" value={editPhone} onChange={e=>setEditPhone(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className={fieldClass} />
                                            </div>
                                            <div className="min-w-0">
                                              <label className={labelClass}>LINE ID</label>
                                              <input type="text" value={editLineId} onChange={e=>setEditLineId(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className={fieldClass} />
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-3 gap-2">
                                            <div>
                                              <label className={labelClass}>主要教練</label>
                                              <select value={editPrimaryCoach} onChange={e=>{
                                                setEditPrimaryCoach(e.target.value);
                                                handleInfoSave(m.id, { primaryCoach: e.target.value });
                                              }} className={fieldClass}>
                                                <option value="">(無)</option>
                                                {coachNames.map(name => <option key={name} value={name}>{name}</option>)}
                                              </select>
                                            </div>
                                            <div>
                                              <label className={labelClass}>偕同教練</label>
                                              <select value={editSecondaryCoach} onChange={e=>{
                                                setEditSecondaryCoach(e.target.value);
                                                handleInfoSave(m.id, { secondaryCoach: e.target.value });
                                              }} className={fieldClass}>
                                                <option value="">(無)</option>
                                                {coachNames.map(name => <option key={name} value={name}>{name}</option>)}
                                              </select>
                                            </div>
                                            <div>
                                              <label className={labelClass}>主要按摩師</label>
                                              <select value={editPrimaryTherapist} onChange={e=>{
                                                setEditPrimaryTherapist(e.target.value);
                                                handleInfoSave(m.id, { primaryTherapist: e.target.value });
                                              }} className={fieldClass}>
                                                <option value="">(無)</option>
                                                {therapistNamesForMember.map(name => (
                                                  <option key={name} value={name}>{name}</option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-[1.6fr_1fr] gap-2">
                                            <div>
                                              <label className={labelClass}>健身方案</label>
                                              <select value={editFitnessPlan} onChange={e=>{
                                                setEditFitnessPlan(e.target.value);
                                                handleInfoSave(m.id, { fitnessPlan: e.target.value });
                                              }} className={`${fieldClass} member-fitness-plan-select truncate whitespace-nowrap`}>
                                                <option value="">(無)</option>
                                                <option value="90天計畫(24堂教練課)">90天計畫(24堂教練課)</option>
                                                <option value="24堂教練課">24堂教練課</option>
                                                <option value="48堂教練課">48堂教練課</option>
                                              </select>
                                            </div>
                                            <details className="relative">
                                              <summary className="list-none cursor-pointer">
                                                <label className={labelClass}>完課次數</label>
                                                <div className={`${fieldClass} font-black text-stone-800 flex items-center justify-between`}>
                                                  <span>{completedCoachOrders.length}</span>
                                                  <span className="text-[10px] text-stone-400">次</span>
                                                </div>
                                              </summary>
                                              <div className="absolute right-0 z-40 mt-2 w-64 max-h-64 overflow-y-auto rounded-xl border border-stone-200 bg-white p-3 shadow-xl">
                                                {completedCoachOrders.length === 0 ? (
                                                  <p className="text-xs text-stone-400">目前沒有完課紀錄</p>
                                                ) : completedCoachOrders.map(o => (
                                                  <div key={o.id} className="border-b border-stone-100 last:border-0 py-2 text-xs text-stone-600">
                                                    <div className="font-bold text-stone-800">{o.date.replace(/-/g, '/')} {o.time}</div>
                                                    <div>1對1教練課</div>
                                                  </div>
                                                ))}
                                              </div>
                                            </details>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Merged Member Grade & Permissions Section */}
                                    {isAdmin && (
                                      <div className="flex flex-col md:col-span-3 mt-4 pt-4 border-t border-stone-200">
                                        <div className="flex flex-col gap-2 mb-3 px-1">
                                          {/* Header Section */}
                                          <div className="flex items-center justify-between flex-wrap gap-2">
                                            <label className="block text-sm font-medium text-stone-800 whitespace-nowrap">
                                              會員身分及權限(可複選)
                                            </label>
                                          </div>
                                        </div>

                                        <div className="space-y-4">
                                          {/* 8 Identity Checkbox Options structured in 3 rows */}
                                          <div className="space-y-2.5">
                                            <div className="text-[11px] font-black text-stone-500 px-1">工作人員身分</div>
                                            {/* Row 1: Venue Rent Staff */}
                                            <div className="grid grid-cols-2 gap-2">
                                              {[
                                                { id: 'therapist_rent', label: '場租按摩師' },
                                                { id: 'coach_rent', label: '場租教練' }
                                              ].map(option => {
                                                const isSelected = editSelectedIdentities.includes(option.id);
                                                return (
                                                  <label 
                                                    key={option.id} 
                                                    className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg cursor-pointer transition-all border font-bold text-[11px] md:text-xs whitespace-nowrap select-none ${
                                                      isSelected 
                                                        ? (option.id === 'therapist_rent' ? 'bg-teal-50 border-teal-300 text-teal-900 shadow-sm' : 'bg-sky-50 border-sky-300 text-sky-900 shadow-sm')
                                                        : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50 hover:border-stone-300'
                                                    }`}
                                                  >
                                                    <input 
                                                      type="checkbox" 
                                                      className="hidden"
                                                      checked={isSelected}
                                                      onChange={() => handleIdentityToggle(option.id)}
                                                    />
                                                    {isSelected ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <span className="block w-3.5 h-3.5 shrink-0 rounded-full border-[1.5px] border-stone-300 bg-white" />}
                                                    {option.label}
                                                  </label>
                                                );
                                              })}
                                            </div>

                                            {/* Row 2: In-Shop Staff */}
                                            <div className="grid grid-cols-3 gap-2">
                                              {[
                                                { id: 'therapist_in', label: '店內按摩師' },
                                                { id: 'coach_in', label: '店內教練' },
                                                { id: 'admin', label: '管理員' }
                                              ].map(option => {
                                                const isSelected = editSelectedIdentities.includes(option.id);
                                                return (
                                                  <label 
                                                    key={option.id} 
                                                    className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg cursor-pointer transition-all border font-bold whitespace-nowrap select-none ${option.id === 'therapist_in' ? 'text-[10px] min-[700px]:text-xs' : 'text-[11px] md:text-xs'} ${
                                                      isSelected 
                                                        ? (option.id === 'admin' ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm' :
                                                           option.id === 'therapist_in' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm' :
                                                           'bg-cyan-50 border-cyan-300 text-cyan-900 shadow-sm')
                                                        : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50 hover:border-stone-300'
                                                    }`}
                                                  >
                                                    <input 
                                                      type="checkbox" 
                                                      className="hidden"
                                                      checked={isSelected}
                                                      onChange={() => handleIdentityToggle(option.id)}
                                                    />
                                                    {isSelected ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <span className="block w-3.5 h-3.5 shrink-0 rounded-full border-[1.5px] border-stone-300 bg-white" />}
                                                    {option.label}
                                                  </label>
                                                );
                                              })}
                                            </div>

                                            {/* In-shop staff details */}
                                            {(editSelectedIdentities.includes('therapist_in') || editSelectedIdentities.includes('coach_in')) && (
                                              <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div>
                                                  <label className="block text-[11px] md:text-xs font-bold text-emerald-700 mb-1.5 whitespace-nowrap">
                                                    連結工作人員姓名
                                                  </label>
                                                  <select
                                                    value={editTherapistName}
                                                    onChange={e => {
                                                      setEditTherapistName(e.target.value);
                                                      handleInfoSave(m.id, { therapistName: e.target.value });
                                                    }}
                                                    className="h-9 w-full rounded-lg border border-emerald-300 bg-white px-2 text-xs font-bold text-emerald-800 shadow-sm outline-none transition focus:ring-1 focus:ring-emerald-200"
                                                  >
                                                    <option value="">(選擇工作人員)</option>
                                                    {(() => {
                                                      const takenNames = members
                                                        .filter(other => other.id !== m.id && (other.level === '店內按摩師' || other.level === '店內教練') && other.therapistName)
                                                        .map(other => other.therapistName);

                                                      return THERAPISTS_W_GENDER.filter(t => !t.includes('即可')).map(t => {
                                                        const isTaken = takenNames.includes(t);
                                                        return (
                                                          <option key={t} value={t} disabled={isTaken} className={isTaken ? 'text-stone-300' : ''}>
                                                            {t}{isTaken ? ' (已被連結)' : ''}
                                                          </option>
                                                        );
                                                      });
                                                    })()}
                                                  </select>
                                                </div>

                                                <div>
                                                  <label className="block text-[11px] md:text-xs font-bold text-emerald-700 mb-1.5 whitespace-nowrap">
                                                    設定專屬的登入密碼
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={editPassword}
                                                    onChange={e => setEditPassword(e.target.value)}
                                                    onBlur={e => handleInfoSave(m.id, { password: e.target.value })}
                                                    placeholder="請輸入登入密碼"
                                                    className="h-9 w-full rounded-lg border border-emerald-300 bg-white px-2 text-xs font-bold text-emerald-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                                  />
                                                </div>
                                              </div>
                                            )}

                                            {/* Row 3: Customers */}
                                            <div className="text-[11px] font-black text-stone-500 px-1 pt-1.5">顧客會員等級</div>
                                            <div className="grid grid-cols-3 gap-2">
                                              {[
                                                { id: 'member_normal', label: '一般顧客' },
                                                { id: 'gold', label: '金卡會員' },
                                                { id: 'black', label: '黑卡會員' }
                                              ].map(option => {
                                                const isSelected = editSelectedIdentities.includes(option.id);
                                                return (
                                                  <label 
                                                    key={option.id} 
                                                    className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg cursor-pointer transition-all border font-bold text-[11px] md:text-xs whitespace-nowrap select-none ${
                                                      isSelected 
                                                        ? (option.id === 'member_normal' ? 'bg-stone-100 border-stone-300 text-stone-800 shadow-sm' :
                                                           option.id === 'gold' ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm' :
                                                           'bg-zinc-200/80 border-zinc-400 text-zinc-900 shadow-sm')
                                                        : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50 hover:border-stone-300'
                                                    }`}
                                                  >
                                                    <input 
                                                      type="checkbox" 
                                                      className="hidden"
                                                      checked={isSelected}
                                                      onChange={() => handleIdentityToggle(option.id)}
                                                    />
                                                    {isSelected ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <span className="block w-3.5 h-3.5 shrink-0 rounded-full border-[1.5px] border-stone-300 bg-white" />}
                                                    {option.label}
                                                  </label>
                                                );
                                              })}
                                            </div>

                                            {editSelectedIdentities.includes('member_normal') && (
                                              <div className="mt-2 grid grid-cols-2 gap-2.5 rounded-lg border border-stone-200 bg-stone-50/70 p-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div>
                                                  <label className="mb-1 block text-[10px] md:text-[11px] font-black text-stone-600">介紹人類型</label>
                                                  <select
                                                    value={editReferrerType}
                                                    onChange={e => {
                                                      const nextType = e.target.value as 'staff' | 'gold' | 'black' | '';
                                                      setEditReferrerType(nextType);
                                                      setEditReferrerId('');
                                                      setEditReferredBy('');
                                                      setEditReferredMonth(nextType ? currentMonthStr : '');
                                                      saveReferralDetails({
                                                        referrerType: nextType || undefined,
                                                        referrerId: undefined,
                                                        referredBy: undefined,
                                                        referredMonth: nextType ? currentMonthStr : undefined
                                                      });
                                                    }}
                                                    className="h-9 w-full rounded-md border border-stone-200 bg-white px-2 text-[11px] md:text-xs font-bold text-stone-700 outline-none focus:border-emerald-400"
                                                  >
                                                    <option value="">無</option>
                                                    <option value="staff">店內人員</option>
                                                    <option value="gold">金卡會員</option>
                                                    <option value="black">黑卡會員</option>
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="mb-1 block text-[10px] md:text-[11px] font-black text-stone-600">介紹人</label>
                                                  <select
                                                    value={editReferrerId}
                                                    disabled={!editReferrerType}
                                                    onChange={e => {
                                                      const nextId = e.target.value;
                                                      const referrer = members.find(candidate => candidate.id === nextId);
                                                      const referrerLabel = editReferrerType === 'staff'
                                                        ? referrer?.therapistName || referrer?.name || ''
                                                        : referrer?.name || '';
                                                      setEditReferrerId(nextId);
                                                      setEditReferredBy(referrerLabel);
                                                      setEditReferredMonth(nextId ? currentMonthStr : '');
                                                      saveReferralDetails({
                                                        referrerType: editReferrerType || undefined,
                                                        referrerId: nextId || undefined,
                                                        referredBy: referrerLabel || undefined,
                                                        referredMonth: nextId ? currentMonthStr : undefined
                                                      });
                                                    }}
                                                    className="h-9 w-full rounded-md border border-stone-200 bg-white px-2 text-[11px] md:text-xs font-bold text-stone-700 outline-none focus:border-emerald-400 disabled:bg-stone-100 disabled:text-stone-400"
                                                  >
                                                    <option value="">選擇介紹人</option>
                                                    {members
                                                      .filter(candidate => {
                                                        if (candidate.id === m.id) return false;
                                                        if (editReferrerType === 'staff') {
                                                          return candidate.level === '店內按摩師' || candidate.level === '店內教練' || candidate.selectedIdentities?.includes('therapist_in') || candidate.selectedIdentities?.includes('coach_in');
                                                        }
                                                        if (editReferrerType === 'gold') return candidate.level === '金卡' || candidate.memberLevel === '金卡' || candidate.selectedIdentities?.includes('gold');
                                                        if (editReferrerType === 'black') return candidate.level === '黑卡' || candidate.memberLevel === '黑卡' || candidate.selectedIdentities?.includes('black');
                                                        return false;
                                                      })
                                                      .map(candidate => (
                                                        <option key={candidate.id} value={candidate.id}>
                                                          {editReferrerType === 'staff' ? candidate.therapistName || candidate.name : candidate.name}
                                                        </option>
                                                      ))}
                                                  </select>
                                                </div>
                                                <div className="col-span-2 flex items-center justify-between border-t border-dashed border-stone-200 pt-2 text-[10px] md:text-[11px] font-bold text-stone-500">
                                                  <span>{editReferrerType === 'staff' ? '店內人員一次性介紹獎金' : editReferrerType ? '會員一次性感謝金' : '選擇後自動計算獎勵'}</span>
                                                  <span className="font-black text-emerald-700">{editReferrerType === 'staff' ? '500元' : editReferrerType ? '300元' : '--'}</span>
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* Sub-panel 2: Only "金卡會員" or "黑卡會員" gets member level details (referredBy, etc.) */}
                                          {(editLevel === '金卡' || editLevel === '黑卡') && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-dashed border-amber-200 animate-in fade-in slide-in-from-top-1 duration-200">
                                              <div>
                                                <label className="block text-xs text-amber-800 font-bold mb-1">締結按摩師</label>
                                                <select 
                                                  value={editReferredBy} 
                                                  onChange={e=>{
                                                    setEditReferredBy(e.target.value);
                                                    handleInfoSave(m.id, { referredBy: e.target.value });
                                                  }} 
                                                  className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition"
                                                >
                                                  <option value="">(無)</option>
                                                  {[...maleTherapists, ...femaleTherapists].map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-xs text-amber-800 font-bold mb-1">締結日期</label>
                                                <input 
                                                  type="date" 
                                                  value={editMembershipStartDate} 
                                                  onChange={e=>{
                                                    setEditMembershipStartDate(e.target.value);
                                                  }} 
                                                  onBlur={()=>handleInfoSave(m.id)} 
                                                  className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" 
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs text-amber-800 font-bold mb-1">優惠期限</label>
                                                <input 
                                                  type="date" 
                                                  value={editMembershipEndDate} 
                                                  onChange={e=>{
                                                    setEditMembershipEndDate(e.target.value);
                                                  }} 
                                                  onBlur={()=>handleInfoSave(m.id)} 
                                                  className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" 
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs text-amber-800 font-bold mb-1">締結月份</label>
                                                <input 
                                                  type="month" 
                                                  value={editReferredMonth} 
                                                  onChange={e=>{
                                                    setEditReferredMonth(e.target.value);
                                                    handleInfoSave(m.id, { referredMonth: e.target.value });
                                                  }} 
                                                  className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" 
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    </div>
                                    <p className="text-xs text-stone-400 text-right mt-3">修改後自動儲存</p>
                                  </div>
                                
                                <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm flex flex-col md:col-span-1">
                                  <h3 className="text-sm font-medium text-stone-800 mb-4 flex items-center">
                                    顧客備註 / 習慣
                                  </h3>
                                  <textarea 
                                    className="flex-1 min-h-[150px] w-full p-4 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-stone-500 resize-none transition"
                                    placeholder="輸入關於此顧客的偏好、習慣等筆記..."
                                    value={editingNote}
                                    onChange={e => setEditingNote(e.target.value)}
                                    onBlur={() => handleNoteSave(m.id)}
                                  />
                                  <p className="text-xs text-stone-400 mt-2 text-right">輸入內容後點擊空白處自動儲存</p>
                                </div>
                              </div>
                              
                              {/* Bottom Section: Order History */}
                              {false && showMemberSpendingId === m.id && (
                              <div className="border border-emerald-100 rounded-xl p-4 bg-white shadow-sm flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                  <h3 className="text-sm font-medium text-stone-800 flex items-center">
                                    <Search className="w-4 h-4 mr-2 text-stone-400" /> 消費紀錄
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="month" 
                                      value={logMonthFilter} 
                                      onChange={e => setLogMonthFilter(e.target.value)}
                                      className="text-xs p-1 border border-stone-200 rounded text-stone-600 outline-none focus:border-stone-400"
                                    />
                                    {logMonthFilter && <button onClick={()=>setLogMonthFilter('')} className="text-[10px] text-stone-400 hover:text-stone-600">清除</button>}
                                  </div>
                                </div>
                                {(() => {
                                  const filteredOrders = memberOrders.filter(mo => {
                                    if (logMonthFilter) {
                                      return mo.date.startsWith(logMonthFilter);
                                    }
                                    const d = new Date(mo.date);
                                    const sixMonthsAgo = new Date();
                                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                                    return d.getTime() >= sixMonthsAgo.getTime();
                                  }).sort((a,b) => {
                                    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
                                    return diff !== 0 ? diff : b.createdAt - a.createdAt;
                                  });

                                  if (filteredOrders.length === 0) {
                                    return <p className="text-sm text-stone-400 py-2">該區間尚無消費紀錄</p>;
                                  }
                                  
                                  return (
                                    <ul className="space-y-3">
                                      {filteredOrders.map(mo => {
                                      const dateObj = new Date(mo.date);
                                      const formattedDate = isNaN(dateObj.getTime()) ? mo.date.replace(/-/g, '/') : `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2,'0')}/${String(dateObj.getDate()).padStart(2,'0')}(${['日','一','二','三','四','五','六'][dateObj.getDay()]})`;
                                      const endTimeStr = mo.time && mo.totalDuration ? minsToTime(timeToMins(mo.time) + mo.totalDuration) : '';
                                      const durationHoursDisplay = (mo.totalDuration / 60) % 1 === 0 ? (mo.totalDuration / 60) : (mo.totalDuration / 60).toFixed(1);
                                      const isHExpanded = expandedHistoryOrderIds.has(mo.id);

                                      return (
                                        <li key={mo.id} className="overflow-hidden border border-stone-200 rounded-lg">
                                          <button 
                                            onClick={() => toggleHistoryOrderExpand(mo.id)}
                                            className={`w-full flex items-center justify-between p-3 text-left transition-colors ${isHExpanded ? 'bg-stone-100' : 'bg-stone-50 hover:bg-stone-100/70'}`}
                                          >
                                            <div className="flex flex-wrap items-center gap-x-1.5 text-[13px] md:text-sm font-bold text-stone-800">
                                              <span>{formattedDate}</span>
                                              <span>{mo.time}{endTimeStr ? `~${endTimeStr}` : ''}</span>
                                              <span>(總共{durationHoursDisplay}小時)</span>
                                              <span className="text-emerald-700">{mo.therapistPreference || '不指定'}</span>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${isHExpanded ? 'rotate-90 text-stone-600' : ''}`} />
                                          </button>
                                          
                                          {isHExpanded && (
                                            <div className="p-4 bg-white space-y-4 animate-in slide-in-from-top-2 duration-300 border-t border-stone-100">
                                              <div className="flex flex-col md:flex-row gap-4">
                                                <div className="flex-1 space-y-3">
                                                  <div className="flex items-center justify-between pb-2 border-b border-stone-50">
                                                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">消費明細</span>
                                                    <span className="text-base font-black text-stone-900">NT${mo.finalPrice} {mo.paymentMethod ? `(${mo.paymentMethod})` : ''}</span>
                                                  </div>
                                                  <div className="text-sm text-stone-700 space-y-1.5 bg-stone-50/50 p-3 rounded-lg border border-stone-100">
                                                    {Object.entries((mo.items || []).reduce((acc, i) => {
                                                      acc[i.name] = (acc[i.name] || 0) + i.duration;
                                                      return acc;
                                                    }, {} as Record<string, number>)).map(([name, duration], idx) => (
                                                      <div key={`${mo.id}-item-${idx}`} className="flex items-center">
                                                        <Plus className="w-3 h-3 mr-2 text-stone-400" />
                                                        {name} ({duration}分鐘)
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>

                                                {/* Discomfort Areas Checkboxes */}
                                                <div className="w-full md:w-[35%] border-t md:border-t-0 md:border-l border-stone-100 pt-4 md:pt-0 md:pl-4">
                                                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-2">當日不適部位</label>
                                                  <div className="grid grid-cols-4 md:grid-cols-3 gap-1.5">
                                                    {['頭','頸','肩','上背','下背','臀','大腿','小腿','足','胸','腹','手'].map(area => (
                                                      <label key={area} className={`flex items-center space-x-1 p-1 rounded cursor-pointer transition ${mo.discomfortAreas?.includes(area) ? 'bg-stone-800 text-white shadow-sm' : 'hover:bg-stone-100 text-stone-600'}`}>
                                                        <input 
                                                          type="checkbox" 
                                                          checked={mo.discomfortAreas?.includes(area) || false} 
                                                          onChange={e => {
                                                            const current = mo.discomfortAreas || [];
                                                            let updated = e.target.checked ? [...current, area] : current.filter(x => x !== area);
                                                            db.updateOrder(mo.id, { discomfortAreas: updated });
                                                            setOrders(db.getOrders());
                                                          }}
                                                          className="hidden" 
                                                        />
                                                        <span className="text-[11px] font-bold mx-auto">{area}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="border-t border-stone-100 pt-3 flex flex-col">
                                                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">服務紀錄及備註</label>
                                                <textarea
                                                  className="w-full min-h-[80px] p-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 resize-none transition bg-white"
                                                  placeholder="輸入針對這次預約的特別備註或事後記錄..."
                                                  defaultValue={mo.note || ''}
                                                  onBlur={(e) => {
                                                    db.updateOrder(mo.id, { note: e.target.value });
                                                    setOrders(db.getOrders());
                                                  }}
                                                />
                                                <p className="text-[10px] text-stone-400 mt-1 text-right italic font-medium">※ 點擊空白處自動儲存</p>
                                              </div>
                                            </div>
                                          )}
                                        </li>
                                      );
                                    })}
                                    </ul>
                                  );
                                })()}
                              </div>
                              )}
                            </div>
                          </td>
                        </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}

  {tab === 'history' && !isAdmin && selectedTherapistPortal && (() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentDate = new Date().toISOString().slice(0, 10);
    const assignedOrders = orders
      .filter(order => order.therapistPreference === selectedTherapistPortal && order.date <= currentDate)
      .map(order => {
        const serviceItems = (order.items || []).filter(item => item.courseId !== 'venue');
        return {
          ...order,
          items: serviceItems,
          totalDuration: serviceItems.reduce((sum, item) => sum + (item.duration || 0), 0)
        };
      })
      .filter(order => (order.items || []).length > 0)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

    const historyMonths: string[] = Array.from(new Set<string>(assignedOrders.map(order => order.date.slice(0, 7)))).sort((a: string, b: string) => b.localeCompare(a));
    const visibleOrders = therapistHistoryMonth === null
      ? []
      : therapistHistoryMonth === 'all'
        ? assignedOrders
        : assignedOrders.filter(order => order.date.startsWith(therapistHistoryMonth));
    const salaryMonths: string[] = historyMonths.filter((month: string) => month < currentMonth);

    const getMonthlySalary = (month: string) => {
      const monthOrders = assignedOrders.filter(order => order.date.startsWith(month) && order.status !== 'cancelled');
      let massageMinutes = 0;
      let inbodyMinutes = 0;
      monthOrders.forEach(order => {
        (order.items || []).forEach(item => {
          if (item.name.includes('InBody')) inbodyMinutes += item.duration || 0;
          else massageMinutes += item.duration || 0;
        });
      });
      const massageHours = massageMinutes / 60;
      const inbodyHours = inbodyMinutes / 60;
      const totalHours = massageHours + inbodyHours;
      const baseSalary = massageHours * 600 + inbodyHours * 200;
      const goldCount = members.filter(member => member.level === '金卡' && member.referredBy === selectedTherapistPortal && member.referredMonth === month).length;
      const blackCount = members.filter(member => member.level === '黑卡' && member.referredBy === selectedTherapistPortal && member.referredMonth === month).length;
      const introducedCount = members.filter(member => member.referredBy === selectedTherapistPortal && member.referredMonth === month).length;
      const closingBonus = goldCount * 1200 + blackCount * 3000;
      const introductionBonus = introducedCount * 500;
      const completionBonus = totalHours >= 96 ? 10500 : totalHours >= 48 ? 4500 : totalHours >= 24 ? 1500 : 0;
      return {
        month,
        count: monthOrders.length,
        totalHours,
        baseSalary,
        closingBonus,
        introductionBonus,
        completionBonus,
        goldCount,
        blackCount,
        introducedCount,
        total: baseSalary + closingBonus + introductionBonus + completionBonus
      };
    };

    const statusText = (status?: string) => status === 'cancelled' ? '已取消' : status === 'completed' ? '已完成' : status === 'no_show' ? '未到' : '預約中';

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="space-y-6">
          <div>
            <div className="min-w-0">
              <h3 className="text-[22px] font-black leading-8 tracking-normal text-stone-900 md:text-3xl md:leading-10">歷史紀錄</h3>
              <p className="mt-1 text-[14px] font-bold leading-6 text-stone-500 md:text-base">查看過往服務紀錄與每月薪資明細。</p>
            </div>
          </div>

        <section className="overflow-hidden rounded-2xl border border-sage-100 bg-[#fdfcf9] shadow-sm">
          <button type="button" onClick={() => setIsTherapistHistoryOpen(open => !open)} className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-sage-50/40 md:p-6">
            <div>
              <h3 className="text-lg font-black text-stone-900 md:text-xl">歷史預約</h3>
              <p className="mt-1 text-xs font-bold text-stone-400">{isTherapistHistoryOpen ? '點擊收合歷史預約' : '點擊展開並選擇月份'}</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sage-100 bg-white text-sage-700">
              <ChevronDown className={`h-4 w-4 transition-transform ${isTherapistHistoryOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {isTherapistHistoryOpen && (
          <div className="border-t border-sage-100 p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-stone-400">{therapistHistoryMonth === null ? '請選擇月份後查看' : `共 ${visibleOrders.length} 筆紀錄`}</p>
            <select
              value={therapistHistoryMonth ?? ''}
              onChange={event => setTherapistHistoryMonth(event.target.value || null)}
              className="min-h-[44px] min-w-[150px] rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-bold text-stone-700 outline-none focus:border-sage-400"
            >
              <option value="" disabled>選擇月份</option>
              <option value="all">全部月份</option>
              {historyMonths.map(month => <option key={month} value={month}>{month.replace('-', ' 年 ')} 月</option>)}
            </select>
          </div>

          {therapistHistoryMonth === null ? (
            <div className="rounded-xl border border-dashed border-sage-100 bg-sage-50/30 py-10 text-center text-sm font-bold text-stone-400">請選擇「全部月份」或是「指定月份」</div>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sage-100 bg-sage-50/30 py-12 text-center text-sm font-bold text-stone-400">所選月份目前尚無歷史預約</div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map(order => {
                const customer = members.find(member => member.id === order.memberId);
                const endTime = minsToTime(timeToMins(order.time) + order.totalDuration);
                return (
                  <div key={order.id} className="rounded-xl border border-stone-100 bg-[#fdfcf9] p-4 transition hover:border-sage-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-black text-stone-900 md:text-lg">{order.date.replace(/-/g, '/')}　{order.time}～{endTime}</p>
                        <p className="mt-1 text-[14px] font-bold text-stone-500 md:text-[15px]">{customer?.name || '顧客'}｜{order.totalDuration} 分鐘</p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-xs md:text-[13px] font-black ${order.status === 'cancelled' ? 'border-rose-100 bg-rose-50 text-rose-600' : order.status === 'completed' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-white text-stone-500'}`}>
                        {statusText(order.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(order.items || []).map((item, index) => <span key={`${order.id}-${index}`} className="rounded-md bg-sage-50 px-2 py-1 text-[13px] md:text-sm font-bold text-sage-800">{item.name}</span>)}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-[14px] md:text-[15px] font-bold text-stone-500">
                      <span>{order.paymentMethod || '現場支付'}</span>
                      <span className="font-black text-stone-800">NT$ {(order.finalPrice ?? order.originalPrice ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-sage-100 bg-[#fdfcf9] shadow-sm">
          <button type="button" onClick={() => setIsTherapistSalaryOpen(open => !open)} className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-sage-50/40 md:p-6">
            <div>
              <h3 className="text-lg font-black text-stone-900 md:text-xl">每月薪資一覽</h3>
              <p className="mt-1 text-xs font-bold text-stone-400">{isTherapistSalaryOpen ? '點擊收合薪資一覽' : '點擊展開並選擇年月'}</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sage-100 bg-white text-sage-700">
              <ChevronDown className={`h-4 w-4 transition-transform ${isTherapistSalaryOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {isTherapistSalaryOpen && (
          <div className="border-t border-sage-100 p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-stone-400">請選擇要查看的薪資月份</p>
              <select
                value={therapistSalaryMonth}
                onChange={event => setTherapistSalaryMonth(event.target.value)}
                className="min-h-[44px] min-w-[150px] rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-bold text-stone-700 outline-none focus:border-sage-400"
              >
                <option value="" disabled>選擇年月</option>
                {salaryMonths.map(month => <option key={month} value={month}>{month.replace('-', ' 年 ')} 月</option>)}
              </select>
            </div>
          {salaryMonths.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sage-100 bg-sage-50/30 py-12 text-center text-sm font-bold text-stone-400">目前尚無過往月份薪資</div>
          ) : !therapistSalaryMonth ? (
            <div className="rounded-xl border border-dashed border-sage-100 bg-sage-50/30 py-10 text-center text-sm font-bold text-stone-400">請點選或滑動選擇要查看的年月</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-stone-100">
              <table className="w-full table-fixed text-left text-[8.5px] min-[375px]:text-[9.5px] sm:text-[11px] md:text-xs">
                <thead className="border-b border-stone-100 bg-sage-50 text-[10px] min-[375px]:text-[11px] sm:text-xs md:text-[13px] text-stone-600">
                  <tr>
                    <th className="w-[20%] pl-2 pr-0.5 py-2.5 font-black leading-tight sm:pl-3">年月<br />本月薪資</th>
                    <th className="w-[13%] px-0.5 py-2.5 text-right font-black leading-tight">預約<br />時數</th>
                    <th className="w-[17%] px-0.5 py-2.5 text-right font-black leading-tight">基本<br />薪資</th>
                    <th className="w-[15%] px-0.5 py-2.5 text-right font-black leading-tight">完課<br />獎金</th>
                    <th className="w-[12%] px-0.5 py-2.5 text-right font-black leading-tight">介紹<br />獎金</th>
                    <th className="w-[23%] pl-0.5 pr-2 py-2.5 text-right font-black leading-tight sm:pr-3">締結<br />獎金</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {salaryMonths.filter(month => month === therapistSalaryMonth).map(month => {
                    const salary = getMonthlySalary(month);
                    return (
                      <tr key={month} className="font-bold text-stone-600 transition hover:bg-sage-50/30">
                        <td className="pl-2 pr-0.5 py-3 leading-tight sm:pl-3">
                          <div className="text-[10px] min-[375px]:text-[11px] sm:text-sm font-black text-stone-900">{month.slice(0, 4)}</div>
                          <div className="mt-0.5 text-[10px] min-[375px]:text-[11px] sm:text-sm font-black text-stone-900">{Number(month.slice(5, 7))}月份</div>
                          <div className="mt-1 whitespace-nowrap text-[9px] min-[375px]:text-[10px] sm:text-xs font-black text-emerald-700">{salary.total.toLocaleString()}元</div>
                        </td>
                        <td className="px-0.5 py-3 text-right leading-tight">
                          <div className="font-black text-emerald-700">{salary.count}筆</div>
                          <div className="mt-1 text-stone-400">{salary.totalHours.toFixed(1).replace('.0', '')}小時</div>
                        </td>
                        <td className="px-0.5 py-3 text-right whitespace-nowrap">{salary.baseSalary.toLocaleString()}元</td>
                        <td className="px-0.5 py-3 text-right whitespace-nowrap">{salary.completionBonus.toLocaleString()}元</td>
                        <td className="px-0.5 py-3 text-right leading-tight whitespace-nowrap">
                          <div className="font-black">{salary.introducedCount}位</div>
                          <div className="mt-1 text-stone-500">{salary.introductionBonus.toLocaleString()}元</div>
                        </td>
                        <td className="pl-0.5 pr-2 py-3 text-right leading-tight whitespace-nowrap sm:pr-3">
                          <div>金{salary.goldCount}張 {(salary.goldCount * 1200).toLocaleString()}元</div>
                          <div className="mt-1">黑{salary.blackCount}張 {(salary.blackCount * 3000).toLocaleString()}元</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
          )}
        </section>
        </div>
      </div>
    );
  })()}

  {tab === 'therapist' && (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex min-h-8 items-center">
        <div className="min-w-0 w-full">
          <h2 className={`${!isAdmin ? 'text-[22px] md:text-3xl leading-8 md:leading-10 font-black text-stone-900 tracking-normal' : 'backend-page-title'}`}>
            {selectedTherapistPortal
              ? (isAdmin ? getStaffPortalTitle(selectedTherapistPortal) : `${selectedTherapistPortal}${getStaffPortalRoleTitle(selectedTherapistPortal)}，${getTimeGreeting()}您好~`)
              : (isAdmin ? '師傅專區' : '我的頁面')}
          </h2>
          {!isAdmin && (
            <p className="mt-0.5 text-base md:text-lg leading-[1.55] font-bold text-stone-500">
              歡迎回來!! 願今天的每一步，都踏實且不悔!! 讓我們一起把握當下，逐夢而行!!
            </p>
          )}
        </div>
      </div>

      {!selectedTherapistPortal && isAdmin && (
        <div className="bg-white p-12 rounded-xl border border-stone-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-stone-300" />
          </div>
              <h3 className="backend-page-title mb-2">請選擇一位師傅</h3>
              <p className="backend-page-subtitle max-w-xs mx-auto">請由上方「師傅專區」選擇您要檢視或管理的師傅專屬頁面內容。</p>
        </div>
      )}

      {/* Therapist Header with Stats */}
      {selectedTherapistPortal && (
        <div className="space-y-4">
          {(() => {
            const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
            const therapistOrdersRaw = orders.filter(o => 
              o.status !== 'cancelled' &&
              o.therapistPreference === selectedTherapistPortal
            );
            const therapistOrders = therapistOrdersRaw.map(o => {
              const itemsFiltered = (o.items || []).filter(item => item.courseId !== 'venue');
              const durationFiltered = itemsFiltered.reduce((sum, item) => sum + (item.duration || 0), 0);
              return {
                ...o,
                items: itemsFiltered,
                totalDuration: durationFiltered
              };
            }).filter(o => (o.items || []).length > 0);
            const monthlyOrders = therapistOrders.filter(o => o.date.startsWith(orderMonth));
            const todaysOrdersCount = therapistOrders.filter(o => o.date === todayStr).length;
            
            const totalMins = monthlyOrders.reduce((sum, o) => sum + o.totalDuration, 0);
            const totalHours = totalMins / 60;
            
            let massageMins = 0;
            let inbodyMins = 0;
            monthlyOrders.forEach(o => {
              (o.items || []).forEach(item => {
                if (item.name.includes('InBody')) {
                  inbodyMins += item.duration || 0;
                } else {
                  massageMins += item.duration || 0;
                }
              });
            });

            const massageHours = massageMins / 60;
            const inbodyHours = inbodyMins / 60;
            const baseSalary = (massageHours * 600) + (inbodyHours * 400);
            
            const goldMembers = members.filter(m => m.level === '金卡' && m.referredBy === selectedTherapistPortal && m.referredMonth === orderMonth);
            const blackMembers = members.filter(m => m.level === '黑卡' && m.referredBy === selectedTherapistPortal && m.referredMonth === orderMonth);
            const closingBonus = goldMembers.length * 1200 + blackMembers.length * 3000;
            const introducedMembers = members.filter(m => m.referredBy === selectedTherapistPortal && m.referredMonth === orderMonth);
            const introductionBonus = introducedMembers.length * 500;
            
            let completionBonus = 0;
            if (totalHours >= 96) completionBonus = 10500;
            else if (totalHours >= 48) completionBonus = 4500;
            else if (totalHours >= 24) completionBonus = 1500;
            const completionBonusFormula = totalHours >= 96
              ? '24小時1500 + 48小時3000 + 96小時6000'
              : totalHours >= 48
                ? '24小時1500 + 48小時3000'
                : totalHours >= 24
                  ? '24小時1500'
                  : '尚未達24小時';

            const expectedSalary = baseSalary + closingBonus + completionBonus + introductionBonus;

            const massageHoursStr = massageHours % 1 === 0 ? massageHours : massageHours.toFixed(1);
            const inbodyHoursStr = inbodyHours % 1 === 0 ? inbodyHours : inbodyHours.toFixed(1);
            const baseSalaryFormula = `${massageHoursStr}x600 + ${inbodyHoursStr}x400`;
            const closingBonusFormula = `${goldMembers.length}x1200 + ${blackMembers.length}x3000`;

            return (
              <div className="space-y-4">
                  {/* Main Highlight: Income overview header */}
                  <div 
                    onClick={() => setShowPortalStats(!showPortalStats)}
                    className="bg-white px-4 py-4 md:px-6 md:py-5 rounded-2xl shadow-sm border border-sage-100 flex items-center justify-between gap-3 hover:shadow-md transition relative overflow-hidden cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-[16px] md:text-xl font-black text-stone-900 tracking-normal leading-tight">
                        本月收入一覽表
                      </p>
                      <p className="text-[11px] md:text-xs text-stone-400 font-bold mt-1">
                        {showPortalStats ? '點擊收起收入明細' : '點擊展開收入明細'}
                      </p>
                    </div>
                    <div className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full bg-sage-50 border border-sage-100 flex items-center justify-center text-sage-700 group-hover:bg-sage-100 transition-colors">
                      <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 ${showPortalStats ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  {showPortalStats && (
                    <div className="grid grid-cols-3 gap-2.5 md:gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      {/* Block 1: 今日預約 */}
                      <button 
                        onClick={() => setViewingAppts('today')}
                        className="bg-white p-3 md:p-5 rounded-2xl border border-stone-200/80 text-center hover:border-emerald-400 hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm min-h-[130px] md:min-h-[160px]"
                      >
                        <div className="flex items-center justify-center gap-1 text-stone-400 group-hover:text-stone-600 transition-colors">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">今日預約</span>
                        </div>
                        <p className="text-xl md:text-3xl font-black text-stone-800 my-2">
                          {todaysOrdersCount}
                          <span className="text-[10px] md:text-xs ml-0.5 text-stone-400 font-normal">筆</span>
                        </p>
                        <p className="text-[9px] md:text-[10px] text-stone-400 group-hover:text-emerald-600 transition-colors font-medium">點擊查看今日詳情</p>
                      </button>

                      {/* Block 2: 本月預計薪資 */}
                      <div className="bg-white p-3 md:p-5 rounded-2xl border border-emerald-100 text-center flex flex-col justify-between shadow-sm min-h-[130px] md:min-h-[160px]">
                        <div className="flex items-center justify-center gap-1 text-stone-400">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">本月預計薪資</span>
                        </div>
                        <p className="text-xl md:text-3xl font-black text-emerald-700 my-2">
                          ${expectedSalary.toLocaleString()}
                        </p>
                        <p className="text-[9px] md:text-[10px] text-stone-400 font-medium">基本薪資＋獎金</p>
                      </div>

                      {/* Block 3: 本月累計預約 */}
                      <div className="bg-white p-3 md:p-5 rounded-2xl border border-stone-200/80 text-center flex flex-col justify-between shadow-sm min-h-[130px] md:min-h-[160px]">
                        <div className="flex items-center justify-center gap-1 text-stone-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">本月累計預約</span>
                        </div>
                        <p className="text-xl md:text-3xl font-black text-stone-800 my-2">
                          {monthlyOrders.length}
                          <span className="text-[10px] md:text-xs ml-0.5 text-stone-400 font-normal">筆</span>
                        </p>
                        <p className="text-[9px] md:text-[10px] text-stone-400 font-medium">本月排程總計</p>
                      </div>

                      {/* Block 4: 本月基本薪資 */}
                      <div className="bg-white p-3 md:p-5 rounded-2xl border border-stone-200/80 text-center grid grid-rows-[22px_34px_28px_1fr] md:grid-rows-[28px_46px_34px_1fr] shadow-sm min-h-[130px] md:min-h-[160px] hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-center gap-1 text-stone-400">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">本月基本薪資</span>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <p className="text-xl md:text-3xl font-black text-stone-800 leading-none">
                            ${baseSalary.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-start gap-0">
                          <p className="text-[9px] md:text-[10.5px] text-stone-400 font-medium leading-[0.62rem] md:leading-[0.72rem]">
                            {baseSalaryFormula}
                          </p>
                          <p className="text-[9px] md:text-[10.5px] text-stone-400 font-medium leading-[0.62rem] md:leading-[0.72rem] text-left inline-block">
                            = {baseSalary.toLocaleString()}
                          </p>
                        </div>

                        <div className="w-full flex justify-center border-t border-dashed border-stone-100 pt-2 mt-1">
                          <div className="w-full max-w-[210px] flex flex-col text-[10.5px] md:text-[11.5px] text-stone-500 font-medium">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-dashed border-stone-100/80 text-left gap-0.5 sm:gap-2">
                              <span className="text-stone-400 shrink-0 font-medium">按摩服務：</span>
                              <div className="flex items-center justify-between sm:justify-end flex-1 gap-1">
                                <span className="text-stone-600 font-bold whitespace-nowrap">{massageHoursStr}小時 x 600</span>
                                <span className="text-emerald-700 font-black text-right whitespace-nowrap">${(massageHours * 600).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-dashed border-stone-100/80 text-left gap-0.5 sm:gap-2">
                              <span className="text-stone-400 shrink-0 font-medium">InBody解說：</span>
                              <div className="flex items-center justify-between sm:justify-end flex-1 gap-1">
                                <span className="text-stone-600 font-bold whitespace-nowrap">{inbodyHoursStr}小時 x 400</span>
                                <span className="text-emerald-700 font-black text-right whitespace-nowrap">${(inbodyHours * 400).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Block 5: 本月完課獎金 / 介紹獎金 */}
                      <div className="bg-white p-3 md:p-5 rounded-2xl border border-stone-200/80 text-center grid grid-rows-[22px_34px_28px_1fr] md:grid-rows-[28px_46px_34px_1fr] shadow-sm min-h-[130px] md:min-h-[160px]">
                        <div className="flex items-center justify-center gap-1 text-stone-400">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">本月完課獎金</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <p className="text-xl md:text-3xl font-black text-stone-800 leading-none">
                            ${completionBonus.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-start gap-0">
                          <p className="text-[8.5px] md:text-[10px] text-stone-400 font-medium leading-[0.62rem] md:leading-[0.72rem]">
                            {completionBonusFormula}
                          </p>
                          <p className="text-[8.5px] md:text-[10px] text-stone-400 font-medium leading-[0.62rem] md:leading-[0.72rem]">
                            累計 {totalHours.toFixed(1)} 小時
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBonusModal({ therapist: selectedTherapistPortal, kind: 'introduction', month: orderMonth })}
                          className="w-full border-t border-dashed border-stone-100 pt-2 mt-1 grid grid-rows-[22px_1fr] md:grid-rows-[26px_1fr] rounded-b-lg transition hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        >
                          <div className="flex items-center justify-center gap-1 text-stone-400">
                            <Users className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">本月介紹獎金</span>
                          </div>
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-xl md:text-3xl font-black text-stone-800 leading-none mb-1.5">
                                ${introductionBonus.toLocaleString()}
                            </p>
                            <p className="text-[8.5px] md:text-[10px] text-stone-400 font-medium leading-[0.62rem] md:leading-[0.72rem]">
                              {introducedMembers.length}位 x 500
                            </p>
                          </div>
                        </button>
                      </div>

                      {/* Block 6: 本月締結獎金 */}
                      <div className="bg-white p-3 md:p-5 rounded-2xl border border-stone-200/80 text-center grid grid-rows-[22px_34px_28px_1fr] md:grid-rows-[28px_46px_34px_1fr] shadow-sm min-h-[130px] md:min-h-[160px] hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-center gap-1 text-stone-400">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">本月締結獎金</span>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <p className="text-xl md:text-3xl font-black text-stone-800 leading-none">
                            ${closingBonus.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-start gap-0">
                          <p className="text-[9px] md:text-[10.5px] text-stone-400 font-medium leading-[0.62rem] md:leading-[0.72rem]">
                            {closingBonusFormula}
                          </p>
                          <p className="text-[9px] md:text-[10.5px] text-stone-400 font-medium leading-[0.62rem] md:leading-[0.72rem] text-left inline-block">
                            = {closingBonus.toLocaleString()}
                          </p>
                        </div>

                        <div className="w-full flex justify-center border-t border-dashed border-stone-100 pt-2 mt-1">
                          <div className="w-full max-w-[210px] flex flex-col text-[10.5px] md:text-[11.5px] text-stone-500 font-medium">
                            <div 
                              onClick={() => setBonusModal({ therapist: selectedTherapistPortal, kind: 'gold', month: orderMonth })}
                              className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-dashed border-stone-100/80 cursor-pointer hover:bg-stone-50/50 transition duration-150 text-left gap-0.5 sm:gap-2"
                            >
                              <span className="text-stone-400 shrink-0 font-medium">金卡：</span>
                              <div className="flex items-center justify-between sm:justify-end flex-1 gap-1">
                                <span className="text-stone-600 font-bold whitespace-nowrap">{goldMembers.length}張 x 1200</span>
                                <span className="text-emerald-700 font-black text-right whitespace-nowrap">${(goldMembers.length * 1200).toLocaleString()}</span>
                              </div>
                            </div>
                            <div 
                              onClick={() => setBonusModal({ therapist: selectedTherapistPortal, kind: 'black', month: orderMonth })}
                              className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-dashed border-stone-100/80 cursor-pointer hover:bg-stone-50/50 transition duration-150 text-left gap-0.5 sm:gap-2"
                            >
                              <span className="text-stone-400 shrink-0 font-medium">黑卡：</span>
                              <div className="flex items-center justify-between sm:justify-end flex-1 gap-1">
                                <span className="text-stone-600 font-bold whitespace-nowrap">{blackMembers.length}張 x 3000</span>
                                <span className="text-emerald-700 font-black text-right whitespace-nowrap">${(blackMembers.length * 3000).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Therapist Schedule Management (Calendar UI) */}
      {selectedTherapistPortal && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="backend-page-title flex items-center gap-2">
              <Calendar className="w-5 h-5 text-stone-600" />
              排班管理
            </h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const d = new Date(copyMonthView);
                  d.setMonth(d.getMonth() - 1);
                  setCopyMonthView(d);
                }}
                className="p-1.5 hover:bg-stone-100 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5 text-stone-400" />
              </button>
              <span className="text-sm md:text-base font-bold text-stone-700">
                {copyMonthView.getFullYear()}年 {copyMonthView.getMonth() + 1}月
              </span>
              {(() => {
                const nextMonthObj = new Date(copyMonthView.getFullYear(), copyMonthView.getMonth() + 1, 1);
                const limitMonthObj = new Date(nowObj.getFullYear(), nowObj.getMonth() + 2, 1);
                const isNextDisabled = nextMonthObj >= limitMonthObj;
                return (
                  <button 
                    disabled={isNextDisabled}
                    onClick={() => {
                      const d = new Date(copyMonthView);
                      d.setMonth(d.getMonth() + 1);
                      setCopyMonthView(d);
                    }}
                    className={`p-1.5 rounded-lg transition ${isNextDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-stone-100'}`}
                  >
                    <ChevronRight className="w-5 h-5 text-stone-400" />
                  </button>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {['一','二','三','四','五','六','日'].map(d => (
              <div key={d} className="text-center text-[11px] md:text-xs font-bold text-stone-400 py-2 uppercase tracking-widest">{d}</div>
            ))}
            {(() => {
              const year = copyMonthView.getFullYear();
              const month = copyMonthView.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const days = [];
              
              for (let i = 0; i < adjustedFirstDay; i++) days.push(<div key={`empty-${i}`} />);
              
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isPast = dateStr < todayStr;
                const isBeyondLimit = dateStr > maxAllowedDateStr;
                const isDisabled = isPast || isBeyondLimit;
                const avail = availabilities.find(a => a.therapistName === selectedTherapistPortal && a.date === dateStr);
                const hasHours = avail && avail.slots && avail.slots.length > 0;
                
                days.push(
                  <button
                    key={dateStr}
                    onClick={() => {
                      if (isDisabled) return;
                      const rawSlots = avail ? avail.slots : [];
                      const expandedSlots: {start: string, end: string}[] = [];
                      rawSlots.forEach((range: any) => {
                        const rStart = timeToMins(range.start);
                        const rEnd = timeToMins(range.end);
                        ALL_TIME_SLOTS.forEach(time => {
                          const tMin = timeToMins(time);
                          if (tMin >= rStart && tMin < rEnd) {
                             expandedSlots.push({ start: time, end: minsToTime(tMin + 30) });
                          }
                        });
                      });
                      setEditingAvailability({ date: dateStr, slots: expandedSlots });
                    }}
                    className={`aspect-square p-1 md:p-2 rounded-xl flex flex-col items-center justify-between transition-all border relative ${isDisabled ? 'bg-stone-50 border-stone-100 opacity-40 cursor-not-allowed' : hasHours ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-white border-stone-100 hover:border-stone-300'}`}
                  >
                    <span className={`text-xs md:text-sm font-bold ${isDisabled ? 'text-stone-300' : hasHours ? 'text-emerald-600' : 'text-stone-400'}`}>{d}</span>
                    {hasHours && !isDisabled && (
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mb-1"></div>
                    )}
                  </button>
                );
              }
              return days;
            })()}
          </div>
          
          <div className="flex items-center gap-6 text-[11px] md:text-sm text-stone-400 font-medium px-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 bg-emerald-500 rounded-sm"></div>
              <span>已設服務時段</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 bg-white border border-stone-200 rounded-sm"></div>
              <span>尚未設定</span>
            </div>
          </div>
        </div>
      )}
        
          </div>
        )}

            {/* Editing Availability Modal */}
      {editingAvailability && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-4 md:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <div className="flex flex-col">
                <h3 className="font-bold text-stone-800 md:text-lg">設定服務時段</h3>
                <p className="text-[11px] md:text-xs text-stone-400">{editingAvailability.date.replace(/-/g, '/')}</p>
              </div>
              <button onClick={() => setEditingAvailability(null)} className="p-1.5 hover:bg-stone-200 rounded-full transition">
                <X className="w-5 h-5 md:w-6 md:h-6 text-stone-400" />
              </button>
            </div>
            <div className="p-4 lg:p-8">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <button 
                  onClick={() => {
                    const availableSlots = ALL_TIME_SLOTS.filter(time => {
                      return !db.getOrders().some(o => 
                        o.date === editingAvailability.date && 
                        o.status !== 'cancelled' && 
                        o.therapistPreference === selectedTherapistPortal &&
                        timeToMins(time) >= timeToMins(o.time) &&
                        timeToMins(time) < (timeToMins(o.time) + o.totalDuration)
                      );
                    });
                    setEditingAvailability({ 
                      ...editingAvailability, 
                       slots: availableSlots.map(time => ({ start: time, end: minsToTime(timeToMins(time) + 30) })) 
                    });
                  }}
                  className="flex-1 py-2 md:py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs md:text-sm font-bold transition"
                >
                  一鍵全選
                </button>
                <button 
                  onClick={() => setEditingAvailability({ ...editingAvailability, slots: [] })}
                  className="flex-1 py-2 md:py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs md:text-sm font-bold transition"
                >
                  全部取消
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
                {ALL_TIME_SLOTS.map(time => {
                   const isSelected = editingAvailability.slots.some(s => s.start === time);
                   const isBooked = db.getOrders().some(o => 
                    o.date === editingAvailability.date && 
                    o.status !== 'cancelled' && 
                    o.therapistPreference === selectedTherapistPortal &&
                    timeToMins(time) >= timeToMins(o.time) &&
                    timeToMins(time) < (timeToMins(o.time) + o.totalDuration)
                   );

                   return (
                     <button
                       key={time}
                       disabled={isBooked}
                       onClick={() => {
                         const current = editingAvailability.slots;
                         const updated = isSelected 
                           ? current.filter(s => s.start !== time)
                           : [...current, { start: time, end: minsToTime(timeToMins(time) + 30) }];
                         setEditingAvailability({ ...editingAvailability, slots: updated });
                       }}
                       className={`py-2.5 md:py-3.5 rounded-lg text-xs md:text-sm font-bold transition border ${isBooked ? 'bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed opacity-50' : isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                     >
                       {time}
                       {isBooked && <div className="text-[8px] font-normal leading-none mt-0.5">已約</div>}
                     </button>
                   );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex flex-col gap-2">
              <button 
                onClick={() => {
                  const ranges = consolidateAvailability(editingAvailability.slots.map(s => s.start));
                  handleSaveAvailability(editingAvailability.date, ranges);
                }}
                className="w-full py-3 md:py-4 bg-stone-800 text-white rounded-xl font-bold text-sm md:text-base tracking-widest hover:bg-stone-900 transition shadow-lg"
              >
                儲存設定
              </button>
              <button 
                onClick={() => setShowCopyCalendar(true)}
                className="w-full py-2.5 md:py-3.5 border border-stone-200 text-stone-600 rounded-xl font-bold text-[13px] md:text-sm hover:bg-stone-100 transition"
              >
                複製到其他日期...
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Availability Calendar Modal */}
      {showCopyCalendar && (
        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm md:max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-4 md:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-bold text-stone-800 text-sm md:text-lg">選擇要複製的日期</h3>
              <button onClick={() => { setShowCopyCalendar(false); setCopyTargetDates([]); }} className="p-1 hover:bg-stone-200 rounded-full transition">
                <X className="w-5 h-5 md:w-6 md:h-6 text-stone-400" />
              </button>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto">
              <div className="grid grid-cols-7 gap-1">
                {['一','二','三','四','五','六','日'].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-stone-400 py-1 uppercase">{d}</div>
                ))}
                {(() => {
                  const year = copyMonthView.getFullYear();
                  const month = copyMonthView.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const daysArr = [];
                  
                  for (let i = 0; i < adjustedFirstDay; i++) daysArr.push(<div key={`empty-copy-${i}`} />);
                  
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const isSelected = copyTargetDates.includes(dateStr);
                    const isPast = dateStr < todayStr;
                    const isBeyondLimit = dateStr > maxAllowedDateStr;
                    const isDisabled = isPast || isBeyondLimit;
                    
                    daysArr.push(
                      <button
                        key={`copy-${dateStr}`}
                        disabled={isDisabled}
                        onClick={() => {
                          setCopyTargetDates(prev => 
                            prev.includes(dateStr) 
                              ? prev.filter(x => x !== dateStr) 
                              : [...prev, dateStr]
                          );
                        }}
                        className={`aspect-square p-1 rounded-lg text-xs font-bold transition border ${isDisabled ? 'opacity-20 cursor-not-allowed border-transparent' : isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-stone-100 hover:border-stone-300 text-stone-600'}`}
                      >
                        {d}
                      </button>
                    );
                  }
                  return daysArr;
                })()}
              </div>
            </div>
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex flex-col gap-2">
              <button 
                onClick={handleBatchCopyAvailability}
                disabled={copyTargetDates.length === 0}
                className={`w-full py-3 rounded-xl font-bold text-sm tracking-widest transition shadow-lg ${copyTargetDates.length > 0 ? 'bg-stone-800 text-white hover:bg-stone-900' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
              >
                確認複製 ({copyTargetDates.length}天)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Lists Modal */}
      {viewingAppts && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-medium text-stone-800 flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-stone-500" />
                 {viewingAppts === 'today' ? '今日預約列表' : '所有歷史預約紀錄'}
              </h3>
              <button onClick={() => setViewingAppts(null)} className="p-1 hover:bg-stone-200 rounded-full transition">
                 <XCircle className="w-5 h-5 text-stone-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto grow bg-white">
              <div className="space-y-3">
                {(() => {
                  const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
                  const list = orders.filter(o => 
                    o.therapistPreference === selectedTherapistPortal && 
                    o.status !== 'cancelled' &&
                    (viewingAppts === 'today' ? o.date === todayStr : true)
                  ).sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

                  if (list.length === 0) return <div className="text-center py-20 text-stone-300">目前尚無紀錄</div>;

                  return list.map(o => {
                    const m = members.find(x => x.id === o.memberId);
                    const isEditingLog = editingServiceLogOrderId === o.id;
                    return (
                      <div key={o.id} className="flex flex-col p-4 border border-stone-100 rounded-xl hover:bg-stone-50/50 transition border-l-4 border-l-emerald-500 shadow-sm space-y-4">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className="text-center min-w-[60px]">
                                <div className="text-[10px] text-stone-400">{o.date}</div>
                                <div className="text-lg font-bold text-stone-800">{o.time}</div>
                              </div>
                              <div>
                                <div className="font-medium text-stone-800">{m?.name || '客戶'}</div>
                                <div className="text-xs text-stone-400">時長：{o.totalDuration} 分鐘</div>
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {(o.items || []).map((item, idx) => (
                                <span key={idx} className="px-2 py-1 bg-stone-100 text-stone-500 rounded text-[10px]">{item.name}</span>
                              ))}
                           </div>
                           <button 
                              onClick={() => setEditingServiceLogOrderId(isEditingLog ? null : o.id)}
                              className={`text-xs font-medium px-3 py-1.5 border rounded-lg whitespace-nowrap transition-all ${
                                isEditingLog 
                                  ? 'text-stone-700 bg-stone-100 border-stone-200' 
                                  : 'text-emerald-700 hover:text-emerald-800 border-emerald-100 bg-emerald-50 hover:bg-emerald-100/60'
                              }`}
                            >
                              當次服務紀錄
                            </button>
                         </div>

                         {isEditingLog && (
                           <div className="pt-4 border-t border-stone-100 space-y-4 animate-fadeIn">
                             {/* Discomfort Areas checklist */}
                             <div className="space-y-2">
                               <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest block">不適部位調整</span>
                               <div className="flex flex-wrap gap-1.5">
                                 {['頭','頸','肩','上背','下背','臀','大腿','小腿','足','胸','腹','手'].map(area => (
                                   <label key={area} className={`flex items-center px-2 py-1 rounded-lg cursor-pointer transition-colors border text-xs font-medium ${o.discomfortAreas?.includes(area) ? 'bg-sage-800 text-white border-sage-800' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
                                     <input 
                                       type="checkbox" 
                                       checked={o.discomfortAreas?.includes(area) || false} 
                                       onChange={e => {
                                         const current = o.discomfortAreas || [];
                                         db.updateOrder(o.id, { discomfortAreas: e.target.checked ? [...current, area] : current.filter(x => x !== area) });
                                         setOrders(db.getOrders());
                                       }}
                                       className="hidden" 
                                     />
                                     <span>{area}</span>
                                   </label>
                                 ))}
                               </div>
                             </div>

                             {/* Note textarea */}
                             <div className="space-y-1.5">
                               <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest block">服務紀錄與備註</span>
                               <textarea
                                 className="w-full min-h-[90px] p-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 resize-none transition bg-white"
                                 placeholder="請輸入針對此次服務的紀錄、按摩力道偏好或調配精油等備註..."
                                 defaultValue={o.note || ''}
                                 onBlur={(e) => {
                                   db.updateOrder(o.id, { note: e.target.value });
                                   setOrders(db.getOrders());
                                 }}
                               />
                               <div className="flex justify-between items-center text-[10px] text-stone-400 italic font-medium">
                                 <span>※ 點擊輸入框外即會自動儲存</span>
                                 <span className="text-emerald-600 font-bold">✓ 自動儲存</span>
                               </div>
                             </div>
                           </div>
                         )}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {bonusModal && (() => {
        const tAuthName = bonusModal.therapist;
        const bonusKind = bonusModal.kind;
        const targetMonth = bonusModal.month;
        const bonusConfig = bonusKind === 'introduction'
          ? { title: '本月介紹獎金', unit: 500, unitLabel: '每位 500 元', tone: 'emerald' }
          : bonusKind === 'gold'
            ? { title: '金卡締結獎金', unit: 1200, unitLabel: '每張 1,200 元', tone: 'amber' }
            : { title: '黑卡締結獎金', unit: 3000, unitLabel: '每張 3,000 元', tone: 'stone' };
        const levelMembers = members.filter(member => {
          if (member.referredBy !== tAuthName || member.referredMonth !== targetMonth) return false;
          if (bonusKind === 'introduction') return true;
          if (bonusKind === 'gold') return member.level === '金卡' || member.memberLevel === '金卡' || member.selectedIdentities?.includes('gold');
          return member.level === '黑卡' || member.memberLevel === '黑卡' || member.selectedIdentities?.includes('black');
        });
        const totalBonus = levelMembers.length * bonusConfig.unit;
        const monthLabel = targetMonth ? `${targetMonth.slice(0, 4)}年${parseInt(targetMonth.slice(5, 7), 10)}月` : '本月份';
        const summaryTone = bonusConfig.tone === 'amber'
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : bonusConfig.tone === 'stone'
            ? 'bg-stone-800 border-stone-800 text-white'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950';

        return (
          <div className="fixed inset-0 z-[300] bg-stone-950/55 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setBonusModal(null)}>
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[82vh] flex flex-col overflow-hidden border border-white/60" onClick={e => e.stopPropagation()}>
              <div className="px-5 pt-5 pb-4 border-b border-stone-100 flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-stone-400 mb-1">{monthLabel} · {tAuthName}</div>
                  <h3 className="font-black text-[19px] leading-tight text-stone-900">{bonusConfig.title}</h3>
                </div>
                <button type="button" aria-label="關閉" onClick={() => setBonusModal(null)} className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition">
                   <XCircle className="w-4.5 h-4.5"/>
                </button>
              </div>
              <div className="px-5 pt-4">
                <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 ${summaryTone}`}>
                  <div>
                    <div className="text-[11px] font-black opacity-65">{bonusConfig.unitLabel}</div>
                    <div className="mt-0.5 text-sm font-black">共 {levelMembers.length}{bonusKind === 'introduction' ? '位' : '張'}</div>
                  </div>
                  <div className="text-xl font-black whitespace-nowrap">NT${totalBonus.toLocaleString()}</div>
                </div>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-2.5 custom-scrollbar">
                 {levelMembers.length === 0 ? (
                   <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-5 py-10 text-center">
                     <Users className="w-7 h-7 mx-auto text-stone-300 mb-2" />
                     <p className="text-sm font-black text-stone-500">本月份尚無名單</p>
                     <p className="mt-1 text-[11px] font-bold text-stone-400">符合條件的會員會自動顯示於此</p>
                   </div>
                 ) : levelMembers.map(member => {
                   const memberIdentity = getMemberIdentityLabels(member)[0] || member.level;
                   return (
                    <div key={member.id} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 p-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50/70 transition shadow-sm">
                       <div className="w-[38px] h-[38px] rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-black text-stone-700">
                         {member.name.slice(0, 1)}
                       </div>
                       <div className="min-w-0">
                         <div className="flex items-center gap-1.5 min-w-0">
                           <p className="font-black text-sm text-stone-900 truncate">{member.name}</p>
                           <span className="shrink-0 text-[9px] font-bold text-stone-400">{memberIdentity}</span>
                         </div>
                         <p className="mt-0.5 text-[12px] font-bold text-stone-500 whitespace-nowrap">{member.id}</p>
                       </div>
                       <div className="text-right whitespace-nowrap">
                         <div className="text-[10px] font-bold text-stone-400">單筆獎金</div>
                         <div className="text-sm font-black text-emerald-700">+{bonusConfig.unit.toLocaleString()}元</div>
                       </div>
                    </div>
                   );
                 })}
              </div>
              <div className="px-5 py-4 border-t border-stone-100 bg-stone-50/70">
                 <button type="button" onClick={() => setBonusModal(null)} className="w-full h-10 bg-stone-900 text-white rounded-md text-sm font-black hover:bg-stone-800 transition">關閉名單</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-medium text-stone-800">{confirmAction.onConfirm ? '確認操作' : '系統提示'}</h3>
            <p className="text-stone-600 whitespace-pre-wrap">{confirmAction.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmAction(null)}
                className={confirmAction.onConfirm ? "px-4 py-2 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition" : "px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition"}
              >
                {confirmAction.onConfirm ? '取消' : '確定'}
              </button>
              {confirmAction.onConfirm && (
                <button
                  onClick={() => {
                    confirmAction.onConfirm!();
                    setConfirmAction(null);
                  }}
                  className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition"
                >
                  確定
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rescheduling Modal */}
      {reschedulingId && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-6">
            <h3 className="text-xl font-medium text-stone-800 text-center">修改預約時間</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">選擇日期</label>
                <div className="relative w-full cursor-pointer">
                  <input 
                    type="date" 
                    value={rescheduleDate} 
                    onChange={e=>setRescheduleDate(e.target.value)} 
                    onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    style={{ colorScheme: 'light' }}
                  />
                  <div className="w-full p-3 border border-stone-200 rounded-lg focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-400 bg-stone-50 transition flex items-center justify-between pointer-events-none">
                    <span className={rescheduleDate ? "text-stone-800" : "text-stone-400"}>{rescheduleDate ? rescheduleDate.replace(/-/g, '/') : '年/月/日'}</span>
                    <CalendarDays className="w-5 h-5 text-stone-400" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">選擇時間 (10:00 - 22:00)</label>
                <select 
                  value={rescheduleTime} 
                  onChange={e=>setRescheduleTime(e.target.value)} 
                  className="w-full p-3 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 bg-stone-50 transition cursor-pointer appearance-none"
                >
                  <option value="" disabled>請選擇時間</option>
                  {ALL_TIME_SLOTS.map(t => {
                    const targetOrder = orders.find(o => o.id === reschedulingId);
                    const durationMins = targetOrder ? targetOrder.totalDuration : 0;
                    const isAvailable = timeToMins(t) + durationMins <= (22 * 60); // Max end time is 22:00
                    return isAvailable && <option key={t} value={t}>{t}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setReschedulingId(null)}
                className="flex-1 py-3 border border-stone-200 text-stone-600 font-medium rounded-xl hover:bg-stone-50 transition"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (reschedulingId) {
                    submitReschedule(reschedulingId);
                  }
                }}
                className="flex-1 py-3 bg-stone-800 text-white font-medium rounded-xl hover:bg-stone-700 transition shadow-md"
              >
                確定改期
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
