import React, { useState, useEffect } from 'react';
import { db, Member, Order, MemberLevel, timeToMins, minsToTime, Gender, ALL_TIME_SLOTS, sortOrderItems } from './store';
import { Trash2, TrendingUp, Users, Calendar, DollarSign, Clock, Search, CheckCircle, XCircle, CalendarDays, Lock, LogOut, ChevronRight } from 'lucide-react';

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

const THERAPISTS_W_GENDER = ['阿翰(男)', 'Ricky(男)', 'Kenny(男)', 'Mark(男)', '男按摩師即可', 'Alice(女)', 'Kelly(女)', 'Miki(女)', '女按摩師即可'];
const ALL_THERAPIST_CATEGORIES = ['不指定按摩師', ...THERAPISTS_W_GENDER];

export default function Backend() {
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<'orders' | 'members' | 'calendar'>('calendar');
  const [orderViewMode, setOrderViewMode] = useState<'list' | 'byTherapist'>('list');
  const [orderMonth, setOrderMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewingTherapistStats, setViewingTherapistStats] = useState<{therapist: string, orders: Order[]} | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [logMonthFilter, setLogMonthFilter] = useState<string>('');
  const [bonusModal, setBonusModal] = useState<{ therapist: string, level: MemberLevel, month: string } | null>(null);

  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm?: () => void} | null>(null);

  useEffect(() => {
    if (localStorage.getItem('zf_admin_auth') === 'true') {
      setIsAdminAuthed(true);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '123456') {
      localStorage.setItem('zf_admin_auth', 'true');
      setIsAdminAuthed(true);
      setAdminPin('');
    } else {
      setConfirmAction({ message: '密碼錯誤' });
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('zf_admin_auth');
    setIsAdminAuthed(false);
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
    const dateStr = o.date.replace(/-/g, '/');
    const shareText = `【ZEN FLOW 預約通知】\n📆日期：${dateStr}\n⏰時間：${o.time}~${endTime}(${o.totalDuration}分鐘)\n😃客人：${m?.name || '未知顧客'} (${m?.gender || '女'})\n🔹預約項目：\n${itemsText}${noteText}`;
    
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

  // Polling to simulate real-time updates from LocalStorage
  useEffect(() => {
    const fetchData = () => {
      setOrders(db.getOrders().sort((a,b) => b.createdAt - a.createdAt));
      // Only update members list if we're not currently editing a note, to avoid losing focus
      setMembers(prev => {
        const next = db.getMembers().sort((a,b) => b.createdAt - a.createdAt);
        return next;
      });
    };
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

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
        setOrders(db.getOrders());
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
    setOrders(db.getOrders());
    setReschedulingId(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  const handleLevelChange = (id: string, lvl: MemberLevel) => {
    db.updateMemberLevel(id, lvl);
    setMembers(db.getMembers());
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
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
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
    }
  };

  const handleNoteSave = (id: string) => {
    db.updateMemberNote(id, editingNote);
    setMembers(db.getMembers());
  };

  const handleInfoSave = (oldId: string, overrides: any = {}) => {
    const finalPhone = overrides.phone ?? editPhone;
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
      overrides.membershipEndDate ?? editMembershipEndDate
    );
    setMembers(db.getMembers());
    if (finalPhone !== oldId) {
      setExpandedMemberId(finalPhone);
    }
  };

  if (!isAdminAuthed) {
    return (
      <div className="bg-stone-50 min-h-screen text-stone-800 font-sans flex items-center justify-center p-6">
        <form onSubmit={handleAdminLogin} className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full animate-in zoom-in">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-stone-100 text-stone-800 rounded-full">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-medium text-center text-stone-800 mb-6 font-sans">ZEN FLOW 管理員登入</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-stone-600 mb-2">請輸入管理員密碼</label>
              <input
                type="password"
                value={adminPin}
                onChange={e => setAdminPin(e.target.value)}
                className="w-full p-3 border border-stone-200 rounded-xl focus:border-stone-500 outline-none transition text-center tracking-[0.5em] text-lg font-mono"
                placeholder="••••••"
                maxLength={6}
              />
            </div>
            <button type="submit" className="w-full py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition font-medium">
              登入後台
            </button>
            <p className="text-xs text-stone-400 text-center mt-4">預設密碼：123456</p>
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

  return (
    <div className="bg-stone-50 min-h-screen text-stone-800 font-sans">
      <div className="bg-stone-900 text-stone-100 px-6 py-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-light tracking-wide">ZEN FLOW <span className="text-stone-400 text-sm ml-2 hidden sm:inline">管理後台</span></h1>
        <div className="space-x-1 flex items-center overflow-x-auto no-scrollbar">
          <button onClick={()=>setTab('calendar')} className={`px-4 py-2 rounded-lg text-sm transition whitespace-nowrap ${tab==='calendar'?'bg-stone-700 text-white':'text-stone-400 hover:text-white'}`}>預約列表</button>
          <button onClick={()=>setTab('orders')} className={`px-4 py-2 rounded-lg text-sm transition whitespace-nowrap ${tab==='orders'?'bg-stone-700 text-white':'text-stone-400 hover:text-white'}`}>訂單管理</button>
          <button onClick={()=>setTab('members')} className={`px-4 py-2 rounded-lg text-sm transition whitespace-nowrap ${tab==='members'?'bg-stone-700 text-white':'text-stone-400 hover:text-white'}`}>會員系統</button>
          <button onClick={handleAdminLogout} className="ml-2 px-3 py-2 text-stone-400 hover:text-white transition flex items-center shrink-0">
            <LogOut className="w-4 h-4 mr-1 md:hidden" />
            <span className="hidden md:inline">登出</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center">
            <div className="p-3 bg-green-100 text-green-700 rounded-lg mr-4"><DollarSign className="w-6 h-6"/></div>
            <div><p className="text-stone-500 text-sm">今日營業額</p><p className="text-2xl font-semibold">NT$ {todaysRevenue}</p></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg mr-4"><Calendar className="w-6 h-6"/></div>
            <div><p className="text-stone-500 text-sm">今日訂單數</p><p className="text-2xl font-semibold">{todaysOrders.length} 筆</p></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-lg mr-4"><TrendingUp className="w-6 h-6"/></div>
            <div><p className="text-stone-500 text-sm">累計總訂單</p><p className="text-2xl font-semibold">{orders.length} 筆</p></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-lg mr-4"><Users className="w-6 h-6"/></div>
            <div><p className="text-stone-500 text-sm">總會員數</p><p className="text-2xl font-semibold">{members.length} 人</p></div>
          </div>
        </div>

        {tab === 'calendar' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-medium text-stone-800 text-lg flex items-center">
                <Calendar className="w-5 h-5 mr-2" /> 預約列表 (即將到來)
              </h2>
            </div>
            
            <div className="space-y-6">
              {ALL_THERAPIST_CATEGORIES.map(category => {
                const categoryOrders = orders.filter(o => 
                  o.date >= todayStr && 
                  o.status !== 'cancelled' &&
                  (category === '不指定按摩師' 
                    ? (!o.therapistPreference || o.therapistPreference === '不指定按摩師' || o.therapistPreference === '男按摩師即可' as any || o.therapistPreference === '女按摩師即可' as any)
                    : o.therapistPreference === category)
                ).sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

                return (
                  <div key={category} className="border border-stone-100 rounded-xl p-4 bg-stone-50/50">
                    <h3 className="font-medium text-stone-700 mb-3 ml-2 border-l-2 border-stone-800 pl-2">{category}</h3>
                    {categoryOrders.length === 0 ? (
                      <p className="text-sm text-stone-400 pl-4 py-2">目前沒有安排在這個分類的預約</p>
                    ) : (
                      <div className="space-y-2">
                        {categoryOrders.map(o => {
                          const m = members.find(x => x.id === o.memberId);
                          const endTime = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                          return (
                            <div key={o.id} className={`bg-white p-4 rounded-lg border shadow-sm flex flex-col hover:border-stone-400 transition ${o.status === 'completed' ? 'opacity-50 border-stone-100' : 'border-stone-200'}`}>
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex items-start space-x-4 w-full md:w-auto">
                                  <div className="flex flex-col space-y-2 shrink-0">
                                    <span className="bg-stone-800 text-stone-50 px-2 py-1 rounded text-sm font-medium text-center">
                                      {o.date.replace(/-/g, '/')}
                                    </span>
                                    <div className="bg-stone-100 text-stone-700 px-2 py-1 rounded text-sm text-center font-medium flex flex-col justify-center">
                                      <span>{o.time}~{endTime}</span>
                                      <span className="text-xs text-stone-500 font-normal mt-0.5">(總共{(o.totalDuration / 60) % 1 === 0 ? o.totalDuration/60 : (o.totalDuration/60).toFixed(1)}小時)</span>
                                    </div>
                                    
                                    {category === '不指定按摩師' && (
                                      <div className="mt-2 text-xs flex flex-col space-y-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                        <span className="text-amber-800 font-medium">分派給：</span>
                                        <select 
                                          className="bg-white border border-amber-200 outline-none rounded p-1 text-stone-700 cursor-pointer shadow-sm w-full"
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
                                      <div className="mt-2 text-xs flex flex-col space-y-1 bg-stone-50 p-2 rounded-lg border border-stone-200">
                                        <span className="text-stone-600 font-medium">改由：</span>
                                        <select 
                                          className="bg-white border border-stone-200 outline-none rounded p-1 text-stone-700 cursor-pointer shadow-sm w-full"
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              db.updateOrder(o.id, { therapistPreference: e.target.value as any });
                                              setOrders(db.getOrders());
                                            }
                                          }}
                                          value=""
                                        >
                                          <option value="" disabled>選擇代班</option>
                                          {THERAPISTS_W_GENDER.map(t => (
                                            t !== category && <option key={t} value={t}>{t} 代班</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-1">
                                    <div className="flex items-center space-x-3 mb-2 flex-wrap gap-y-2">
                                      <p className="text-base font-medium text-stone-800 cursor-pointer hover:underline" onClick={() => openCustomerModal(m)}>
                                        {m?.name || '未知顧客'} <span className="text-stone-400 text-sm font-normal ml-1">{o.memberId}</span>
                                      </p>
                                      {o.isAssignedByShop && (
                                        <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded border border-stone-200">
                                          店家分派
                                        </span>
                                      )}
                                      <button onClick={() => handleShare(o)} className="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 px-2 py-0.5 rounded flex items-center transition bg-white shadow-sm">
                                        複製預約資訊
                                      </button>
                                    </div>
                                    <div className="text-sm text-stone-600 space-y-1 mt-3">
                                      {sortOrderItems(o.items).map((i, idx) => (
                                        <p key={idx} className="flex items-center">
                                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mr-2"></span>
                                          {i.name} ({i.duration} 分鐘)
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3 md:mt-1 pt-3 md:pt-0 border-t border-stone-100 md:border-t-0 flex flex-col justify-between items-start md:items-end w-full md:w-auto h-full shrink-0">
                                  <div className="flex w-full md:w-auto justify-between md:justify-end items-center md:items-end md:flex-col gap-2">
                                    <div className="flex flex-wrap gap-2">
                                      {o.status === 'completed' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded inline-block">已完成</span>}
                                      {o.status === 'cancelled' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded inline-block">已取消</span>}
                                      {o.isConfirmed && (!o.status || o.status === 'pending') && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block border border-blue-100">已確認出席</span>}
                                    </div>
                                    <p className="text-sm font-medium text-stone-800">NT$ {o.finalPrice}</p>
                                  </div>
                                  <div className="mt-4 flex flex-col items-start md:items-end w-full md:w-auto space-y-2">
                                    {(!o.status || o.status === 'pending') && (
                                      <>
                                        <div className="flex flex-wrap gap-2 justify-start md:justify-end w-full">
                                          {!o.isConfirmed && (
                                            <button onClick={() => {
                                                db.updateOrder(o.id, { isConfirmed: true });
                                                setOrders(db.getOrders());
                                              }} className="text-xs px-3 py-1.5 border border-stone-200 bg-white text-stone-800 font-medium shadow-sm rounded-lg hover:bg-stone-50 flex items-center whitespace-nowrap transition">
                                              確認出席
                                            </button>
                                          )}
                                          <button onClick={() => {
                                            setRescheduleDate(o.date);
                                            setRescheduleTime(o.time);
                                            setReschedulingId(o.id);
                                          }} className="text-xs px-3 py-1.5 border border-stone-200 bg-white text-stone-800 font-medium shadow-sm rounded-lg hover:bg-stone-50 flex items-center whitespace-nowrap transition">
                                            <CalendarDays className="w-3 h-3 mr-1 text-stone-500" />
                                            改期
                                          </button>
                                          <button onClick={() => handleCompleteOrder(o.id)} className="text-xs px-3 py-1.5 border border-stone-200 bg-white text-stone-800 font-medium shadow-sm rounded-lg hover:bg-stone-50 flex items-center whitespace-nowrap transition">
                                            <CheckCircle className="w-3 h-3 mr-1 text-stone-500" />
                                            完成服務
                                          </button>
                                        </div>
                                        <button onClick={() => handleCancelOrder(o.id)} className="text-xs px-3 py-1 text-stone-400 hover:text-red-600 rounded flex items-center transition mt-1">
                                          取消預約
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-stone-100">
                                <textarea
                                  className="w-full text-xs p-2 border border-stone-200 rounded resize-none focus:outline-none focus:border-stone-500 bg-stone-50 placeholder:text-stone-400 text-stone-700 flex-1"
                                  placeholder="當日服務注意事項..."
                                  rows={1}
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
                          );
                        })}
                      </div>
                    )}
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
                <h2 className="font-medium text-stone-800">所有預約紀錄</h2>
                <div className="flex bg-stone-200/50 p-1 rounded-lg">
                  <button onClick={() => setOrderViewMode('list')} className={`px-3 py-1 text-xs rounded transition ${orderViewMode === 'list' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>時間排序</button>
                  <button onClick={() => setOrderViewMode('byTherapist')} className={`px-3 py-1 text-xs rounded transition ${orderViewMode === 'byTherapist' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>按摩師統計</button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="month" 
                  value={orderMonth} 
                  onChange={e => setOrderMonth(e.target.value)} 
                  className="px-2 py-1 text-sm border border-stone-200 rounded outline-none"
                />
                <span className="text-xs text-stone-500 flex items-center hidden md:flex"><Clock className="w-3 h-3 mr-1"/> 每秒自動更新 (儲存於本機)</span>
              </div>
            </div>
            
            {orderViewMode === 'list' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[1000px]">
                  <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100 whitespace-nowrap">
                    <tr>
                      <th className="pl-6 pr-2 py-3 font-medium whitespace-nowrap">服務按摩師</th>
                      <th className="px-2 py-3 font-medium">預約日期及時間</th>
                      <th className="px-2 py-3 font-medium whitespace-nowrap">總時長</th>
                      <th className="px-2 py-3 font-medium w-[60px] text-center">完成</th>
                      <th className="px-5 py-3 font-medium">顧客及電話</th>
                      <th className="px-5 py-3 font-medium w-[184px]">服務內容</th>
                      <th className="px-5 py-3 font-medium whitespace-nowrap">結帳金額</th>
                      <th className="px-5 py-3 font-medium whitespace-nowrap">付款方式</th>
                      <th className="px-5 py-3 font-medium">服務備註</th>
                      <th className="px-5 py-3 font-medium">刪除</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {orders
                      .filter(o => o.date.startsWith(orderMonth))
                      .sort((a,b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))
                      .map(o => {
                      const m = members.find(x => x.id === o.memberId);
                      const dateObj = new Date(o.date);
                      const formattedDate = o.date.replace(/-/g, '/');
                      const endTimeStr = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                      const durationHoursDisplay = (o.totalDuration / 60) % 1 === 0 ? (o.totalDuration / 60) : (o.totalDuration / 60).toFixed(1);

                      const nowMs = new Date().getTime();
                      const orderEndMs = new Date(`${o.date}T${endTimeStr || '23:59'}:00`).getTime();
                      const isPast = orderEndMs < nowMs;

                      return (
                      <tr key={o.id} className={`hover:bg-stone-50/50 transition ${o.status === 'cancelled' || isPast || o.status === 'completed' ? 'opacity-60 bg-stone-50/50' : ''}`}>
                        <td className="pl-6 pr-2 py-4 text-stone-600 font-medium">{o.therapistPreference || '不指定按摩師'}</td>
                        <td className="px-2 py-4">
                          <div className="font-medium text-stone-800 flex items-center gap-2">
                            {formattedDate} 
                            {o.status === 'cancelled' && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded border border-red-200">已取消</span>}
                          </div>
                          <div className="text-stone-500">{o.time}{endTimeStr ? `~${endTimeStr}` : ''}</div>
                        </td>
                        <td className="px-2 py-4 text-stone-600 whitespace-nowrap">{durationHoursDisplay}小時</td>
                        <td className="px-5 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={o.status === 'completed'} 
                            onChange={(e) => toggleOrderStatus(o.id, e.target.checked)}
                            className="w-4 h-4 cursor-pointer text-stone-800 rounded border-stone-300 focus:ring-stone-800"
                            disabled={o.status === 'cancelled'}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div 
                            className="font-medium text-stone-800 cursor-pointer hover:underline"
                            onClick={() => {
                              if (m) openCustomerModal(m);
                            }}
                          >{m?.name || '未知'}</div>
                          <div className="text-xs text-stone-500">{o.memberId}</div>
                        </td>
                        <td className="px-5 py-4 w-[184px]">
                          <ul className="list-disc list-inside text-stone-600 text-xs space-y-1">
                            {sortOrderItems(o.items).map((item, i) => <li key={`${o.id}-i-${i}`} className="whitespace-nowrap truncate w-full">{item.name}({item.duration}分鐘)</li>)}
                          </ul>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                           <div className="font-medium">NT$ {o.finalPrice}</div>
                           {o.discountAmount > 0 && <div className="text-xs text-green-600 mt-1 whitespace-nowrap">已扣除優惠 ${o.discountAmount}<br/><span className="text-[10px] text-stone-400 whitespace-nowrap">{o.discountFormula}</span></div>}
                        </td>
                        <td className="px-5 py-4 text-stone-600 whitespace-nowrap">
                          <select 
                            value={o.paymentMethod || ''} 
                            onChange={(e) => {
                               db.updateOrder(o.id, { paymentMethod: e.target.value });
                               setOrders(db.getOrders().sort((a,b) => b.createdAt - a.createdAt));
                            }}
                            className="p-1 border border-stone-200 rounded text-xs outline-none bg-transparent hover:bg-stone-50 transition cursor-pointer"
                          >
                            <option value="">請選擇</option>
                            <option value="現金">現金</option>
                            <option value="線上刷卡">線上刷卡</option>
                            <option value="LINE PAY">LINE PAY</option>
                            <option value="街口支付">街口支付</option>
                            <option value="全支付">全支付</option>
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <textarea
                            className="w-40 min-h-[40px] text-xs p-2 border border-stone-200 rounded resize-none focus:outline-none focus:border-stone-500"
                            placeholder="新增備註..."
                            defaultValue={o.note || ''}
                            onBlur={(e) => {
                               if (e.target.value !== o.note) {
                                 db.updateOrder(o.id, { note: e.target.value });
                                 setOrders(db.getOrders());
                               }
                            }}
                          ></textarea>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={()=>handleDeleteOrder(o.id)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </td>
                      </tr>
                    )})}
                    {orders.filter(o => o.date.startsWith(orderMonth)).length === 0 && (
                      <tr><td colSpan={9} className="px-5 py-8 text-center text-stone-400">目前月份無訂單紀錄</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {orderViewMode === 'byTherapist' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100 whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-3 font-medium">按摩師</th>
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
                    {ALL_THERAPIST_CATEGORIES.map(therapist => {
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
                          <td className="px-4 py-4 font-medium text-stone-800">{therapist}</td>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[900px]">
                <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100 whitespace-nowrap">
                  <tr>
                    <th className="pl-6 pr-2 py-3 font-medium cursor-pointer w-24 text-left" title="點擊展開/收合消費紀錄">姓名</th>
                    <th className="px-2 py-3 font-medium w-16 text-center">性別</th>
                    <th className="px-2 py-3 font-medium w-32 text-left">電話</th>
                    <th className="px-2 py-3 font-medium w-32 text-left">LINE ID</th>
                    <th className="px-2 py-3 font-medium w-32 text-left">生日</th>
                    <th className="pl-2 pr-1 py-3 font-medium w-14 text-center">星座</th>
                    <th className="pl-1 pr-2 py-3 font-medium w-14 text-center">年齡</th>
                    <th className="px-2 py-3 font-medium w-20 text-center">消費次數</th>
                    <th className="pr-6 py-3 font-medium text-right">累計金額</th>
                    <th className="px-0 py-3 font-medium w-28 text-center text-stone-400">會員等級</th>
                    <th className="px-2 py-3 font-medium w-32 text-center text-stone-500">結束日期</th>
                    <th className="px-2 py-3 font-medium text-center">消費紀錄</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {members.map(m => {
                    const memberOrders = orders.filter(o => o.memberId === m.id);
                    const totalSpent = memberOrders.reduce((sum, o) => sum + o.finalPrice, 0);
                    const isExpanded = expandedMemberId === m.id;
                    return (
                    <React.Fragment key={m.id}>
                      <tr id={`member-row-${m.id}`} className="hover:bg-stone-50/50 transition whitespace-nowrap">
                        <td className="pl-6 pr-2 py-4 font-medium text-stone-800 cursor-pointer hover:text-stone-600 underline decoration-stone-300 underline-offset-4 whitespace-nowrap text-left"
                          onClick={() => handleExpand(m)}
                        >
                          {m.name}
                        </td>
                        <td className="px-2 py-4 text-stone-600 text-center">{m.gender || '女'}</td>
                        <td className="px-2 py-4 text-stone-600 text-left">{m.id}</td>
                        <td className="px-2 py-4 text-stone-600 text-left">{m.lineId || '-'}</td>
                        <td className="px-2 py-4 text-stone-600 whitespace-nowrap text-left">{m.birthday}</td>
                        <td className="pl-2 pr-1 py-4 text-stone-600 whitespace-nowrap text-center text-xs">{getZodiacSign(m.birthday)}</td>
                        <td className="pl-1 pr-2 py-4 text-stone-600 whitespace-nowrap text-center">{getAge(m.birthday)}</td>
                        <td className="px-2 py-4 text-stone-600 text-center">{memberOrders.length} 次</td>
                        <td className="pr-6 py-4 text-stone-600 font-medium text-right">NT$ {totalSpent}</td>
                        <td className="px-0 py-4 text-center">
                          <select 
                            value={m.level} 
                            onChange={(e)=>handleLevelChange(m.id, e.target.value as MemberLevel)}
                            className={`p-1 border rounded text-xs font-medium outline-none mx-auto block ${m.level==='金卡'?'bg-amber-50 text-amber-800 border-amber-200':m.level==='黑卡'?'bg-stone-800 text-stone-100 border-stone-800':'bg-stone-50 text-stone-600 border-stone-200'}`}
                          >
                            <option value="一般">一般會員</option>
                            <option value="金卡">金卡會員</option>
                            <option value="黑卡">黑卡會員</option>
                          </select>
                        </td>
                        <td className="px-2 py-4 text-stone-600 text-center text-xs">{m.membershipEndDate || '-'}</td>
                        <td className="px-2 py-4 text-center">
                          <button 
                            onClick={() => handleExpand(m)}
                            className="px-3 py-1 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded text-xs transition"
                          >
                            {isExpanded ? '收合' : '檢視'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-stone-50/40">
                          <td colSpan={12} className="px-6 py-4">
                            <div className="space-y-6">
                              {/* Top Section: Info & Note */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm md:col-span-2">
                                  <h3 className="text-sm font-medium text-stone-800 mb-4 flex items-center">
                                    編輯基本資料
                                  </h3>
                                  <div className="flex flex-col gap-5">
                                    {/* Row 1: 姓名, 性別, 手機號碼, LINE ID */}
                                    <div className="flex flex-wrap gap-4 items-start">
                                      <div className="flex-shrink-0">
                                        <label className="block text-xs text-stone-500 mb-1">姓名</label>
                                        <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-20 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
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
                                        <input type="text" value={editPhone} onChange={e=>setEditPhone(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-28 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                      </div>
                                      <div className="flex-shrink-0">
                                        <label className="block text-xs text-stone-500 mb-1">LINE ID</label>
                                        <input type="text" value={editLineId} onChange={e=>setEditLineId(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-28 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                      </div>
                                    </div>

                                    {/* Row 2: 生日, 主要按摩師, 締結按摩師 */}
                                    <div className="flex flex-wrap gap-4 items-start">
                                      <div className="flex-shrink-0">
                                        <label className="block text-xs text-stone-500 mb-1">生日</label>
                                        <div className="relative w-32 cursor-pointer">
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
                                        <div className="flex-shrink-0">
                                          <label className="block text-xs text-stone-500 mb-1">主要按摩師</label>
                                          <select value={editPrimaryTherapist} onChange={e=>{
                                            setEditPrimaryTherapist(e.target.value);
                                            handleInfoSave(m.id, { primaryTherapist: e.target.value });
                                          }} className="w-32 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition">
                                            <option value="">(無)</option>
                                            {THERAPISTS_W_GENDER.map(name => (
                                              <option key={name} value={name}>{name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="flex-shrink-0">
                                          <label className="block text-xs text-stone-500 mb-1">締結按摩師</label>
                                          <select value={editReferredBy} onChange={e=>{
                                            setEditReferredBy(e.target.value);
                                            handleInfoSave(m.id, { referredBy: e.target.value });
                                          }} className="w-32 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition">
                                            <option value="">(無)</option>
                                            {THERAPISTS_W_GENDER.map(name => (
                                              <option key={name} value={name}>{name}</option>
                                            ))}
                                          </select>
                                        </div>
                                    </div>

                                    {/* Row 3: 會員等級, 資格起始, 資格結束, 締結月份 */}
                                    <div className="flex flex-wrap gap-4 items-start">
                                      <div className="flex-shrink-0 relative group">
                                        <label className="block text-xs text-stone-500 mb-1">會員等級</label>
                                        <select value={editLevel} onChange={e=>{
                                          const newLevel = e.target.value as MemberLevel;
                                          setEditLevel(newLevel);
                                          handleInfoSave(m.id, { level: newLevel });
                                        }} className="w-24 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition">
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
                                          <div className="flex-shrink-0 flex items-center space-x-2 mt-8 ml-2">
                                            <div className="h-4 w-px bg-stone-300 hidden md:block"></div>
                                          </div>
                                          <div className="flex-shrink-0">
                                            <label className="block text-xs text-stone-500 mb-1">資格起始</label>
                                            <input type="date" value={editMembershipStartDate} onChange={e=>{
                                              setEditMembershipStartDate(e.target.value);
                                            }} onBlur={()=>handleInfoSave(m.id)} className="w-32 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                          </div>
                                          <div className="flex-shrink-0">
                                            <label className="block text-xs text-stone-500 mb-1">資格結束</label>
                                            <input type="date" value={editMembershipEndDate} onChange={e=>{
                                              setEditMembershipEndDate(e.target.value);
                                            }} onBlur={()=>handleInfoSave(m.id)} className="w-32 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                          </div>
                                          <div className="flex-shrink-0">
                                            <label className="block text-xs text-stone-500 mb-1">締結月份</label>
                                            <input type="month" value={editReferredMonth} onChange={e=>{
                                              setEditReferredMonth(e.target.value);
                                              handleInfoSave(m.id, { referredMonth: e.target.value });
                                            }} className="w-32 text-sm p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-500 outline-none transition" />
                                          </div>
                                        </>
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
                                    <ul className="space-y-4">
                                      {filteredOrders.map(mo => {
                                      const dateObj = new Date(mo.date);
                                      const formattedDate = isNaN(dateObj.getTime()) ? mo.date.replace(/-/g, '/') : `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2,'0')}/${String(dateObj.getDate()).padStart(2,'0')}(${['日','一','二','三','四','五','六'][dateObj.getDay()]})`;
                                      
                                      const endTimeStr = mo.time && mo.totalDuration ? minsToTime(timeToMins(mo.time) + mo.totalDuration) : '';
                                      const durationHoursDisplay = (mo.totalDuration / 60) % 1 === 0 ? (mo.totalDuration / 60) : (mo.totalDuration / 60).toFixed(1);
                                      
                                      return (
                                        <li key={mo.id} className="text-sm flex flex-col md:flex-row items-stretch p-4 bg-stone-50 rounded-lg border border-stone-200 gap-4">
                                          <div className="flex-[1.2] flex flex-col space-y-1">
                                            <div className="font-medium text-stone-900 border-b border-stone-200 pb-3 mb-2 flex flex-col space-y-1">
                                              <div>{formattedDate} {mo.time}{endTimeStr ? `~${endTimeStr}` : ''} ({durationHoursDisplay}小時)</div>
                                              <div>服務按摩師：{mo.therapistPreference || '不指定按摩師'}</div>
                                              <div>金額:NT${mo.finalPrice} {mo.paymentMethod ? `(${mo.paymentMethod})` : ''}</div>
                                            </div>
                                            <div className="text-stone-700 space-y-1 mt-1">
                                              {Object.entries(mo.items.reduce((acc, i) => {
                                                acc[i.name] = (acc[i.name] || 0) + i.duration;
                                                return acc;
                                              }, {} as Record<string, number>)).map(([name, duration], idx) => <div key={`${mo.id}-item-${idx}`}>{name}({duration}分鐘)</div>)}
                                            </div>
                                          </div>
                                          
                                          {/* Discomfort Areas Checkboxes */}
                                          <div className="w-full md:w-[28%] border-t md:border-t-0 md:border-l border-stone-200 pt-4 md:pt-0 md:pl-4">
                                            <label className="block text-xs text-stone-500 mb-2 font-medium">當日不適部位</label>
                                            <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
                                              {['頭','頸','肩膀','上背','下背','臀','大腿','小腿','足','胸','腹'].map(area => (
                                                <label key={area} className="flex items-center text-xs text-stone-700 cursor-pointer hover:bg-stone-100 p-0.5 rounded transition">
                                                  <input 
                                                    type="checkbox" 
                                                    checked={mo.discomfortAreas?.includes(area) || false} 
                                                    onChange={e => {
                                                      const current = mo.discomfortAreas || [];
                                                      let updated = [];
                                                      if (e.target.checked) {
                                                         updated = [...current, area];
                                                      } else {
                                                         updated = current.filter(x => x !== area);
                                                      }
                                                      db.updateOrder(mo.id, { discomfortAreas: updated });
                                                      setOrders(db.getOrders());
                                                    }}
                                                    className="mr-1.5 accent-stone-700" 
                                                  />
                                                  {area}
                                                </label>
                                              ))}
                                            </div>
                                          </div>

                                          <div className="w-full md:w-1/3 flex flex-col border-t md:border-t-0 md:border-l border-stone-200 pt-4 md:pt-0 md:pl-4">
                                            <label className="text-xs text-stone-500 mb-2 font-medium">服務紀錄及備註</label>
                                            <textarea
                                              className="flex-1 min-h-[100px] w-full p-2.5 text-sm border border-stone-200 rounded focus:outline-none focus:border-stone-400 resize-none transition bg-white"
                                              placeholder="輸入針對這次預約的特別備註或事後記錄..."
                                              defaultValue={mo.note || ''}
                                              onBlur={(e) => {
                                                db.updateOrder(mo.id, { note: e.target.value });
                                                setOrders(db.getOrders());
                                              }}
                                            />
                                            <p className="text-[10px] text-stone-400 mt-1 text-right">點擊空白處自動儲存</p>
                                          </div>
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
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>



      {bonusModal && (() => {
        const tAuthName = bonusModal.therapist;
        const targetLevel = bonusModal.level;
        const targetMonth = bonusModal.month;
        
        const levelMembers = members.filter(m => m.level === targetLevel);
        
        const handleToggle = (m: Member, isChecked: boolean) => {
           if (isChecked) {
              db.saveMember({ ...m, referredBy: tAuthName, referredMonth: targetMonth });
           } else {
              db.saveMember({ ...m, referredBy: undefined, referredMonth: undefined });
           }
           setMembers(db.getMembers().sort((a,b) => b.createdAt - a.createdAt));
        };
        
        return (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-stone-100 flex justify-between items-center">
                <h3 className="font-medium text-lg text-stone-800">{tAuthName} 的締結會員 ({targetLevel})</h3>
                <button onClick={() => setBonusModal(null)} className="text-stone-400 hover:text-stone-600">
                   <XCircle className="w-5 h-5"/>
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                 {levelMembers.length === 0 && <p className="text-sm text-stone-400">目前沒有 {targetLevel} 會員</p>}
                 {levelMembers.map(m => {
                    const isChecked = m.referredBy === tAuthName && m.referredMonth === targetMonth;
                    const isOther = !isChecked && m.referredBy && m.referredMonth === targetMonth;
                    
                    return (
                       <label key={m.id} className={`flex items-center space-x-3 p-3 rounded-lg border ${isChecked ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'} cursor-pointer transition`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            disabled={isOther}
                            onChange={(e) => handleToggle(m, e.target.checked)}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-stone-800">{m.name} <span className="text-xs text-stone-500 font-normal ml-2">{m.id}</span></p>
                            {isOther && <p className="text-[10px] text-orange-500 mt-0.5">已由 {m.referredBy} 於 {m.referredMonth} 締結</p>}
                            {m.referredBy && m.referredMonth && !isOther && !isChecked && (
                               <p className="text-[10px] text-stone-400 mt-0.5">已由 {m.referredBy} 於 {m.referredMonth} 締結 (非本月)</p>
                            )}
                          </div>
                       </label>
                    );
                 })}
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
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-6">
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
  );
}
