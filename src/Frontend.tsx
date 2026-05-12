import React, { useState, useEffect, useMemo } from 'react';
import { db, COURSES, Member, OrderItem, Order, calculateDiscount, ALL_TIME_SLOTS, isSlotAvailable, Gender, TherapistPreference, timeToMins, minsToTime, getDiscountStatus, sortOrderItems } from './store';
import { User, Phone, Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2, ChevronRight, X } from 'lucide-react';

const getZodiacSign = (dateString: string) => {
  if (!dateString) return '';
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return '';
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  if ((month === 1 && day <= 19) || (month === 12 && day >= 22)) return '摩羯座';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '雙魚座';
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '牡羊座';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return '雙子座';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return '巨蟹座';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '獅子座';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '處女座';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return '天秤座';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return '天蠍座';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return '射手座';
  return '';
};

export default function Frontend() {
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  
  // Registration Form
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [lineId, setLineId] = useState('');
  const [gender, setGender] = useState<Gender>('女');
  const [isRegistering, setIsRegistering] = useState(false);

  // Polling for orders to check real-time availability
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  useEffect(() => {
    const fetchData = () => setAllOrders(db.getOrders());
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Booking Flow State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [frontendTab, setFrontendTab] = useState<'booking' | 'upcoming' | 'history'>('booking');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  // Cart (holds only addons, BASE_COURSE is implicit)
  const [cart, setCart] = useState<{ courseId: string, id: string, isUpgrade: boolean }[]>([]);
  const [therapistPref, setTherapistPref] = useState<TherapistPreference>('不指定按摩師');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [linePayUrl, setLinePayUrl] = useState('');
  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm?: () => void} | null>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem('zf_login_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      const m = db.getMemberByPhone(savedPhone);
      if (m) {
        setMember(m);
        // Do not auto-set step 2 if we are returning from LINE Pay
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const linepayStatus = urlParams.get('linepay');
    const transactionId = urlParams.get('transactionId');
    const orderId = urlParams.get('orderId');

    if (linepayStatus === 'confirm' && transactionId && orderId) {
      const allOriginalOrders = db.getOrders();
      const currentOrder = allOriginalOrders.find(o => o.id === orderId);
      if (currentOrder && currentOrder.paymentMethod === 'LINE PAY') {
         fetch('/api/linepay/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               amount: currentOrder.finalPrice,
               transactionId
            })
         }).then(res => res.json()).then(result => {
             if (result.returnCode === '0000') {
                alert('LINE Pay 付款成功！');
                db.updateOrder(orderId, { paymentMethod: 'LINE PAY (已線上結帳)' });
                setStep(3);
             } else {
                alert('付款確認失敗: ' + result.returnMessage);
             }
         }).catch(e => {
            console.error(e);
            alert('付款確認異常');
         }).finally(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
         });
      }
    } else if (linepayStatus === 'cancel') {
       alert('LINE Pay 付款已取消');
       window.history.replaceState({}, document.title, window.location.pathname);
    } else if (savedPhone && db.getMemberByPhone(savedPhone)) {
       setStep(2);
    }
  }, []);

  const handleLogin = () => {
    if (!phone) return;
    const m = db.getMemberByPhone(phone);
    if (m) {
      localStorage.setItem('zf_login_phone', phone);
      setMember(m);
      setStep(2);
    } else {
      setIsRegistering(true);
    }
  };

  const handleRegister = () => {
    if (!name || !birthday || !phone) return;
    const newMember: Member = {
      id: phone,
      name,
      birthday,
      gender,
      lineId,
      level: '一般',
      createdAt: Date.now()
    };
    db.saveMember(newMember);
    localStorage.setItem('zf_login_phone', phone);
    setMember(newMember);
    setIsRegistering(false);
    setStep(2);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('zf_login_phone');
    setMember(null);
    setPhone('');
    setCart([]);
    setStep(1);
  };

  const addToCart = (courseId: string) => {
    setCart([...cart, { courseId, id: Math.random().toString(36).substring(7), isUpgrade: false }]);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(c => c.id !== cartId));
  };

  const toggleUpgrade = (cartId: string, val: boolean) => {
    setCart(cart.map(c => c.id === cartId ? { ...c, isUpgrade: val } : c));
  };

  // Derive Order computation
  const orderComputation = useMemo(() => {
    let items: OrderItem[] = [];
    let totalDuration = 0;
    
    // Process courses
    cart.forEach(c => {
      const course = COURSES.find(x => x.id === c.courseId);
      if (course) {
        const isUpgraded = c.isUpgrade && course.allowUpgrade;
        let price = course.price;
        if (isUpgraded) price += 200;
        
        items.push({
          id: c.id,
          courseId: c.courseId,
          name: course.name + (isUpgraded ? ' (+芳療/筋膜刀)' : ''),
          price: price,
          duration: course.time,
          isUpgrade: isUpgraded
        });
        totalDuration += course.time;
      }
    });

    const originalPrice = items.reduce((sum, item) => sum + item.price, 0);
    
    // Discount calculation
    let discountAmount = 0;
    let discountFormula = '';
    if (member) {
      const discountResult = calculateDiscount(member, date, allOrders, items);
      discountAmount = discountResult.discount;
      discountFormula = discountResult.formulaExp;
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return { items, totalDuration, originalPrice, discountAmount, discountFormula, finalPrice };
  }, [cart, member, date, allOrders]);

  const { items, totalDuration, originalPrice, discountAmount, discountFormula, finalPrice } = orderComputation;

  const hasFemaleExclusive = cart.some(c => {
    const course = COURSES.find(x => x.id === c.courseId);
    return course?.category === '女性專屬';
  });

  useEffect(() => {
    if (hasFemaleExclusive) {
      setTherapistPref('Kelly');
    }
  }, [hasFemaleExclusive]);

  // Verify currently selected time is still valid after changing duration or therapist
  useEffect(() => {
    if (date && time && !isSlotAvailable(date, time, totalDuration, allOrders, member?.id, therapistPref)) {
      setTime(''); // clear invalid time
    }
  }, [totalDuration, allOrders, date, time, member?.id, therapistPref]);

  const canCheckout = date && time && totalDuration >= 30 && totalDuration <= 180;

  const isTherapistAvailable = (tName: string) => {
    if (!date || !time) return true;
    if (tName === '不指定按摩師') return true;
    
    const startMins = timeToMins(time);
    const endMins = startMins + totalDuration + 30;
    
    // Check overlapping orders for this therapist
    const overlaps = allOrders.some(o => {
      if (o.date !== date || o.status === 'cancelled' || o.therapistPreference !== tName) return false;
      const oStart = timeToMins(o.time || '00:00');
      const oEnd = oStart + (o.totalDuration || 0) + 30;
      
      // Check intersection
      return startMins < oEnd && endMins > oStart;
    });
    
    return !overlaps;
  };

  const THERAPISTS = ['不指定按摩師', '阿翰(男)', 'Ricky(男)', 'Kenny(男)', 'Mark(男)', '男按摩師即可', 'Alice(女)', 'Kelly(女)', 'Miki(女)', '女按摩師即可'];

  const handleCheckoutClick = () => {
    if (!canCheckout || !member) return;
    setIsPaying(true);
  };

  const processPayment = async () => {
    if (!member || !date || !time) return;
    
    const orderId = Math.random().toString(36).substring(7);

    // Save order as pending initially (if payment fails, they can cancel or it remains pending)
    db.saveOrder({
      id: orderId,
      memberId: member.id,
      date,
      time,
      paymentMethod,
      therapistPreference: therapistPref,
      items,
      totalDuration,
      originalPrice,
      status: 'pending',
      discountAmount,
      discountFormula,
      finalPrice,
      createdAt: Date.now()
    });

    if (paymentMethod === 'LINE PAY') {
      try {
        const baseUrl = window.location.origin + window.location.pathname;
        const confirmUrl = `${baseUrl}?linepay=confirm&orderId=${orderId}`;
        const cancelUrl = `${baseUrl}?linepay=cancel`;
        
        setIsRegistering(true); // show loading state visually on button or form
        
        const response = await fetch('/api/linepay/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalPrice,
            orderId,
            productName: items.map(i => i.name).join(', '),
            confirmUrl,
            cancelUrl
          })
        });
        
        const result = await response.json();
        
        if (result.returnCode === '0000' && result.info?.paymentUrl?.web) {
          // Instead of immediate redirect (which might be blocked by iframe), show a button
          setLinePayUrl(result.info.paymentUrl.web);
          return;
        } else {
          alert('LINE Pay 請求失敗: ' + (result.returnMessage || '未知錯誤'));
          setIsPaying(false);
          return;
        }
      } catch (error) {
        console.error(error);
        alert('LINE Pay 系統連線異常');
        setIsPaying(false);
        return;
      }
    }
    
    setIsPaying(false);
    setPaymentMethod('');
    setStep(3);
  };

  const getWeekDay = (dateStr: string) => {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[new Date(dateStr).getDay()];
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}小時${m}分`;
    if (h > 0) return `${h}小時`;
    return `${m}分`;
  };

  const handleCancelOrder = (id: string, date: string, time: string) => {
    const orderTime = new Date(`${date}T${time || '00:00'}:00`).getTime();
    const now = new Date().getTime();
    if (orderTime - now < 2 * 60 * 60 * 1000) {
      setConfirmAction({ message: "距離預約時間已不足2小時，無法線上取消。請直接來電通知！" });
      return;
    }
    setConfirmAction({
      message: '確定要取消這筆預約嗎？',
      onConfirm: () => {
        db.updateOrder(id, { status: 'cancelled' });
        setAllOrders(db.getOrders());
        setConfirmAction({ message: '預約已為您取消，我們將收到系統更新，謝謝您的通知！' });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 bg-white min-h-screen font-sans">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-stone-800 tracking-wider">ZEN FLOW</h1>
        <p className="text-stone-500 mt-2">身心療癒 專屬預約</p>
      </div>

      {step === 1 && (
        <div className="max-w-md mx-auto bg-stone-50 p-8 rounded-2xl shadow-sm border border-stone-100">
          <h2 className="text-xl text-stone-700 mb-6 text-center">會員登入 / 註冊</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-stone-500 mb-1">手機號碼 (必填)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-stone-400" />
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-400 outline-none"
                  placeholder="0912345678"
                />
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-4 pt-4 border-t border-stone-200 animate-in fade-in slide-in-from-top-4">
                <p className="text-sm text-stone-500">歡迎新朋友！請填寫基本資料註冊</p>
                <div>
                  <label className="block text-sm text-stone-500 mb-1">姓名</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg" placeholder="您的姓名"/>
                </div>
                <div>
                  <label className="block text-sm text-stone-500 mb-1">生日</label>
                  <div className="relative w-full cursor-pointer">
                    <input 
                      type="date" 
                      value={birthday} 
                      onChange={e => setBirthday(e.target.value)} 
                      onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      style={{ colorScheme: 'light' }}
                    />
                    <div className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg text-stone-800 transition flex items-center justify-between">
                      <span className={birthday ? "" : "text-stone-400"}>{birthday ? birthday.replace(/-/g, '/') : '年/月/日'}</span>
                      <CalendarIcon className="w-4 h-4 text-stone-400" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-stone-500 mb-1">LINE ID (選填)</label>
                  <input type="text" value={lineId} onChange={e => setLineId(e.target.value)} className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg" placeholder="您的 LINE ID" />
                </div>
                <div>
                  <label className="block text-sm text-stone-500 mb-1">性別</label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input type="radio" value="男" checked={gender === '男'} onChange={() => setGender('男')} className="mr-2" />
                      <span className="text-stone-700">男性</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input type="radio" value="女" checked={gender === '女'} onChange={() => setGender('女')} className="mr-2" />
                      <span className="text-stone-700">女性</span>
                    </label>
                  </div>
                </div>
                <button onClick={handleRegister} className="w-full py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition">完成註冊並繼續</button>
              </div>
            )}

            {!isRegistering && (
               <button onClick={handleLogin} className="w-full py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition mt-4 flex items-center justify-center">
                 下一步 <ChevronRight className="w-5 h-5 ml-1" />
               </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && member && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex flex-col md:flex-row gap-4">
            <div className="md:w-1/2">
              <div className="flex items-center gap-3">
                <p className="text-stone-800 font-medium">您好, {member.name}</p>
                <button onClick={handleLogout} className="text-xs text-stone-400 hover:text-stone-600 underline">切換帳號</button>
              </div>
              <div className="text-sm text-stone-600 mt-3 space-y-1">
                <p>生日 | {member.birthday}</p>
                <p>星座 | {getZodiacSign(member.birthday)}</p>
                <p>電話 | {member.id}</p>
                <p>等級 | {member.level}</p>
              </div>
              <p className="text-[10px] text-stone-400 mt-3">如需修改請聯繫 ZEN FLOW 工作人員</p>
            </div>
            {member.level !== '一般' && (() => {
              const status = getDiscountStatus(member, date, allOrders);
              return (
                <div className="md:w-1/2 text-left flex flex-col justify-start">
                  <div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full border border-amber-200 inline-block mb-3">尊爵禮遇生效中</span>
                    <div className="space-y-1.5 text-xs text-stone-700">
                      <p>➊按摩首時1200元後半價<span className="text-stone-500"> (本月優惠次數：{status.usedTimes} / {status.maxTimes})</span></p>
                      <p>➋InBody量測與解說<span className="text-stone-500"> (本月免費量測次數：{status.inbodyUsedTimes} / {status.inbodyMaxTimes})</span></p>
                      <p>➌店內飲品全面8折</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex space-x-2 border-b border-stone-200 mb-6">
            <button onClick={() => setFrontendTab('booking')} className={`pb-3 px-2 text-sm font-medium transition-colors relative ${frontendTab === 'booking' ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
              開始預約
              {frontendTab === 'booking' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-stone-800"></div>}
            </button>
            <button onClick={() => setFrontendTab('upcoming')} className={`pb-3 px-2 text-sm font-medium transition-colors relative ${frontendTab === 'upcoming' ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
              我的預約
              {frontendTab === 'upcoming' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-stone-800"></div>}
            </button>
            <button onClick={() => setFrontendTab('history')} className={`pb-3 px-2 text-sm font-medium transition-colors relative ${frontendTab === 'history' ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
              過往消費紀錄
              {frontendTab === 'history' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-stone-800"></div>}
            </button>
          </div>

          {frontendTab === 'booking' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* DateTime */}
              <section>
                <h3 className="text-lg text-stone-800 mb-1 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-stone-400"/> 請先選擇日期與按摩開始時間</h3>
                <p className="text-xs text-stone-500 mb-3 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                  ＊本店營業時間為 10:00 - 22:00，最晚接受預約時間為 21:30。請選擇營業時間內可完成之服務項目。
                </p>
                <div className="space-y-4">
                  {(() => {
                    const today = new Date();
                    const maxDateObj = new Date(today);
                    maxDateObj.setMonth(maxDateObj.getMonth() + 1);
                    const minDateStr = today.toISOString().split('T')[0];
                    const maxDateStr = maxDateObj.toISOString().split('T')[0];
                    return (
                      <div className="relative w-full cursor-pointer">
                        <input 
                          type="date" 
                          min={minDateStr} 
                          max={maxDateStr} 
                          value={date} 
                          onChange={e=>{setDate(e.target.value); setTime('');}} 
                          onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                          style={{ colorScheme: 'light' }}
                        />
                        <div className="w-full p-2 border border-stone-200 rounded-lg bg-white text-stone-800 transition flex items-center justify-between">
                          <span className={date ? "" : "text-stone-400"}>{date ? date.replace(/-/g, '/') : '年/月/日'}</span>
                          <CalendarIcon className="w-4 h-4 text-stone-400" />
                        </div>
                      </div>
                    );
                  })()}
                  
                  {date && (
                    <div className="grid grid-cols-4 gap-2">
                      {ALL_TIME_SLOTS.map(t => {
                        const available = isSlotAvailable(date, t, totalDuration, allOrders, member?.id, therapistPref);
                        return (
                          <button
                            key={t}
                            disabled={!available}
                            onClick={() => setTime(t)}
                            className={`py-2 text-sm rounded border transition flex flex-col items-center justify-center ${
                              time === t ? 'bg-stone-800 text-white border-stone-800' 
                              : available ? 'bg-white text-stone-700 border-stone-200 hover:border-stone-400' 
                              : 'bg-stone-100 text-stone-300 border-stone-100 cursor-not-allowed'
                            }`}
                          >
                            <span>{t}</span>
                            {!available && <span className="text-[10px] mt-0.5">已約滿</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!date && <p className="text-sm text-stone-400">請先選擇日期</p>}
                </div>
              </section>

              {/* Course Selection */}
              <section>
                 <h3 className="text-lg text-stone-800 mb-1 flex items-center"><User className="w-5 h-5 mr-2 text-stone-400"/> 再選擇想預約的服務項目(可複選)</h3>
                 <p className="text-xs text-stone-500 mb-3 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                   ＊小提醒：如果想規劃「局部舒壓」項目，因為局部舒壓為短時間重點部位加強，如需更多服務只可搭配「芳療升級(芳療油推)」、「運動按摩(晴空)」或是「InBody量測與解說」哦！
                 </p>
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                   {COURSES.filter(c => !(member.gender === '男' && c.category.includes('女性專屬'))).map(course => {
                    const selectedCount = cart.filter(c => c.courseId === course.id).length;
                    const isSelected = selectedCount > 0;

                    const hasFullBody = cart.some(cartItem => {
                      const c = COURSES.find(x => x.id === cartItem.courseId);
                      return c && (c.category === '經絡按摩' || c.category.includes('女性專屬'));
                    });
                    const localCount = cart.filter(cartItem => {
                      const c = COURSES.find(x => x.id === cartItem.courseId);
                      return c && c.category.includes('局部舒壓');
                    }).length;
                    const hasLocal = localCount > 0;

                    let isDisabled = false;
                    if (course.category.includes('局部舒壓')) {
                      if (hasFullBody || localCount >= 1) isDisabled = true;
                    }
                    if (course.category === '經絡按摩' || course.category.includes('女性專屬')) {
                      if (hasLocal) isDisabled = true;
                    }

                    return (
                     <div key={course.id} className={`p-3 border rounded-lg transition flex justify-between items-center ${isDisabled ? 'opacity-40 cursor-not-allowed bg-stone-50 border-stone-100' : isSelected ? 'border-stone-800 bg-stone-50/80 shadow-sm cursor-pointer' : 'border-stone-200 hover:border-stone-400 bg-white cursor-pointer'}`} onClick={() => { if (!isDisabled) addToCart(course.id); }}>
                       <div>
                         <p className="text-xs text-stone-400 mb-1">{course.category}</p>
                         <p className="font-medium text-stone-700 flex items-center gap-2">
                           {course.name}
                           {isSelected && <span className="bg-stone-800 text-stone-50 text-[10px] px-2 py-0.5 rounded-full">{selectedCount}</span>}
                         </p>
                       </div>
                       <div className="text-right">
                         <p className="text-stone-800">NT${course.price}</p>
                         <p className="text-xs text-stone-400 mt-1">{course.time} 分鐘 {isSelected ? <CheckCircle2 className="w-3 h-3 inline text-stone-800" /> : <Plus className="w-3 h-3 inline"/>}</p>
                       </div>
                     </div>
                   )})}
                 </div>
              </section>
            </div>

            {/* Cart Summary */}
            <div>
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 sticky top-4">
                <h3 className="text-lg text-stone-800 mb-4 font-medium">預約明細</h3>
                
                {cart.length === 0 ? (
                  <div className="mb-6 space-y-4">
                    <p className="text-sm text-stone-500 text-center py-4">請由左側選擇療程</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {cart.map(c => {
                      const course = COURSES.find(x => x.id === c.courseId);
                      if(!course) return null;
                      return (
                        <div key={c.id} className="relative pl-3 border-l-2 border-stone-800 bg-white shadow-sm p-3 rounded">
                           <div className="flex justify-between items-start">
                             <div>
                               <p className="font-medium text-stone-700">{course.name}</p>
                               <p className="text-xs text-stone-500 mt-0.5">{course.time} 分鐘</p>
                             </div>
                             <div className="flex items-center">
                               <span className="text-stone-700 mr-3">NT${course.price}</span>
                               <button onClick={()=>removeFromCart(c.id)} className="text-stone-400 hover:text-red-500 transition-colors p-1" title="刪除此項目"><Trash2 className="w-4 h-4"/></button>
                             </div>
                           </div>
                           
                           {course.allowUpgrade && (
                             <label className="flex items-center mt-2 text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-100 cursor-pointer">
                               <input type="checkbox" checked={c.isUpgrade} onChange={e=>toggleUpgrade(c.id, e.target.checked)} className="mr-2" />
                               加購 $200 升級芳療油推/筋膜刀
                             </label>
                           )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="bg-white p-4 rounded-xl border border-stone-100 space-y-2">
                  {(date && time) && (
                    <div className="mb-4 pb-4 border-b border-stone-100">
                      <p className="text-xs text-stone-500 mb-1">本次預約時間</p>
                      <p className="text-lg font-medium text-stone-800">
                        {date.length >= 10 ? parseInt(date.substring(5, 7)) : ''}/{date.length >= 10 ? parseInt(date.substring(8, 10)) : ''} {time}~{minsToTime(timeToMins(time) + totalDuration)}
                      </p>
                      {time && (() => {
                        const arriveMins = timeToMins(time) - 15;
                        const arriveTimeStr = minsToTime(arriveMins < 0 ? 0 : arriveMins);
                        return <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100 inline-block">✨ 歡迎於 {arriveTimeStr} 到店沐浴更衣準備按摩。</p>;
                      })()}
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm text-stone-600 mb-2">
                    <span className="mt-1">安排按摩師</span>
                    <select 
                      value={therapistPref} 
                      onChange={e=>setTherapistPref(e.target.value as TherapistPreference)} 
                      disabled={hasFemaleExclusive}
                      className="p-1 border border-stone-200 rounded bg-stone-50 text-stone-700 focus:outline-none"
                    >
                      {THERAPISTS.map(t => {
                        const available = isTherapistAvailable(t);
                        return (
                          <option key={t} value={t} disabled={!available} className={!available ? 'text-stone-300' : ''}>
                            {t} {!available ? '(此時段已有約)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex justify-between text-sm text-stone-600 border-t border-stone-100 pt-2">
                    <span>總時長</span>
                    <span className={totalDuration > 180 || (totalDuration > 0 && totalDuration < 30) ? "text-red-500 font-medium" : ""}>{totalDuration} 分鐘</span>
                  </div>
                  {(totalDuration > 180 || (totalDuration > 0 && totalDuration < 30)) && (
                    <p className="text-xs text-red-500 text-right">※ 單次最低30分，最高180分</p>
                  )}
                  <div className="flex justify-between text-sm text-stone-600">
                    <span>小計</span>
                    <span>NT$ {originalPrice}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                        <span>會員優惠 (1200元後半價)</span>
                        <span>- NT$ {discountAmount}</span>
                      </div>
                      <p className="text-right text-xs text-stone-500">
                        優惠算式: {discountFormula}
                      </p>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-stone-100 flex justify-between items-end">
                    <span className="font-medium text-stone-800">總計金額</span>
                    <span className="text-2xl font-semibold text-stone-900">NT$ {finalPrice}</span>
                  </div>
                </div>

                <button 
                  onClick={handleCheckoutClick} 
                  disabled={!canCheckout}
                  className={`w-full py-4 mt-6 rounded-xl font-medium transition ${canCheckout ? 'bg-stone-800 text-white hover:bg-stone-700 shadow-md' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
                >
                  確認預約並線上結帳
                </button>
              </div>
            </div>
          </div>
          )}

          {frontendTab === 'upcoming' && (() => {
            const memberOrders = allOrders.filter(o => o.memberId === member.id).sort((a,b) => b.createdAt - a.createdAt);
            const now = new Date().getTime();
            const upcomingOrders = memberOrders.filter(o => o.status !== 'cancelled' && new Date(`${o.date}T${o.time || '00:00'}:00`).getTime() > now).sort((a,b) => new Date(`${a.date}T${a.time || '00:00'}:00`).getTime() - new Date(`${b.date}T${b.time || '00:00'}:00`).getTime());

            return (
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg text-stone-800 mb-4 font-medium flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> 即將到來的預約
                  </h3>
                  {upcomingOrders.length === 0 ? (
                    <div className="p-6 text-center text-stone-500 bg-white border border-stone-200 rounded-xl">目前沒有即將到來的預約</div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingOrders.map(o => {
                        const orderTimeMs = new Date(`${o.date}T${o.time || '00:00'}:00`);
                        const canCancelMs = orderTimeMs.getTime() - 2 * 60 * 60 * 1000;
                        const canCancel = new Date().getTime() <= canCancelMs;
                        const limitDateObj = new Date(canCancelMs);
                        const limitDateStr = limitDateObj.toISOString().split('T')[0];
                        const limitTimeStr = limitDateObj.toTimeString().substring(0, 5);

                        return (
                        <div key={o.id} className="p-5 bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-stone-300 transition">
                          <div className="flex-1">
                            <p className="font-medium text-stone-800 mb-1">
                              {o.date.replace(/-/g, '/')}({getWeekDay(o.date)}) {o.time}~{minsToTime(timeToMins(o.time) + o.totalDuration)}(總共{formatDuration(o.totalDuration)})
                            </p>
                            <div className="text-stone-600 text-sm mb-2 space-y-0.5">
                              {sortOrderItems(o.items).map((i, idx) => (
                                <p key={idx}>{i.name}({i.duration}分) NT${i.price}</p>
                              ))}
                              <div className="text-xs text-stone-500 pt-1 border-t border-stone-100 mt-1">
                                <p>原價：{sortOrderItems(o.items).map(i => i.price).join(' + ')} = NT${o.originalPrice}</p>
                                {o.discountAmount > 0 && (
                                  <p>優惠：{o.discountFormula || '活動折抵'} = NT${o.finalPrice}</p>
                                )}
                              </div>
                            </div>
                            <p className="text-stone-500 text-xs">按摩師：{o.therapistPreference || '不指定按摩師'} | 總時間：{o.totalDuration} 分 | 金額：NT${o.finalPrice}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end space-y-2 mt-4 md:mt-0">
                             <div className="flex gap-2">
                               <button
                                 onClick={() => setConfirmAction({ message: '需要修改預約(例如時段或項目)，請加官方LINE聯繫客服協助處理 (@zenflow)' })}
                                 className="px-4 py-2 text-sm rounded border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
                               >
                                 我要修改
                               </button>
                               <button
                                 onClick={() => {
                                   if(canCancel) handleCancelOrder(o.id, o.date, o.time);
                                 }}
                                 className={`px-4 py-2 text-sm rounded border transition ${canCancel ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-stone-400 border-stone-200 cursor-not-allowed bg-stone-50'}`}
                               >
                                 {canCancel ? '取消預約' : '已不可線上取消'}
                               </button>
                             </div>
                             <p className="text-[10px] text-stone-400 text-right mt-1">
                               本次預約最遲應於{limitDateStr.replace(/-/g, '/')} {limitTimeStr}前 修改或取消
                             </p>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}
                </section>
              </div>
            );
          })()}

          {frontendTab === 'history' && (() => {
            const memberOrders = allOrders.filter(o => o.memberId === member.id).sort((a,b) => b.createdAt - a.createdAt);
            const now = new Date().getTime();
            const pastOrders = memberOrders.filter(o => o.status === 'cancelled' || new Date(`${o.date}T${o.time || '00:00'}:00`).getTime() <= now);

            return (
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg text-stone-800 mb-4 font-medium flex items-center text-stone-500">
                    歷史與取消紀錄
                  </h3>
                  {pastOrders.length === 0 ? (
                    <div className="p-6 text-center text-stone-500 bg-white border border-stone-200 rounded-xl">目前沒有歷史紀錄</div>
                  ) : (
                    <div className="space-y-4">
                      {pastOrders.map(o => (
                        <div key={o.id} className="p-5 bg-stone-50 border border-stone-200 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4 opacity-80">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-stone-700">
                                {o.date.replace(/-/g, '/')}({getWeekDay(o.date)}) {o.time}~{minsToTime(timeToMins(o.time) + o.totalDuration)}(總共{formatDuration(o.totalDuration)})
                              </p>
                              {o.status === 'cancelled' ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded border border-red-200">已取消</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-stone-200 text-stone-600 text-xs rounded border border-stone-300">已結束</span>
                              )}
                            </div>
                            <div className="text-stone-600 text-sm mb-2 space-y-0.5">
                              {sortOrderItems(o.items).map((i, idx) => (
                                <p key={idx}>{i.name}({i.duration}分) NT${i.price}</p>
                              ))}
                              <div className="text-xs text-stone-500 pt-1 border-t border-stone-100 mt-1">
                                <p>原價：{sortOrderItems(o.items).map(i => i.price).join(' + ')} = NT${o.originalPrice}</p>
                                {o.discountAmount > 0 && (
                                  <p>優惠：{o.discountFormula || '活動折抵'} = NT${o.finalPrice}</p>
                                )}
                              </div>
                            </div>
                            <p className="text-stone-500 text-xs">按摩師：{o.therapistPreference || '不指定按摩師'} | 總時間：{o.totalDuration} 分 | 金額：NT${o.finalPrice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            );
          })()}

        </div>
      )}

      {isPaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl relative">
            <button onClick={() => { setIsPaying(false); setLinePayUrl(''); }} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"><X className="w-5 h-5"/></button>
            <h2 className="text-xl font-medium text-stone-800 mb-6 font-sans">線上結帳</h2>
            
            {linePayUrl ? (
              <div className="text-center py-6">
                <p className="text-sm text-stone-600 mb-6">因系統環境限制，無法自動跳轉。<br/>請點擊下方按鈕開啟 LINE Pay 進行付款：</p>
                <a href={linePayUrl} target="_blank" rel="noopener noreferrer" className="inline-block w-full py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34c] transition shadow-md">
                   點擊前往 LINE Pay 結帳
                </a>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-8">
                  {['現金', '線上刷卡', 'LINE PAY', '街口支付', '全支付'].map(method => (
                    <label key={method} className={`flex items-center p-4 border rounded-xl cursor-pointer transition ${paymentMethod === method ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'}`}>
                      <input type="radio" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} className="w-4 h-4 text-stone-800 focus:ring-stone-800" />
                      <span className="ml-3 font-medium text-stone-700">{method}</span>
                    </label>
                  ))}
                </div>

                <button 
                  onClick={processPayment} 
                  disabled={!paymentMethod}
                  className="w-full py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition disabled:bg-stone-200 disabled:text-stone-400 cursor-pointer disabled:cursor-not-allowed"
                >
                  確認付款 NT$ {finalPrice}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-20 animate-in zoom-in">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-medium text-stone-800 mb-2">預約成功！</h2>
          <p className="text-stone-500 mb-8">感謝您的預約，我們期待為您服務。</p>
          <button onClick={() => {setStep(1); setCart([]); setDate(''); setTime('');}} className="px-6 py-2 border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-50 transition">
            返回首頁
          </button>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <p className="text-stone-800 mb-6 text-center">{confirmAction.message}</p>
            <div className="flex justify-center gap-3">
              {confirmAction.onConfirm && (
                <button 
                  onClick={() => setConfirmAction(null)} 
                  className="px-6 py-2 rounded-lg text-stone-600 bg-stone-100 hover:bg-stone-200 transition"
                >
                  取消
                </button>
              )}
              <button 
                onClick={() => {
                  if (confirmAction.onConfirm) confirmAction.onConfirm();
                  else setConfirmAction(null);
                }}
                className="px-6 py-2 rounded-lg text-white bg-stone-800 hover:bg-stone-700 transition"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
