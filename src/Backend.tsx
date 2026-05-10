import React, { useState, useEffect } from 'react';
import { db, Member, Order, MemberLevel, timeToMins, minsToTime, Gender } from './store';
import { Trash2, TrendingUp, Users, Calendar, DollarSign, Clock, Search, CheckCircle, XCircle, CalendarDays, Lock, LogOut } from 'lucide-react';

export default function Backend() {
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<'orders' | 'members' | 'calendar'>('calendar');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [logMonthFilter, setLogMonthFilter] = useState<string>('');

  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [customerModalOpen, setCustomerModalOpen] = useState<Member | null>(null);

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
    const itemsText = o.items.map(i => `${i.name}(${i.duration}分)`).join(' + ');
    const shareText = `【ZEN FLOW 預約通知】\n日期：${o.date}\n時間：${o.time} - ${endTime}\n客人：${m?.name || '未知顧客'} (${m?.gender || '女'})\n項目：${itemsText}\n總長度：${o.totalDuration} 分鐘`;
    
    // Attempt to copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      setConfirmAction({ message: '已複製預約資訊到剪貼簿，您可以直接貼給按摩師了！' });
    }).catch(err => {
      setConfirmAction({ message: '複製失敗，請手動複製以下內容：\n\n' + shareText });
    });
  };

  // local state for editing note
  const [editingNote, setEditingNote] = useState<string>('');
  
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState<any>('女');
  const [editBirthday, setEditBirthday] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLevel, setEditLevel] = useState<MemberLevel>('一般');

  // Polling to simulate real-time updates from LocalStorage
  useEffect(() => {
    const fetch = () => {
      setOrders(db.getOrders().sort((a,b) => b.createdAt - a.createdAt));
      // Only update members list if we're not currently editing a note, to avoid losing focus
      setMembers(prev => {
        const next = db.getMembers().sort((a,b) => b.createdAt - a.createdAt);
        return next;
      });
    };
    fetch();
    const interval = setInterval(fetch, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysOrders = orders.filter(o => o.createdAt >= new Date(todayStr).getTime()); // Simplified day check
  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + o.finalPrice, 0);

  const filterDateStr = todayStr; // Simplified for now, could add date picker
  
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
    setEditingNote(m.note || '');
    setEditName(m.name);
    setEditGender(m.gender || '女');
    setEditBirthday(m.birthday);
    setEditPhone(m.id);
    setEditLevel(m.level);
    setCustomerModalOpen(m);
  };

  const handleExpand = (m: Member) => {
    if (expandedMemberId === m.id) {
      setExpandedMemberId(null);
    } else {
      setExpandedMemberId(m.id);
      setEditingNote(m.note || '');
      setEditName(m.name);
      setEditGender(m.gender || '女');
      setEditBirthday(m.birthday);
      setEditPhone(m.id);
      setEditLevel(m.level);
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
      overrides.level ?? editLevel
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
          <button onClick={()=>setTab('calendar')} className={`px-4 py-2 rounded-lg text-sm transition whitespace-nowrap ${tab==='calendar'?'bg-stone-700 text-white':'text-stone-400 hover:text-white'}`}>今日視圖</button>
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
                <Calendar className="w-5 h-5 mr-2" /> 今日視圖 ({todayStr})
              </h2>
            </div>
            
            <div className="space-y-6">
              {['阿翰', 'Ricky', 'Kelly', 'Kenny', 'Mark', '不指定'].map(category => {
                const categoryOrders = todaysOrders.filter(o => 
                  category === '不指定' 
                    ? (!o.therapistPreference || o.therapistPreference === '不指定' || o.therapistPreference === '男按摩師' as any || o.therapistPreference === '女按摩師' as any)
                    : o.therapistPreference === category
                ).sort((a,b) => (a.time || '').localeCompare(b.time || ''));

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
                            <div key={o.id} className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex items-start justify-between hover:border-stone-400 transition">
                              <div className="flex items-start space-x-4">
                                <div className="flex flex-col space-y-2">
                                  <span className="bg-stone-800 text-stone-50 px-2 py-1 rounded text-sm font-medium text-center">
                                    {o.date}
                                  </span>
                                  <span className="bg-stone-100 text-stone-700 px-2 py-1 rounded text-sm text-center">
                                    {o.time} - {endTime}
                                  </span>
                                </div>
                                <div className="mt-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <p className="text-base font-medium text-stone-800 cursor-pointer hover:underline" onClick={() => openCustomerModal(m)}>
                                      {m?.name || '未知顧客'} <span className="text-stone-400 text-sm font-normal ml-1">{o.memberId}</span>
                                    </p>
                                    <button onClick={() => handleShare(o)} className="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 px-2 py-0.5 rounded flex items-center transition bg-white shadow-sm">
                                      複製預約資訊
                                    </button>
                                  </div>
                                  <div className="text-sm text-stone-600 space-y-1">
                                    {o.items.map((i, idx) => (
                                      <p key={idx} className="flex items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mr-2"></span>
                                        {i.name} ({i.duration} 分鐘)
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right mt-1 flex flex-col justify-between items-end h-full">
                                <div>
                                  {o.status === 'completed' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mb-2 inline-block">已完成</span>}
                                  {o.status === 'cancelled' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mb-2 inline-block">已取消</span>}
                                  <p className="text-sm font-medium text-stone-800">NT$ {o.finalPrice}</p>
                                </div>
                                <div className="mt-4 flex flex-col items-end space-y-2">
                                  {(!o.status || o.status === 'pending') && (
                                    <>
                                      <div className="flex space-x-2">
                                        <button onClick={() => handleCompleteOrder(o.id)} className="text-xs px-3 py-1.5 bg-stone-800 text-white rounded hover:bg-stone-700 flex items-center transition">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          完成服務
                                        </button>
                                        <button onClick={() => setReschedulingId(o.id)} className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 flex items-center transition">
                                          <CalendarDays className="w-3 h-3 mr-1" />
                                          改期
                                        </button>
                                      </div>
                                      <button onClick={() => handleCancelOrder(o.id)} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded flex items-center transition">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        取消預約
                                      </button>
                                    </>
                                  )}
                                  {reschedulingId === o.id && (
                                    <div className="mt-2 p-3 bg-stone-50 border border-stone-200 rounded-lg flex flex-col space-y-2 w-48 shadow-sm">
                                      <input type="date" value={rescheduleDate} onChange={e=>setRescheduleDate(e.target.value)} className="text-sm p-1.5 border rounded" />
                                      <input type="time" value={rescheduleTime} onChange={e=>setRescheduleTime(e.target.value)} className="text-sm p-1.5 border rounded" />
                                      <div className="flex justify-end space-x-2 pt-1">
                                        <button onClick={()=>setReschedulingId(null)} className="text-xs px-2 py-1 text-stone-500 hover:bg-stone-100 rounded">取消</button>
                                        <button onClick={()=>submitReschedule(o.id)} className="text-xs px-2 py-1 bg-stone-800 text-white rounded">確定</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
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
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <h2 className="font-medium text-stone-800">所有預約紀錄</h2>
              <span className="text-xs text-stone-500 flex items-center"><Clock className="w-3 h-3 mr-1"/> 每秒自動更新 (儲存於本機)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[1000px]">
                <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-100 whitespace-nowrap">
                  <tr>
                    <th className="px-6 py-3 font-medium">預約時間</th>
                    <th className="px-6 py-3 font-medium">總時長</th>
                    <th className="px-6 py-3 font-medium">服務按摩師</th>
                    <th className="px-6 py-3 font-medium">顧客電話</th>
                    <th className="px-6 py-3 font-medium">療程內容</th>
                    <th className="px-6 py-3 font-medium">結帳金額</th>
                    <th className="px-6 py-3 font-medium">付款方式</th>
                    <th className="px-6 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-stone-400">尚無訂單紀錄</td></tr>
                  ) : orders.map(o => {
                    const m = members.find(x => x.id === o.memberId);
                    const dateObj = new Date(o.date);
                    const formattedDate = isNaN(dateObj.getTime()) ? o.date : `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2,'0')}/${String(dateObj.getDate()).padStart(2,'0')}(${['日','一','二','三','四','五','六'][dateObj.getDay()]})`;
                    const endTimeStr = o.time && o.totalDuration ? minsToTime(timeToMins(o.time) + o.totalDuration) : '';
                    const durationHoursDisplay = (o.totalDuration / 60) % 1 === 0 ? (o.totalDuration / 60) : (o.totalDuration / 60).toFixed(1);

                    return (
                    <tr key={o.id} className="hover:bg-stone-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-stone-800">{formattedDate}</div>
                        <div className="text-stone-500">{o.time}{endTimeStr ? `~${endTimeStr}` : ''}</div>
                      </td>
                      <td className="px-6 py-4 text-stone-600">{durationHoursDisplay}小時</td>
                      <td className="px-6 py-4 text-stone-600">{o.therapistPreference || '不指定'}</td>
                      <td className="px-6 py-4">
                        <div 
                          className="font-medium text-stone-800 cursor-pointer hover:underline"
                          onClick={() => {
                            if (m) setCustomerModalOpen(m);
                          }}
                        >{m?.name || '未知'}</div>
                        <div className="text-xs text-stone-500">{o.memberId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <ul className="list-disc list-inside text-stone-600 text-xs space-y-1">
                          {o.items.map((item, i) => <li key={`${o.id}-i-${i}`}>{item.name}</li>)}
                        </ul>
                      </td>
                      <td className="px-6 py-4">
                         <div className="font-medium">NT$ {o.finalPrice}</div>
                         {o.discountAmount > 0 && <div className="text-xs text-green-600 mt-1">已扣除優惠 ${o.discountAmount}<br/><span className="text-[10px] text-stone-400">{o.discountFormula}</span></div>}
                      </td>
                      <td className="px-6 py-4 text-stone-600">
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
                      <td className="px-6 py-4">
                        <button onClick={()=>handleDeleteOrder(o.id)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
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
                    <th className="px-6 py-3 font-medium cursor-pointer" title="點擊展開/收合消費紀錄">姓名</th>
                    <th className="px-6 py-3 font-medium">性別</th>
                    <th className="px-6 py-3 font-medium">電話</th>
                    <th className="px-6 py-3 font-medium">生日</th>
                    <th className="px-6 py-3 font-medium">總消費次數</th>
                    <th className="px-6 py-3 font-medium">累計金額</th>
                    <th className="px-6 py-3 font-medium">會員等級</th>
                    <th className="px-6 py-3 font-medium text-center">消費紀錄</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {members.map(m => {
                    const memberOrders = orders.filter(o => o.memberId === m.id);
                    const totalSpent = memberOrders.reduce((sum, o) => sum + o.finalPrice, 0);
                    const isExpanded = expandedMemberId === m.id;
                    return (
                    <React.Fragment key={m.id}>
                      <tr className="hover:bg-stone-50/50 transition">
                        <td 
                          className="px-6 py-4 font-medium text-stone-800 cursor-pointer hover:text-stone-600 underline decoration-stone-300 underline-offset-4"
                          onClick={() => handleExpand(m)}
                        >
                          {m.name}
                        </td>
                        <td className="px-6 py-4 text-stone-600">{m.gender || '女'}</td>
                        <td className="px-6 py-4 text-stone-600">{m.id}</td>
                        <td className="px-6 py-4 text-stone-600">{m.birthday}</td>
                        <td className="px-6 py-4 text-stone-600">{memberOrders.length} 次</td>
                        <td className="px-6 py-4 text-stone-600 font-medium">NT$ {totalSpent}</td>
                        <td className="px-6 py-4">
                          <select 
                            value={m.level} 
                            onChange={(e)=>handleLevelChange(m.id, e.target.value as MemberLevel)}
                            className={`p-1.5 border rounded-lg text-xs font-medium outline-none ${m.level==='金卡'?'bg-amber-50 text-amber-800 border-amber-200':m.level==='黑卡'?'bg-stone-800 text-stone-100 border-stone-800':'bg-stone-50 text-stone-600 border-stone-200'}`}
                          >
                            <option value="一般">一般會員</option>
                            <option value="金卡">金卡會員 (1次/月 首時半價)</option>
                            <option value="黑卡">黑卡會員 (4次/月 首時半價)</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-center">
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
                          <td colSpan={8} className="px-6 py-4">
                            <div className="space-y-6">
                              {/* Top Section: Info & Note */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm">
                                  <h3 className="text-sm font-medium text-stone-800 mb-4 flex items-center">
                                    編輯基本資料
                                  </h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs text-stone-500 mb-1">姓名</label>
                                      <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-stone-500 mb-1">手機號碼</label>
                                      <input type="text" value={editPhone} onChange={e=>setEditPhone(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-stone-500 mb-1">生日</label>
                                      <input type="date" value={editBirthday} onChange={e=>setEditBirthday(e.target.value)} onBlur={()=>handleInfoSave(m.id)} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-stone-500 mb-1">性別</label>
                                      <select value={editGender} onChange={e=>{
                                        const newGen = e.target.value as Gender;
                                        setEditGender(newGen);
                                        handleInfoSave(m.id, { gender: newGen });
                                      }} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition">
                                        <option value="男">男性</option>
                                        <option value="女">女性</option>
                                      </select>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-xs text-stone-500 mb-1">會員等級</label>
                                      <select value={editLevel} onChange={e=>{
                                        const newLevel = e.target.value as MemberLevel;
                                        setEditLevel(newLevel);
                                        handleInfoSave(m.id, { level: newLevel });
                                      }} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition">
                                        <option value="一般">一般會員</option>
                                        <option value="金卡">金卡會員 (每月1次優惠)</option>
                                        <option value="黑卡">黑卡會員 (每月4次優惠)</option>
                                      </select>
                                    </div>
                                  </div>
                                  <p className="text-xs text-stone-400 text-right mt-2">修改後自動儲存</p>
                                </div>
                                
                                <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm flex flex-col">
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
                                      const formattedDate = isNaN(dateObj.getTime()) ? mo.date : `${dateObj.getMonth() + 1}月${dateObj.getDate()}日(${['日','一','二','三','四','五','六'][dateObj.getDay()]})`;
                                      
                                      const endTimeStr = mo.time && mo.totalDuration ? minsToTime(timeToMins(mo.time) + mo.totalDuration) : '';
                                      const durationHoursDisplay = (mo.totalDuration / 60) % 1 === 0 ? (mo.totalDuration / 60) : (mo.totalDuration / 60).toFixed(1);
                                      
                                      return (
                                        <li key={mo.id} className="text-sm flex flex-col md:flex-row items-stretch p-4 bg-stone-50 rounded-lg border border-stone-200 gap-4">
                                          <div className="flex-[1.2] flex flex-col space-y-1">
                                            <div className="font-medium text-stone-900 border-b border-stone-200 pb-3 mb-2 flex flex-col space-y-1">
                                              <div>{formattedDate} 預約 {mo.time}{endTimeStr ? `~${endTimeStr}` : ''} ({durationHoursDisplay}小時)</div>
                                              <div>服務按摩師：{mo.therapistPreference || '不指定'}</div>
                                              <div>金額:NT${mo.finalPrice} {mo.paymentMethod ? `(${mo.paymentMethod})` : ''}</div>
                                            </div>
                                            <div className="text-stone-700 space-y-1 mt-1">
                                              {mo.items.map((i, idx) => <div key={`${mo.id}-item-${idx}`}>{i.name} {i.duration}分鐘</div>)}
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

      {customerModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-50 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden relative">
            <div className="sticky top-0 bg-stone-50/90 backdrop-blur border-b border-stone-200 p-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-medium text-stone-800">顧客詳細資料</h2>
              <button onClick={() => setCustomerModalOpen(null)} className="p-2 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-200 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* Top Section: Info & Note */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm">
                    <h3 className="text-sm font-medium text-stone-800 mb-4 flex items-center">
                      編輯基本資料
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">姓名</label>
                        <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} onBlur={()=>handleInfoSave(customerModalOpen.id)} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">手機號碼</label>
                        <input type="text" value={editPhone} onChange={e=>setEditPhone(e.target.value)} onBlur={()=>handleInfoSave(customerModalOpen.id)} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">生日</label>
                        <input type="date" value={editBirthday} onChange={e=>setEditBirthday(e.target.value)} onBlur={()=>handleInfoSave(customerModalOpen.id)} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">性別</label>
                        <select value={editGender} onChange={e=>{
                          const newGen = e.target.value as Gender;
                          setEditGender(newGen);
                          handleInfoSave(customerModalOpen.id, { gender: newGen });
                        }} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition">
                          <option value="男">男性</option>
                          <option value="女">女性</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-stone-500 mb-1">會員等級</label>
                        <select value={editLevel} onChange={e=>{
                          const newLevel = e.target.value as MemberLevel;
                          setEditLevel(newLevel);
                          handleInfoSave(customerModalOpen.id, { level: newLevel });
                        }} className="w-full text-sm p-2.5 border border-stone-200 rounded-lg focus:border-stone-500 outline-none transition">
                          <option value="一般">一般會員</option>
                          <option value="金卡">金卡會員 (每月1次優惠)</option>
                          <option value="黑卡">黑卡會員 (每月4次優惠)</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-stone-400 text-right mt-2">修改後自動儲存</p>
                  </div>
                  
                  <div className="border border-stone-200 rounded-lg p-5 bg-white shadow-sm flex flex-col">
                    <h3 className="text-sm font-medium text-stone-800 mb-4 flex items-center">
                      顧客備註 / 習慣
                    </h3>
                    <textarea 
                      className="flex-1 min-h-[150px] w-full p-4 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-stone-500 resize-none transition"
                      placeholder="輸入關於此顧客的偏好、習慣等筆記..."
                      value={editingNote}
                      onChange={e => setEditingNote(e.target.value)}
                      onBlur={() => handleNoteSave(customerModalOpen.id)}
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
                    const memberOrders = orders.filter(o => o.memberId === customerModalOpen.id);
                    const filteredOrders = memberOrders.filter(mo => {
                      if (logMonthFilter) return mo.date.startsWith(logMonthFilter);
                      const d = new Date(mo.date);
                      const sixMonthsAgo = new Date();
                      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                      return d.getTime() >= sixMonthsAgo.getTime();
                    }).sort((a,b) => {
                      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
                      return diff !== 0 ? diff : b.createdAt - a.createdAt;
                    });
                    
                    if (filteredOrders.length === 0) return <p className="text-sm text-stone-400 py-2">該區間尚無消費紀錄</p>;
                    return (
                      <ul className="space-y-4">
                        {filteredOrders.map(mo => {
                          const dateObj = new Date(mo.date);
                          const formattedDate = isNaN(dateObj.getTime()) ? mo.date : `${dateObj.getMonth() + 1}月${dateObj.getDate()}日(${['日','一','二','三','四','五','六'][dateObj.getDay()]})`;
                          
                          const endTimeStr = mo.time && mo.totalDuration ? minsToTime(timeToMins(mo.time) + mo.totalDuration) : '';
                          const durationHoursDisplay = (mo.totalDuration / 60) % 1 === 0 ? (mo.totalDuration / 60) : (mo.totalDuration / 60).toFixed(1);
                          
                          return (
                            <li key={mo.id} className="text-sm flex flex-col md:flex-row items-stretch p-4 bg-stone-50 rounded-lg border border-stone-200 gap-4">
                              <div className="flex-[1.2] flex flex-col space-y-1">
                                <div className="font-medium text-stone-900 border-b border-stone-200 pb-3 mb-2 flex flex-col space-y-1">
                                  <div>{formattedDate} 預約 {mo.time}{endTimeStr ? `~${endTimeStr}` : ''} ({durationHoursDisplay}小時)</div>
                                  <div>服務按摩師：{mo.therapistPreference || '不指定'}</div>
                                  <div>金額:NT${mo.finalPrice} {mo.paymentMethod ? `(${mo.paymentMethod})` : ''}</div>
                                </div>
                                <div className="text-stone-700 space-y-1 mt-1">
                                  {mo.items.map((i, idx) => <div key={`${mo.id}-item-${idx}`}>{i.name} {i.duration}分鐘</div>)}
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
            </div>
          </div>
        </div>
      )}

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

    </div>
  );
}
