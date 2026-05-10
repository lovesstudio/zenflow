import React, { useState, useEffect, useMemo } from 'react';
import { db, COURSES, Member, OrderItem, Order, calculateDiscount, ALL_TIME_SLOTS, isSlotAvailable, Gender, TherapistPreference, timeToMins, minsToTime, getDiscountStatus } from './store';
import { User, Phone, Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2, ChevronRight, X } from 'lucide-react';

export default function Frontend() {
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  
  // Registration Form
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<Gender>('女');
  const [isRegistering, setIsRegistering] = useState(false);

  // Polling for orders to check real-time availability
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  useEffect(() => {
    const fetch = () => setAllOrders(db.getOrders());
    fetch();
    const interval = setInterval(fetch, 1000);
    return () => clearInterval(interval);
  }, []);

  // Booking Flow State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  // Cart (holds only addons, BASE_COURSE is implicit)
  const [cart, setCart] = useState<{ courseId: string, id: string, isUpgrade: boolean }[]>([]);
  const [therapistPref, setTherapistPref] = useState<TherapistPreference>('不指定');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('zf_login_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      const m = db.getMemberByPhone(savedPhone);
      if (m) {
        setMember(m);
        setStep(2);
      }
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

  // Verify currently selected time is still valid after changing duration
  useEffect(() => {
    if (date && time && !isSlotAvailable(date, time, totalDuration, allOrders)) {
      setTime(''); // clear invalid time
    }
  }, [totalDuration, allOrders, date, time]);

  const canCheckout = date && time && totalDuration >= 30 && totalDuration <= 180;

  const handleCheckoutClick = () => {
    if (!canCheckout || !member) return;
    setIsPaying(true);
  };

  const processPayment = () => {
    if (!member || !date || !time) return;
    
    db.saveOrder({
      id: Math.random().toString(36).substring(7),
      memberId: member.id,
      date,
      time,
      paymentMethod,
      therapistPreference: therapistPref,
      items,
      totalDuration,
      originalPrice,
      discountAmount,
      discountFormula,
      finalPrice,
      createdAt: Date.now()
    });
    
    setIsPaying(false);
    setPaymentMethod('');
    setStep(3);
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
                  <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg" />
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
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-stone-800 font-medium">您好, {member.name}</p>
                <button onClick={handleLogout} className="text-xs text-stone-400 hover:text-stone-600 underline">切換帳號</button>
              </div>
              <p className="text-xs text-stone-500 mt-1">會員等級：{member.level}</p>
            </div>
            {member.level !== '一般' && (() => {
              const status = getDiscountStatus(member, date, allOrders);
              return (
                <div className="text-right">
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full border border-amber-200 inline-block mb-2">尊爵禮遇生效中</span>
                  <p className="text-xs text-stone-500">本月優惠次數：{status.usedTimes} / {status.maxTimes} {status.isUsedUp ? '(已用完)' : ''}</p>
                </div>
              );
            })()}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* DateTime */}
              <section>
                <h3 className="text-lg text-stone-800 mb-3 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-stone-400"/> 請先選擇日期與按摩開始時間</h3>
                <div className="space-y-4">
                  <input type="date" value={date} onChange={e=>{setDate(e.target.value); setTime('');}} className="w-full p-2 border border-stone-200 rounded-lg" />
                  
                  {date && (
                    <div className="grid grid-cols-4 gap-2">
                      {ALL_TIME_SLOTS.map(t => {
                        const available = isSlotAvailable(date, t, totalDuration, allOrders);
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
                 <h3 className="text-lg text-stone-800 mb-3 flex items-center"><User className="w-5 h-5 mr-2 text-stone-400"/> 再選擇想預約的服務項目(可複選)</h3>
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                   {COURSES.filter(c => !(member.gender === '男' && c.category.includes('女性專屬'))).map(course => {
                    const selectedCount = cart.filter(c => c.courseId === course.id).length;
                    const isSelected = selectedCount > 0;
                    return (
                     <div key={course.id} className={`p-3 border rounded-lg transition cursor-pointer flex justify-between items-center ${isSelected ? 'border-stone-800 bg-stone-50/80 shadow-sm' : 'border-stone-200 hover:border-stone-400 bg-white'}`} onClick={() => addToCart(course.id)}>
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
                      <option value="不指定">不指定</option>
                      <option value="阿翰">阿翰</option>
                      <option value="Ricky">Ricky</option>
                      <option value="Kelly">Kelly</option>
                      <option value="Kenny">Kenny</option>
                      <option value="Mark">Mark</option>
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
        </div>
      )}

      {isPaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl relative">
            <button onClick={() => setIsPaying(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"><X className="w-5 h-5"/></button>
            <h2 className="text-xl font-medium text-stone-800 mb-6 font-sans">線上結帳</h2>
            
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
    </div>
  );
}
