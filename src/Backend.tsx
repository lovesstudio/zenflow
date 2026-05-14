import React, { useState, useEffect } from 'react';
import { db, Member, Order, MemberLevel, timeToMins, minsToTime, Gender, ALL_TIME_SLOTS, sortOrderItems, TherapistAvailability } from './store';
import { Trash2, TrendingUp, Users, Calendar, DollarSign, Clock, Search, CheckCircle, XCircle, CalendarDays, Lock, LogOut, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Plus, User, X } from 'lucide-react';

const getZodiacSign = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('-')) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!month || !day) return '';
  const signs = ["摩羯座", "水瓶座", "雙魚座", "牡羊座", "金牛座", "雙子座", "巨蟹座", "獅子座", "處女座", "天秤座", "天蠍座", "射手座", "摩羯座"];
  const cutoffs = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 22, 22];
  return (day >= cutoffs[month - 1]) ? signs[month] : signs[month - 1];
};

const getAge = (dateStr: string) => {
  if (!dateStr) return '';
  const today = new Date();
  const birthDate = new Date(dateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? `${age}歲` : '';
};

const stripGender = (name: string) => name ? name.replace(/\(男\)|\(女\)|（男）|（女）/g, '').trim() : '';

const sortMembers = (list: Member[]) => [...list].sort((a,b) => (b.createdAt - a.createdAt) || b.id.localeCompare(a.id));
const sortOrders = (list: Order[]) => [...list].sort((a,b) => b.createdAt - a.createdAt);

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
  const [authedUser, setAuthedUser] = useState<{ role: 'admin' | 'therapist', name?: string, phone?: string } | null>(null);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [tab, setTab] = useState<'orders' | 'members' | 'calendar' | 'therapist'>('calendar');
  const [orderViewMode, setOrderViewMode] = useState<'list' | 'byTherapist'>('list');
  const [orderMonth, setOrderMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewingTherapistStats, setViewingTherapistStats] = useState<{therapist: string, orders: Order[]} | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [logMonthFilter, setLogMonthFilter] = useState<string>('');
  const [bonusModal, setBonusModal] = useState<{ therapist: string, level: MemberLevel, month: string } | null>(null);

  const [selectedTherapistPortal, setSelectedTherapistPortal] = useState<string>('');
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [editingAvailability, setEditingAvailability] = useState<{ date: string, slots: {start: string, end: string}[] } | null>(null);
  const [showPortalStats, setShowPortalStats] = useState(false);
  const [viewingAppts, setViewingAppts] = useState<'today' | 'all' | null>(null);
  const [copyTargetDates, setCopyTargetDates] = useState<string[]>([]);
  const [showCopyCalendar, setShowCopyCalendar] = useState(false);
  const [copyMonthView, setCopyMonthView] = useState(new Date());

  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
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
      } else if (parsed.role === 'admin' && parsed.name) {
        setSelectedTherapistPortal(parsed.name);
      }
    }
  }, []);

  useEffect(() => {
    if (authedUser?.role === 'therapist' && authedUser.name) {
      setTab('therapist');
      setSelectedTherapistPortal(authedUser.name);
    }
  }, [authedUser]);

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
      if (user.name && user.name !== '系統管理員') {
        setSelectedTherapistPortal(user.name);
      }
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
    localStorage.removeItem('zf_authed_user');
    setAuthedUser(null);
  };

  const handleShare = (o: Order) => {
    const m = members.find(x => x.id === o.memberId);
    const endTime = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
    
    const itemDurations: Record<string, number> = {};
    o.items.forEach(item => {
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
  const [editPhone, setEditPhone] = useState('');
  const [editLevel, setEditLevel] = useState<MemberLevel>('一般');
  const [editReferredBy, setEditReferredBy] = useState('');
  const [editReferredMonth, setEditReferredMonth] = useState('');
  const [editPrimaryTherapist, setEditPrimaryTherapist] = useState('');
  const [editMembershipStartDate, setEditMembershipStartDate] = useState('');
  const [editMembershipEndDate, setEditMembershipEndDate] = useState('');
  const [editRole, setEditRole] = useState<'member' | 'therapist' | 'admin'>('member');
  const [editRoles, setEditRoles] = useState<('member' | 'therapist' | 'admin')[]>(['member']);
  const [editTherapistName, setEditTherapistName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Polling to simulate real-time updates from LocalStorage
  useEffect(() => {
    // Initial sync
    db.syncMembers().then(data => setMembers(sortMembers(data)));
    db.syncOrders().then(data => setOrders(sortOrders(data)));
    db.syncAvailability().then(setAvailabilities);

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

  const todayStr = new Date().toISOString().split('T')[0];
  const filterDateStr = todayStr; // Simplified for now, could add date picker
  
  // scheduledOrders are orders that are scheduled for today (for the calendar view)
  const todaysOrders = orders.filter(o => o.date === filterDateStr && o.status !== 'cancelled');
  
  // Orders created today (for revenue metrics if desired, though normally revenue is based on scheduled date)
  // Let's base revenue on today's non-cancelled scheduled orders
  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + o.finalPrice, 0);
  
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
    setEditBirthday(m.birthday);
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
    
    copyTargetDates.forEach(date => {
        const availability: TherapistAvailability = {
            id: `${selectedTherapistPortal}_${date}`,
            therapistName: selectedTherapistPortal,
            date: date,
            slots: editingAvailability.slots
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
    } else {
      setExpandedMemberId(m.id);
      setEditingNote(m.note || '');
      setEditName(m.name);
      setEditLineId(m.lineId || '');
      setEditGender(m.gender || '女');
      setEditBirthday(m.birthday);
      setEditPhone(m.id);
      setEditLevel(m.level);
      setEditReferredBy(m.referredBy || '');
      setEditReferredMonth(m.referredMonth || '');
      setEditPrimaryTherapist(m.primaryTherapist || '');
      setEditMembershipStartDate(m.membershipStartDate || '');
      setEditMembershipEndDate(m.membershipEndDate || '');
      setEditRole(m.role || 'member');
      setEditRoles(m.roles || (m.role ? [m.role] : ['member']));
      setEditTherapistName(m.therapistName || '');
      setEditPassword(m.password || '');
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
      overrides.roles ?? editRoles
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

  if (!authedUser) {
    return (
      <div className="bg-stone-50 min-h-screen text-stone-800 font-sans flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full animate-in zoom-in">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-stone-100 text-stone-800 rounded-full">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-medium text-center text-stone-800 mb-6 font-sans">ZEN FLOW 登入系統</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-stone-600 mb-2">帳號 (手機號碼 或 admin)</label>
              <input
                type="text"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                className="w-full p-3 border border-stone-200 rounded-xl focus:border-stone-500 outline-none transition text-center text-lg"
                placeholder="手機號碼 / admin"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-2">密碼</label>
              <input
                type="password"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                className="w-full p-3 border border-stone-200 rounded-xl focus:border-stone-500 outline-none transition text-center tracking-[0.5em] text-lg font-mono"
                placeholder="••••••"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition font-medium">
              登入
            </button>
            <p className="text-xs text-stone-400 text-center mt-4">師傅登入請輸入會員帳號與專屬密碼</p>
          </div>
        </form>
        {confirmAction && (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-6">
              <h3 className="text-lg font-medium text-stone-800">系統提示</h3>
              <p className="text-stone-600 whitespace-pre-wrap">{confirmAction.message}</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setConfirmAction(null)} 
                  className="flex-1 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isAdmin = authedUser.role === 'admin';

  return (
    <div className="bg-stone-50 min-h-screen text-stone-800 font-sans">
      <div className="bg-stone-900 text-stone-100 px-6 py-6 md:py-8 flex flex-col items-center shadow-md gap-4 md:gap-6">
        <div className="w-full flex justify-between items-center border-b border-stone-800 pb-4 mb-2">
          <h1 className="text-xl md:text-[42px] font-black tracking-tighter md:leading-none">
            ZEN FLOW 
            <span className="text-stone-500 text-[10px] md:text-xl ml-4 font-bold uppercase tracking-widest md:inline hidden">
              {isAdmin ? 'Management Center' : `${authedUser.name || 'Therapist'} 老師專屬頁面`}
            </span>
          </h1>
          <div className="flex items-center gap-3">
            {!isAdmin && <span className="text-stone-400 text-xs md:text-base font-medium mr-2">{authedUser.name} 老師</span>}
            <button onClick={handleLogout} className="p-2 md:p-3 text-stone-500 hover:text-white transition bg-white/5 rounded-lg md:rounded-xl">
              <LogOut className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
        
        <div className="w-full flex items-center justify-center md:justify-start gap-2 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={()=>setTab('calendar')} 
            className={`w-[75px] md:w-[100px] h-9 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl text-[13px] md:text-base transition whitespace-nowrap font-bold shrink-0 ${tab==='calendar'?'bg-stone-100 text-stone-900 shadow-xl':'text-stone-500 hover:text-stone-200'}`}
          >
            預約列表
          </button>
          
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button 
                onClick={()=>setTab('orders')} 
                className={`w-[75px] md:w-[100px] h-9 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl text-[13px] md:text-base transition whitespace-nowrap font-bold shrink-0 ${tab==='orders'?'bg-stone-100 text-stone-900 shadow-xl':'text-stone-500 hover:text-stone-200'}`}
              >
                訂單管理
              </button>
              <button 
                onClick={()=>setTab('members')} 
                className={`w-[75px] md:w-[100px] h-9 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl text-[13px] md:text-base transition whitespace-nowrap font-bold shrink-0 ${tab==='members'?'bg-stone-100 text-stone-900 shadow-xl':'text-stone-500 hover:text-stone-200'}`}
              >
                會員系統
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setTab('therapist')} 
            className={`w-[75px] md:w-[100px] h-9 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl text-[13px] md:text-base transition whitespace-nowrap font-bold shrink-0 ${tab==='therapist' ? 'bg-emerald-500 text-white shadow-lg' : 'text-stone-500 hover:text-stone-200'}`}
          >
            {isAdmin ? '師傅專區' : '個人專區'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-10">
        {tab === 'calendar' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden p-6">
            {isAdmin && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 mb-8 md:mb-10">
                <div className="bg-white p-3 md:p-8 rounded-xl md:rounded-3xl border border-stone-200 shadow-sm flex items-center gap-4">
                  <div className="p-2 md:p-5 bg-green-50 text-green-700 rounded-lg md:rounded-2xl shrink-0"><DollarSign className="w-3.5 h-3.5 md:w-8 md:h-8"/></div>
                  <div className="flex flex-col">
                    <p className="text-stone-400 text-[11px] md:text-[14px] uppercase font-black tracking-wider leading-none mb-1 md:mb-3">今日營業額</p>
                    <p className="text-sm md:text-4xl font-black text-stone-900 leading-none">NT$ {todaysRevenue}</p>
                  </div>
                </div>
                <div className="bg-white p-3 md:p-8 rounded-xl md:rounded-3xl border border-stone-200 shadow-sm flex items-center gap-4">
                  <div className="p-2 md:p-5 bg-blue-50 text-blue-700 rounded-lg md:rounded-2xl shrink-0"><Calendar className="w-3.5 h-3.5 md:w-8 md:h-8"/></div>
                  <div className="flex flex-col">
                    <p className="text-stone-400 text-[11px] md:text-[14px] uppercase font-black tracking-wider leading-none mb-1 md:mb-3">今日訂單數</p>
                    <p className="text-sm md:text-4xl font-black text-stone-900 leading-none">{todaysOrders.length} <span className="text-xs md:text-base text-stone-400 font-bold">筆</span></p>
                  </div>
                </div>
                <div className="bg-white p-3 md:p-8 rounded-xl md:rounded-3xl border border-stone-200 shadow-sm flex items-center gap-4">
                  <div className="p-2 md:p-5 bg-purple-50 text-purple-700 rounded-lg md:rounded-2xl shrink-0"><TrendingUp className="w-3.5 h-3.5 md:w-8 md:h-8"/></div>
                  <div className="flex flex-col">
                    <p className="text-stone-400 text-[11px] md:text-[14px] uppercase font-black tracking-wider leading-none mb-1 md:mb-3">累計總訂單</p>
                    <p className="text-sm md:text-4xl font-black text-stone-900 leading-none">{orders.length} <span className="text-xs md:text-base text-stone-400 font-bold">筆</span></p>
                  </div>
                </div>
                <div className="bg-white p-3 md:p-8 rounded-xl md:rounded-3xl border border-stone-200 shadow-sm flex items-center gap-4">
                  <div className="p-2 md:p-5 bg-amber-50 text-amber-700 rounded-lg md:rounded-2xl shrink-0"><Users className="w-3.5 h-3.5 md:w-8 md:h-8"/></div>
                  <div className="flex flex-col">
                    <p className="text-stone-400 text-[11px] md:text-[14px] uppercase font-black tracking-wider leading-none mb-1 md:mb-3">總會員數</p>
                    <p className="text-sm md:text-4xl font-black text-stone-900 leading-none">{members.length} <span className="text-xs md:text-base text-stone-400 font-bold">人</span></p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {ALL_THERAPIST_CATEGORIES.map(category => {
                const categoryOrders = orders.filter(o => 
                  o.date >= todayStr && 
                  o.status !== 'cancelled' &&
                  (category === '不指定按摩師' 
                    ? (!o.therapistPreference || o.therapistPreference === '不指定按摩師' || o.therapistPreference === '男按摩師即可' as any || o.therapistPreference === '女按摩師即可' as any)
                    : o.therapistPreference === category)
                ).sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

                const isExpanded = expandedTherapists.has(category);

                return (
                  <div key={category} className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                    <button 
                        onClick={() => toggleTherapistExpand(category)}
                        className={`w-full flex items-center justify-between py-2.5 px-4 text-left transition-colors ${isExpanded ? 'bg-stone-50' : 'hover:bg-stone-50/50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-800/40"></div>
                            <span className="font-bold text-stone-800 text-sm md:text-xl tracking-tight">{stripGender(category)}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${categoryOrders.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-400'}`}>
                                {categoryOrders.length} 筆
                            </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    
                    <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[5000px] opacity-100 border-t border-stone-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-4 space-y-3 bg-stone-50/30">
                            {categoryOrders.length === 0 ? (
                                <p className="text-xs text-stone-400 py-6 text-center italic">目前沒有安排在這個分類的預約</p>
                            ) : (
                                categoryOrders.map(o => {
                                    const m = members.find(x => x.id === o.memberId);
                                    const endTime = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                                    return (
                                        <div key={o.id} className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col hover:border-stone-400 transition-all ${o.status === 'completed' ? 'opacity-50 grayscale border-stone-100' : 'border-stone-200'}`}>
                                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                              <div className="flex flex-col gap-2 shrink-0">
                                                <div className="bg-stone-800 text-stone-50 px-2 py-1 rounded-lg text-[11px] font-bold text-center">
                                                  {o.date.replace(/-/g, '/')}
                                                </div>
                                                <div className="bg-stone-100 text-stone-700 px-2 py-1.5 rounded-lg text-xs md:text-sm text-center font-bold flex flex-col justify-center border border-stone-200">
                                                  <span>{o.time}~{endTime}</span>
                                                  <span className="text-[10px] md:text-xs text-stone-400 font-normal mt-0.5">({o.totalDuration}分)</span>
                                                </div>
                                                
                                                <div className="mt-1 flex flex-col gap-1.5">
                                                  {category === '不指定按摩師' && (
                                                    <div className="text-[10px] flex flex-col gap-1 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                                                      <span className="text-amber-800 font-bold">分派：</span>
                                                      <select 
                                                        className="bg-white border border-amber-200 outline-none rounded p-1 text-stone-700 cursor-pointer shadow-sm text-[10px] w-full"
                                                        onChange={(e) => {
                                                          if (e.target.value) {
                                                            db.updateOrder(o.id, { therapistPreference: e.target.value as any, isAssignedByShop: true });
                                                            setOrders(db.getOrders());
                                                          }
                                                        }}
                                                        value=""
                                                      >
                                                        <option value="" disabled>選擇安排</option>
                                                        {THERAPISTS_W_GENDER.map(t => (
                                                          <option key={t} value={t}>{t}</option>
                                                        ))}
                                                      </select>
                                                    </div>
                                                  )}
                                                  
                                                  {category !== '不指定按摩師' && (!o.status || o.status === 'pending') && (
                                                    <div className="text-[10px] flex flex-col gap-1 bg-stone-50 p-1.5 rounded-lg border border-stone-200">
                                                      <span className="text-stone-600 font-bold">代班：</span>
                                                      <select 
                                                        className="bg-white border border-stone-200 outline-none rounded p-1 text-stone-700 cursor-pointer shadow-sm text-[10px] w-full"
                                                        onChange={(e) => {
                                                          if (e.target.value) {
                                                            db.updateOrder(o.id, { therapistPreference: e.target.value as any });
                                                            setOrders(db.getOrders());
                                                          }
                                                        }}
                                                        value=""
                                                      >
                                                        <option value="" disabled>代班..</option>
                                                        {THERAPISTS_W_GENDER.map(t => (
                                                          t !== category && <option key={t} value={t}>{t}</option>
                                                        ))}
                                                      </select>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                  <p className="text-base md:text-xl font-bold text-stone-800 cursor-pointer hover:underline truncate" onClick={() => openCustomerModal(m)}>
                                                    {stripGender(m?.name || '未知客戶')}
                                                  </p>
                                                  <span className="text-stone-400 text-xs font-mono">{o.memberId}</span>
                                                  {o.isAssignedByShop && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">店家分派</span>}
                                                </div>

                                                <div className="space-y-1.5 mb-3">
                                                  {sortOrderItems(o.items).map((i, idx) => (
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

                                            <div className="lg:ml-4 flex flex-col justify-between items-start lg:items-end gap-3 shrink-0">
                                              <div className="flex items-center gap-3 w-full lg:w-auto justify-between">
                                                <p className="text-lg font-black text-stone-900">NT$ {o.finalPrice}</p>
                                                <div className="flex flex-wrap gap-2">
                                                  {o.status === 'completed' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">已完成</span>}
                                                  {o.status === 'cancelled' && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">已取消</span>}
                                                  {o.isConfirmed && (!o.status || o.status === 'pending') && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">出席確認</span>}
                                                </div>
                                              </div>

                                              <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
                                                  {(!o.status || o.status === 'pending') && (
                                                    <>
                                                      {!o.isConfirmed && (
                                                        <button onClick={() => {
                                                            db.updateOrder(o.id, { isConfirmed: true });
                                                            setOrders(db.getOrders());
                                                          }} className="text-[11px] px-3 py-2 bg-stone-800 text-white font-bold rounded-lg hover:bg-stone-700 transition active:scale-95 shadow-sm">
                                                          出席確認
                                                        </button>
                                                      )}
                                                      <button onClick={() => {
                                                        setRescheduleDate(o.date);
                                                        setRescheduleTime(o.time);
                                                        setReschedulingId(o.id);
                                                      }} className="text-[11px] px-3 py-2 border border-stone-200 bg-white text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition active:scale-95 shadow-sm flex items-center">
                                                        <CalendarDays className="w-3.5 h-3.5 mr-1 text-stone-400" />
                                                        改期
                                                      </button>
                                                      <button onClick={() => handleCompleteOrder(o.id)} className="text-[11px] px-3 py-2 border border-stone-200 bg-white text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition active:scale-95 shadow-sm flex items-center">
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-stone-400" />
                                                        完成服務
                                                      </button>
                                                      <button onClick={() => handleShare(o)} className="text-[11px] px-3 py-2 border border-stone-200 bg-white text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition active:scale-95 shadow-sm">
                                                        分享
                                                      </button>
                                                      <button onClick={() => handleCancelOrder(o.id)} className="w-full lg:w-auto text-[10px] py-1 text-stone-400 hover:text-red-500 font-bold transition">
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
                                                  <label key={area} className={`flex items-center px-1.5 py-0.5 rounded cursor-pointer transition-colors border ${o.discomfortAreas?.includes(area) ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-100 hover:border-stone-200'}`}>
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
              })}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex flex-col md:flex-row md:justify-between md:items-center bg-stone-50 gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[14px] font-bold text-stone-800">所有預約紀錄</h2>
                <div className="flex bg-stone-200/50 p-1 rounded-lg">
                  <button onClick={() => setOrderViewMode('list')} className={`px-3 py-1 text-[11.5px] rounded transition ${orderViewMode === 'list' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>時間排序</button>
                  <button onClick={() => setOrderViewMode('byTherapist')} className={`px-3 py-1 text-[11.5px] rounded transition ${orderViewMode === 'byTherapist' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>按摩師統計</button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="month" 
                  value={orderMonth} 
                  onChange={e => setOrderMonth(e.target.value)} 
                  className="px-2 py-1 text-sm border border-stone-200 rounded outline-none"
                />
                <span className="text-xs text-stone-500 flex items-center hidden md:flex"><Clock className="w-3 h-3 mr-1"/> 每秒自動更新</span>
              </div>
            </div>
            
            {orderViewMode === 'list' && (
              <div className="flex flex-col">
                <div className="bg-stone-50/80 px-6 py-2 border-b border-stone-200 flex items-center text-[11px] font-bold text-stone-400 uppercase tracking-widest sticky top-0 z-10">
                  <div className="w-[35px] text-center text-[11px]">完成</div>
                  <div className="w-[140px] px-4 font-bold leading-tight flex flex-col">
                    <span className="text-[11px]">預約日期及時間</span>
                    <span className="text-[11px]">顧客及電話</span>
                  </div>
                  <div className="flex-1 px-2 font-bold whitespace-nowrap text-[11px]">服務按摩師</div>
                  <div className="w-[24px]"></div>
                </div>
                <div className="divide-y divide-stone-100">
                  {orders
                    .filter(o => o.date.startsWith(orderMonth))
                    .sort((a,b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))
                    .map(o => {
                      const m = members.find(x => x.id === o.memberId);
                      const endTimeStr = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                      const isExpanded = expandedOrderIds.has(o.id);

                      const nowMs = new Date().getTime();
                      const orderEndMs = new Date(`${o.date}T${endTimeStr || '23:59'}:00`).getTime();
                      const isPast = orderEndMs < nowMs;

                      return (
                        <div key={o.id} className={`transition-all ${o.status === 'completed' ? 'bg-emerald-50/20' : (o.status === 'cancelled' || isPast) ? 'bg-stone-50/50 opacity-70' : 'bg-white'} hover:bg-stone-50 group`}>
                          <div className="flex items-center px-6 py-4 cursor-pointer" onClick={() => toggleOrderExpand(o.id)}>
                            <div className="w-[35px] flex justify-center" onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={o.status === 'completed'} 
                                onChange={(e) => toggleOrderStatus(o.id, e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-stone-800 rounded border-stone-300"
                                disabled={o.status === 'cancelled'}
                              />
                            </div>
                            <div className="w-[140px] px-4 flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 overflow-visible">
                                <span className={`text-[10px] font-bold whitespace-nowrap ${o.status === 'completed' ? 'text-stone-400' : 'text-stone-800'}`}>
                                  {o.date.replace(/-/g, '/')}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border border-stone-200 font-bold whitespace-nowrap shrink-0 ${o.status === 'completed' ? 'text-stone-300 border-stone-100' : 'text-stone-600 bg-stone-50/50'}`}>
                                  {(o.totalDuration / 60) % 1 === 0 ? (o.totalDuration / 60) : (o.totalDuration / 60).toFixed(1)}小時
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-[12px] font-black ${o.status === 'completed' ? 'text-stone-400' : 'text-stone-900'}`}>
                                  {m?.name || '未知客戶'}
                                </span>
                                {o.isAssignedByShop && <span className={`text-[10px] ${o.status === 'completed' ? 'bg-stone-100 text-stone-400' : 'bg-amber-100 text-amber-700'} px-1 py-0.5 rounded-full font-bold`}>分</span>}
                                {o.status === 'cancelled' && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1 py-0.5 rounded-full">消</span>}
                              </div>
                              <div className={`text-[10px] font-mono ${o.status === 'completed' ? 'text-stone-300' : 'text-stone-400'}`}>
                                {m?.phoneNumber || o.memberId}
                              </div>
                            </div>
                            <div className="flex-1 px-2 flex flex-col justify-center min-w-0">
                              <span className={`text-[11px] font-bold whitespace-nowrap truncate ${o.status === 'completed' ? 'text-stone-400' : 'text-stone-700'}`}>
                                {o.therapistPreference === '不指定按摩師' || !o.therapistPreference ? '不指定' : 
                                 o.therapistPreference === '男按摩師即可' ? '男按摩師' : 
                                 o.therapistPreference === '女按摩師即可' ? '女按摩師' : o.therapistPreference}
                              </span>
                            </div>
                            <div className="w-[24px] flex justify-end">
                              <ChevronRight className={`w-4 h-4 text-stone-300 transition-transform ${isExpanded ? 'rotate-90 text-stone-800' : 'group-hover:text-stone-500'}`} />
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="px-6 pb-6 pt-3 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-dotted border-stone-200 mx-4 mb-4 rounded-xl mt-1 bg-stone-50/50">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">服務按摩師</label>
                                  <span className="text-xs font-bold text-stone-700 bg-white px-2 py-1 rounded border border-stone-100 inline-block shadow-sm">
                                    {o.therapistPreference === '不指定按摩師' || !o.therapistPreference ? '不指定' : 
                                     o.therapistPreference === '男按摩師即可' ? '男按摩師' : 
                                     o.therapistPreference === '女按摩師即可' ? '女按摩師' : o.therapistPreference}
                                  </span>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">時長 / 金額</label>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs text-stone-600 font-medium">{o.totalDuration} 分鐘</span>
                                    <span className="text-sm font-black text-stone-900">NT$ {o.finalPrice}</span>
                                    {o.discountAmount > 0 && (
                                      <div className="bg-emerald-100/50 p-2 rounded-lg mt-1 border border-emerald-200">
                                        <p className="text-[10px] text-emerald-700 font-bold mb-1">折扣明細：</p>
                                        <p className="text-[10px] text-emerald-600 leading-tight whitespace-pre-line">{o.discountFormula}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">服務內容</label>
                                  <div className="space-y-1">
                                    {sortOrderItems(o.items).map((item, i) => (
                                      <div key={i} className="flex items-center text-xs text-stone-600 bg-white px-2 py-1.5 rounded border border-stone-100 shadow-sm">
                                        <Plus className="w-2.5 h-2.5 mr-2 text-stone-300" />
                                        {item.name} ({item.duration}分)
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">付款方式</label>
                                  <select 
                                    onClick={e => e.stopPropagation()}
                                    value={o.paymentMethod || ''} 
                                    onChange={(e) => {
                                      db.updateOrder(o.id, { paymentMethod: e.target.value });
                                      setOrders(db.getOrders());
                                    }}
                                    className="w-full p-2 border border-stone-200 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-stone-400 shadow-sm"
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

                              <div className="space-y-4">
                                <div>
                                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">服務備註</label>
                                  <textarea
                                    onClick={e => e.stopPropagation()}
                                    className="w-full text-xs p-3 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white h-24 shadow-sm"
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
                                <div className="flex justify-end pt-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteOrder(o.id);
                                    }}
                                    className="flex items-center gap-2 text-red-400 hover:text-red-600 transition text-[11px] font-bold px-3 py-2 rounded-lg hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    刪除此筆預約
                                  </button>
                                </div>
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100 whitespace-nowrap">
                    <tr>
                      <th className="pl-6 pr-4 py-3 font-medium">按摩師</th>
                      <th className="px-4 py-3 font-medium text-right">預約數</th>
                      <th className="px-4 py-3 font-medium text-right">總時數</th>
                      <th className="px-4 py-3 font-medium text-right">基本薪資</th>
                      <th className="px-4 py-3 font-medium text-right">完課獎金</th>
                      <th className="px-4 py-3 font-medium text-right">締結獎金(金卡)</th>
                      <th className="px-4 py-3 font-medium text-right">締結獎金(黑卡)</th>
                      <th className="px-4 py-3 font-medium text-right">薪資總計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {ALL_THERAPIST_CATEGORIES.filter(t => t !== '不指定按摩師' && t !== '男按摩師即可' && t !== '女按摩師即可').map(therapist => {
                    const therapistOrders = orders.filter(o => 
                      o.date.startsWith(orderMonth) && 
                      o.status !== 'cancelled' &&
                      (therapist === '不指定按摩師' 
                        ? (!o.therapistPreference || o.therapistPreference === '不指定按摩師' || o.therapistPreference === '男按摩師即可' as any || o.therapistPreference === '女按摩師即可' as any)
                        : o.therapistPreference === therapist)
                    ).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
                    
                    const totalCount = therapistOrders.length;
                    const totalMins = therapistOrders.reduce((sum, o) => sum + o.totalDuration, 0);
                    const totalHours = totalMins / 60;
                    const totalHoursDisplay = totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1);
                    
                    const baseSalary = totalHours * 600;
                    let hoursBonus = 0;
                    if (totalHours >= 96) hoursBonus = 10500;
                    else if (totalHours >= 48) hoursBonus = 4500;
                    else if (totalHours >= 24) hoursBonus = 1500;

                    const goldMembers = members.filter(m => m.level === '金卡' && m.referredBy === therapist && m.referredMonth === orderMonth);
                    const blackMembers = members.filter(m => m.level === '黑卡' && m.referredBy === therapist && m.referredMonth === orderMonth);
                    
                    const goldBonus = goldMembers.length * 1200;
                    const blackBonus = blackMembers.length * 3000;
                    const closingBonusTotal = goldBonus + blackBonus;
                    
                    const totalSalary = baseSalary + hoursBonus + closingBonusTotal;

                    return (
                      <React.Fragment key={therapist}>
                        <tr className="hover:bg-stone-50/50 transition">
                          <td className="pl-6 pr-4 py-4 font-medium text-stone-800">{therapist}</td>
                          <td className="px-4 py-4 text-right">
                            {therapistOrders.length > 0 ? (
                              <details className="group cursor-pointer relative inline-block">
                                <summary className="hover:text-stone-800 select-none outline-none inline-flex items-center text-emerald-600 font-medium">
                                  <span>{totalCount} 筆</span>
                                  <ChevronRight className="w-3 h-3 ml-1 transition-transform group-open:rotate-90" />
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
                              <span className="text-stone-500">{totalCount} 筆</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">{totalHoursDisplay} 小時</td>
                          <td className="px-4 py-4 text-right">{baseSalary} 元</td>
                          <td className="px-4 py-4 text-right">{hoursBonus} 元</td>
                          <td className="px-4 py-4 text-right">
                            <button onClick={() => setBonusModal({ therapist, level: '金卡', month: orderMonth })} className="hover:text-emerald-600 border-b border-stone-300 hover:border-emerald-300 border-dashed pb-0.5">
                              {goldMembers.length}位 ({goldBonus}元)
                            </button>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button onClick={() => setBonusModal({ therapist, level: '黑卡', month: orderMonth })} className="hover:text-emerald-600 border-b border-stone-300 hover:border-emerald-300 border-dashed pb-0.5">
                              {blackMembers.length}位 ({blackBonus}元)
                            </button>
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-emerald-600">{totalSalary} 元</td>
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

        {tab === 'members' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50">
              <h2 className="font-medium text-stone-800">會員列表</h2>
            </div>
            <div>
              <table className="w-full text-left text-sm table-auto">
                <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100 whitespace-nowrap">
                  <tr>
                    <th className="pl-6 pr-1 py-3 font-medium w-max text-left">姓名</th>
                    <th className="px-1 py-3 font-medium w-max text-left">電話</th>
                    <th className="px-1 py-3 font-medium w-max text-center text-stone-400">會員等級</th>
                    <th className="pr-6 py-3 font-medium text-right w-full"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {members.map(m => {
                    const memberOrders = orders.filter(o => o.memberId === m.id);
                    const totalSpent = memberOrders.reduce((sum, o) => sum + o.finalPrice, 0);
                    const isExpanded = expandedMemberId === m.id;
                    return (
                    <React.Fragment key={m.id}>
                      <tr id={`member-row-${m.id}`} className={`hover:bg-stone-50/50 transition whitespace-nowrap cursor-pointer ${isExpanded ? 'bg-stone-50' : ''}`} onClick={() => handleExpand(m)}>
                        <td className="pl-6 pr-1 py-4 font-bold text-stone-800 text-[14px] whitespace-nowrap text-left w-max">
                          <div className="flex items-center gap-1.5 truncate">
                            {m.name}
                          </div>
                        </td>
                        <td className="px-1 py-4 text-stone-600 font-mono text-[13px] text-left w-max truncate">{m.id}</td>
                        <td className="px-1 py-4 text-center w-max">
                          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border mx-auto ${
                            m.level === '金卡' ? 'bg-amber-50 text-amber-800 border-amber-200' : 
                            m.level === '黑卡' ? 'bg-stone-800 text-stone-100 border-stone-800' : 
                            'bg-stone-50 text-stone-600 border-stone-200'
                          }`}>
                            {m.level}
                          </div>
                        </td>
                        <td className="pr-6 py-4 text-right w-full">
                          <ChevronRight className={`w-4 h-4 text-stone-300 transition-transform ${isExpanded ? 'rotate-90 text-stone-800' : ''}`} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-stone-50/40">
                          <td colSpan={4} className="px-0 py-0 border-b border-stone-200 overflow-hidden">
                            <div className="px-6 py-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-6">
                                <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                                  <div className="flex items-baseline gap-3 whitespace-nowrap">
                                    <span className="text-[11px] text-emerald-600 uppercase font-black tracking-widest shrink-0">年齡</span>
                                    <span className="text-sm font-bold text-stone-700 flex items-baseline">
                                      {getAge(m.birthday) || '未設定'}
                                      {m.birthday && (
                                        <span className="text-[10px] font-normal text-stone-500 ml-1.5 opacity-80">
                                          ({parseInt(m.birthday.split('-')[0]) - 1911}年次)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-3 whitespace-nowrap">
                                    <span className="text-[11px] text-emerald-600 uppercase font-black tracking-widest shrink-0">消費次數</span>
                                    <span className="text-sm font-bold text-stone-700">{memberOrders.length}次</span>
                                  </div>
                                  <div className="flex items-baseline gap-3 whitespace-nowrap">
                                    <span className="text-[11px] text-emerald-600 uppercase font-black tracking-widest shrink-0">星座</span>
                                    <span className="text-sm font-bold text-stone-700 flex items-baseline">
                                      {getZodiacSign(m.birthday) || '未設定'}
                                      {m.birthday && (
                                        <span className="text-[10px] font-normal text-stone-500 ml-1.5 opacity-80">
                                          ({m.birthday.split('-').slice(1).map(v => parseInt(v)).join('/')})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-3 whitespace-nowrap">
                                    <span className="text-[11px] text-emerald-600 uppercase font-black tracking-widest shrink-0">累計金額</span>
                                    <span className="text-[9px] font-bold text-stone-900 underline decoration-emerald-300 underline-offset-3 decoration-2">NT${totalSpent.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Top Section: Info & Note */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm md:col-span-2">
                                  <h3 className="text-sm font-medium text-stone-800 mb-4 flex items-center">
                                    編輯基本資料
                                  </h3>
                                  <div className="flex flex-col gap-5">
                                    {/* Row 1: 姓名, 性別, 手機號碼, LINE ID, 生日, 主要按摩師 */}
                                    <div className="flex flex-wrap gap-x-3 gap-y-4 items-start">
                                      <div className="flex-shrink-0">
                                        <label className="block text-xs text-stone-500 mb-1">姓名</label>
                                        <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-[72px] text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                      </div>
                                      <div className="flex-shrink-0">
                                        <label className="block text-xs text-stone-500 mb-1">性別</label>
                                        <select value={editGender} onChange={e=>{
                                          const newGen = e.target.value as Gender;
                                          setEditGender(newGen);
                                          handleInfoSave(m.id, { gender: newGen });
                                        }} className="w-[72px] text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition text-center">
                                          <option value="男">男性</option>
                                          <option value="女">女性</option>
                                        </select>
                                      </div>
                                      <div className="flex-shrink-0">
                                        <label className="block text-xs text-stone-500 mb-1">手機號碼</label>
                                        <input type="text" value={editPhone} onChange={e=>setEditPhone(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-[120px] text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition font-mono" />
                                      </div>
                                      <div className="flex-shrink-0">
                                        <label className="block text-xs text-stone-500 mb-1">LINE ID</label>
                                        <input type="text" value={editLineId} onChange={e=>setEditLineId(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-[85px] text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                      </div>
                                      <div className="flex-shrink-0">
                                        <div className="flex gap-3">
                                          <div>
                                            <label className="block text-xs text-stone-500 mb-1">生日</label>
                                            <div className="relative w-[110px] cursor-pointer">
                                              <input 
                                                type="date" 
                                                value={editBirthday} 
                                                onChange={e=>setEditBirthday(e.target.value)} 
                                                onBlur={()=>handleInfoSave(m.id)} 
                                                onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                style={{ colorScheme: 'light' }}
                                              />
                                              <div className="w-full text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white text-stone-800 transition flex items-center justify-between">
                                                <span className={editBirthday ? "" : "text-stone-400 truncate"}>{editBirthday ? editBirthday.replace(/-/g, '/') : '年/月/日'}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-xs text-stone-500 mb-1">主要按摩師</label>
                                            <select value={editPrimaryTherapist} onChange={e=>{
                                              setEditPrimaryTherapist(e.target.value);
                                              handleInfoSave(m.id, { primaryTherapist: e.target.value });
                                            }} className="w-[100px] text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition px-1">
                                              <option value="">(無)</option>
                                              {THERAPISTS_W_GENDER.filter(t => !t.includes('即可')).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Row 3: 會員等級, [Conditional] 締結按摩師, 締結日期, 優惠期限, 締結月份 */}
                                    <div className="flex flex-wrap gap-4 items-start">
                                      <div className="flex-shrink-0 relative group">
                                        <label className="block text-xs text-stone-500 mb-1">會員等級</label>
                                        <select value={editLevel} onChange={e=>{
                                          const newLevel = e.target.value as MemberLevel;
                                          setEditLevel(newLevel);
                                          handleInfoSave(m.id, { level: newLevel });
                                        }} className="w-24 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition-all duration-300 font-bold">
                                          <option value="一般">一般會員</option>
                                          <option value="金卡">金卡會員</option>
                                          <option value="黑卡">黑卡會員</option>
                                        </select>
                                        {editLevel !== '一般' && (
                                          <div className="absolute left-0 top-full mt-2 bg-white shadow-xl rounded-lg p-3 border border-stone-200 w-56 text-xs text-stone-600 hidden group-hover:block z-20">
                                            <div className="font-medium text-stone-800 mb-1">權益說明</div>
                                            <div className="leading-relaxed">
                                              {editLevel === '金卡' ? '首時1200元後半價 + 1次 InBody量測 (優惠1次/月)' : ''}
                                              {editLevel === '黑卡' ? '首時1200元後半價 + 4次 InBody量測 (優惠4次/月)' : ''}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      {(editLevel === '金卡' || editLevel === '黑卡') && (
                                        <>
                                          <div className="flex-shrink-0">
                                            <label className="block text-xs text-stone-500 mb-1">締結按摩師</label>
                                            <select value={editReferredBy} onChange={e=>{
                                              setEditReferredBy(e.target.value);
                                              handleInfoSave(m.id, { referredBy: e.target.value });
                                            }} className="w-32 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition">
                                              <option value="">(無)</option>
                                              {THERAPISTS_W_GENDER.filter(t => !t.includes('即可')).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                              ))}
                                            </select>
                                          </div>
                                          <div className="flex-shrink-0">
                                            <label className="block text-xs text-stone-500 mb-1">締結日期</label>
                                            <input type="date" value={editMembershipStartDate} onChange={e=>{
                                              setEditMembershipStartDate(e.target.value);
                                            }} onBlur={()=>handleInfoSave(m.id)} className="w-[120px] text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                          </div>
                                          <div className="flex-shrink-0">
                                            <label className="block text-xs text-stone-500 mb-1">優惠期限</label>
                                            <input type="date" value={editMembershipEndDate} onChange={e=>{
                                              setEditMembershipEndDate(e.target.value);
                                            }} onBlur={()=>handleInfoSave(m.id)} className="w-[120px] text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                          </div>
                                          <div className="flex-shrink-0">
                                            <label className="block text-xs text-stone-500 mb-1">締結月份</label>
                                            <input type="month" value={editReferredMonth} onChange={e=>{
                                              setEditReferredMonth(e.target.value);
                                              handleInfoSave(m.id, { referredMonth: e.target.value });
                                            }} className="w-[120px] text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                          </div>
                                        </>
                                      )}

                                      {/* Account Settings */}
                                      {isAdmin && (
                                        <div className="flex flex-col md:col-span-3 mt-4 pt-4 border-t border-stone-200">
                                          <div className="flex items-center justify-between mb-3 px-1">
                                            <div className="flex items-center gap-3">
                                              <label className="block text-[10px] md:text-sm font-bold text-stone-400 uppercase tracking-widest">帳號安全性與權限設定</label>
                                              <button 
                                                onClick={() => handleDeleteMember(m.id)}
                                                className="text-[10px] text-red-400 hover:text-red-600 font-bold flex items-center gap-1 transition"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                                刪除此會員
                                              </button>
                                            </div>
                                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">支援複選身份</span>
                                          </div>
                                          <div className={`grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 rounded-xl border transition-all duration-300 shadow-md ${
                                            editRoles.includes('therapist') ? 'bg-emerald-50/50 border-emerald-200' : 'bg-stone-50 border-stone-200'
                                          }`}>
                                            {/* 1. Account Roles Checkboxes */}
                                            <div className="md:col-span-4">
                                              <label className="block text-[10px] md:text-xs font-bold text-stone-400 mb-2 uppercase tracking-tighter">1. 帳權權限 (可同時具備)</label>
                                              <div className="flex flex-wrap gap-2">
                                                {[
                                                  { id: 'member', label: '顧客', color: 'stone' },
                                                  { id: 'therapist', label: '按摩師', color: 'emerald' },
                                                  { id: 'admin', label: '管理員', color: 'stone' }
                                                ].map(roleItem => {
                                                  const isSelected = editRoles.includes(roleItem.id as any);
                                                  return (
                                                    <label 
                                                      key={roleItem.id} 
                                                      className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg cursor-pointer transition-all border-2 font-bold text-xs md:text-base ${
                                                        isSelected 
                                                          ? (roleItem.color === 'emerald' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-stone-800 border-stone-800 text-white shadow-sm')
                                                          : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'
                                                      }`}
                                                    >
                                                      <input 
                                                        type="checkbox" 
                                                        className="hidden"
                                                        checked={isSelected}
                                                        onChange={e => {
                                                          let next: any[] = [];
                                                          if (e.target.checked) {
                                                            next = [...editRoles, roleItem.id];
                                                          } else {
                                                            next = editRoles.filter(r => r !== roleItem.id);
                                                            if (next.length === 0) next = ['member'];
                                                          }
                                                          setEditRoles(next);
                                                          
                                                          let primary: any = 'member';
                                                          if (next.includes('admin')) primary = 'admin';
                                                          else if (next.includes('therapist')) primary = 'therapist';
                                                          setEditRole(primary);
                                                          const newTherapistName = next.includes('therapist') ? editTherapistName : '';
                                                          handleInfoSave(m.id, { roles: next, role: primary, therapistName: newTherapistName });
                                                        }}
                                                      />
                                                      {isSelected && <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />}
                                                      {roleItem.label}
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            </div>

                                            {/* 2. Therapist Name Link */}
                                            <div className="md:col-span-4">
                                              <label className={`block text-[10px] md:text-xs font-bold mb-1 uppercase tracking-tighter ${editRoles.includes('therapist') ? 'text-emerald-600' : 'text-stone-400'}`}>
                                                2. 連結按摩師姓名
                                              </label>
                                              <select 
                                                value={editTherapistName} 
                                                disabled={!editRoles.includes('therapist')}
                                                onChange={e => {
                                                  setEditTherapistName(e.target.value);
                                                  handleInfoSave(m.id, { therapistName: e.target.value });
                                                }}
                                                className={`w-full text-sm md:text-lg p-2.5 rounded-lg outline-none transition font-bold shadow-sm border-2 ${
                                                  !editRoles.includes('therapist') ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed' :
                                                  editTherapistName ? 'bg-white border-emerald-500 text-emerald-800 focus:ring-2 focus:ring-emerald-200' : 
                                                  'bg-white border-red-400 text-red-500'
                                                }`}
                                              >
                                                <option value="">(選擇按摩師)</option>
                                                {(() => {
                                                  const takenNames = members
                                                    .filter(other => other.id !== m.id && other.roles?.includes('therapist') && other.therapistName)
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
                                            
                                            {/* 3. Password */}
                                            <div className="md:col-span-3 flex flex-col">
                                              <label className="block text-[10px] md:text-xs font-bold text-stone-400 mb-1 uppercase tracking-tighter">3. 設定登入密碼</label>
                                              <div className="flex items-center gap-2">
                                                <input 
                                                  type="text" 
                                                  value={editPassword} 
                                                  onChange={e => setEditPassword(e.target.value)}
                                                  onBlur={e => handleInfoSave(m.id, { password: e.target.value })}
                                                  placeholder="密碼"
                                                  className="w-full text-sm md:text-lg p-2.5 border-2 border-stone-200 rounded-lg focus:border-stone-400 focus:ring-4 focus:ring-stone-100 bg-white outline-none transition shadow-sm font-mono" 
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
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
                              <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm flex flex-col">
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
                                                    {Object.entries(mo.items.reduce((acc, i) => {
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

  {tab === 'therapist' && (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isAdmin && (
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-lg text-stone-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">師傅切換 (管理員功能)</h3>
              <p className="text-[11px] text-stone-400">目前身分：{authedUser.name || '系統管理員'}</p>
            </div>
          </div>
          <select 
            value={selectedTherapistPortal} 
            onChange={e => setSelectedTherapistPortal(e.target.value)}
            className="text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition bg-stone-50 md:w-64"
          >
            <option value="">選擇要檢視的師傅...</option>
            {THERAPISTS_W_GENDER.filter(t => !t.includes('即可')).map(t => (
              <option key={t} value={t}>{t} 老師</option>
            ))}
          </select>
        </div>
      )}

      {!selectedTherapistPortal && isAdmin && (
        <div className="bg-white p-12 rounded-xl border border-stone-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-stone-300" />
          </div>
          <h3 className="text-lg font-medium text-stone-800 mb-2">請選擇一位師傅</h3>
          <p className="text-stone-400 text-sm max-w-xs mx-auto">請由上方下拉選單選擇您要檢視或管理的師傅專屬頁面內容。</p>
        </div>
      )}

      {selectedTherapistPortal && (
        <div className="mb-2 text-center md:text-left">
          <h2 className="text-2xl md:text-4xl font-black text-stone-800 tracking-tight">
            {selectedTherapistPortal}老師的專屬頁面
          </h2>
          <p className="text-stone-400 text-sm md:text-base mt-2">歡迎回來，祝您今天有個愉快的工作體驗！</p>
        </div>
      )}

      {/* Therapist Header with Stats */}
      {selectedTherapistPortal && (
        <div className="space-y-4">
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const therapistOrders = orders.filter(o => 
              o.status !== 'cancelled' &&
              o.therapistPreference === selectedTherapistPortal
            );
            const monthlyOrders = therapistOrders.filter(o => o.date.startsWith(orderMonth));
            const todaysOrdersCount = therapistOrders.filter(o => o.date === todayStr).length;
            
            const totalMins = monthlyOrders.reduce((sum, o) => sum + o.totalDuration, 0);
            const totalHours = totalMins / 60;
            const baseSalary = totalHours * 600;
            
            const goldMembers = members.filter(m => m.level === '金卡' && m.referredBy === selectedTherapistPortal && m.referredMonth === orderMonth);
            const blackMembers = members.filter(m => m.level === '黑卡' && m.referredBy === selectedTherapistPortal && m.referredMonth === orderMonth);
            const closingBonus = goldMembers.length * 1200 + blackMembers.length * 3000;
            
            let completionBonus = 0;
            if (totalHours >= 96) completionBonus = 10500;
            else if (totalHours >= 48) completionBonus = 4500;
            else if (totalHours >= 24) completionBonus = 1500;

            const expectedSalary = baseSalary + closingBonus + completionBonus;

            return (
              <div className="space-y-4">
                  {/* Main Highlight: Centered Salary Box */}
                  <div 
                    onClick={() => setShowPortalStats(!showPortalStats)}
                    className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center justify-center hover:shadow-md transition h-[110px] md:h-[140px] relative overflow-hidden cursor-pointer group"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-20"></div>
                    <p className="text-[14px] md:text-base font-semibold uppercase tracking-wider text-stone-500 mb-1">本月預計薪資</p>
                    <p className="text-[28px] md:text-4xl leading-[30px] font-black text-emerald-600">${expectedSalary.toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] md:text-xs text-stone-400 font-bold group-hover:text-stone-600 transition-colors">
                      {showPortalStats ? '收起績效詳情' : '展開績效詳情'}
                      <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-300 ${showPortalStats ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Metrics Grid: 3x2 Layout */}
                  {showPortalStats && (
                    <div className="grid grid-cols-3 gap-2.5 md:gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      {/* Row 1: Appointment Stats */}
                    <button 
                      onClick={() => setViewingAppts('today')}
                      className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-stone-200 text-center hover:border-emerald-300 hover:shadow-sm transition group cursor-pointer"
                    >
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">今日預約數</p>
                      <p className="text-xl md:text-3xl font-bold text-stone-800">{todaysOrdersCount}<span className="text-[10px] md:text-xs ml-0.5 text-stone-400 font-normal">筆</span></p>
                    </button>

                    <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-stone-200 text-center">
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">本月累計預約</p>
                      <p className="text-xl md:text-3xl font-bold text-stone-800">{monthlyOrders.length}<span className="text-[10px] md:text-xs ml-0.5 text-stone-400 font-normal">筆</span></p>
                    </div>

                    <button 
                      onClick={() => setViewingAppts('all')}
                      className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-stone-200 text-center hover:border-emerald-300 hover:shadow-sm transition group cursor-pointer"
                    >
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">所有預約紀錄</p>
                      <div className="flex items-center justify-center gap-1.5">
                        <p className="text-xl md:text-3xl font-bold text-stone-800">{therapistOrders.length}<span className="text-[10px] md:text-xs ml-0.5 text-stone-400 font-normal">筆</span></p>
                      </div>
                    </button>

                    {/* Row 2: Salary Components */}
                    <div className="bg-stone-50/80 p-3 md:p-5 rounded-xl border border-stone-200 border-dashed text-center">
                      <p className="text-[10px] md:text-xs font-bold text-stone-400 mb-1 uppercase tracking-wide">本月基本薪資</p>
                      <p className="text-[10px] md:text-[11px] text-stone-400 mb-1">(時數x600)</p>
                      <p className="text-base md:text-2xl text-stone-700 font-black">${baseSalary.toLocaleString()}</p>
                    </div>

                    <div className="bg-stone-50/80 p-3 md:p-5 rounded-xl border border-stone-200 border-dashed text-center flex flex-col justify-center">
                      <p className="text-[10px] md:text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wide">本月完課獎金</p>
                      <p className="text-base md:text-2xl text-stone-700 font-black">${completionBonus.toLocaleString()}</p>
                    </div>

                    <div className="bg-stone-50/80 p-3 md:p-5 rounded-xl border border-stone-200 border-dashed text-center">
                      <p className="text-[10px] md:text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wide">本月締結獎金</p>
                      <div className="flex flex-col gap-1 md:gap-2">
                        <button 
                          onClick={() => setBonusModal({ therapist: selectedTherapistPortal, level: '金卡', month: orderMonth })}
                          className="flex justify-between items-center text-[10px] md:text-xs w-full bg-white/40 hover:bg-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-md transition border border-transparent hover:border-emerald-100"
                        >
                          <span className="text-stone-500">金:{goldMembers.length}</span>
                          <span className="text-emerald-700 font-bold">${(goldMembers.length * 1200).toLocaleString()}</span>
                        </button>
                        <button 
                          onClick={() => setBonusModal({ therapist: selectedTherapistPortal, level: '黑卡', month: orderMonth })}
                          className="flex justify-between items-center text-[10px] md:text-xs w-full bg-white/40 hover:bg-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-md transition border border-transparent hover:border-emerald-100"
                        >
                          <span className="text-stone-500">黑:{blackMembers.length}</span>
                          <span className="text-emerald-700 font-bold">${(blackMembers.length * 3000).toLocaleString()}</span>
                        </button>
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
            <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
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
              <button 
                onClick={() => {
                  const d = new Date(copyMonthView);
                  d.setMonth(d.getMonth() + 1);
                  setCopyMonthView(d);
                }}
                className="p-1.5 hover:bg-stone-100 rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {['日','一','二','三','四','五','六'].map(d => (
              <div key={d} className="text-center text-[11px] md:text-xs font-bold text-stone-400 py-2 uppercase tracking-widest">{d}</div>
            ))}
            {(() => {
              const year = copyMonthView.getFullYear();
              const month = copyMonthView.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const days = [];
              
              for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
              
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isPast = dateStr < todayStr;
                const avail = availabilities.find(a => a.therapistName === selectedTherapistPortal && a.date === dateStr);
                const hasHours = avail && avail.slots && avail.slots.length > 0;
                
                days.push(
                  <button
                    key={dateStr}
                    onClick={() => {
                      if (isPast) return;
                      setEditingAvailability({ date: dateStr, slots: avail ? avail.slots : [] });
                    }}
                    className={`aspect-square p-1 md:p-2 rounded-xl flex flex-col items-center justify-between transition-all border relative ${isPast ? 'bg-stone-50 border-stone-100 opacity-40 cursor-not-allowed' : hasHours ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-white border-stone-100 hover:border-stone-300'}`}
                  >
                    <span className={`text-xs md:text-sm font-bold ${isPast ? 'text-stone-300' : hasHours ? 'text-emerald-600' : 'text-stone-400'}`}>{d}</span>
                    {hasHours && !isPast && (
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
          <div className="bg-white rounded-2xl w-full max-w-sm md:max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-4 md:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <div className="flex flex-col">
                <h3 className="font-bold text-stone-800 md:text-lg">設定服務時段</h3>
                <p className="text-[11px] md:text-xs text-stone-400">{editingAvailability.date.replace(/-/g, '/')}</p>
              </div>
              <button onClick={() => setEditingAvailability(null)} className="p-1.5 hover:bg-stone-200 rounded-full transition">
                <X className="w-5 h-5 md:w-6 md:h-6 text-stone-400" />
              </button>
            </div>
            <div className="p-4 lg:p-8 overflow-y-auto max-h-[70vh]">
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
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
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
                {['日','一','二','三','四','五','六'].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-stone-400 py-1 uppercase">{d}</div>
                ))}
                {(() => {
                  const year = copyMonthView.getFullYear();
                  const month = copyMonthView.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const daysArr = [];
                  
                  for (let i = 0; i < firstDay; i++) daysArr.push(<div key={`empty-copy-${i}`} />);
                  
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const isSelected = copyTargetDates.includes(dateStr);
                    const isPast = dateStr < todayStr;
                    
                    daysArr.push(
                      <button
                        key={`copy-${dateStr}`}
                        disabled={isPast}
                        onClick={() => {
                          setCopyTargetDates(prev => 
                            prev.includes(dateStr) 
                              ? prev.filter(x => x !== dateStr) 
                              : [...prev, dateStr]
                          );
                        }}
                        className={`aspect-square p-1 rounded-lg text-xs font-bold transition border ${isPast ? 'opacity-20 cursor-not-allowed border-transparent' : isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-stone-100 hover:border-stone-300 text-stone-600'}`}
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
                        const todayStr = new Date().toISOString().split('T')[0];
                        const list = orders.filter(o => 
                          o.therapistPreference === selectedTherapistPortal && 
                          o.status !== 'cancelled' &&
                          (viewingAppts === 'today' ? o.date === todayStr : true)
                        ).sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

                        if (list.length === 0) return <div className="text-center py-20 text-stone-300">目前尚無紀錄</div>;

                        return list.map(o => {
                          const m = members.find(x => x.id === o.memberId);
                          return (
                            <div key={o.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-stone-100 rounded-xl hover:bg-stone-50 transition border-l-4 border-l-emerald-500 shadow-sm">
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
                               <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                                  {o.items.map((item, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-stone-100 text-stone-500 rounded text-[10px]">{item.name}</span>
                                  ))}
                               </div>
                               <button 
                                  onClick={() => handleShare(o)}
                                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-3 py-1 border border-emerald-100 rounded-lg bg-emerald-50 whitespace-nowrap mt-2 md:mt-0"
                                >
                                  複製通知
                                </button>
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
        const targetLevel = bonusModal.level;
        const targetMonth = bonusModal.month;
        
        const levelMembers = members.filter(m => 
          m.level === targetLevel && 
          m.referredBy === tAuthName && 
          m.referredMonth === targetMonth
        );
        
        const handleToggle = (m: Member, isChecked: boolean) => {
           if (!isAdmin) return;
           if (isChecked) {
              db.saveMember({ ...m, referredBy: tAuthName, referredMonth: targetMonth });
           } else {
              db.saveMember({ ...m, referredBy: undefined, referredMonth: undefined });
           }
           setMembers(sortMembers(db.getMembers()));
        };
        
        return (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-stone-100 flex justify-between items-center">
                <h3 className="font-medium text-lg text-stone-800">{tAuthName} 的本月締結 ({targetLevel})</h3>
                <button onClick={() => setBonusModal(null)} className="text-stone-400 hover:text-stone-600">
                   <XCircle className="w-5 h-5"/>
                </button>
              </div>
              <div className="p-4 overflow-y-scroll flex-1 space-y-2 custom-scrollbar pr-3">
                 {levelMembers.length === 0 && <p className="text-sm text-stone-400">本月目前沒有隸屬您的 {targetLevel} 會員</p>}
                 {levelMembers.map(m => (
                    <div key={m.id} className="flex items-center space-x-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50 transition">
                       <div className="flex-1">
                         <div className="flex justify-between items-start">
                           <p className="font-medium text-sm text-stone-800">{m.name} <span className="text-xs text-stone-500 font-normal ml-2">{m.id}</span></p>
                           <p className="text-xs text-stone-500 font-mono">{m.phone}</p>
                         </div>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="p-4 border-t border-stone-100">
                 <button onClick={() => setBonusModal(null)} className="w-full py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition">完成</button>
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
