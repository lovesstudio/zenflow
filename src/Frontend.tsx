import React, { useState, useEffect, useMemo, useRef } from 'react';
// EZ Pages release: 2026-07-22-line-profile-fix-v2
import { db, COURSES, Member, OrderItem, Order, calculateDiscount, ALL_TIME_SLOTS, isSlotAvailable, isDayAvailable, Gender, TherapistPreference, timeToMins, minsToTime, getDiscountStatus, sortOrderItems, TherapistAvailability, getSlotStatus, SlotStatus, isTimeRangeCovered, getDetailedSlotStatus, Promotion } from './store';
import { User, Phone, Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2, ChevronRight, X, ChevronLeft, ChevronDown, LogOut, ShieldAlert, Award, Star, Compass, MapPin } from 'lucide-react';

const PAYMENT_COMPLETION_MESSAGE = '感謝您的預定，我們已為您鎖定專屬時段。\n\n線上預付限定的「15分鐘加值服務（價值 $300 元）」亦已準備就緒。\n\n當天體驗結束後，您可以直接帶著舒暢的身心優雅離開，期待與您相見！';
const ONSITE_PAYMENT_COMPLETION_MESSAGE = '感謝您的預定，我們已為您鎖定專屬時段。\n\n期待與您相見！';

const BookingNotice = ({ kind, expanded, onToggle }: { kind: 'massage' | 'fitness'; expanded: boolean; onToggle: () => void }) => {
  const isMassage = kind === 'massage';
  return (
    <div className={`booking-notice relative -top-4 ${expanded ? '' : '-mb-2'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full min-h-[36px] bg-transparent px-1 py-1 flex items-center justify-start gap-2 text-left transition-colors"
      >
        <span className="min-w-0 flex items-center gap-2">
          <span className="font-black text-sage-950 text-[18px] sm:text-xl leading-tight whitespace-nowrap">{isMassage ? '按摩課預約須知' : '健身課預約須知'}</span>
          <span className="rounded-md border border-rose-200/70 bg-rose-50/80 px-2 py-1 text-[12px] sm:text-[13px] font-bold text-rose-700/80 whitespace-nowrap">初次預約請詳閱</span>
        </span>
        <span className="w-6 h-6 shrink-0 rounded-full border border-stone-200 flex items-center justify-center">
          <ChevronDown className={`w-3.5 h-3.5 text-sage-800 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {expanded && (
        <div className="pt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 text-base sm:text-[17px] leading-[1.8] text-stone-600">
          {isMassage ? (
            <>
              <p className="rounded-lg bg-white border border-stone-100 px-3 py-2.5">為保障完整、不匆忙的療癒體驗及身體安全，初次預約請詳閱以下規範。</p>
              <div className="rounded-lg bg-white border border-stone-100 p-3 space-y-2.5">
                <p className="font-black text-stone-900">1　課程時數與最晚預約時間</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[['120分鐘', '20:00'], ['60分鐘', '21:00'], ['30分鐘', '21:30']].map(([duration, time]) => (
                    <div key={duration} className="rounded-md bg-stone-50 border border-stone-100 px-1.5 py-2 text-center">
                      <div className="font-bold text-stone-600">{duration}</div><div className="text-base sm:text-[17px] font-black text-sage-800">{time}</div>
                    </div>
                  ))}
                </div>
                <p className="rounded-md bg-amber-50 border border-amber-100 px-2.5 py-2"><strong>21:30 限定：</strong>僅提供局部深層油推、局部指壓放鬆及精準筋膜刀釋放。</p>
                <p><strong className="text-stone-800">開放區間：</strong>今日起至次月底之所有時段。歡迎提早 15 分鐘到店沐浴更衣並與老師討論加強部位。</p>
              </div>
              <div className="rounded-lg bg-white border border-stone-100 p-3 space-y-1.5">
                <p className="font-black text-stone-900">2　變更、取消與遲到</p>
                <p>取消或更改請最遲於課程開始前 1 小時主動通知；逾時取消或無故未到將照常扣課。</p>
                <p>若學員遲到，課程仍依原定時間結束，恕無法順延補時。</p>
              </div>
              <div className="rounded-lg bg-white border border-stone-100 p-3 space-y-1.5">
                <p className="font-black text-stone-900">3　健康安全提醒</p>
                <p>發燒、感冒、急性發炎、傳染性皮膚病、開放性傷口、術後或骨折未癒合、飲酒過量者請勿預約。</p>
                <p>高血壓、心臟病、骨質疏鬆、懷孕或特殊生理狀況請於課前主動告知；飯後請間隔至少 1 小時。</p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-white border border-stone-100 p-3 space-y-1.5">
                <p className="font-black text-stone-900">1　準時出席與課前準備</p>
                <p>健身課每節 60 分鐘，請提早 15 分鐘到場著裝，並先行進行伸展與暖身。</p>
                <p>課後可至櫃台兌換一杯 BCAA 乳清蛋白飲，限當日課後現場兌換。</p>
              </div>
              <div className="rounded-lg bg-white border border-stone-100 p-3 space-y-1.5">
                <p className="font-black text-stone-900">2　營運、變更與取消</p>
                <p>每日營運至 22:00，教練課最晚預約時間為 21:00。</p>
                <p>取消或更改請於課程前 1 小時通知；逾時取消或無故未到將視同正常出席並照常扣課。</p>
                <p>遲到仍依原定時間結束，恕無法順延補時。</p>
              </div>
              <div className="rounded-lg bg-white border border-stone-100 p-3 space-y-1.5">
                <p className="font-black text-stone-900">3　穿著裝備與健康提醒</p>
                <p>請穿著舒適運動服、乾淨室內運動鞋並攜帶個人毛巾。</p>
                <p>若有身體不適、受傷、熬夜或特殊生理狀況，請於課前主動告知教練。</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const BookingHint = ({
  title = '預約提醒',
  children,
  className = ''
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`py-2.5 font-sans ${className}`}>
    {title && <div className="mb-1 text-xs sm:text-[13px] font-black text-sage-700">{title}</div>}
    <div className="text-[14px] sm:text-[15px] font-semibold leading-[1.6] text-stone-600">{children}</div>
  </div>
);

const StaffPicker = ({
  label,
  placeholder,
  value,
  options,
  open,
  onToggle,
  onSelect,
  emptyMessage = '暫無可服務人員',
  labelClassName = ''
}: {
  label: string;
  placeholder: string;
  value: string;
  options: { name: string; disabled: boolean; note?: string }[];
  open: boolean;
  onToggle: () => void;
  onSelect: (name: string) => void;
  emptyMessage?: string;
  labelClassName?: string;
}) => (
  <div className="min-w-0" data-booking-course-menu>
    <label className={`mb-1.5 block pl-0.5 text-[13px] sm:text-sm font-black text-stone-600 ${labelClassName}`}>{label}</label>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left text-[13px] sm:text-sm font-black text-stone-700 transition hover:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-100"
    >
      <span className="min-w-0 truncate">{value || placeholder}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && (
      <div className="mt-2 space-y-1.5 rounded-xl border border-stone-200 bg-white p-2 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
        {options.length === 0 ? (
          <div className="flex min-h-[44px] items-center justify-center px-2 text-center text-[13px] sm:text-sm font-black text-sage-800 whitespace-nowrap">
            {emptyMessage}
          </div>
        ) : options.map(option => (
          <button
            key={option.name}
            type="button"
            disabled={option.disabled}
            onClick={() => onSelect(option.name)}
            className="w-full rounded-lg border border-stone-100 bg-white px-3 py-2.5 text-left transition hover:border-sage-300 hover:bg-sage-50 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-50"
          >
            <span className="block text-[14px] sm:text-[15px] font-black leading-tight text-stone-900">{option.name}</span>
            {option.note && <span className="mt-1 block text-[11px] sm:text-xs font-bold text-stone-500">{option.note}</span>}
          </button>
        ))}
      </div>
    )}
  </div>
);

type MassageCourseCategory = '全身療程' | '局部療程' | '加購療程';

const MassageCoursePicker = ({
  category,
  expanded,
  onToggle,
  onSelect,
  therapistPreference,
  selectedCourseIds,
  showTrigger = true
}: {
  category: MassageCourseCategory;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (courseId: string) => void;
  therapistPreference: TherapistPreference;
  selectedCourseIds: string[];
  showTrigger?: boolean;
}) => {
  const courses = COURSES.filter(course => course.category === category && course.visible !== false);
  const selectedOilMinutes = selectedCourseIds.reduce((total, selectedCourseId) => {
    const selectedCourse = COURSES.find(course => course.id === selectedCourseId);
    return total + (selectedCourse?.name.includes('油推') ? selectedCourse.time : 0);
  }, 0);

  return (
    <div className="relative" data-booking-course-menu>
      {showTrigger && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="w-full min-h-[50px] rounded-lg border border-stone-200 bg-white px-3.5 py-3 text-left text-[14px] sm:text-[15px] font-black text-stone-800 transition hover:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-100 flex items-center justify-between gap-2"
        >
          <span>-- 選擇{category} --</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {expanded && (
        <div className={`${showTrigger ? 'mt-2' : 'mt-0'} rounded-xl border border-stone-200 bg-white p-2 shadow-lg space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 sm:absolute sm:left-0 sm:right-0 sm:z-40 sm:min-w-[230px]`}>
          {courses.map(course => {
            const disabledByTherapist = therapistPreference.includes('Mark') && course.name.includes('油推');
            const disabledByOilLimit = course.name.includes('油推') && selectedOilMinutes + course.time > 60;
            const disabled = disabledByTherapist || disabledByOilLimit;
            const nameParts = course.name.match(/^(.*?)(\d+分鐘)$/);
            const courseTitle = nameParts?.[1] || course.name;
            const durationLabel = nameParts?.[2] || `${course.time}分鐘`;
            return (
              <button
                key={course.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(course.id)}
                className="w-full min-h-[54px] rounded-lg border border-stone-100 bg-white px-3 py-2 text-left transition hover:border-sage-300 hover:bg-sage-50 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-55"
              >
                <span className="block text-[16px] sm:text-[17px] leading-tight font-black text-stone-900 break-words">{courseTitle}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-[14px] sm:text-[15px] font-bold">
                  <span className="text-stone-500">{durationLabel}</span>
                  <span className="text-sage-800">NT${course.price.toLocaleString()}</span>
                </span>
                {disabledByTherapist && <span className="mt-1.5 block text-[13px] font-bold text-rose-600">Mark不提供油推療程</span>}
                {!disabledByTherapist && disabledByOilLimit && <span className="mt-1.5 block text-[13px] font-bold text-rose-600">油推療程合計最多60分鐘</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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

const stripGender = (name: string) => name ? name.replace(/\(男\)|\(女\)|（男）|（女）/g, '').trim() : '';

const getGreetingPeriod = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return '早安';
  if (hour >= 11 && hour < 18) return '午安';
  return '晚安';
};

const getFriendlyDisplayName = (name: string) => {
  const cleanName = stripGender(name);
  if (!cleanName || cleanName === '系統管理員' || cleanName === '管理員') return '管理員';
  if (/^[A-Za-z][A-Za-z\s.'-]*$/.test(cleanName)) return cleanName;
  const chineseName = (cleanName.match(/[\u3400-\u4DBF\u4E00-\u9FFF]+/gu) || []).join('');
  if (chineseName) {
    const chineseChars = Array.from(chineseName);
    return chineseChars.length >= 3 ? chineseChars.slice(1).join('') : chineseName;
  }
  const chars = Array.from(cleanName);
  if (chars.length >= 3 && /^[\u4e00-\u9fff]+$/.test(cleanName)) return chars.slice(1).join('');
  return cleanName;
};

const canAccessVenueBooking = (m: Member) => {
  const identityIds = m.selectedIdentities || [];
  return (
    m.role === 'admin' ||
    m.roles?.includes('admin') ||
    m.level === '場租教練' ||
    m.level === '場租按摩師' ||
    m.level === '店內按摩師' ||
    m.level === '店內教練' ||
    identityIds.includes('therapist_rent') ||
    identityIds.includes('coach_rent') ||
    identityIds.includes('therapist_in') ||
    identityIds.includes('coach_in')
  );
};

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
  if (member.role === 'admin' || member.roles?.includes('admin')) {
    return ['管理員'];
  }
  if (member.selectedIdentities?.length) {
    return member.selectedIdentities.map(id => IDENTITY_LABELS[id] || id);
  }
  return [member.memberLevel || member.level];
};

const formatFitnessCourseName = (courseId: string, fallback: string) => {
  if (courseId === 'f3') return '1對1教練課(已購課學員專屬)';
  if (courseId === 'f1') return '健身體驗課(每人限購一次)';
  if (courseId === 'f2') return 'InBody量測與解說';
  return fallback;
};

const formatMassageCourseOption = (course: { name: string; price: number }) => {
  return `${course.name}\nNT$${course.price}`;
};

const THERAPIST_DETAILS: Record<string, {
  name: string;
  title: string;
  specialties: string[];
  bio: string;
  imageUrl: string;
}> = {
  '阿翰': {
    name: '阿翰',
    title: '資深運動美式整復理療師',
    specialties: ['深層經絡放鬆', '運動拉伸', '運動理療'],
    bio: '擁有 6 年專業理療與運動按摩經驗，擅長針對久坐族群與運動愛好者的下背與肩頸緊繃進行精準筋膜鬆解，力道渾厚透達，能直擊酸痛核心。',
    imageUrl: '/ahan-profile.jpg'
  },
  'Kenny': {
    name: 'Kenny',
    title: '全息穴位導引物理按摩師',
    specialties: ['中式指壓', '全身經絡導引', '疲勞修復'],
    bio: '精通穴位經絡按摩，手法剛柔並濟。擅長結合呼吸吐納引導，深層舒緩因壓力造成的緊繃，重啟身體的自癒能量。',
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300&h=300'
  },
  'Mark': {
    name: 'Mark',
    title: '美式關節減壓結構整復師',
    specialties: ['美式整復', '關節減壓', '深層肌肉理療'],
    bio: '專攻身體結構減壓，擁有豐富的骨骼關節調配基礎。手法細緻且具方向性，能顯著改善關節活動度，讓身體重回黃金平衡。（備註：Mark不提供油推課程）',
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300&h=300'
  },
  'Ricky': {
    name: 'Ricky',
    title: '國家級運動平衡肌動學防護員',
    specialties: ['運動按摩', '筋膜刀放鬆', '預防與修復'],
    bio: '國家級運動防護背景，專為高強度運動者進行肌肉檢測與深層修復。利用筋膜平衡技術，快速瓦難以消除的結節，還原肌肉彈性。',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300&h=300'
  },
  'Alice': {
    name: 'Alice',
    title: '法式純淨天然精油芳療大師',
    specialties: ['法式芳療', '淋巴排毒', '身心減壓'],
    bio: '資深芳療師，擅長傾聽身體的聲音。結合 Florihana 有機精油與法式輕柔撫順手法，舒緩自律神經，帶來極致的靜謐與放鬆體驗。',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300&h=300'
  },
  'Kelly': {
    name: 'Kelly',
    title: '全能孕婦與身心調息芳療師',
    specialties: ['客製化精油舒壓', '孕婦舒壓', '頭部釋壓'],
    bio: '溫柔且專注，手法綿密深透。特別擅長頭皮筋膜釋壓與肩頸放鬆，搭配特調精油，能在療程中引導心靈與身體同步入靜。',
    imageUrl: '/kelly-profile.jpg'
  },
  'Miki': {
    name: 'Miki',
    title: '日式極致細緻淋巴體雕經絡師',
    specialties: ['日式淋巴排毒', '瑞典式放鬆', '溫感體雕'],
    bio: '秉持日式職人精神，手法輕柔卻具穿透力。擅長循著淋巴流向溫和導引，能有效代謝多餘體水分，改善緊繃與沉重感，再現體態輕盈。',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300&h=300'
  }
};

export default function Frontend({ onNavigateToBackend }: { onNavigateToBackend?: () => void } = {}) {
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [legalDocument, setLegalDocument] = useState<'privacy' | 'terms' | null>(null);
  
  // Registration Form
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [lineId, setLineId] = useState('');
  const [gender, setGender] = useState<Gender>('女');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLineProfileRegistration, setIsLineProfileRegistration] = useState(false);
  const [loginType, setLoginType] = useState<'member' | 'staff'>('member');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [rememberStaffDevice, setRememberStaffDevice] = useState(true);
  const [rememberedStaffUsers, setRememberedStaffUsers] = useState<{ role: 'admin' | 'therapist'; name: string; phone: string }[]>([]);
  const [staffLoginAccounts, setStaffLoginAccounts] = useState<Member[]>([]);

  // Polling for orders to check real-time availability
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [availabilities, setAvailabilities] = useState<TherapistAvailability[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  
  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : { authenticated: false })
      .then(session => {
        if (!session.authenticated || !session.member) return;
        const lineMember = session.member as Member;
        if (lineMember.isProfileCompleted !== true) {
          setMember(lineMember);
          setPhone(/^09\d{8}$/.test(lineMember.id) ? lineMember.id : '');
          setName(/^[\u3400-\u4DBF\u4E00-\u9FFF]{1,4}$/u.test(lineMember.name || '') ? lineMember.name : '');
          setBirthday(lineMember.birthday || '');
          setGender(lineMember.gender === '男' ? '男' : '女');
          setLineId(lineMember.lineId || '');
          setIsLineProfileRegistration(true);
          setIsRegistering(true);
          setStep(1);
          return;
        }
        setMember(lineMember);
        setPhone(lineMember.id);
        localStorage.removeItem('zf_authed_user');
        localStorage.setItem('zf_login_phone', lineMember.id);
        window.dispatchEvent(new Event('zf-auth-change'));
        setFrontendTab(canAccessVenueBooking(lineMember) ? 'venue' : 'booking');
        setStep(2);
        if (new URLSearchParams(window.location.search).get('lineLogin') === 'success') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      })
      .catch(error => console.warn('LINE session check failed', error));

    // Initial sync
    db.syncMembers().then(members => {
      setStaffLoginAccounts(members.filter(account =>
        account.role === 'therapist' || account.roles?.includes('therapist')
      ));
    });
    db.syncOrders().then(setAllOrders);
    db.syncAvailability().then(setAvailabilities);
    db.syncPromotions().then(setPromotions);

    if (typeof window !== 'undefined') {
      const rememberedStaffList = localStorage.getItem('zf_staff_remembered_users');
      const rememberedStaff = localStorage.getItem('zf_staff_remembered_user');
      if (rememberedStaffList || rememberedStaff) {
        try {
          const parsedList = rememberedStaffList
            ? JSON.parse(rememberedStaffList)
            : [JSON.parse(rememberedStaff as string)];
          const validList = Array.isArray(parsedList)
            ? parsedList
                .filter(user => user?.role)
                .map(user => user.role === 'admin'
                  ? { ...user, name: user.name || '管理員', phone: user.phone || 'admin' }
                  : user
                )
                .filter(user => user.phone)
            : [];
          const currentAuthedUser = JSON.parse(localStorage.getItem('zf_authed_user') || 'null');
          const normalizedCurrentUser = currentAuthedUser?.role === 'admin'
            ? { ...currentAuthedUser, name: currentAuthedUser.name || '管理員', phone: currentAuthedUser.phone || 'admin' }
            : currentAuthedUser;
          const restoredList = normalizedCurrentUser?.role && normalizedCurrentUser?.phone
            ? [...validList.filter(user => user.phone !== normalizedCurrentUser.phone), normalizedCurrentUser]
            : validList;
          setRememberedStaffUsers(restoredList);
          localStorage.setItem('zf_staff_remembered_users', JSON.stringify(restoredList));
          localStorage.removeItem('zf_staff_remembered_user');
        } catch (e) {
          localStorage.removeItem('zf_staff_remembered_users');
          localStorage.removeItem('zf_staff_remembered_user');
        }
      }

      if (!rememberedStaffList && !rememberedStaff) {
        try {
          const currentAuthedUser = JSON.parse(localStorage.getItem('zf_authed_user') || 'null');
          if (currentAuthedUser?.role === 'admin') {
            const restoredAdmin = { ...currentAuthedUser, name: currentAuthedUser.name || '管理員', phone: currentAuthedUser.phone || 'admin' };
            setRememberedStaffUsers([restoredAdmin]);
            localStorage.setItem('zf_staff_remembered_users', JSON.stringify([restoredAdmin]));
          }
        } catch (e) {
          localStorage.removeItem('zf_authed_user');
        }
      }

      if (localStorage.getItem('zf_redirect_staff') === 'true') {
        setLoginType('staff');
        localStorage.removeItem('zf_redirect_staff');
      }
    }

    const fetchData = () => {
      setAllOrders(db.getOrders());
      setAvailabilities(db.getAvailability());
      setPromotions(db.getPromotions());
    };
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Booking Flow State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [frontendTab, setFrontendTab] = useState<'venue' | 'booking' | 'upcoming' | 'history' | 'fitness'>('booking');

  // Venue Booking State
  const [venueDate, setVenueDate] = useState('');
  const [venueTime, setVenueTime] = useState('');
  const [venueRoom, setVenueRoom] = useState<'ZEN1' | 'ZEN2' | 'SPA1' | 'SPA2' | ''>('');
  const [venueDuration, setVenueDuration] = useState<number>(60);
  const [venueNote, setVenueNote] = useState('');
  const [venueViewMonth, setVenueViewMonth] = useState(new Date());
  const [isVenuePaying, setIsVenuePaying] = useState(false);

  const isVenueBooked = (v: string, dStr: string, tStr: string, dur: number) => {
    if (!v || !dStr || !tStr) return false;
    const startMins = timeToMins(tStr);
    const endMins = startMins + dur;
    const endMinsWithBuffer = endMins + 30;

    return allOrders.some(o => {
      if (o.date !== dStr || o.status === 'cancelled' || o.massageRoom !== v) return false;
      const oStart = timeToMins(o.time || '00:00');
      const oEnd = oStart + (o.totalDuration || 0) + 30; // 30 mins buffer after booking
      return startMins < oEnd && endMinsWithBuffer > oStart;
    });
  };

  const handleBookVenue = async () => {
    if (!venueDate) {
      alert('請先選擇預約日期！');
      return;
    }
    if (!venueTime) {
      alert('請先選擇預約時段！');
      return;
    }
    if (!venueRoom) {
      alert('請先選擇預約場地！');
      return;
    }
    if (!member) {
      alert('會員資料有誤，請重新登入！');
      return;
    }

    if (isVenueBooked(venueRoom, venueDate, venueTime, venueDuration)) {
      alert(`該時段的場地 ${venueRoom} 已被其他人預約，請選擇其他場地或時段！`);
      return;
    }

    const calculatedPrice = (venueDuration / 30) * 150;
    const orderId = 'venue_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const newOrder: Order = {
      id: orderId,
      memberId: member.id,
      date: venueDate,
      time: venueTime,
      status: 'pending',
      therapistPreference: '不指定按摩師',
      items: [{
        id: 'venue-rent',
        courseId: 'venue',
        name: `場地租借 (${venueRoom})`,
        price: calculatedPrice,
        duration: venueDuration
      }],
      totalDuration: venueDuration,
      originalPrice: calculatedPrice,
      discountAmount: 0,
      finalPrice: calculatedPrice,
      paymentMethod: 'LINE PAY',
      note: venueNote ? `【場地預約備註】${venueNote}` : '場地預約',
      isAssignedByShop: true,
      isConfirmed: false,
      massageRoom: venueRoom,
      createdAt: Date.now()
    };

    try {
      db.saveOrder(newOrder);
      setIsVenuePaying(true);
      const baseUrl = window.location.origin + window.location.pathname;
      const response = await fetch('/api/linepay/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: calculatedPrice,
          orderId,
          productName: `場地租借 (${venueRoom})`,
          confirmUrl: `${baseUrl}?linepay=confirm&orderId=${orderId}`,
          cancelUrl: `${baseUrl}?linepay=cancel&orderId=${orderId}`
        })
      });
      const result = await response.json();
      if (result.returnCode === '0000' && result.info?.paymentUrl?.web) {
        window.location.assign(result.info.paymentUrl.web);
        return;
      }
      db.deleteOrder(orderId);
      alert('LINE Pay 請求失敗: ' + (result.returnMessage || '未知錯誤'));
      setIsVenuePaying(false);
    } catch (e) {
      console.error(e);
      db.deleteOrder(orderId);
      setIsVenuePaying(false);
      alert('LINE Pay 系統連線異常，場地尚未保留，請重試！');
    }
  };
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const toggleOrder = (id: string) => setExpandedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [showVenueNotice, setShowVenueNotice] = useState(false);
  const [showMassageNotice, setShowMassageNotice] = useState(false);
  const [showFitnessNotice, setShowFitnessNotice] = useState(false);
  const [showFitnessCourseMenu, setShowFitnessCourseMenu] = useState(false);
  const [showFitnessPlanMenu, setShowFitnessPlanMenu] = useState(false);
  const [openStaffMenu, setOpenStaffMenu] = useState<'maleMassage' | 'femaleMassage' | 'maleCoach' | 'femaleCoach' | null>(null);
  const [activeMassageCourseCategory, setActiveMassageCourseCategory] = useState<'全身療程' | '局部療程' | '加購療程'>('全身療程');
  const [openMassageCourseCategory, setOpenMassageCourseCategory] = useState<MassageCourseCategory | null>(null);
  const [bookingToast, setBookingToast] = useState<string | null>(null);
  const bookingToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPremiumReferralList, setShowPremiumReferralList] = useState(false);

  useEffect(() => () => {
    if (bookingToastTimer.current) clearTimeout(bookingToastTimer.current);
  }, []);

  useEffect(() => {
    if (!openMassageCourseCategory && !showFitnessCourseMenu && !showFitnessPlanMenu && !openStaffMenu) return;

    const closeCourseMenus = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-booking-course-menu]')) return;
      setOpenMassageCourseCategory(null);
      setShowFitnessCourseMenu(false);
      setShowFitnessPlanMenu(false);
      setOpenStaffMenu(null);
    };

    document.addEventListener('pointerdown', closeCourseMenus);
    return () => document.removeEventListener('pointerdown', closeCourseMenus);
  }, [openMassageCourseCategory, showFitnessCourseMenu, showFitnessPlanMenu, openStaffMenu]);
  
  // Cart (holds only addons, BASE_COURSE is implicit)
  const [cart, setCart] = useState<{ courseId: string, id: string, isUpgrade: boolean }[]>([]);
  const [therapistPref, setTherapistPref] = useState<TherapistPreference>('不指定按摩師');
  const [fitnessPlan, setFitnessPlan] = useState<string>('無');
  const [fitnessPlanPrice, setFitnessPlanPrice] = useState<number>(0);

  const linkedTherapistMembers = useMemo(() => {
    return db.getMembers().filter(m =>
      !!m.therapistName && (
        m.selectedIdentities?.includes('therapist_in') ||
        (!m.selectedIdentities?.length && m.level === '店內按摩師')
      )
    );
  }, [allOrders, frontendTab]);

  const maleMassageTherapists = useMemo(() => linkedTherapistMembers
    .filter(m => m.gender === '男')
    .map(m => m.therapistName as string), [linkedTherapistMembers]);
  const femaleMassageTherapists = useMemo(() => linkedTherapistMembers
    .filter(m => m.gender === '女')
    .map(m => m.therapistName as string), [linkedTherapistMembers]);

  const coachMembers = useMemo(() => {
    return db.getMembers().filter(m =>
      !!m.therapistName && (
      m.selectedIdentities?.length
        ? m.selectedIdentities.includes('coach_in')
        : m.level === '店內教練'
      )
    );
  }, [allOrders, frontendTab]);

  const maleCoaches = useMemo(() => {
    return coachMembers.filter(m => m.gender === '男').map(m => m.therapistName as string);
  }, [coachMembers]);

  const femaleCoaches = useMemo(() => {
    return coachMembers.filter(m => m.gender === '女').map(m => m.therapistName as string);
  }, [coachMembers]);

  const scheduleMonthPrefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-`;
  const hasMonthlySchedule = (names: string[]) => availabilities.some(availability =>
    names.includes(availability.therapistName) &&
    availability.date.startsWith(scheduleMonthPrefix) &&
    Array.isArray(availability.slots) &&
    availability.slots.length > 0
  );
  const hasMaleMassageServiceThisMonth = hasMonthlySchedule(maleMassageTherapists);
  const hasFemaleMassageServiceThisMonth = hasMonthlySchedule(femaleMassageTherapists);
  const hasMaleCoachServiceThisMonth = hasMonthlySchedule(maleCoaches);
  const hasFemaleCoachServiceThisMonth = hasMonthlySchedule(femaleCoaches);

  const hasPurchasedExperience = useMemo(() => {
    if (!member) return false;
    return allOrders.some(order => 
      order.memberId === member.id && 
      order.status !== 'cancelled' && 
      (order.items || []).some(item => item.courseId === 'f1')
    );
  }, [allOrders, member]);

  const fitnessLessonBalance = useMemo(() => {
    const plan = member?.fitnessPlan?.trim() || '';
    const totalLessons = plan.includes('48堂')
      ? 48
      : plan.includes('24堂') || plan.includes('90天計畫')
        ? 24
        : 0;
    const completedLessons = !member ? 0 : allOrders.filter(order =>
      order.memberId === member.id &&
      order.status === 'completed' &&
      (order.items || []).some(item => item.courseId === 'f3' || item.name.includes('1對1教練課'))
    ).length;
    const planLabel = plan.includes('90天計畫')
      ? '90天計畫'
      : plan.includes('48堂')
        ? '48堂方案'
        : plan.includes('24堂')
          ? '24堂方案'
          : '';

    return {
      hasPlan: totalLessons > 0,
      label: planLabel,
      total: totalLessons,
      remaining: Math.max(totalLessons - completedLessons, 0)
    };
  }, [allOrders, member]);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [gratitudeInput, setGratitudeInput] = useState('');
  const [promotionCodeInput, setPromotionCodeInput] = useState('');
  const [promotionCodeStatus, setPromotionCodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [promotionName, setPromotionName] = useState('');
  const [promotionDiscountInput, setPromotionDiscountInput] = useState('');
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-clear past selected venue time
  useEffect(() => {
    if (venueDate && venueTime) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (venueDate === todayStr && timeToMins(venueTime) < (now.getHours() * 60 + now.getMinutes())) {
        setVenueTime('');
        setVenueRoom('');
      }
    }
  }, [venueDate, venueTime]);

  useEffect(() => {
    let savedPhone = localStorage.getItem('zf_login_phone');
    if (!savedPhone) {
      const authedStr = localStorage.getItem('zf_authed_user');
      if (authedStr) {
        try {
          const authed = JSON.parse(authedStr);
          if (authed && authed.phone) {
            savedPhone = authed.phone;
            localStorage.setItem('zf_login_phone', authed.phone);
          }
        } catch (e) {}
      }
    }

    if (savedPhone) {
      setPhone(savedPhone);
      const m = db.getMemberByPhone(savedPhone);
      if (m) {
        setMember(m);
        if (canAccessVenueBooking(m)) {
          setFrontendTab('venue');
        }
      } else if (savedPhone === 'admin' || savedPhone === 'system_admin') {
        const adminMember: Member = {
          id: savedPhone,
          name: '管理員',
          gender: '男',
          birthday: '1970-01-01',
          level: '一般',
          selectedIdentities: ['admin'],
          roles: ['admin'],
          role: 'admin',
          createdAt: Date.now()
        };
        setMember(adminMember);
        setFrontendTab('venue');
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
               transactionId,
               orderId
            })
         }).then(res => res.json()).then(result => {
              if (result.returnCode === '0000') {
                 alert('LINE Pay 付款成功！');
                 db.updateOrder(orderId, {
                   paymentMethod: 'LINE PAY (已線上結帳)',
                   linePayTransactionId: String(transactionId),
                   linePayPaidAt: Date.now()
                 });
                 if ((currentOrder.items || []).some(item => item.courseId === 'venue')) {
                   setVenueDate('');
                   setVenueTime('');
                   setVenueRoom('');
                   setVenueNote('');
                   setStep(2);
                   setFrontendTab('upcoming');
                   setAllOrders(db.getOrders());
                 } else {
                   setSuccessMessage(PAYMENT_COMPLETION_MESSAGE);
                   setStep(3);
                 }
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
       if (orderId) db.deleteOrder(orderId);
       alert('LINE Pay 付款已取消');
       window.history.replaceState({}, document.title, window.location.pathname);
    } else if (savedPhone) {
       const m = db.getMemberByPhone(savedPhone);
       if (m) {
         setStep(2);
          if (canAccessVenueBooking(m)) {
            setFrontendTab('venue');
          }
        } else if (savedPhone === 'admin' || savedPhone === 'system_admin') {
          setStep(2);
          setFrontendTab('venue');
       }
    }
  }, []);

  const handleLogin = async () => {
    if (!/^09\d{8}$/.test(phone)) {
      alert('請輸入正確的台灣手機號碼（09 開頭，共 10 碼）。');
      return;
    }
    
    // Check locally first
    let m = db.getMemberByPhone(phone);
    
    // If not found locally, try to sync from Firestore once to be sure
    if (!m) {
      const syncedMembers = await db.syncMembers();
      m = syncedMembers.find(member => member.id === phone);
    }

    if (m) {
      localStorage.removeItem('zf_authed_user');
      localStorage.setItem('zf_login_phone', phone);
      window.dispatchEvent(new Event('zf-auth-change'));
      setMember(m);
      if (canAccessVenueBooking(m)) {
        setFrontendTab('venue');
      } else {
        setFrontendTab('booking');
      }
      setStep(2);
    } else {
      setIsRegistering(true);
    }
  };

  const handleRegister = async () => {
    const normalizedName = name.trim();
    const normalizedPhone = phone.replace(/\D/g, '');
    const normalizedBirthday = birthday.trim().replace(/\//g, '-');
    if (!/^[\u3400-\u4DBF\u4E00-\u9FFF]{1,4}$/u.test(normalizedName)) {
      alert('姓名限填 1 至 4 個中文字。');
      return;
    }
    if (!/^09\d{8}$/.test(normalizedPhone)) {
      alert('請輸入正確的台灣手機號碼（09 開頭，共 10 碼）。');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthday) || Number.isNaN(new Date(`${normalizedBirthday}T00:00:00`).getTime())) {
      alert('請輸入正確的生日格式，例如 1990/05/20。');
      return;
    }

    if (isLineProfileRegistration) {
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName, phone: normalizedPhone, birthday: normalizedBirthday, gender })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.member) {
        alert(result.message || '會員資料儲存失敗，請稍後再試。');
        return;
      }
      const completedMember = result.member as Member;
      db.saveMember(completedMember);
      setMember(completedMember);
      setPhone(completedMember.id);
      localStorage.removeItem('zf_authed_user');
      localStorage.setItem('zf_login_phone', completedMember.id);
      window.dispatchEvent(new Event('zf-auth-change'));
      setIsLineProfileRegistration(false);
      setIsRegistering(false);
      setFrontendTab(canAccessVenueBooking(completedMember) ? 'venue' : 'booking');
      setStep(2);
      return;
    }
    
    // Double check if member already exists to prevent duplicates
    const existing = db.getMemberByPhone(normalizedPhone);
    if (existing) {
      alert('此手機號碼已經註冊過囉！系統將自動為您登入。');
      setMember(existing);
      localStorage.removeItem('zf_authed_user');
      localStorage.setItem('zf_login_phone', normalizedPhone);
      window.dispatchEvent(new Event('zf-auth-change'));
      setIsRegistering(false);
      setName('');
      setBirthday('');
      setLineId('');
      setStep(2);
      return;
    }

    const newMember: Member = {
      id: normalizedPhone,
      name: normalizedName,
      birthday: normalizedBirthday,
      gender,
      lineId,
      level: '一般',
      createdAt: Date.now()
    };
    db.saveMember(newMember);
    localStorage.removeItem('zf_authed_user');
    localStorage.setItem('zf_login_phone', normalizedPhone);
    window.dispatchEvent(new Event('zf-auth-change'));
    setMember(newMember);
    setIsRegistering(false);
    setStep(2);
  };
  
  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
    localStorage.removeItem('zf_login_phone');
    localStorage.removeItem('zf_authed_user');
    window.dispatchEvent(new Event('zf-auth-change'));
    setMember(null);
    setIsLineProfileRegistration(false);
    setPhone('');
    setCart([]);
    setStep(1);
  };

  const enterBackendAsStaff = (user: { role: 'admin' | 'therapist'; name: string; phone: string }) => {
    localStorage.setItem('zf_authed_user', JSON.stringify(user));
    localStorage.setItem('zf_login_phone', user.phone);
    window.dispatchEvent(new Event('zf-auth-change'));
    if (rememberStaffDevice) {
      let storedUsers: { role: 'admin' | 'therapist'; name: string; phone: string }[] = [];
      try {
        const parsedUsers = JSON.parse(localStorage.getItem('zf_staff_remembered_users') || '[]');
        storedUsers = Array.isArray(parsedUsers) ? parsedUsers : [];
      } catch (e) {
        storedUsers = [];
      }
      const nextUsers = [...storedUsers.filter(saved => saved.phone !== user.phone), user];
      localStorage.setItem('zf_staff_remembered_users', JSON.stringify(nextUsers));
      setRememberedStaffUsers(nextUsers);
    }
    setStaffPassword('');
    setStaffPhone('');
    if (onNavigateToBackend) {
      onNavigateToBackend();
    } else {
      window.history.pushState({}, '', '/backend');
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const handleRememberedStaffLogin = async (rememberedStaffUser: { role: 'admin' | 'therapist'; name: string; phone: string }) => {

    const membersList = await db.syncMembers();
    if (rememberedStaffUser.role === 'admin') {
      const stillAdmin = rememberedStaffUser.phone === 'admin' || membersList.some(m => m.id === rememberedStaffUser.phone && (m.role === 'admin' || m.roles?.includes('admin')));
      if (stillAdmin) {
        enterBackendAsStaff(rememberedStaffUser);
        return;
      }
    }

    const staff = membersList.find(m => m.id === rememberedStaffUser.phone && (m.role === 'therapist' || m.roles?.includes('therapist')));
    if (staff) {
      enterBackendAsStaff({
        role: 'therapist',
        name: staff.therapistName || staff.name,
        phone: staff.id
      });
      return;
    }

    setRememberedStaffUsers(previousUsers => {
      const nextUsers = previousUsers.filter(saved => saved.phone !== rememberedStaffUser.phone);
      localStorage.setItem('zf_staff_remembered_users', JSON.stringify(nextUsers));
      return nextUsers;
    });
    setConfirmAction({ message: '此裝置記住的登入身分已失效，請重新輸入帳號與密碼。' });
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneTrimmed = staffPhone.trim();
    const passTrimmed = staffPassword.trim();

    if (!passTrimmed) {
      setConfirmAction({ message: '請輸入密碼' });
      return;
    }

    const membersList = db.getMembers();

    // Admin check (hardcoded fallback OR database check)
    const adminAccount = membersList.find(m => m.id === phoneTrimmed && m.password === passTrimmed && (m.role === 'admin' || m.roles?.includes('admin')));
    if (adminAccount || ((phoneTrimmed === 'admin' || phoneTrimmed === '') && passTrimmed === '123456')) {
      const user = { 
        role: 'admin' as const,
        name: adminAccount?.therapistName || '管理員',
        phone: adminAccount?.id || 'admin'
      };
      enterBackendAsStaff(user);
      return;
    }

    // Therapist check
    const memberAccount = membersList.find(m => m.id === phoneTrimmed && m.password === passTrimmed && (m.role === 'therapist' || m.roles?.includes('therapist')));
    if (memberAccount) {
      const user = { role: 'therapist' as const, name: memberAccount.therapistName || memberAccount.name, phone: memberAccount.id };
      enterBackendAsStaff(user);
    } else {
      setConfirmAction({ message: '帳號或密碼錯誤，請重新輸入。' });
    }
  };

  const hasRememberedAdminIdentity = rememberedStaffUsers.some(saved => saved.role === 'admin');
  const visibleRememberedStaffUsers = hasRememberedAdminIdentity
    ? rememberedStaffUsers.filter(saved =>
        saved.role === 'admin' || staffLoginAccounts.some(account =>
          account.id === saved.phone && (
            account.role === 'admin' ||
            account.roles?.includes('admin') ||
            account.selectedIdentities?.includes('admin') ||
            account.therapistName === '阿翰'
          )
        )
      )
    : rememberedStaffUsers;
  const unrememberedStaffAccounts = hasRememberedAdminIdentity
    ? staffLoginAccounts.filter(account => {
        const belongsToAdmin = account.role === 'admin' ||
          account.roles?.includes('admin') ||
          account.selectedIdentities?.includes('admin') ||
          account.therapistName === '阿翰';
        return belongsToAdmin && !rememberedStaffUsers.some(saved => saved.phone === account.id);
      })
    : [];

  const getStaffAccountTitle = (account: Member) => {
    const identities = account.selectedIdentities || [];
    const isTherapist = identities.includes('therapist_in') || account.level === '店內按摩師';
    const isCoach = identities.includes('coach_in') || account.level === '店內教練';
    if (isTherapist && isCoach) return '老師／教練';
    if (isCoach) return '教練';
    return '老師';
  };

  const showAddedBookingToast = (courseName: string) => {
    if (bookingToastTimer.current) clearTimeout(bookingToastTimer.current);
    setBookingToast(courseName);
    bookingToastTimer.current = setTimeout(() => setBookingToast(null), 3500);
  };

  const addToCart = (courseId: string) => {
    const course = COURSES.find(c => c.id === courseId);
    if (course) {
      if (courseId === 'f3' && !fitnessLessonBalance.hasPlan) {
        setConfirmAction({ message: '購買健身方案後，即可預約1對1教練課。' });
        return;
      }
      if (courseId === 'f1' && hasPurchasedExperience) {
        alert('體驗課60分鐘限購1次，您先前已購買過此課程！');
        return;
      }
      if (course.category === '全身療程' && cart.some(item => {
        const selectedCourse = COURSES.find(candidate => candidate.id === item.courseId);
        return selectedCourse?.category === '全身療程';
      })) {
        setConfirmAction({ message: '全身療程一次只能選擇一項，如需更換，請先在今日預約明細中刪除原本的全身療程。' });
        return;
      }
      if (course.name.includes('油推')) {
        const selectedOilMinutes = cart.reduce((total, item) => {
          const selectedCourse = COURSES.find(candidate => candidate.id === item.courseId);
          return total + (selectedCourse?.name.includes('油推') ? selectedCourse.time : 0);
        }, 0);
        if (selectedOilMinutes + course.time > 60) {
          setConfirmAction({ message: '油推療程合計最多為60分鐘，請先在今日預約明細中調整已選療程。' });
          return;
        }
      }
      const isLimited = course.name.includes('芳療油推') || course.name.includes('筋膜刀');
      if (isLimited) {
        const count = cart.filter(c => c.courseId === courseId).length;
        if (count >= 2) return;
      }
    }

    if (frontendTab === 'fitness') {
      setFitnessPlan('無');
      setFitnessPlanPrice(0);
      const newItem = { courseId, id: Math.random().toString(36).substring(7), isUpgrade: false };
      if (courseId === 'f1') {
        setCart([...cart.filter(item => !['f1', 'f2', 'f3'].includes(item.courseId)), newItem]);
        showAddedBookingToast(course?.name || '課程');
        return;
      }
      if (cart.some(c => c.courseId === 'f1')) {
        setCart(cart.filter(item => !['f2', 'f3'].includes(item.courseId)));
        return;
      }
      if (cart.some(c => c.courseId === courseId)) return;
      setCart([...cart.filter(c => c.courseId !== 'f1'), newItem]);
      showAddedBookingToast(course?.name || '課程');
      return;
    }

    setCart([...cart, { courseId, id: Math.random().toString(36).substring(7), isUpgrade: false }]);
    showAddedBookingToast(course?.name || '療程');
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(c => c.id !== cartId));
  };

  const applyPromotionCode = () => {
    const normalizedCode = promotionCodeInput.trim().toUpperCase();
    const promotion = promotions.find(item => item.code === normalizedCode);
    const bookingType = frontendTab === 'fitness' ? 'fitness' : 'massage';
    const bookingDate = date || new Date().toISOString().slice(0, 10);
    const usageCount = member ? allOrders.filter(order => order.memberId === member.id && order.promotionCode === normalizedCode && order.status !== 'cancelled').length : 0;
    const currentSubtotal = cart.reduce((sum, item) => {
      const course = COURSES.find(courseItem => courseItem.id === item.courseId);
      return sum + (course ? course.price + (item.isUpgrade && course.allowUpgrade ? 200 : 0) : 0);
    }, 0) + (frontendTab === 'fitness' && fitnessPlanPrice ? Number(fitnessPlanPrice) || 0 : 0);
    const isUnavailable = !promotion || !promotion.enabled || bookingDate < promotion.startDate || bookingDate > promotion.endDate ||
      (promotion.appliesTo !== 'all' && promotion.appliesTo !== bookingType) ||
      (promotion.memberUsageLimit > 0 && usageCount >= promotion.memberUsageLimit) || currentSubtotal < promotion.minimumSpend;
    if (isUnavailable || !promotion) {
      setPromotionName('');
      setPromotionDiscountInput('');
      setSelectedPromotion(null);
      setPromotionCodeStatus('invalid');
      return;
    }
    setPromotionName(promotion.name);
    setPromotionDiscountInput(String(promotion.discountValue));
    setSelectedPromotion(promotion);
    setPromotionCodeStatus('valid');
  };

  const toggleUpgrade = (cartId: string, val: boolean) => {
    setCart(cart.map(c => c.id === cartId ? { ...c, isUpgrade: val } : c));
  };

  const canUseGratitude = !!member && (
    member.level === '金卡' ||
    member.level === '黑卡' ||
    member.memberLevel === '金卡' ||
    member.memberLevel === '黑卡' ||
    member.selectedIdentities?.includes('gold') ||
    member.selectedIdentities?.includes('black')
  );
  const earnedGratitude = canUseGratitude && member ? db.getMembers().filter(candidate =>
    candidate.referrerId === member.id && (candidate.referrerType === 'gold' || candidate.referrerType === 'black')
  ).length * 300 : 0;
  const usedGratitude = member ? allOrders
    .filter(order => order.memberId === member.id && order.status !== 'cancelled')
    .reduce((sum, order) => sum + (order.gratitudeDiscount || 0), 0) : 0;
  const availableGratitude = Math.max(earnedGratitude - usedGratitude, 0);

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
          name: (c.courseId.startsWith('f') ? formatFitnessCourseName(c.courseId, course.name) : course.name) + (isUpgraded ? ' (+芳療/筋膜刀)' : ''),
          price: price,
          duration: course.time,
          isUpgrade: isUpgraded
        });
        totalDuration += course.time;
      }
    });

    // Add fitness plan if selected and in fitness tab
    if (frontendTab === 'fitness' && fitnessPlan !== '無') {
      items.push({
        id: 'fitness-plan-item',
        courseId: 'fitness-plan',
        name: fitnessPlan,
        price: Number(fitnessPlanPrice) || 0,
        duration: 0,
        isUpgrade: false
      });
    }

    const originalPrice = items.reduce((sum, item) => sum + item.price, 0);
    
    // Discount calculation
    let memberDiscountAmount = 0;
    let discountFormula = '';
    if (member) {
      const discountResult = calculateDiscount(member, date, allOrders, items);
      memberDiscountAmount = discountResult.discount;
      discountFormula = discountResult.formulaExp;
    }

    const afterMemberDiscount = Math.max(0, originalPrice - memberDiscountAmount);
    const gratitudeDiscount = canUseGratitude
      ? Math.min(Math.max(0, Math.floor(Number(gratitudeInput) || 0)), availableGratitude, afterMemberDiscount)
      : 0;
    const afterGratitude = Math.max(0, afterMemberDiscount - gratitudeDiscount);
    const promotionDiscount = selectedPromotion && originalPrice >= selectedPromotion.minimumSpend
      ? Math.min(
          selectedPromotion.discountType === 'percentage'
            ? Math.floor(afterGratitude * Math.min(100, selectedPromotion.discountValue) / 100)
            : Math.max(0, Math.floor(selectedPromotion.discountValue)),
          afterGratitude
        )
      : 0;
    const discountAmount = memberDiscountAmount + gratitudeDiscount + promotionDiscount;
    const formulaParts = [discountFormula];
    if (gratitudeDiscount > 0) formulaParts.push(`感謝金折抵${gratitudeDiscount}元`);
    if (promotionDiscount > 0) formulaParts.push(`${promotionName.trim()}折抵${promotionDiscount}元`);
    const finalDiscountFormula = formulaParts.filter(Boolean).join('；');
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return { items: sortOrderItems(items), totalDuration, originalPrice, memberDiscountAmount, gratitudeDiscount, promotionDiscount, discountAmount, discountFormula: finalDiscountFormula, finalPrice };
  }, [cart, member, date, allOrders, frontendTab, fitnessPlan, fitnessPlanPrice, gratitudeInput, availableGratitude, canUseGratitude, promotionName, selectedPromotion]);

  const hasOilCourse = useMemo(() => {
    return cart.some(c => {
      const course = COURSES.find(x => x.id === c.courseId);
      return course?.name.includes('芳療油推') || c.isUpgrade;
    });
  }, [cart]);

  const { items, totalDuration, originalPrice, memberDiscountAmount, gratitudeDiscount, promotionDiscount, discountAmount, discountFormula, finalPrice } = orderComputation;

  const hasFemaleExclusive = cart.some(c => {
    const course = COURSES.find(x => x.id === c.courseId);
    return course?.category === '女性專屬';
  });

  useEffect(() => {
    if (hasFemaleExclusive) {
      setTherapistPref('Kelly');
    }
  }, [hasFemaleExclusive]);

  // Verify currently selected date and time is still valid after changing therapist or calendar
  useEffect(() => {
    if (date && !isDayAvailable(date, availabilities, therapistPref, member?.id)) {
      setDate('');
      setTime('');
    } else if (date && time) {
      const baseSlotInfo = getDetailedSlotStatus(date, time, 30, allOrders, member?.id, therapistPref, availabilities, hasOilCourse, hasFemaleExclusive);
      const selectedStartMins = timeToMins(time);
      const hasLaterBooking = !!baseSlotInfo.bookedTherapist && allOrders.some(order => {
        if (order.date !== date || order.status === 'cancelled' || order.therapistPreference !== baseSlotInfo.bookedTherapist) return false;
        return timeToMins(order.time || '00:00') > selectedStartMins;
      });
      // Keep a start time selected when the therapist is free at that moment but a later
      // booking prevents the chosen treatment from fitting; the grid then explains it as 時長不足.
      if (baseSlotInfo.status !== 'available' && !(baseSlotInfo.status === 'fully_booked' && hasLaterBooking)) {
        setTime('');
      }
    }
  }, [allOrders, date, time, member?.id, therapistPref, availabilities]);

  const maxAvailableMins = useMemo(() => {
    if (!date || !time) return 180;
    let maxMins = 0;
    for (let d = 30; d <= 180; d += 30) {
      if (isSlotAvailable(date, time, d, allOrders, member?.id, therapistPref, availabilities, hasOilCourse, hasFemaleExclusive)) {
        maxMins = d;
      } else {
        break;
      }
    }
    return maxMins;
  }, [date, time, allOrders, member?.id, therapistPref, availabilities, hasOilCourse, hasFemaleExclusive]);

  const isPureFitnessPlan = useMemo(() => {
    return frontendTab === 'fitness' && cart.length === 0 && fitnessPlan !== '無';
  }, [frontendTab, cart, fitnessPlan]);

  const canCheckout = (
    (fitnessPlan !== '無' ? Number(fitnessPlanPrice) > 0 : true) &&
    (isPureFitnessPlan || (date && time && (
      totalDuration >= 30 && totalDuration <= 180 && totalDuration <= maxAvailableMins
    )))
  );

  const isTherapistAvailable = (tName: string) => {
    if (!date || !time) return true;

    // Check 30 minutes buffer for today's date
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date === todayStr) {
      const currentMins = now.getHours() * 60 + now.getMinutes();
      if (timeToMins(time) < currentMins + 30) {
        return false;
      }
    }

    const REAL_THERAPISTS = [...maleMassageTherapists, ...femaleMassageTherapists];

    const activeCoachNames = maleCoaches.concat(femaleCoaches);
    const activeMaleCoaches = maleCoaches;
    const activeFemaleCoaches = femaleCoaches;

    const checkIndividualAvailability = (name: string) => {
      // Cannot book oneself
      if (member?.therapistName && name === member.therapistName) return false;

      // Specialization rules only apply to massage tab
      if (frontendTab !== 'fitness') {
        // 1. Mark cannot do Oil Push/Aroma
        if (name === 'Mark' && hasOilCourse) return false;
        
        // 2. Female Exclusive courses can ONLY be done by Kelly
        if (hasFemaleExclusive && name !== 'Kelly') return false;
      }

      const startMins = timeToMins(time);
      const finishMins = startMins + totalDuration;
      const endMinsWithBuffer = finishMins + 30;

      // 3. Check if scheduled
      const avail = availabilities.find(a => a.therapistName === name && a.date === date);
      if (!avail || !avail.slots || avail.slots.length === 0) return false;
      
      const isInTime = isTimeRangeCovered(avail.slots, startMins, finishMins);
      if (!isInTime) return false;

      // 4. Check for overlapping orders
      const overlaps = allOrders.some(o => {
        if (o.date !== date || o.status === 'cancelled' || o.therapistPreference !== name) return false;
        const oStart = timeToMins(o.time || '00:00');
        const oEnd = oStart + (o.totalDuration || 0) + 30;
        return startMins < oEnd && endMinsWithBuffer > oStart;
      });
      return !overlaps;
    };

    if (frontendTab === 'fitness') {
      if (tName === '不指定') {
        return activeCoachNames.some(checkIndividualAvailability);
      }
      if (tName === '男即可') {
        return activeMaleCoaches.some(checkIndividualAvailability);
      }
      if (tName === '女即可') {
        return activeFemaleCoaches.some(checkIndividualAvailability);
      }
      return checkIndividualAvailability(tName);
    } else {
      if (tName === '不指定按摩師' || tName === '不指定') {
        return REAL_THERAPISTS.some(checkIndividualAvailability);
      }

      if (tName === '男按摩師即可' || tName === '男按摩師') {
        return maleMassageTherapists.some(checkIndividualAvailability);
      }

      if (tName === '女按摩師即可' || tName === '女按摩師') {
        return femaleMassageTherapists.some(checkIndividualAvailability);
      }

      return checkIndividualAvailability(tName);
    }
  };

  const handleCheckoutClick = () => {
    if (!canCheckout || !member) return;
    const isFitnessExperienceCheckout = frontendTab === 'fitness' && items.some(item => item.courseId === 'f1');
    if (frontendTab === 'fitness' && !isPureFitnessPlan && !isFitnessExperienceCheckout) {
      if (member.therapistName && therapistPref === member.therapistName) {
        alert('您無法預約自己作為服務教練，請選擇其他教練！');
        return;
      }

      const orderId = Math.random().toString(36).substring(7);
      db.saveOrder({
        id: orderId,
        memberId: member.id,
        date,
        time,
        paymentMethod: finalPrice > 0 ? '現場確認' : '無需付款',
        therapistPreference: therapistPref,
        originalTherapistPreference: therapistPref,
        items,
        totalDuration,
        originalPrice,
        status: 'pending',
        discountAmount,
        discountFormula,
        gratitudeDiscount,
        promotionName: promotionName.trim() || undefined,
        promotionCode: selectedPromotion?.code,
        promotionDiscount,
        finalPrice,
        isFitness: true,
        createdAt: Date.now()
      });

      const dateText = date ? `${date.substring(0, 4)}年${date.substring(5, 7)}月${date.substring(8, 10)}日` : '預約日期';
      setSuccessMessage(`請您於 ${dateText} ${time} 前15分鐘抵達專心練健身房先行著裝與熱身，如需更改時間，請最遲於上課前1小時告知，以便為您取消或更改預約，謝謝!!`);
      setStep(3);
      return;
    }
    setPaymentMethod('LINE PAY');
    setIsPaying(true);
  };

  const processPayment = async (selectedPaymentMethod = paymentMethod) => {
    if (!member) return;
    if (!isPureFitnessPlan && (!date || !time)) return;

    if (!isPureFitnessPlan && member.therapistName && therapistPref === member.therapistName) {
      alert('您無法預約自己作為服務按摩師，請選擇其他按摩師！');
      setIsPaying(false);
      return;
    }
    
    const orderId = Math.random().toString(36).substring(7);

    db.saveOrder({
      id: orderId,
      memberId: member.id,
      date: isPureFitnessPlan ? new Date().toISOString().substring(0, 10) : date,
      time: isPureFitnessPlan ? '00:00' : time,
      paymentMethod: selectedPaymentMethod,
      therapistPreference: isPureFitnessPlan ? '無需教練' : therapistPref,
      originalTherapistPreference: isPureFitnessPlan ? '無需教練' : therapistPref,
      items,
      totalDuration,
      originalPrice,
      status: 'pending',
      discountAmount,
      discountFormula,
      gratitudeDiscount,
      promotionName: promotionName.trim() || undefined,
      promotionCode: selectedPromotion?.code,
      promotionDiscount,
      finalPrice,
      isFitness: frontendTab === 'fitness',
      createdAt: Date.now()
    });

    if (selectedPaymentMethod === 'LINE PAY') {
      try {
        const baseUrl = window.location.origin + window.location.pathname;
        const confirmUrl = `${baseUrl}?linepay=confirm&orderId=${orderId}`;
        const cancelUrl = `${baseUrl}?linepay=cancel`;
        
        setIsRegistering(true); // show loading state visually
        
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
          window.location.assign(result.info.paymentUrl.web);
          return;
        } else {
          alert('LINE Pay 請求失敗: ' + (result.returnMessage || '未知錯誤'));
          setIsRegistering(false);
          setIsPaying(false);
          return;
        }
      } catch (error) {
        console.error(error);
        alert('LINE Pay 系統連線異常');
        setIsRegistering(false);
        setIsPaying(false);
        return;
      }
    }
    
    setIsPaying(false);
    setPaymentMethod('');
    setSuccessMessage(selectedPaymentMethod === 'LINE PAY' ? PAYMENT_COMPLETION_MESSAGE : ONSITE_PAYMENT_COMPLETION_MESSAGE);
    setStep(3);
  };

  const getWeekDay = (dateStr: string) => {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[new Date(dateStr).getDay()];
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${h}小時`;
    const decimal = (mins / 60).toFixed(1).replace(/\.0$/, '');
    return `${decimal}小時`;
  };

  const formatTherapistWithAssign = (pref: string | undefined, origPref: string | undefined) => {
    if (!pref) return '不指定';
    const normalize = (name: string) => {
      let n = name;
      if (n === '不指定按摩師' || n === '不指定教練') n = '不指定';
      if (n === '男按摩師即可' || n === '男按摩師') n = '男即可';
      if (n === '女按摩師即可' || n === '女按摩師') n = '女即可';
      return n;
    };
    const current = normalize(pref);
    if (origPref) {
      const orig = normalize(origPref);
      const genericList = ['不指定', '男即可', '女即可'];
      if (genericList.includes(orig) && orig !== current) {
        return `${orig}(${current})`;
      }
    }
    return current;
  };

  const cancelOrderAndRefundIfNeeded = async (order: Order) => {
    const isVenueOrder = (order.items || []).some(item => item.courseId === 'venue');
    const isPaidWithLinePay = !!order.linePayTransactionId && !!order.paymentMethod?.includes('已線上結帳');
    const orderTime = new Date(`${order.date}T${order.time || '00:00'}:00`).getTime();
    const cancellationLimitMs = (isVenueOrder || isPaidWithLinePay ? 60 : 120) * 60 * 1000;
    if (orderTime - Date.now() <= cancellationLimitMs) {
      throw new Error(isVenueOrder || isPaidWithLinePay
        ? '已超過線上取消時限，如有緊急狀況請撥打電話 0222521711 與我們聯絡'
        : '距離預約時間已不足2小時，無法線上取消。請直接來電通知！');
    }

    if (isVenueOrder || isPaidWithLinePay) {
      if (!isPaidWithLinePay) {
        throw new Error('找不到此場地預約的 LINE Pay 付款交易編號，請撥打 0222521711 由店家協助處理。');
      }
      const response = await fetch('/api/linepay/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: order.linePayTransactionId,
          refundAmount: order.finalPrice
        })
      });
      const result = await response.json();
      if (result.returnCode !== '0000') {
        db.updateOrder(order.id, { refundStatus: 'refund_failed' });
        throw new Error('LINE Pay 退款未完成：' + (result.returnMessage || result.error || '未知錯誤'));
      }
      db.updateOrder(order.id, {
        status: 'cancelled',
        refundStatus: 'refunded',
        linePayRefundTransactionId: String(result.info?.refundTransactionId || ''),
        linePayRefundedAt: Date.now()
      });
    } else {
      db.updateOrder(order.id, { status: 'cancelled' });
    }
    setAllOrders(db.getOrders());
  };

  const handleCancelOrder = (order: Order, reschedule = false) => {
    const isVenueOrder = (order.items || []).some(item => item.courseId === 'venue');
    const isPaidWithLinePay = !!order.linePayTransactionId && !!order.paymentMethod?.includes('已線上結帳');
    setConfirmAction({
      message: isVenueOrder
        ? reschedule
          ? '改期會先將原場地預約全額退款並釋放時段，再帶您重新選擇日期與時間。確定繼續嗎？'
          : '確定取消這筆場地預約嗎？完成後將自動全額退回 LINE Pay 並釋放時段。'
        : isPaidWithLinePay
          ? '確定取消這筆預約嗎？完成後將自動全額退回 LINE Pay。'
          : '確定要取消這筆預約嗎？',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await cancelOrderAndRefundIfNeeded(order);
          if (reschedule && isVenueOrder) {
            setVenueDate(order.date);
            setVenueTime('');
            setVenueRoom((order.massageRoom || '') as 'ZEN1' | 'ZEN2' | 'SPA1' | 'SPA2' | '');
            setVenueDuration(order.totalDuration);
            setVenueNote((order.note || '').replace('【場地預約備註】', '').replace(/^場地預約$/, ''));
            setFrontendTab('venue');
            setConfirmAction({ message: '原預約已完成退款並釋放時段，請重新選擇日期與時間後以 LINE Pay 完成新預約。' });
          } else {
            setConfirmAction({ message: isVenueOrder ? 'LINE Pay 已完成全額退款，原場地時段也已釋放。' : isPaidWithLinePay ? 'LINE Pay 已完成全額退款，預約時段也已釋放。' : '預約已為您取消，我們將收到系統更新，謝謝您的通知！' });
          }
        } catch (error) {
          setConfirmAction({ message: error instanceof Error ? error.message : '取消處理失敗，請稍後再試。' });
        }
      }
    });
  };

  const welcomeIdentityLabels = member ? getMemberIdentityLabels(member) : [];
  const welcomePrimaryIdentity = member ? welcomeIdentityLabels[0] || member.level : '';
  const welcomeIdentityIds = member?.selectedIdentities || [];
  const premiumReferralMembers = member ? db.getMembers().filter(candidate =>
    candidate.referrerId === member.id && (candidate.referrerType === 'gold' || candidate.referrerType === 'black')
  ) : [];
  const welcomeIsPremiumMember = !!member && (
    member.level === '金卡' || member.level === '黑卡' || member.memberLevel === '金卡' || member.memberLevel === '黑卡' ||
    welcomeIdentityIds.includes('gold') || welcomeIdentityIds.includes('black')
  );
  const welcomeIsVenueRentMember = !!member && (
    member.level === '場租按摩師' || member.level === '場租教練' ||
    welcomeIdentityIds.includes('therapist_rent') || welcomeIdentityIds.includes('coach_rent')
  );
  const welcomeCanAccessVenue = !!member && canAccessVenueBooking(member);
  const frontendNavSizingClass = welcomeCanAccessVenue
    ? 'text-[12px] min-[360px]:text-[12.5px] min-[390px]:text-[13.5px] sm:text-base'
    : 'text-[13px] min-[375px]:text-[14px] sm:text-base';

  const renderLinePayCheckout = () => (
    <div className="space-y-3.5 sm:space-y-4">
      <button
        type="button"
        onClick={() => processPayment('LINE PAY')}
        disabled={isRegistering}
        className="w-full rounded-xl bg-[#06C755] px-4 py-4.5 text-[17px] sm:text-lg font-black text-white shadow-md transition hover:bg-[#05b34c] hover:shadow-lg disabled:cursor-wait disabled:opacity-60"
      >
        {isRegistering ? '正在連接 LINE Pay…' : 'LINE Pay 安全付款'}
      </button>
      <div className="rounded-xl bg-sage-50 px-4 py-4 sm:px-5 sm:py-5 text-[14px] sm:text-[15px] leading-[1.75] text-stone-600">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#06A848]" />
          <div className="min-w-0">
            <p className="text-[15px] sm:text-base font-black text-sage-950">LINE Pay 付款說明</p>
            <p className="mt-1.5">確認金額後，系統會安全跳轉至 LINE Pay。付款完成後，將自動返回 ZEN FLOW 預約頁面。</p>
          </div>
        </div>
        <div className="mt-3.5 border-t border-sage-200/70 pt-3.5 pl-0.5">
          <p className="text-[15px] sm:text-base font-black text-sage-950">
            {frontendTab === 'booking'
              ? '線上預付好禮｜免費升級 15 分鐘療癒加值（價值 $300）'
              : items.some(item => item.courseId === 'f1')
                ? 'LINE Pay 線上付款・健身體驗課預付限定'
                : 'LINE Pay 線上付款'}
          </p>
          {frontendTab === 'booking' && (
            <>
              <p className="mt-2">完成線上付款，即免費享有<strong className="font-black text-stone-800">「15 分鐘肩頸熱敷」或「香氛精油加強」二選一</strong>。免去現場找零與對帳，療癒結束後即可輕鬆離店。</p>
              <p className="mt-2.5 font-bold text-sage-800">最晚可於預約前 1 小時線上取消，款項將全額退還。</p>
            </>
          )}
          {frontendTab === 'fitness' && items.some(item => item.courseId === 'f1') && (
            <p className="mt-2">線上完成 LINE Pay 付款，教練體驗課結束後，即可免費預約<strong className="font-black text-stone-800">15 分鐘局部運動按摩（價值 300 元）</strong>。免去現場付款與對帳，流程更輕鬆。</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => processPayment('到店付款')}
        disabled={isRegistering}
        className="w-full rounded-xl bg-sage-100 px-4 py-4.5 text-[17px] sm:text-lg font-black text-sage-950 transition hover:bg-sage-200 disabled:cursor-wait disabled:opacity-50"
      >
        到店付款
      </button>
    </div>
  );

  return (
    <div className="frontend-customer-ui min-h-screen bg-sage-50 text-stone-800 font-sans selection:bg-sage-200/50">
      {bookingToast && (
        <div className="fixed top-4 left-1/2 z-[500] w-[calc(100%-28px)] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="rounded-lg border border-sage-700 bg-sage-900 px-4 py-3.5 text-white shadow-xl flex items-center gap-3.5">
            <span className="w-9 h-9 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] sm:text-sm font-bold text-sage-100">已加入預約</div>
              <div className="mt-1 text-[15px] sm:text-base leading-snug font-black text-white break-words">{bookingToast}</div>
            </div>
          </div>
        </div>
      )}

      {showPremiumReferralList && member && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-stone-950/45 p-4" onClick={() => setShowPremiumReferralList(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-3.5">
              <div>
                <h3 className="text-base font-black text-stone-900">介紹新朋友名單</h3>
                <p className="mt-0.5 text-[12px] font-bold text-stone-500">每位可獲得300元感謝金</p>
              </div>
              <button type="button" onClick={() => setShowPremiumReferralList(false)} className="rounded-md p-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700" aria-label="關閉">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-3 custom-scrollbar">
              {premiumReferralMembers.length === 0 ? (
                <div className="rounded-lg bg-stone-50 px-4 py-6 text-center text-sm font-bold text-stone-400">目前尚無介紹紀錄</div>
              ) : (
                <div className="space-y-2">
                  {premiumReferralMembers.map(referredMember => (
                    <div key={referredMember.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 bg-stone-50/70 px-3.5 py-3">
                      <span className="text-[15px] font-black text-stone-800">{referredMember.name}</span>
                      <span className="text-[13px] font-bold text-stone-500 font-sans whitespace-nowrap">{referredMember.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-600">
              <span>共 {premiumReferralMembers.length} 位</span>
              <span className="font-black text-emerald-700">{(premiumReferralMembers.length * 300).toLocaleString()}元</span>
            </div>
          </div>
        </div>
      )}
      
      {/* HEADER FOR MOBILE / TABLET */}
      <div className={`lg:hidden ${step === 1 ? 'bg-gradient-to-b from-white via-sage-50/35 to-transparent px-5 pt-10 pb-7' : 'border-b border-sage-100 bg-white px-3 min-[390px]:px-4 py-4 shadow-sm'}`}>
        <div className={step === 1 ? 'text-center' : 'grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 min-[390px]:gap-3'}>
          <div className={step === 1 ? 'inline-flex flex-col items-center' : 'min-w-0 h-[62px] flex flex-col justify-between py-0.5'}>
            <h1 className={`zen-flow-wordmark text-sage-950 whitespace-nowrap ${step === 1 ? 'text-[50px] min-[390px]:text-[56px] leading-[0.92] tracking-[-0.035em]' : 'text-[38px] min-[390px]:text-[44px] leading-[0.88]'}`}>ZEN FLOW</h1>
            <p className={`${step === 1 ? 'mt-3 text-[10.5px] min-[390px]:text-[11.5px] tracking-[0.16em]' : 'h-4 flex items-end text-[10px] min-[390px]:text-[11px]'} leading-none text-sage-600 font-bold uppercase whitespace-nowrap`}>
              {step === 1 ? 'Massage · Fitness · Nutrition' : 'Massage, Fitness & Nutrition'}
            </p>
          </div>
          {step === 2 && member && (
            <div className="shrink-0 h-[62px] flex flex-col items-end justify-start">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[12px] font-bold text-stone-600 hover:bg-stone-100 transition whitespace-nowrap"
              >
                <LogOut className="w-3 h-3" />
                切換帳號
              </button>
            </div>
          )}
        </div>
        <div className={step === 1 ? 'mt-4 text-center' : 'mt-3 pt-3 border-t border-sage-100'}>
          {step === 2 && member ? (
            <>
              <p className="text-[19px] leading-tight font-black text-stone-900 whitespace-nowrap">親愛的 {getFriendlyDisplayName(member.registeredName || member.name)}，{getGreetingPeriod()}您好!!</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-sage-100 bg-sage-50/60 px-2.5 py-2.5 flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-bold text-stone-500 shrink-0">生日</span>
                  <span className="text-stone-300">|</span>
                  <span className="text-[15px] font-black text-stone-800 whitespace-nowrap">{member.birthday}</span>
                </div>
                <div className="rounded-md border border-sage-100 bg-sage-50/60 px-2.5 py-2.5 flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-bold text-stone-500 shrink-0">星座</span>
                  <span className="text-stone-300">|</span>
                  <span className="text-[15px] font-black text-stone-800 whitespace-nowrap">{getZodiacSign(member.birthday)}</span>
                </div>
                <div className="rounded-md border border-sage-100 bg-sage-50/60 px-2.5 py-2.5 flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-bold text-stone-500 shrink-0">電話</span>
                  <span className="text-stone-300">|</span>
                  <span className="text-[14px] font-black text-stone-800 whitespace-nowrap">{member.id}</span>
                </div>
                <div className="rounded-md border border-sage-100 bg-sage-50/60 px-2.5 py-2.5 flex items-center gap-1.5 min-w-0 overflow-visible">
                  <span className="text-[13px] font-bold text-stone-500 shrink-0">身分</span>
                  <span className="text-stone-300">|</span>
                  {welcomeIdentityLabels.length <= 1 ? (
                    <span className="min-w-0 text-[14px] font-black text-sage-800 whitespace-nowrap">{welcomePrimaryIdentity}</span>
                  ) : (
                    <details className="relative inline-block min-w-0 group">
                      <summary className="inline-flex items-center gap-0.5 text-[14px] font-black text-sage-800 whitespace-nowrap cursor-pointer list-none">
                        {welcomePrimaryIdentity}<ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="absolute right-0 top-full z-40 mt-1 min-w-[110px] rounded-md border border-sage-100 bg-white p-1.5 shadow-lg">
                        {welcomeIdentityLabels.map(label => <div key={label} className="whitespace-nowrap px-2 py-1 text-[11px] font-bold text-stone-600">{label}</div>)}
                      </div>
                    </details>
                  )}
                </div>
              </div>
              {welcomeIsPremiumMember && (() => {
                const isBlackMember = member.level === '黑卡' || member.memberLevel === '黑卡' || welcomeIdentityIds.includes('black');
                const status = getDiscountStatus(member, date, allOrders);
                const gratitudeAmount = db.getMembers().filter(candidate =>
                  candidate.referrerId === member.id && (candidate.referrerType === 'gold' || candidate.referrerType === 'black')
                ).length * 300;
                return (
                  <div className={`mt-3 rounded-lg border p-3.5 ${isBlackMember ? 'bg-stone-900 border-stone-800 text-white' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <span className={`rounded-md px-2.5 py-1 text-[13px] font-black ${isBlackMember ? 'bg-white text-stone-900' : 'bg-amber-500 text-white'}`}>
                        {isBlackMember ? '黑卡會員權益' : '金卡會員權益'}
                      </span>
                      <div className="text-right">
                        <div className={`text-[11px] font-bold ${isBlackMember ? 'text-stone-400' : 'text-amber-700'}`}>感謝金</div>
                        <div className={`text-[16px] font-black ${isBlackMember ? 'text-emerald-300' : 'text-emerald-700'}`}>{gratitudeAmount.toLocaleString()}元</div>
                      </div>
                    </div>
                    <div className={`divide-y text-[13px] font-bold leading-snug ${isBlackMember ? 'divide-stone-700 text-stone-200' : 'divide-amber-200 text-amber-950'}`}>
                      <button type="button" onClick={() => setShowPremiumReferralList(true)} className="w-full py-2 flex items-center justify-between gap-2 text-left">
                        <span>每介紹一位新朋友，即可獲得300元感謝金</span>
                        <span className={`shrink-0 inline-flex items-center gap-0.5 text-[12px] ${isBlackMember ? 'text-emerald-300' : 'text-emerald-700'}`}>{premiumReferralMembers.length}位<ChevronRight className="h-3.5 w-3.5" /></span>
                      </button>
                      <div className="py-2 flex items-center justify-between gap-2">
                        <span>按摩首時1200元，後續時數半價</span>
                        <span className={`shrink-0 text-[12px] ${isBlackMember ? 'text-stone-400' : 'text-amber-700'}`}>{status.usedTimes}/{status.maxTimes}次</span>
                      </div>
                      <div className="py-2 flex items-center justify-between gap-2">
                        <span>InBody量測免費</span>
                        <span className={`shrink-0 text-[12px] ${isBlackMember ? 'text-stone-400' : 'text-amber-700'}`}>{status.inbodyUsedTimes}/{status.inbodyMaxTimes}次</span>
                      </div>
                      <div className="pt-2">店內特調飲品全面 8 折</div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="font-sans text-stone-700">
              <div className="mx-auto mb-3.5 h-px w-12 bg-sage-300" />
              <p className="text-[19px] min-[390px]:text-[21px] font-extrabold tracking-[0.1em]">流動的身心平衡</p>
              <p className="mt-2.5 text-[11.5px] min-[390px]:text-[12.5px] font-bold tracking-[0.2em] text-sage-600">專屬線上預約系統</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:p-6 lg:p-10">
        <div className={`grid grid-cols-1 lg:grid-cols-12 items-start ${step === 1 ? 'gap-5 lg:gap-8' : 'gap-8'}`}>
          
          {/* LEFT COLUMN: Store Profile / Vibe Introductions (Responsive desktop side, mobile below) */}
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            <div className={`relative overflow-hidden ${step === 1 ? 'bg-transparent px-1 py-5 min-[390px]:px-2 sm:p-8 border-0 border-t border-sage-200/70 shadow-none lg:bg-white lg:p-8 lg:rounded-3xl lg:border lg:border-sage-100 lg:shadow-md' : 'bg-white p-4 min-[390px]:p-5 sm:p-8 border border-sage-100 rounded-3xl shadow-md'}`}>
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-sage-100/40 rounded-full filter blur-2xl"></div>
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-sage-200/20 rounded-full filter blur-2xl"></div>
              
              <div className="relative z-10">
                {/* Desktop Store Logo Header */}
                <div className="hidden lg:block mb-8">
                  <h1 className="zen-flow-wordmark text-[50px] leading-[0.92] tracking-[-0.035em] text-sage-900">ZEN FLOW</h1>
                  <p className="mt-2.5 text-[10.5px] leading-none tracking-[0.13em] text-sage-600 font-bold uppercase">Massage · Fitness · Nutrition</p>
                  <div className="h-px w-12 bg-sage-300 my-5"></div>
                  <p className="text-[19px] font-extrabold tracking-[0.08em] text-stone-700">流動的身心平衡</p>
                  <p className="mt-2 text-[11px] font-bold tracking-[0.18em] text-sage-600">專屬線上預約系統</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-[15px] sm:text-base font-bold uppercase tracking-wider text-sage-800 border-b border-sage-100 pb-2.5 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-sage-500" /> 靜謐空間與品牌初衷
                    </h3>
                    <div className="text-[14px] sm:text-[15px] text-stone-600 leading-[1.85] font-medium mt-3 space-y-3.5">
                      <p className="text-[16px] sm:text-[17px] font-black text-sage-900">ZEN FLOW 創立於 2016 年。</p>
                      <p>
                        十載的光陰淬鍊，讓我們更深信大自然植物與身體自我療癒的力量。我們將<strong className="font-black text-stone-800">西方頂級芳療 SPA 油推</strong>的細緻撫慰，與<strong className="font-black text-stone-800">東方經絡穴道調理</strong>的深層釋放完美融合。
                      </p>
                      <p>
                        為了提供更精準的照護，我們導入<strong className="font-black text-stone-800">科學 InBody 身體組成分析</strong>，為您量身規劃結合<strong className="font-black text-stone-800">運動按摩修復</strong>、<strong className="font-black text-stone-800">個人化健身運動</strong>與<strong className="font-black text-stone-800">日常營養調理</strong>的整合方案。從肌肉的深層釋放、體態的鍛鍊到內在的營養滋養，ZEN FLOW 陪伴您在靜謐的空間中，找回最純粹的身心和諧。
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[15px] sm:text-base font-bold uppercase tracking-wider text-sage-800 border-b border-sage-100 pb-2.5 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-sage-500" /> 店內奢華禮遇與服務
                    </h3>
                    <ul className="text-[16px] sm:text-[17px] text-stone-700 space-y-5 font-medium leading-[1.75] mt-3.5">
                      <li className="flex items-start gap-2">
                        <span className="text-sage-500 mt-0.5">✦</span>
                        <span>
                          <strong>法國 Florihana芳療家｜頂級有機芳療護理</strong>
                          <span className="block text-[15px] sm:text-base leading-[1.8] text-stone-600 mt-2">我們全店採用法國頂級有機品牌 Florihana 精油。每一滴，都凝聚了南法高原最純淨的植物能量，透過芳療師細緻溫熱的手技，溫柔撫平身心每一處緊繃，帶來無可比擬的深層釋放。</span>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-sage-500 mt-0.5">✦</span>
                        <span>
                          <strong>專業經絡與深層運動按摩｜深度解構筋膜緊繃，徹底釋放關節壓力，重啟身體無壓的輕盈流動</strong>
                          <span className="block text-[15px] sm:text-base leading-[1.8] text-stone-600 mt-2">直擊酸痛核心！結合專業東西方按摩技法，深層瓦解緊繃肌群，神救援被壓力與疲勞積壓的關節，還原身體久違的鬆彈與自由。</span>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-sage-500 mt-0.5">✦</span>
                        <span>
                          <strong>醫學級 InBody 數據解密｜精準透視身體組成，為您精確定義健康與體態的黃金比例。</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-sage-500 mt-0.5">✦</span>
                        <span>
                          <strong>尊榮專屬款待｜迎賓花草茶、獨立淋浴空間、課後頂級優質蛋白飲</strong>
                          <span className="block text-[15px] sm:text-base leading-[1.8] text-stone-600 mt-2">從一杯暖心的有機迎賓茶開始，到獨立淋浴房的放鬆沐浴，最後以精準修復的優質蛋白飲完美收尾。全流程專屬款待，只為成就最好的您。</span>
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-5 border-t border-sage-100 space-y-3.5 text-[14px] sm:text-[15px] leading-relaxed text-stone-600 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sage-500" />
                      <span><strong>營業時間：</strong>每日 10:00 ~ 22:00</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-sage-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1 leading-relaxed">
                        <div className="font-bold text-[14px] sm:text-[15px]">店鋪地址：</div>
                        <a
                          href="https://www.google.com/maps/search/?api=1&query=新北市板橋區民生路三段30-1號1樓"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 hover:text-sage-700 hover:underline transition duration-150 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-stone-600 min-w-0"
                        >
                          <span className="text-[15px] sm:text-base leading-relaxed break-words">新北市板橋區民生路三段30-1號1樓</span>
                          <span className="text-[12px] sm:text-[13px] text-stone-600 font-bold border border-sage-200 rounded-md px-2 py-0.5 bg-sage-50 inline-block shrink-0">導航</span>
                        </a>
                        <div className="text-stone-500 text-[14px] sm:text-[15px] mt-1.5 leading-relaxed">
                          (新埔站/ 新埔民生站 步行1分鐘)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-sage-500" />
                      <span><strong>預約專線：</strong>02-2252-1711</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Booking Dialogue Area */}
          <div className="lg:col-span-8 order-1 lg:order-2 w-full">
            <div className={`overflow-hidden flex flex-col justify-between ${step === 1 ? `${loginType === 'member' ? 'min-h-0 lg:min-h-[550px]' : 'min-h-[550px]'} bg-transparent border-0 shadow-none lg:bg-white lg:border lg:border-sage-100 lg:rounded-3xl lg:shadow-lg` : 'min-h-[550px] bg-white border border-sage-100 rounded-3xl shadow-lg'}`}>
              
              {/* Internal Dialogue App Header */}
              <div className="hidden lg:flex bg-sage-800 text-white p-5 sm:p-7 items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-wider whitespace-nowrap">專屬預約系統</h2>
                  </div>
                  <p className="mt-1 text-[10px] sm:text-[11px] text-sage-200 tracking-wider">ZEN FLOW ｜ Online Reservation</p>
                </div>
                {step === 2 && member && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-sage-600 bg-sage-900/25 px-2.5 py-2 text-[10px] sm:text-xs font-bold text-sage-100 hover:bg-sage-700 transition whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    切換帳號
                  </button>
                )}
              </div>

              {/* Step Content Shell */}
              <div className="p-4 sm:p-8 flex-1">
                
                {/* STEP 1: LOGIN & REGISTRATION */}
                {step === 1 && (
                  <div className="max-w-md mx-auto overflow-hidden bg-white/95 rounded-[24px] sm:rounded-[28px] shadow-[0_14px_38px_-26px_rgba(54,79,65,0.32)] border border-sage-100/80 my-0 lg:my-4">
                    {loginType === 'member' ? (
                      <div className="p-6 sm:p-9">
                        <div className="mb-8 pt-1 text-center">
                          <h2 className="text-[30px] leading-tight font-black tracking-[0.08em] text-sage-950">{isRegistering ? '會員註冊' : '會員登入'}</h2>
                          <p className="mt-2 text-[13px] font-medium tracking-[0.04em] text-stone-500">{isRegistering ? '完成基本資料，即可開始預約服務' : '使用 LINE 完成身分驗證，即可開始預約'}</p>
                        </div>
                        
                        <div className="space-y-5">
                          {isRegistering && (
                            <div className="space-y-4 pt-5 border-t border-sage-100 animate-in fade-in slide-in-from-top-4 duration-300">
                              <div className="rounded-2xl border border-sage-200/80 bg-gradient-to-br from-sage-50 to-stone-50 p-4">
                                <div className="flex items-start gap-3">
                                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sage-700 shadow-sm"><CheckCircle2 className="h-4.5 w-4.5" /></span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-sage-950">{isLineProfileRegistration ? '歡迎加入 ZEN FLOW' : '建立您的會員資料'}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-stone-500">{isLineProfileRegistration ? '只需第一次加入會員時填寫，之後即可用 LINE 登入預約服務。完成預約時我們會傳送 LINE 通知，並於預約前一天致電提醒您，謝謝！' : '只需第一次加入會員時填寫，之後即可用 LINE 登入預約服務。完成預約時我們會傳送 LINE 通知，並於預約前一天致電提醒您，謝謝！'}</p>
                                  </div>
                                  {!isLineProfileRegistration && <button onClick={() => setIsRegistering(false)} className="shrink-0 text-xs font-bold text-sage-700 underline decoration-sage-300 underline-offset-4 hover:text-sage-900">修改</button>}
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">真實姓名</label>
                                <input 
                                  type="text" 
                                  inputMode="text"
                                  autoComplete="name"
                                  maxLength={4}
                                  value={name} 
                                  onChange={e => setName(Array.from(e.target.value.replace(/[^\u3400-\u4DBF\u4E00-\u9FFF]/gu, '')).slice(0, 4).join(''))} 
                                  className="w-full px-4 py-3 bg-white border border-sage-200 rounded-2xl focus:ring-2 focus:ring-sage-200 focus:border-sage-500 outline-none text-base" 
                                  placeholder="例如：陳小美"
                                />
                                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-400"><CheckCircle2 className="h-3.5 w-3.5 text-sage-500" />請填寫 1–4 個繁體中文字</p>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">手機號碼</label>
                                <div className="relative">
                                  <input
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    disabled={!isLineProfileRegistration}
                                    className={`w-full px-4 py-3 border rounded-2xl outline-none text-base transition ${
                                      isLineProfileRegistration
                                        ? 'bg-white border-sage-200 focus:ring-2 focus:ring-sage-200 focus:border-sage-500'
                                        : 'bg-stone-50 text-stone-600 border-stone-200'
                                    }`}
                                    placeholder="0912345678"
                                  />
                                </div>
                                <p className="mt-1.5 text-xs font-medium text-stone-400">請填寫可接聽預約提醒的台灣手機號碼</p>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">生日</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="bday"
                                    maxLength={10}
                                    value={birthday.replace(/-/g, '/')}
                                    onChange={e => {
                                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                      const formatted = digits.length <= 4
                                        ? digits
                                        : digits.length <= 6
                                          ? `${digits.slice(0, 4)}/${digits.slice(4)}`
                                          : `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
                                      setBirthday(formatted);
                                    }}
                                    className="w-full px-4 py-3 pr-11 bg-white border border-sage-200 rounded-2xl text-stone-800 focus:ring-2 focus:ring-sage-200 focus:border-sage-500 outline-none transition text-base"
                                    placeholder="西元年/月/日，例如 1990/05/20"
                                  />
                                  <CalendarIcon className="pointer-events-none absolute right-4 top-3.5 h-5 w-5 text-sage-400" />
                                </div>
                                <p className="mt-1.5 text-xs font-medium text-stone-400">請輸入西元生日，共 8 碼數字</p>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">性別</label>
                                <div className="grid grid-cols-2 gap-3">
                                  <label className={`flex items-center justify-center cursor-pointer rounded-2xl border px-4 py-3 transition ${gender === '男' ? 'border-sage-600 bg-sage-50 text-sage-900' : 'border-stone-200 bg-white text-stone-500'}`}>
                                    <input 
                                      type="radio" 
                                      value="男" 
                                      checked={gender === '男'} 
                                      onChange={() => setGender('男')} 
                                      className="mr-2 w-5 h-5 accent-sage-800" 
                                    />
                                    <span className="text-stone-700 text-base font-medium">男性</span>
                                  </label>
                                  <label className={`flex items-center justify-center cursor-pointer rounded-2xl border px-4 py-3 transition ${gender === '女' ? 'border-sage-600 bg-sage-50 text-sage-900' : 'border-stone-200 bg-white text-stone-500'}`}>
                                    <input 
                                      type="radio" 
                                      value="女" 
                                      checked={gender === '女'} 
                                      onChange={() => setGender('女')} 
                                      className="mr-2 w-5 h-5 accent-sage-800" 
                                    />
                                    <span className="text-stone-700 text-base font-medium">女性</span>
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 rounded-2xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
                                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                                <p>請填寫可聯繫的真實資料，僅用於會員識別、預約確認與到店提醒。</p>
                              </div>

                              <button 
                                onClick={handleRegister} 
                                className="w-full py-4 bg-sage-800 text-white rounded-2xl font-black hover:bg-sage-700 transition duration-200 mt-2 text-base shadow-lg shadow-sage-200"
                              >
                                完成註冊並繼續預約
                              </button>
                            </div>
                          )}

                          {!isRegistering && (
                            <div className="space-y-5 pt-1">
                              <button
                                type="button"
                                onClick={() => window.location.assign('/api/auth/line/start?returnTo=/')}
                                className="w-full py-4.5 bg-[#06C755] text-white rounded-2xl hover:bg-[#05b74d] transition duration-200 flex items-center justify-center font-black text-[17px] shadow-lg shadow-emerald-100"
                              >
                                使用 LINE 快速登入
                              </button>
                              <p className="text-center text-xs leading-relaxed text-stone-400">首次登入將引導您完成會員基本資料</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setLoginType('staff');
                                  setStaffPhone('');
                                  setStaffPassword('');
                                }}
                                className="w-full text-center text-xs sm:text-sm text-sage-700 hover:text-sage-900 font-bold underline underline-offset-4 transition font-sans"
                              >
                                店內人員由此登入
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleStaffLogin} autoComplete="on" className="space-y-5 animate-in fade-in duration-200">
                        <h2 className="staff-login-title text-[17px] sm:text-xl font-bold text-sage-900 mb-6 text-center flex items-center justify-center gap-2 font-sans leading-tight">
                          <User className="w-5 h-5 text-sage-500 shrink-0" />
                          <span className="whitespace-nowrap">ZEN FLOW 工作人員由此登入</span>
                        </h2>

                        {visibleRememberedStaffUsers.length > 0 && (
                          <div className="rounded-xl border border-sage-100 bg-sage-50/70 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-black text-sage-900">快速選擇身分</p>
                              <span className="text-[11px] font-bold text-stone-400">此裝置已驗證</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {visibleRememberedStaffUsers.map(savedUser => (
                                <div key={`${savedUser.role}-${savedUser.phone}`} className="flex items-stretch gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRememberedStaffLogin(savedUser)}
                                    className="min-w-0 flex-1 rounded-lg border border-sage-200 bg-white px-3.5 py-2.5 text-left shadow-sm transition hover:border-sage-400 hover:bg-sage-50"
                                  >
                                    <span className="block truncate text-[15px] font-black text-stone-900">{savedUser.name || savedUser.phone}</span>
                                    <span className="mt-0.5 block text-xs font-bold text-sage-700">{savedUser.role === 'admin' ? '系統管理員' : '店內人員'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`移除 ${savedUser.name || savedUser.phone}`}
                                    onClick={() => {
                                      setRememberedStaffUsers(previousUsers => {
                                        const nextUsers = previousUsers.filter(user => user.phone !== savedUser.phone);
                                        localStorage.setItem('zf_staff_remembered_users', JSON.stringify(nextUsers));
                                        return nextUsers;
                                      });
                                    }}
                                    className="w-10 shrink-0 rounded-lg border border-stone-200 bg-white text-stone-400 transition hover:border-rose-200 hover:text-rose-600"
                                    title="移除此身分"
                                  >
                                    <X className="mx-auto h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {unrememberedStaffAccounts.length > 0 && (
                          <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-black text-stone-800">可連結的工作身分</p>
                              <span className="text-[11px] font-bold text-amber-700">首次需驗證</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {unrememberedStaffAccounts.map(account => (
                                <button
                                  key={account.id}
                                  type="button"
                                  onClick={() => {
                                    setStaffPhone(account.id);
                                    setStaffPassword('');
                                    setRememberStaffDevice(true);
                                  }}
                                  className={`min-w-0 rounded-lg border px-3 py-2.5 text-left transition ${staffPhone === account.id ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-100' : 'border-stone-200 bg-stone-50/60 hover:border-sage-300'}`}
                                >
                                  <span className="block truncate text-sm font-black text-stone-900">{account.therapistName || account.name}</span>
                                  <span className="mt-0.5 block text-[11px] font-bold text-stone-500">{getStaffAccountTitle(account)}・輸入一次密碼</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-1.5">帳號 (手機號碼 或 admin)</label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-3.5 h-5 w-5 text-sage-400" />
                            <input 
                              type="text" 
                              name="username"
                              autoComplete="username"
                              inputMode="text"
                              value={staffPhone} 
                              onChange={e => setStaffPhone(e.target.value)}
                              className="w-full pl-11 pr-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-sage-500 outline-none text-base transition"
                              placeholder="請輸入帳號"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-1.5">密碼</label>
                          <input 
                            type="password" 
                            name="password"
                            autoComplete="current-password"
                            value={staffPassword} 
                            onChange={e => setStaffPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-sage-500 outline-none text-base transition text-center tracking-[0.3em] font-sans"
                            placeholder="••••••"
                          />
                        </div>

                        <label className="flex items-center justify-center gap-2 rounded-xl border border-sage-100 bg-white/70 px-3 py-2.5 text-xs font-bold text-stone-600">
                          <input
                            type="checkbox"
                            checked={rememberStaffDevice}
                            onChange={e => setRememberStaffDevice(e.target.checked)}
                            className="h-4 w-4 accent-sage-700"
                          />
                          記住此裝置，下次可快速登入
                        </label>

                        <button 
                          type="submit" 
                          className="w-full py-4 bg-sage-800 text-white rounded-xl hover:bg-sage-700 transition duration-200 font-bold text-base shadow-sm font-sans"
                        >
                          登入系統
                        </button>

                        <div className="flex justify-between items-center pt-2">
                          <button 
                            type="button" 
                            onClick={() => {
                              setLoginType('member');
                              setStaffPhone('');
                              setStaffPassword('');
                            }}
                            className="text-xs text-sage-600 hover:text-sage-800 font-semibold underline transition font-sans"
                          >
                            ⬅️ 返回顧客登入
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              setConfirmAction({
                                message: '請聯絡店內管理員為您重設密碼, 謝謝!!'
                              });
                            }}
                            className="text-xs text-stone-500 hover:text-stone-800 font-semibold underline transition font-sans"
                          >
                            忘記密碼？
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* STEP 2: DASHBOARD & ACTIVE BOOKING FLOW */}
                {step === 2 && member && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* Member Profile Dashboard Card */}
                    <div className={`bg-sage-50/70 p-4 sm:p-5 rounded-2xl border border-sage-100 flex-col md:flex-row justify-between gap-4 ${welcomeIsVenueRentMember && !welcomeIsPremiumMember ? 'flex' : 'hidden lg:flex'}`}>
                      <div className="hidden lg:block space-y-3 flex-1">
                        <p className="hidden lg:block text-stone-900 font-black text-lg sm:text-xl leading-tight">親愛的 {getFriendlyDisplayName(member.registeredName || member.name)}，{getGreetingPeriod()}您好!!</p>
                        <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-sm text-stone-600 font-semibold">
                          <div className="bg-white/80 px-2 py-2 rounded-lg border border-sage-100/50 min-w-0 flex items-center gap-1 whitespace-nowrap overflow-hidden">
                            <span className="shrink-0 text-stone-500">生日</span><span className="shrink-0 text-stone-300">|</span><span className="min-w-0 font-sans font-bold text-stone-800 text-[11px] sm:text-sm whitespace-nowrap">{member.birthday}</span>
                          </div>
                          <div className="bg-white/80 px-2 py-2 rounded-lg border border-sage-100/50 min-w-0 flex items-center gap-1 whitespace-nowrap overflow-hidden">
                            <span className="shrink-0 text-stone-500">星座</span><span className="shrink-0 text-stone-300">|</span><span className="min-w-0 font-bold text-stone-800 text-[11px] sm:text-sm whitespace-nowrap">{getZodiacSign(member.birthday)}</span>
                          </div>
                          <div className="bg-white/80 px-2 py-2 rounded-lg border border-sage-100/50 min-w-0 flex items-center gap-1 whitespace-nowrap overflow-hidden">
                            <span className="shrink-0 text-stone-500">電話</span><span className="shrink-0 text-stone-300">|</span><span className="min-w-0 font-sans font-bold text-stone-800 text-[11px] sm:text-sm whitespace-nowrap">{member.id}</span>
                          </div>
                          <div className="bg-white/80 px-2 py-2 rounded-lg border border-sage-100/50 min-w-0 flex items-center gap-1 whitespace-nowrap overflow-visible">
                            <span className="shrink-0 text-stone-500">身分</span><span className="shrink-0 text-stone-300">|</span>{(() => {
                              const identityLabels = getMemberIdentityLabels(member);
                              const primaryIdentity = identityLabels[0] || member.level;
                              if (identityLabels.length <= 1) {
                                return <span className="min-w-0 px-1.5 py-0.5 bg-sage-800 text-white rounded text-[9px] sm:text-[10px] font-bold whitespace-nowrap">{primaryIdentity}</span>;
                              }
                              return (
                                <details className="inline-block relative group">
                                  <summary className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sage-800 text-white rounded text-[9px] sm:text-[10px] font-bold whitespace-nowrap cursor-pointer list-none">
                                    {primaryIdentity}
                                    <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  </summary>
                                  <div className="absolute right-0 top-full z-30 mt-1 min-w-[92px] rounded-lg border border-sage-100 bg-white p-1.5 shadow-lg">
                                    {identityLabels.map(label => (
                                      <div key={label} className="whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold text-stone-600">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              );
                            })()}
                          </div>
                        </div>
                        <p className="text-[10px] text-stone-400">＊如需修改或更新資料，請聯繫ZEN FLOW專員</p>
                      </div>

                      {(() => {
                        const identityIds = member.selectedIdentities || [];
                        const isVenueRentMember = member.level === '場租按摩師' || member.level === '場租教練' || identityIds.includes('therapist_rent') || identityIds.includes('coach_rent');
                        const isPremiumMember = member.level === '金卡' || member.level === '黑卡' || member.memberLevel === '金卡' || member.memberLevel === '黑卡' || identityIds.includes('gold') || identityIds.includes('black');
                        const isBlackMember = member.level === '黑卡' || member.memberLevel === '黑卡' || identityIds.includes('black');

                        if (!isVenueRentMember && !isPremiumMember) return null;

                        if (isVenueRentMember) {
                          const now = new Date();
                          const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                          const monthlyVenueBookings = allOrders.filter(o => 
                            o.memberId === member?.id && 
                            o.date.startsWith(currentMonthPrefix) && 
                            o.items && (o.items || []).some(item => item.courseId === 'venue') && 
                            o.status !== 'cancelled'
                          ).length;

                          return (
                            <div className="md:w-5/12 bg-[#F6F4ED] border border-[#EBE6DA] p-3 rounded-xl flex flex-col justify-center shrink-0">
                              <span className="px-2 py-0.5 bg-sage-800 text-white text-[10px] rounded font-bold inline-block mb-1.5 self-start">場租會員權益</span>
                              <div className="space-y-1 text-xs text-stone-800 font-medium leading-tight">
                                <p className="font-bold text-sage-950 mb-1">本月租用次數：<span className="text-sm text-sage-800 font-sans font-extrabold">{monthlyVenueBookings}</span> 次</p>
                                <div className="border-t border-[#EBE6DA] my-1 pt-1.5">
                                  <p className="font-bold text-stone-500 mb-0.5 text-[10px] uppercase tracking-wider">專屬優惠</p>
                                  <p>➊ Inbody 量測 5 折</p>
                                  <p>➋ 店內飲品全面 8 折</p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const status = getDiscountStatus(member, date, allOrders);
                        return (
                          <div className={`md:w-5/12 border p-3.5 rounded-xl flex flex-col justify-center shrink-0 ${isBlackMember ? 'bg-stone-900 border-stone-800 text-white' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`px-2 py-1 text-[10px] rounded-md font-black inline-block ${isBlackMember ? 'bg-white text-stone-900' : 'bg-amber-500 text-white'}`}>
                                {isBlackMember ? '黑卡會員權益' : '金卡會員權益'}
                              </span>
                              <span className={`text-[9px] font-bold ${isBlackMember ? 'text-stone-400' : 'text-amber-700'}`}>禮遇生效中</span>
                            </div>
                            <div className={`mb-2 rounded-md px-2.5 py-2 flex items-center justify-between gap-2 ${isBlackMember ? 'bg-white/10 border border-stone-700' : 'bg-white/70 border border-amber-200'}`}>
                              <span className="text-[11px] font-black">感謝金：</span>
                              <span className={`text-sm font-black whitespace-nowrap ${isBlackMember ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                {(db.getMembers().filter(candidate => candidate.referrerId === member.id && (candidate.referrerType === 'gold' || candidate.referrerType === 'black')).length * 300).toLocaleString()}元
                              </span>
                            </div>
                            <div className={`divide-y text-[11px] sm:text-xs font-bold leading-snug ${isBlackMember ? 'divide-stone-700 text-stone-200' : 'divide-amber-200 text-amber-950'}`}>
                              <button type="button" onClick={() => setShowPremiumReferralList(true)} className="w-full py-1.5 flex items-start justify-between gap-2 text-left">
                                <span>介紹新朋友享300元感謝金</span>
                                <span className={`shrink-0 inline-flex items-center gap-0.5 text-[10px] ${isBlackMember ? 'text-emerald-300' : 'text-emerald-700'}`}>{premiumReferralMembers.length}位<ChevronRight className="h-3 w-3" /></span>
                              </button>
                              <div className="py-1.5 flex items-start justify-between gap-2">
                                <span>按摩首時1200元後半價</span>
                                <span className={`shrink-0 text-[9px] ${isBlackMember ? 'text-stone-400' : 'text-amber-700'}`}>{status.usedTimes}/{status.maxTimes}次</span>
                              </div>
                              <div className="py-1.5 flex items-start justify-between gap-2">
                                <span>InBody量測免費</span>
                                <span className={`shrink-0 text-[9px] ${isBlackMember ? 'text-stone-400' : 'text-amber-700'}`}>{status.inbodyUsedTimes}/{status.inbodyMaxTimes}次</span>
                              </div>
                              <div className="pt-1.5">店內特調飲品全面 8 折</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Navigation Tab bar */}
                    <div className="flex border-b border-sage-200 w-full overflow-x-auto scrollbar-none">
                      {canAccessVenueBooking(member) && (
                        <button 
                          onClick={() => setFrontendTab('venue')} 
                          className={`flex-1 text-center pb-3 pt-1 px-0.5 sm:px-4 ${frontendNavSizingClass} font-bold transition-colors relative whitespace-nowrap ${
                            frontendTab === 'venue' ? 'text-sage-800' : 'text-stone-400 hover:text-stone-600'
                          }`}
                        >
                          場地預約
                          {frontendTab === 'venue' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-sage-800 rounded-full"></div>}
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          const hasFitnessSelection = cart.some(item => item.courseId.startsWith('f')) || fitnessPlan !== '無';
                          if (hasFitnessSelection) {
                            setConfirmAction({
                              message: '您要先清除本頁面的預約嗎？',
                              confirmLabel: '是，前往另一個預約',
                              cancelLabel: '否，我要先繼續完成本預約',
                              onConfirm: () => {
                                setCart([]);
                                setFitnessPlan('無');
                                setFitnessPlanPrice(0);
                                setDate('');
                                setTime('');
                                setTherapistPref('不指定按摩師');
                                setPromotionCodeInput('');
                                setPromotionCodeStatus('idle');
                                setPromotionName('');
                                setPromotionDiscountInput('');
                                setSelectedPromotion(null);
                                setGratitudeInput('');
                                setFrontendTab('booking');
                                setConfirmAction(null);
                              }
                            });
                            return;
                          }
                          setFrontendTab('booking');
                          setDate('');
                          setTime('');
                          setTherapistPref('不指定按摩師');
                        }} 
                        className={`flex-1 text-center pb-3 pt-1 px-0.5 sm:px-4 ${frontendNavSizingClass} font-bold transition-colors relative whitespace-nowrap ${
                          frontendTab === 'booking' ? 'text-sage-800' : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        按摩預約
                        {frontendTab === 'booking' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-sage-800 rounded-full"></div>}
                      </button>
                      <button 
                        onClick={() => {
                          const hasMassageSelection = cart.some(item => {
                            const selectedCourse = COURSES.find(course => course.id === item.courseId);
                            return selectedCourse && selectedCourse.category !== '健身預約';
                          });
                          if (hasMassageSelection) {
                            setConfirmAction({
                              message: '您要先清除本頁面的預約嗎？',
                              confirmLabel: '是，前往另一個預約',
                              cancelLabel: '否，我要先繼續完成本預約',
                              onConfirm: () => {
                                setCart([]);
                                setFitnessPlan('無');
                                setFitnessPlanPrice(0);
                                setDate('');
                                setTime('');
                                setTherapistPref('不指定');
                                setPromotionCodeInput('');
                                setPromotionCodeStatus('idle');
                                setPromotionName('');
                                setPromotionDiscountInput('');
                                setSelectedPromotion(null);
                                setGratitudeInput('');
                                setFrontendTab('fitness');
                                setConfirmAction(null);
                              }
                            });
                            return;
                          }
                          setFrontendTab('fitness');
                          setDate('');
                          setTime('');
                          setTherapistPref('不指定');
                        }} 
                        className={`flex-1 text-center pb-3 pt-1 px-0.5 sm:px-4 ${frontendNavSizingClass} font-bold transition-colors relative whitespace-nowrap ${
                          frontendTab === 'fitness' ? 'text-sage-800' : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        健身預約
                        {frontendTab === 'fitness' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-sage-800 rounded-full"></div>}
                      </button>
                      <button 
                        onClick={() => setFrontendTab('upcoming')} 
                        className={`flex-1 text-center pb-3 pt-1 px-0.5 sm:px-4 ${frontendNavSizingClass} font-bold transition-colors relative whitespace-nowrap ${
                          frontendTab === 'upcoming' ? 'text-sage-800' : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        近期預約
                        {frontendTab === 'upcoming' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-sage-800 rounded-full"></div>}
                      </button>
                      <button 
                        onClick={() => setFrontendTab('history')} 
                        className={`flex-1 text-center pb-3 pt-1 px-0.5 sm:px-4 ${frontendNavSizingClass} font-bold transition-colors relative whitespace-nowrap ${
                          frontendTab === 'history' ? 'text-sage-800' : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        消費紀錄
                        {frontendTab === 'history' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-sage-800 rounded-full"></div>}
                      </button>
                    </div>

                    {/* TAB 0: VENUE BOOKING */}
                    {frontendTab === 'venue' && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                          {/* Left column: Date & Time selector */}
                          <div className="lg:col-span-7 space-y-6">
                            {/* 1. Date Selector */}
                            <section className="bg-white border border-sage-100 p-5 rounded-2xl shadow-sm">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <h3 className="text-base sm:text-lg text-sage-900 font-bold flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                  <span className="whitespace-nowrap">選擇預約日期</span>
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => setShowVenueNotice(prev => !prev)}
                                  className="shrink-0 inline-flex items-center gap-1.5 py-1 text-[12px] sm:text-[13px] font-bold text-sage-700 hover:text-sage-900 transition-colors"
                                >
                                  預約說明
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showVenueNotice ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                              {showVenueNotice && (
                                <BookingHint title="場地提醒" className="mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                  請依序選擇租用日期、時段與按摩場地。若該時段已有預約，場地選單會標示「已約」，請改選其他時段或空間。
                                </BookingHint>
                              )}
                              <div className="mb-4 flex items-center gap-1.5 text-[12px] min-[375px]:text-[13px] sm:text-sm font-bold text-stone-500">
                                <CalendarIcon className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                                <span>開放本月與次月所有日期預約</span>
                              </div>

                              {/* Venue Custom Calendar */}
                              {(() => {
                                const today = new Date();
                                const currentYear = venueViewMonth.getFullYear();
                                const currentMonth = venueViewMonth.getMonth();
                                
                                const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                                const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                                
                                const isMinMonth = currentYear === minMonth.getFullYear() && currentMonth === minMonth.getMonth();
                                const isMaxMonth = currentYear === maxMonth.getFullYear() && currentMonth === maxMonth.getMonth();

                                const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
                                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                                const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
                                
                                const days = [];
                                for (let i = 0; i < startingDayOfWeek; i++) {
                                  days.push(<div key={`empty-${i}`} className="h-10 sm:h-12"></div>);
                                }
                                
                                for (let d = 1; d <= daysInMonth; d++) {
                                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                  
                                  const checkPast = new Date(currentYear, currentMonth, d, 23, 59, 59);
                                  const isPast = checkPast < today;
                                  const isSelected = venueDate === dateStr;
                                  
                                  days.push(
                                    <button
                                      key={d}
                                      type="button"
                                      disabled={isPast}
                                      onClick={() => { setVenueDate(dateStr); setVenueTime(''); }}
                                      className={`h-10 sm:h-12 w-full flex items-center justify-center rounded-xl text-sm sm:text-base font-bold transition-all duration-150 ${
                                        isSelected 
                                          ? 'bg-sage-800 text-white shadow-sm scale-105 z-10' 
                                          : isPast 
                                            ? 'text-stone-300 cursor-not-allowed opacity-40'
                                            : 'bg-white text-stone-700 border border-sage-200 hover:border-sage-400'
                                      }`}
                                    >
                                      {d}
                                    </button>
                                  );
                                }
                                
                                return (
                                  <div className="bg-sage-50/40 p-3 sm:p-4 rounded-2xl border border-sage-100">
                                    <div className="flex items-center justify-between mb-4">
                                      <button 
                                        type="button"
                                        disabled={isMinMonth}
                                        onClick={() => {
                                          const prev = new Date(venueViewMonth);
                                          prev.setMonth(prev.getMonth() - 1);
                                          setVenueViewMonth(prev);
                                        }}
                                        className={`p-2 rounded-full transition-colors border border-transparent ${
                                          isMinMonth ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white hover:border-sage-200'
                                        }`}
                                      >
                                        <ChevronLeft className="w-4 h-4 text-stone-600" />
                                      </button>
                                      <span className="font-bold text-sage-900 text-sm sm:text-base bg-white px-5 py-1.5 rounded-full border border-sage-100 shadow-sm font-sans">
                                        {currentYear}年 {currentMonth + 1}月
                                      </span>
                                      <button 
                                        type="button"
                                        disabled={isMaxMonth}
                                        onClick={() => {
                                          const next = new Date(venueViewMonth);
                                          next.setMonth(next.getMonth() + 1);
                                          setVenueViewMonth(next);
                                        }}
                                        className={`p-2 rounded-full transition-colors border border-transparent ${
                                          isMaxMonth ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white hover:border-sage-200'
                                        }`}
                                      >
                                        <ChevronRight className="w-4 h-4 text-stone-600" />
                                      </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                      {['一', '二', '三', '四', '五', '六', '日'].map(w => (
                                        <div key={w} className="text-[10px] sm:text-xs font-bold text-sage-500 uppercase tracking-wider py-1 font-sans">
                                          {w}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                      {days}
                                    </div>

                                    {venueDate && (
                                      <div className="mt-4 p-2.5 bg-sage-800 text-white text-xs sm:text-sm rounded-xl flex items-center justify-center font-bold font-sans">
                                        已選擇場地日期：{venueDate.replace(/-/g, '/')} ({getWeekDay(venueDate)})
                                      </div>
                                    )}
                                    {!venueDate && (
                                      <p className="text-[11px] text-stone-400 text-center mt-3 font-medium">＊點選日曆中的日期以進行下一步。</p>
                                    )}
                                  </div>
                                );
                              })()}
                            </section>

                            {/* 2. Time Selector */}
                            {venueDate && (
                              <section className="bg-white border border-sage-100 p-5 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-base sm:text-lg text-sage-900 font-bold flex items-center gap-2 mb-2">
                                  <span className="w-5 h-5 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center text-xs font-bold">2</span>
                                  選擇預約時間
                                </h3>
                                <p className="text-xs text-stone-500 mb-4 font-medium leading-relaxed bg-sage-50/50 p-2.5 rounded-lg">
                                  ＊提供 10:00 至 21:30 所有時段供您預約。
                                </p>

                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                  {ALL_TIME_SLOTS.map(t => {
                                    const now = new Date();
                                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                    const isPast = venueDate === todayStr && timeToMins(t) < (now.getHours() * 60 + now.getMinutes());
                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        disabled={isPast}
                                        onClick={() => { setVenueTime(t); setVenueRoom(''); }}
                                        className={`py-2 text-sm rounded-xl border transition-all duration-200 flex flex-col items-center justify-center font-bold ${
                                          venueTime === t 
                                            ? 'bg-sage-800 text-white border-sage-800 shadow-sm' 
                                            : isPast
                                              ? 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed opacity-60'
                                              : 'bg-white text-stone-700 border-sage-200 hover:border-sage-400' 
                                        }`}
                                      >
                                        <span className="font-sans text-sm">{t}</span>
                                        {isPast && <span className="text-[9px] mt-0.5 font-medium">已過時</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </section>
                            )}
                          </div>

                          {/* Right column: Venue Selection & Summary & Confirm */}
                          <div className="lg:col-span-5 space-y-6">
                            {venueDate && venueTime ? (
                              <section className="bg-white border border-sage-100 p-5 rounded-2xl shadow-sm animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
                                <h3 className="text-base sm:text-lg text-sage-900 font-bold flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center text-xs font-bold">3</span>
                                  場地與時長設定
                                </h3>

                                {/* Duration Selector */}
                                <div className="space-y-1.5">
                                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">租借時長</label>
                                  <select
                                    value={venueDuration}
                                    onChange={(e) => {
                                      setVenueDuration(Number(e.target.value));
                                      setVenueRoom('');
                                    }}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-sage-500 outline-none transition font-medium text-sm text-stone-700 font-sans"
                                  >
                                    <option value={60}>60 分鐘 (1小時) - NT$ 300</option>
                                    <option value={90}>90 分鐘 (1.5小時) - NT$ 450</option>
                                    <option value={120}>120 分鐘 (2小時) - NT$ 600</option>
                                    <option value={150}>150 分鐘 (2.5小時) - NT$ 750</option>
                                    <option value={180}>180 分鐘 (3小時) - NT$ 900</option>
                                    <option value={210}>210 分鐘 (3.5小時) - NT$ 1050</option>
                                    <option value={240}>240 分鐘 (4小時) - NT$ 1200</option>
                                    <option value={270}>270 分鐘 (4.5小時) - NT$ 1350</option>
                                    <option value={300}>300 分鐘 (5小時) - NT$ 1500</option>
                                    <option value={330}>330 分鐘 (5.5小時) - NT$ 1650</option>
                                    <option value={360}>360 分鐘 (6小時) - NT$ 1800</option>
                                  </select>
                                </div>

                                {/* Room Selection with Occupancy indicator */}
                                <div className="space-y-1.5">
                                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">選擇按摩場地</label>
                                  <select
                                    value={venueRoom}
                                    onChange={(e) => setVenueRoom(e.target.value as any)}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-sage-500 outline-none transition font-bold text-sm text-stone-700 font-sans"
                                  >
                                    <option value="">-- 請選擇場地 --</option>
                                    {['ZEN1', 'ZEN2', 'SPA1', 'SPA2'].map(room => {
                                      const booked = isVenueBooked(room, venueDate, venueTime, venueDuration);
                                      return (
                                        <option key={room} value={room} disabled={booked} className={booked ? "text-stone-400 font-normal bg-stone-50 font-sans" : "text-stone-800 font-bold font-sans"}>
                                          {room} {booked ? ' (已約)' : ' (可選)'}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                {/* Rental Note */}
                                <div className="space-y-1.5">
                                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">預約備註 (選填)</label>
                                  <textarea
                                    value={venueNote}
                                    onChange={(e) => setVenueNote(e.target.value)}
                                    placeholder="例如：租借用途、預估人數、特殊器材需求等..."
                                    rows={3}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-sage-500 outline-none transition text-sm text-stone-700 font-sans"
                                  />
                                </div>

                                {/* Summary Panel */}
                                {venueRoom && (
                                  <div className="bg-sage-50 p-4 rounded-xl border border-sage-100 text-stone-700 text-xs sm:text-sm space-y-2.5">
                                    <h4 className="font-bold text-sage-900 border-b border-sage-200/60 pb-1.5 font-sans">場地預約資訊摘要</h4>
                                    <div className="space-y-1.5 font-medium font-sans">
                                      <div className="flex justify-between">
                                        <span className="text-stone-500 font-sans">預約日期：</span>
                                        <span className="font-bold text-stone-900">{venueDate} ({getWeekDay(venueDate)})</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-stone-500 font-sans">預約時間：</span>
                                        <span className="font-bold text-stone-900">{venueTime} ~ {minsToTime(timeToMins(venueTime) + venueDuration)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-stone-500 font-sans">租借時長：</span>
                                        <span className="font-bold text-stone-900">{venueDuration} 分鐘</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-stone-500 font-sans">租借空間：</span>
                                        <span className="font-bold text-sage-800 bg-sage-100 px-2 py-0.5 rounded font-bold text-xs">{venueRoom}</span>
                                      </div>
                                      <div className="border-t border-sage-200/60 my-1 pt-1.5 text-xs">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-stone-500 font-sans">租費計算：</span>
                                          <span className="text-stone-600 font-sans font-medium">每 30 分鐘 150 元 (起租 60 分鐘)</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-stone-500 font-sans">計算公式：</span>
                                          <span className="text-stone-600">({venueDuration} 分鐘 ÷ 30) × 150 元</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1 font-bold">
                                          <span className="text-stone-800 font-sans">租用金額：</span>
                                          <span className="text-sage-800 text-sm font-sans">NT$ {(venueDuration / 30) * 150} 元</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="border-l-2 border-sage-500 bg-white/70 px-3 py-2.5 rounded-r-lg text-[12px] sm:text-[13px] leading-relaxed text-stone-600">
                                      <span className="font-bold text-sage-900">✦ 付款與改期提醒：</span>
                                      預約場地需先完成 LINE Pay 付款。若行程有變，最晚可於預約前 1 小時在線上直接取消或改期；若遇臨時突發狀況，請直接來電，我們會協助為您重新安排，請放心預約！
                                    </div>
                                  </div>
                                )}

                                {/* Action Button */}
                                <button
                                  type="button"
                                  onClick={handleBookVenue}
                                  disabled={!venueRoom || isVenuePaying}
                                  className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 shadow-sm ${
                                    venueRoom && !isVenuePaying
                                      ? 'bg-sage-800 text-white hover:bg-sage-700 hover:shadow-md' 
                                      : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/50'
                                  }`}
                                >
                                  {isVenuePaying ? '正在連接 LINE Pay…' : '使用 LINE Pay 付款並預約場地'}
                                </button>
                              </section>
                            ) : (
                              <div className="bg-sage-50/50 border border-dashed border-sage-200 p-8 text-center rounded-2xl text-stone-400 text-sm font-medium whitespace-nowrap">
                                請先選擇欲預約的【日期及時段】
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 1: BEGIN BOOKING FLOW */}
                    {frontendTab === 'booking' && (
                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                        
                        {/* Left Side selectors (Therapist, Date, Course) */}
                        <div className="xl:col-span-7 space-y-6">
                          <BookingNotice kind="massage" expanded={showMassageNotice} onToggle={() => setShowMassageNotice(prev => !prev)} />
                          
                          {/* 1. Therapist preference selector */}
                          <section className="bg-white border border-sage-100 p-4 sm:p-5 rounded-2xl shadow-sm">
                            <h3 className="text-[18px] sm:text-xl text-sage-950 font-black flex items-center gap-2.5 mb-2">
                              <span className="w-6 h-6 rounded-full bg-sage-200 text-sage-900 flex items-center justify-center text-sm font-black">1</span>
                              選擇按摩師
                            </h3>
                            <BookingHint title="">
                              如選擇「不指定」、「男即可」或「女即可」，店家將為您推薦最適合的按摩師。
                            </BookingHint>
                            
                            <div className="space-y-4">
                              {/* Quick flexible options */}
                              <div className="grid grid-cols-3 gap-2">
                                {['不指定按摩師', '男按摩師即可', '女按摩師即可'].map(t => {
                                  const available = isTherapistAvailable(t);
                                  const isSelected = therapistPref === t;
                                  return (
                                    <button 
                                      key={t}
                                      type="button"
                                      disabled={!available}
                                      onClick={() => setTherapistPref(t as TherapistPreference)}
                                      className={`py-3.5 px-1.5 text-[14px] sm:text-base rounded-xl border transition-all duration-200 text-center relative font-bold ${
                                        isSelected 
                                          ? 'bg-sage-800 text-white border-sage-800 shadow-sm' 
                                          : available
                                            ? 'bg-white text-stone-700 border-sage-200 hover:border-sage-400 hover:bg-sage-50/20' 
                                            : 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed'
                                      }`}
                                    >
                                      <span>{t.replace('按摩師', '')}</span>
                                      {(date && time && available && !isSelected) && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Male & Female Dropdowns */}
                              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                                <StaffPicker
                                  label="男按摩師"
                                  placeholder="選擇男按摩師"
                                  value={maleMassageTherapists.includes(therapistPref) ? therapistPref : ''}
                                  open={openStaffMenu === 'maleMassage'}
                                  onToggle={() => setOpenStaffMenu(current => current === 'maleMassage' ? null : 'maleMassage')}
                                  onSelect={name => { setTherapistPref(name as TherapistPreference); setOpenStaffMenu(null); }}
                                  emptyMessage="暫無男按摩師服務"
                                  labelClassName="!text-[15px] sm:!text-base"
                                  options={(hasMaleMassageServiceThisMonth ? maleMassageTherapists : []).map(name => {
                                    const available = isTherapistAvailable(name);
                                    const isSelf = member?.therapistName === name;
                                    const note = isSelf ? '無法預約自己' : date && time && !available ? (name === 'Mark' && hasOilCourse ? '不提供油推' : '該時段已約滿') : '點選指定按摩師';
                                    return { name, disabled: !available || isSelf, note };
                                  })}
                                />
                                <StaffPicker
                                  label="女按摩師"
                                  placeholder="選擇女按摩師"
                                  value={femaleMassageTherapists.includes(therapistPref) ? therapistPref : ''}
                                  open={openStaffMenu === 'femaleMassage'}
                                  onToggle={() => setOpenStaffMenu(current => current === 'femaleMassage' ? null : 'femaleMassage')}
                                  onSelect={name => { setTherapistPref(name as TherapistPreference); setOpenStaffMenu(null); }}
                                  emptyMessage="暫無女按摩師服務"
                                  labelClassName="!text-[15px] sm:!text-base"
                                  options={(hasFemaleMassageServiceThisMonth ? femaleMassageTherapists : []).map(name => {
                                    const available = isTherapistAvailable(name);
                                    const isSelf = member?.therapistName === name;
                                    const note = isSelf ? '無法預約自己' : date && time && !available ? (hasFemaleExclusive && name !== 'Kelly' ? '此療程限指定按摩師' : '該時段已約滿') : '點選指定按摩師';
                                    return { name, disabled: !available || isSelf, note };
                                  })}
                                />
                              </div>

                              {/* Selected Therapist Bio & Photo Row */}
                              {THERAPIST_DETAILS[therapistPref] && (() => {
                                const t = THERAPIST_DETAILS[therapistPref];
                                return (
                                  <div className="customer-profile-card p-4 bg-sage-50/40 border border-sage-100/70 rounded-xl flex flex-col md:flex-row gap-4 items-center md:items-start animate-fadeIn mt-4">
                                    <img 
                                      src={t.imageUrl} 
                                      alt={t.name}
                                      referrerPolicy="no-referrer"
                                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-sm border border-white shrink-0"
                                    />
                                    <div className="flex-1 text-center md:text-left space-y-2">
                                      <div className="flex flex-col md:flex-row md:items-baseline gap-2">
                                        <span className="customer-profile-name text-base font-bold text-sage-900">{t.name}</span>
                                        <span className="customer-profile-title text-xs text-sage-600 font-medium">{t.title}</span>
                                      </div>
                                      <div className="flex flex-wrap justify-center md:justify-start gap-1">
                                        {t.specialties.map((spec, idx) => (
                                          <span key={idx} className="customer-profile-specialty px-2 py-0.5 bg-sage-100 text-sage-800 rounded-full text-[10px] font-bold">
                                            ✦ {spec}
                                          </span>
                                        ))}
                                      </div>
                                      <p className="customer-profile-bio text-xs text-stone-500 leading-relaxed font-medium">
                                        {t.bio}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </section>

                          {/* 2. Date and Time Calendar selector */}
                          <section className="bg-white border border-sage-100 p-4 sm:p-5 rounded-2xl shadow-sm">
                            <h3 className="text-[18px] sm:text-xl text-sage-950 font-black flex items-center gap-2.5 mb-2">
                              <span className="w-6 h-6 rounded-full bg-sage-200 text-sage-900 flex items-center justify-center text-sm font-black">2</span>
                              預約日期與時間
                            </h3>
                            <div className="hidden mb-4 text-stone-600 leading-relaxed font-medium">
                              <button
                                type="button"
                                onClick={() => setShowMassageNotice(prev => !prev)}
                                className="w-full min-h-[38px] rounded-md bg-sage-50 border border-sage-200 px-2.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-sage-100 transition"
                              >
                                <span className="min-w-0 flex items-center gap-2">
                                  <span className="font-black text-sage-900 text-xs sm:text-sm whitespace-nowrap">按摩課預約須知</span>
                                  <span className="rounded-md border border-rose-200/70 bg-rose-50/80 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-rose-700/80 whitespace-nowrap">初次預約請詳閱</span>
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-sage-700 transition-transform ${showMassageNotice ? 'rotate-180' : ''}`} />
                              </button>

                              {showMassageNotice && (
                                <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                                  <p className="rounded-lg bg-white/70 border border-stone-100 px-3 py-2 text-[11px] sm:text-xs text-stone-600 leading-relaxed">
                                    為了保障您享有完整、不匆忙的尊寵體驗，並確保在最安全的身體狀態下享受療癒，請您詳閱以下預約與健康須知：
                                  </p>

                                  <div className="rounded-xl bg-white border border-stone-100 p-3 space-y-2.5 text-[11px] sm:text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-sage-50 text-sage-800 flex items-center justify-center text-[10px] font-black">1</span>
                                      <p className="font-black text-stone-900">依課程時數・最晚預約時間</p>
                                    </div>
                                    <p className="text-stone-500">本工作室每日營運至 <strong className="text-stone-800">22:00</strong>，為確保您的施作時間不被壓縮，最晚進場時間如下：</p>
                                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                      <div className="rounded-lg bg-stone-50 border border-stone-100 px-2 py-2 text-center">
                                        <div className="font-black text-stone-800 text-[10px] sm:text-xs">120 分鐘</div>
                                        <div className="font-black text-sage-800 text-[11px] sm:text-sm">20:00</div>
                                      </div>
                                      <div className="rounded-lg bg-stone-50 border border-stone-100 px-2 py-2 text-center">
                                        <div className="font-black text-stone-800 text-[10px] sm:text-xs">60 分鐘</div>
                                        <div className="font-black text-sage-800 text-[11px] sm:text-sm">21:00</div>
                                      </div>
                                      <div className="rounded-lg bg-stone-50 border border-stone-100 px-2 py-2 text-center">
                                        <div className="font-black text-stone-800 text-[10px] sm:text-xs">30 分鐘</div>
                                        <div className="font-black text-sage-800 text-[11px] sm:text-sm">21:30</div>
                                      </div>
                                    </div>
                                    <p className="rounded-lg bg-amber-50/80 border border-amber-100 px-3 py-2 text-amber-950">
                                      <span className="font-black">21:30 限定：</span>僅提供「局部深層油推」、「局部指壓放鬆」、「精準筋膜刀釋放」。
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs">
                                    <div className="rounded-xl bg-white border border-stone-100 p-3">
                                      <p className="font-black text-stone-900 mb-1">📅 開放預約區間</p>
                                      <p>開放「今日起至次月底」之所有時段。</p>
                                    </div>
                                    <div className="rounded-xl bg-white border border-stone-100 p-3">
                                      <p className="font-black text-stone-900 mb-1">🛀 專屬放鬆禮遇</p>
                                      <p>非常歡迎您提早 15 分鐘到店沐浴更衣，並與老師討論今日想加強的部位。</p>
                                    </div>
                                  </div>

                                  <div className="rounded-xl bg-white border border-stone-100 p-3 space-y-2 text-[11px] sm:text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-sage-50 text-sage-800 flex items-center justify-center text-[10px] font-black">2</span>
                                      <p className="font-black text-stone-900">預約變更與取消規範</p>
                                    </div>
                                    <p className="massage-policy-nowrap"><strong className="text-stone-700">時限內取消：</strong>請最遲於<strong className="text-stone-800">課程開始前 1 小時</strong>主動通知工作室。</p>
                                    <p><strong className="text-stone-700">逾時或未到：</strong>課程前 1 小時內臨時取消或無故未到，該堂課程將照常扣課（或依工作室規範收取手續費）。</p>
                                    <p className="massage-policy-nowrap"><strong className="text-stone-700">遲到說明：</strong>課程仍將依原定時間結束，恕無法順延補時。</p>
                                  </div>

                                  <div className="rounded-xl bg-white border border-stone-100 p-3 space-y-2 text-[11px] sm:text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-sage-50 text-sage-800 flex items-center justify-center text-[10px] font-black">3</span>
                                      <p className="font-black text-stone-900">健康安全宣告</p>
                                    </div>
                                    <p>若有以下症狀，<strong className="text-stone-800">請勿預約</strong>或<strong className="text-stone-800">務必於課前主動告知</strong>，由老師評估是否適合施作。</p>
                                    <div className="rounded-lg bg-red-50/70 border border-red-100 px-3 py-2 space-y-1.5 text-red-950">
                                      <p className="font-black">嚴禁按摩之狀況（請改期預約）</p>
                                      <p><strong>發燒、感冒、急性發炎期：</strong>按摩會加速血液循環，可能導致體溫進一步上升或加劇發炎。</p>
                                      <p><strong>傳染性皮膚病、開放性傷口：</strong>包含帶狀皰疹、嚴重濕疹、蜂窩性組織炎或未癒合的傷口。</p>
                                      <p><strong>剛動完手術或骨折未癒合：</strong>骨骼、韌帶或手術傷口尚未完全穩固者。</p>
                                      <p><strong>剛飲酒過量者：</strong>極易造成神經系統過度反應、暈眩或身體不適。</p>
                                    </div>
                                    <div className="rounded-lg bg-amber-50/70 border border-amber-100 px-3 py-2 space-y-1.5 text-amber-950">
                                      <p className="font-black">需特別注意並提前告知之狀況</p>
                                      <p><strong>飲食時間：</strong>飯後請<strong>間隔至少 1 小時</strong>，避免空腹或過度飽食前來。</p>
                                      <p><strong>慢性疾病與特殊生理期：</strong>高血壓、心臟病、嚴重骨質疏鬆、懷孕初期/後期，或經期量多時請提早告知。</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              {/* Custom Calendar Render */}
                              {(() => {
                                const today = new Date();
                                const currentYear = viewMonth.getFullYear();
                                const currentMonth = viewMonth.getMonth();
                                
                                const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                                const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                                
                                const isMinMonth = currentYear === minMonth.getFullYear() && currentMonth === minMonth.getMonth();
                                const isMaxMonth = currentYear === maxMonth.getFullYear() && currentMonth === maxMonth.getMonth();

                                const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
                                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                                const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
                                
                                const days = [];
                                for (let i = 0; i < startingDayOfWeek; i++) {
                                  days.push(<div key={`empty-${i}`} className="h-10 sm:h-12"></div>);
                                }
                                
                                for (let d = 1; d <= daysInMonth; d++) {
                                  const dateObj = new Date(currentYear, currentMonth, d);
                                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                  const isPast = new Date(currentYear, currentMonth, d, 23, 59, 59) < today;
                                  const isAvailable = isDayAvailable(dateStr, availabilities, therapistPref, member?.id);
                                  const isSelected = date === dateStr;
                                  
                                  days.push(
                                    <button
                                      key={d}
                                      type="button"
                                      disabled={isPast || !isAvailable}
                                      onClick={() => { setDate(dateStr); setTime(''); }}
                                      className={`h-10 sm:h-12 w-full flex items-center justify-center rounded-xl text-sm sm:text-base font-bold transition-all duration-150 ${
                                        isSelected 
                                          ? 'bg-sage-800 text-white shadow-sm scale-105 z-10' 
                                          : isPast 
                                            ? 'text-stone-300 cursor-not-allowed opacity-40'
                                            : isAvailable 
                                              ? 'bg-white text-stone-700 border border-sage-200 hover:border-sage-400'
                                              : 'bg-stone-50 text-stone-300 cursor-not-allowed border border-dashed border-stone-200'
                                      }`}
                                    >
                                      {d}
                                    </button>
                                  );
                                }
                                
                                return (
                                  <div className="bg-sage-50/40 p-3 sm:p-4 rounded-2xl border border-sage-100">
                                    <div className="flex items-center justify-between mb-4">
                                      <button 
                                        type="button"
                                        disabled={isMinMonth}
                                        onClick={() => {
                                          const prev = new Date(viewMonth);
                                          prev.setMonth(prev.getMonth() - 1);
                                          setViewMonth(prev);
                                        }}
                                        className={`p-2 rounded-full transition-colors border border-transparent ${
                                          isMinMonth ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white hover:border-sage-200'
                                        }`}
                                      >
                                        <ChevronLeft className="w-4 h-4 text-stone-600" />
                                      </button>
                                      <span className="font-bold text-sage-900 text-sm sm:text-base bg-white px-5 py-1.5 rounded-full border border-sage-100 shadow-sm font-sans">
                                        {currentYear}年 {currentMonth + 1}月
                                      </span>
                                      <button 
                                        type="button"
                                        disabled={isMaxMonth}
                                        onClick={() => {
                                          const next = new Date(viewMonth);
                                          next.setMonth(next.getMonth() + 1);
                                          setViewMonth(next);
                                        }}
                                        className={`p-2 rounded-full transition-colors border border-transparent ${
                                          isMaxMonth ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white hover:border-sage-200'
                                        }`}
                                      >
                                        <ChevronRight className="w-4 h-4 text-stone-600" />
                                      </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                      {['一', '二', '三', '四', '五', '六', '日'].map(w => (
                                        <div key={w} className="text-[10px] sm:text-xs font-bold text-sage-500 uppercase tracking-wider py-1 font-sans">
                                          {w}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                      {days}
                                    </div>

                                    {date && (
                                      <div className="mt-4 p-2.5 bg-sage-800 text-white text-xs sm:text-sm rounded-xl flex items-center justify-center font-bold animate-in fade-in slide-in-from-bottom-1 font-sans">
                                        已選擇預約日期：{date.replace(/-/g, '/')} ({getWeekDay(date)})
                                      </div>
                                    )}
                                    {!date && (
                                      <p className="text-[11px] text-stone-400 text-center mt-3 font-medium">＊點選上方日曆中的日期以選擇開始時間。</p>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Time slots grid (no scroll) */}
                              {date && (
                                <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in zoom-in-95 duration-200">
                                  {ALL_TIME_SLOTS.map(t => {
                                    // Only the selected slot is evaluated against the full treatment duration.
                                    // Other cells retain their own base 30-minute availability state.
                                    const evaluationDuration = time === t ? Math.max(30, totalDuration) : 30;
                                    const slotInfo = getDetailedSlotStatus(date, t, evaluationDuration, allOrders, member?.id, therapistPref, availabilities, hasOilCourse, hasFemaleExclusive);
                                    const status = slotInfo.status;
                                    const available = status === 'available';
                                    const availableTherapists = slotInfo.availableTherapists;
                                    const bookedTherapist = slotInfo.bookedTherapist;
                                    const slotStartMins = timeToMins(t);
                                    const hasLaterBookingConflict = !!bookedTherapist && allOrders.some(order => {
                                      if (order.date !== date || order.status === 'cancelled' || order.therapistPreference !== bookedTherapist) return false;
                                      const orderStartMins = timeToMins(order.time || '00:00');
                                      return orderStartMins > slotStartMins && orderStartMins < slotStartMins + Math.max(30, totalDuration);
                                    });
                                    const canInspectDurationConflict = status === 'fully_booked' && hasLaterBookingConflict;
                                    const selectedDurationConflict = time === t && canInspectDurationConflict;
                                    const selectable = available || canInspectDurationConflict;
                                    
                                    return (
                                      <button
                                        key={t}
                                        disabled={!selectable}
                                        onClick={() => setTime(t)}
                                        className={`py-3 text-sm rounded-xl border transition-all duration-200 flex flex-col items-center justify-center font-bold ${
                                          selectedDurationConflict
                                            ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm'
                                            : time === t 
                                            ? 'bg-sage-800 text-white border-sage-800 shadow-sm' 
                                            : available 
                                              ? 'bg-white text-stone-700 border-sage-200 hover:border-sage-400' 
                                              : 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed opacity-60'
                                        }`}
                                      >
                                        <span className="font-sans text-sm leading-tight">{t}</span>
                                        {available && !selectedDurationConflict && (
                                          <span className={`text-[10.5px] sm:text-[11.5px] mt-0.5 font-semibold leading-tight ${
                                            time === t ? 'text-sage-100' : 'text-emerald-600'
                                          }`}>
                                            {therapistPref && therapistPref !== '不指定按摩師' && !therapistPref.includes('即可')
                                              ? '可預約' 
                                              : availableTherapists.length > 0 
                                                ? <span className={`grid ${availableTherapists.length === 1 ? 'grid-cols-1 justify-items-center' : 'grid-cols-2'} gap-x-1.5 gap-y-0.5 text-center`}>{availableTherapists.map(name => <span key={name}>{name}</span>)}</span>
                                                : '可預約'}
                                          </span>
                                        )}
                                        {(!available || selectedDurationConflict) && (
                                          <span className={`text-[9px] mt-0.5 font-medium ${
                                            selectedDurationConflict || status === 'exceeds_shift' ? 'text-amber-600/95 font-semibold' : 'text-stone-300'
                                          }`}>
                                            {selectedDurationConflict
                                              ? '時長不足'
                                              : status === 'exceeds_shift' 
                                              ? '時段未開放' 
                                              : status === 'past' 
                                                ? '時間已過' 
                                                : bookedTherapist 
                                                  ? `已約: ${bookedTherapist}` 
                                                  : '已約滿'}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </section>

                          {/* 3. Course selection list */}
                          <section className="bg-white border border-sage-100 p-4 sm:p-5 rounded-2xl shadow-sm">
                            <h3 className="text-[18px] sm:text-xl text-sage-950 font-black flex items-center gap-2.5 mb-2">
                              <span className="w-6 h-6 rounded-full bg-sage-200 text-sage-900 flex items-center justify-center text-sm font-black">3</span>
                              <span className="min-w-0">
                                <span className="block">按摩預約</span>
                              </span>
                            </h3>
                            <BookingHint title="">
                              <p className="whitespace-nowrap text-[12px] min-[360px]:text-[13px] min-[390px]:text-[13.5px] sm:text-[15px]">療程可複選，單次按摩服務時長最多 3 小時。</p>
                              <p className="text-[12px] min-[360px]:text-[13px] min-[390px]:text-[13.5px] sm:text-[15px]">選擇後會加入下方的今日預約明細。</p>
                            </BookingHint>
                            
                            {/* Mobile: category-first selection keeps labels and prices readable. */}
                            <div className="sm:hidden space-y-2" data-booking-course-menu>
                              <div className="grid grid-cols-3 gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
                                {(['全身療程', '局部療程', '加購療程'] as const).map(category => (
                                  <button
                                    key={category}
                                    type="button"
                                    onClick={() => {
                                      setActiveMassageCourseCategory(category);
                                      setOpenMassageCourseCategory(current => current === category ? null : category);
                                    }}
                                    className={`h-10 min-h-0 rounded-md px-1 text-[14px] font-black transition ${activeMassageCourseCategory === category ? 'bg-sage-800 text-white shadow-sm' : 'text-stone-600 hover:bg-white'}`}
                                  >
                                    {category}
                                  </button>
                                ))}
                              </div>
                              <div>
                                <MassageCoursePicker
                                  category={activeMassageCourseCategory}
                                  expanded={openMassageCourseCategory === activeMassageCourseCategory}
                                  onToggle={() => setOpenMassageCourseCategory(current => current === activeMassageCourseCategory ? null : activeMassageCourseCategory)}
                                  onSelect={courseId => {
                                    addToCart(courseId);
                                    setOpenMassageCourseCategory(null);
                                  }}
                                  therapistPreference={therapistPref}
                                  selectedCourseIds={cart.map(item => item.courseId)}
                                  showTrigger={false}
                                />
                              </div>
                            </div>

                            {/* Tablet and desktop: compare all three categories side by side. */}
                            <div className="massage-course-grid hidden sm:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.18fr)] gap-1.5 sm:gap-2">
                              {/* 全身療程 */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] sm:text-sm font-black text-stone-600 pl-0.5">全身療程</label>
                                <MassageCoursePicker
                                  category="全身療程"
                                  expanded={openMassageCourseCategory === '全身療程'}
                                  onToggle={() => setOpenMassageCourseCategory(current => current === '全身療程' ? null : '全身療程')}
                                  onSelect={courseId => { addToCart(courseId); setOpenMassageCourseCategory(null); }}
                                  therapistPreference={therapistPref}
                                  selectedCourseIds={cart.map(item => item.courseId)}
                                />
                              </div>

                              {/* 局部療程 */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] sm:text-sm font-black text-stone-600 pl-0.5">局部療程</label>
                                <MassageCoursePicker
                                  category="局部療程"
                                  expanded={openMassageCourseCategory === '局部療程'}
                                  onToggle={() => setOpenMassageCourseCategory(current => current === '局部療程' ? null : '局部療程')}
                                  onSelect={courseId => { addToCart(courseId); setOpenMassageCourseCategory(null); }}
                                  therapistPreference={therapistPref}
                                  selectedCourseIds={cart.map(item => item.courseId)}
                                />
                              </div>

                              {/* 加購療程 */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] sm:text-sm font-black text-stone-600 pl-0.5">加購療程</label>
                                <MassageCoursePicker
                                  category="加購療程"
                                  expanded={openMassageCourseCategory === '加購療程'}
                                  onToggle={() => setOpenMassageCourseCategory(current => current === '加購療程' ? null : '加購療程')}
                                  onSelect={courseId => { addToCart(courseId); setOpenMassageCourseCategory(null); }}
                                  therapistPreference={therapistPref}
                                  selectedCourseIds={cart.map(item => item.courseId)}
                                />
                              </div>
                            </div>
                          </section>
                        </div>

                        {/* Right Side: Cart明細 Summary panel */}
                        <div className="xl:col-span-5 sticky top-6">
                          <div className="bg-white border border-sage-100 p-5 sm:p-6 rounded-2xl shadow-md space-y-5">
                            <h3 className="text-lg sm:text-xl text-sage-950 font-black border-b border-sage-100 pb-2.5 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 leading-none">
                                <span className="shrink-0 text-[23px] sm:text-[25px] leading-none text-sage-700">✦</span>
                                <span className="leading-none">今日預約明細</span>
                              </span>
                              {cart.length > 0 && (
                                <span className="text-xs text-stone-500 font-normal">
                                  已選 <span className="font-sans text-sage-800 font-bold">{cart.length}</span> 項
                                </span>
                              )}
                            </h3>
                            
                            {cart.length === 0 ? (
                              <div className="py-8 text-center bg-sage-50/30 rounded-xl border border-dashed border-sage-100">
                                <p className="text-sm text-stone-400 font-medium">請在上方選擇療程項目</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* List of selected items - Merged here! */}
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                  {items.map(item => {
                                    const course = COURSES.find(x => x.id === item.courseId);
                                    if (!course) return null;
                                    return (
                                      <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 bg-sage-50/30 px-3 py-2.5 rounded-lg border border-stone-100 shadow-xs">
                                        <div className="min-w-0 flex flex-col gap-0.5">
                                          <span className="text-[11px] sm:text-[12px] leading-tight font-bold text-stone-400">{course.category}</span>
                                          <span className="text-[15px] sm:text-[16px] leading-tight font-black text-stone-800 break-words">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="hidden sm:inline text-xs font-bold text-stone-400 font-sans">{item.duration} 分鐘</span>
                                          <span className="text-[13px] sm:text-sm font-black text-stone-700 font-sans whitespace-nowrap">NT${item.price}</span>
                                          <button 
                                            type="button" 
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-stone-400 hover:text-red-500 transition-colors p-1.5"
                                            title="刪除"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Detail calculations */}
                                <div className="border-t border-stone-200 pt-4 space-y-3 text-[14px] sm:text-[15px] font-medium">
                                  <div className="text-[12px] sm:text-[13px] font-black text-stone-500">預約資訊</div>
                                  {(date && time) && (
                                    <div className="pb-3 border-b border-sage-200/60">
                                      <div className="flex items-start justify-between gap-3 py-0.5 text-stone-600">
                                        <span className="shrink-0">預約日期與時段</span>
                                        <span className="text-right font-bold text-stone-800 font-sans">
                                          {date.replace(/-/g, '/')}({getWeekDay(date)}) {time}~{minsToTime(timeToMins(time) + totalDuration)}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex justify-between items-center py-0.5 text-stone-600">
                                        <span>總服務時長</span>
                                        <span className={`font-bold font-sans ${totalDuration > 180 || (totalDuration > 0 && totalDuration < 30) ? "text-red-500" : "text-stone-800"}`}>{totalDuration} 分鐘</span>
                                      </div>
                                      {time && (() => {
                                        const arriveMins = timeToMins(time) - 15;
                                        const arriveTimeStr = minsToTime(arriveMins < 0 ? 0 : arriveMins);
                                        return (
                                          <div className="mt-2 flex items-start gap-2 border-l-2 border-sage-400 bg-stone-50/80 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-r-lg text-[13px] sm:text-[14px] leading-relaxed text-stone-600">
                                            <span className="shrink-0 text-sage-700 leading-relaxed" aria-hidden="true">✦</span>
                                            <p>
                                              <span className="font-bold text-stone-700">貼心提醒：</span>請於 <strong className="font-sans text-sage-800">{arriveTimeStr}</strong> 提早到店，以便放鬆更衣及享用迎賓花草茶。
                                            </p>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between items-center py-0.5 text-stone-600">
                                    <span>指定技師</span>
                                    <span className="font-bold text-stone-800">{therapistPref}</span>
                                  </div>

                                  {(totalDuration > 180 || (totalDuration > 0 && totalDuration < 30)) && (
                                    <p className="text-[10px] text-red-500 text-right font-medium">※ 單次預約最低30分鐘，最高180分鐘限制</p>
                                  )}

                                  <div className="flex justify-between items-center py-0.5 text-stone-600">
                                    <span>服務小計金額</span>
                                    <span className="font-bold font-sans text-stone-800">NT$ {originalPrice.toLocaleString()}</span>
                                  </div>

                                  {promotionCodeStatus === 'valid' && promotionDiscount > 0 && (
                                    <div className="ml-2 space-y-1.5 border-l-2 border-sage-200 pl-3 py-1 text-stone-600">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="font-bold text-sage-800">優惠｜{promotionName.trim()}</span>
                                        <span className="shrink-0 font-bold font-sans text-sage-700">- NT$ {promotionDiscount.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3 border-t border-stone-200/70 pt-1.5">
                                        <span className="font-bold text-stone-700">折扣後金額</span>
                                        <span className="shrink-0 font-black font-sans text-stone-900">NT$ {Math.max(0, originalPrice - promotionDiscount).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="pt-2 border-t border-stone-200 text-[12px] sm:text-[13px] font-black text-stone-500">折抵方式</div>

                                  {canUseGratitude && availableGratitude > 0 && (
                                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 space-y-1.5">
                                      <div className="flex items-center justify-between gap-3">
                                        <label className="text-[13px] font-black text-emerald-900">使用感謝金</label>
                                        <span className="text-[12px] font-bold text-emerald-700">可用 {availableGratitude.toLocaleString()}元</span>
                                      </div>
                                      <input
                                        type="number"
                                        min="0"
                                        max={availableGratitude}
                                        step="1"
                                        value={gratitudeInput}
                                        onChange={event => setGratitudeInput(event.target.value)}
                                        placeholder="請輸入本次使用金額"
                                        className="h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-[14px] font-bold text-stone-800 outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                  )}

                                  <div className="rounded-lg border border-stone-200 bg-stone-50/70 p-2.5 space-y-2">
                                    <label className="text-[13px] font-black text-stone-700">優惠代碼</label>
                                    <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2">
                                      <input
                                        type="text"
                                        value={promotionCodeInput}
                                        onChange={event => {
                                          setPromotionCodeInput(event.target.value.toUpperCase());
                                          setPromotionCodeStatus('idle');
                                          setPromotionName('');
                                          setPromotionDiscountInput('');
                                          setSelectedPromotion(null);
                                        }}
                                        onKeyDown={event => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            applyPromotionCode();
                                          }
                                        }}
                                        placeholder="請輸入優惠代碼"
                                        autoCapitalize="characters"
                                        className="h-10 min-w-0 rounded-md border border-stone-200 bg-white px-3 text-[14px] font-black uppercase tracking-wide text-stone-800 outline-none focus:border-sage-500"
                                      />
                                      <button type="button" onClick={applyPromotionCode} disabled={!promotionCodeInput.trim()} className="h-10 rounded-md bg-sage-800 px-3 text-[13px] font-black text-white transition hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-40">套用</button>
                                    </div>
                                    {promotionCodeStatus === 'invalid' && <p className="text-[12px] font-bold text-rose-600">優惠代碼無效，請重新確認。</p>}
                                    {promotionCodeStatus === 'valid' && <p className="text-[12px] font-bold text-emerald-700">已套用：{promotionName}，本次折抵 {promotionDiscount.toLocaleString()} 元</p>}
                                  </div>

                                  {memberDiscountAmount > 0 && (
                                    <div className="space-y-1 bg-green-50/50 p-2.5 rounded-lg border border-green-100 text-green-700">
                                      <div className="flex justify-between items-center">
                                        <span>尊爵會員折抵 (首時後半價)</span>
                                        <span className="font-bold font-sans">- NT$ {memberDiscountAmount.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  )}

                                  {gratitudeDiscount > 0 && (
                                    <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 text-emerald-800">
                                      <span className="font-bold">感謝金折抵</span>
                                      <span className="font-black font-sans">- NT$ {gratitudeDiscount.toLocaleString()}</span>
                                    </div>
                                  )}

                                  <div className="mt-1 rounded-lg border border-sage-200 bg-sage-50 px-3.5 py-3 flex justify-between items-end">
                                    <span className="font-black text-stone-700 text-[14px]">應付總計</span>
                                    <span className="text-[22px] sm:text-2xl leading-none font-black text-sage-900 font-sans">NT$ {finalPrice.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Validation and instruction feedback panel */}
                                <div className="animate-fadeIn">
                                  {totalDuration > 180 ? (
                                    <div className="border-l-4 border-red-400 bg-stone-50 px-3.5 py-3 flex items-start gap-2.5 text-red-800 text-[13px] font-semibold leading-[1.6]">
                                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                                      <div>
                                        <p className="font-bold text-red-800">超過預約時長上限！</p>
                                        <p className="text-red-600 font-medium">單次預約按摩療程最高上限為 3 小時 (180 分鐘)，目前已達 {totalDuration} 分鐘。請刪除部分項目後再送出。</p>
                                      </div>
                                    </div>
                                  ) : totalDuration > 0 && totalDuration < 30 ? (
                                    <div className="border-l-4 border-red-400 bg-stone-50 px-3.5 py-3 flex items-start gap-2.5 text-red-800 text-[13px] font-semibold leading-[1.6]">
                                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                                      <div>
                                        <p className="font-bold text-red-800">預約時長不足！</p>
                                        <p className="text-red-600 font-medium">單次預約按摩療程最低時長為 30 分鐘，目前僅 {totalDuration} 分鐘。請加選療程項目後再送出。</p>
                                      </div>
                                    </div>
                                  ) : !date || !time ? (
                                    <div className="border-l-4 border-amber-400 bg-stone-50 px-3.5 py-3 flex items-start gap-2.5 text-amber-950 text-[13px] font-semibold leading-[1.6]">
                                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                                      <div className="space-y-1">
                                        <p className="font-black text-[14px] sm:text-[15px] text-stone-900">尚未完成預約時間設定</p>
                                        <p className="text-[13px] sm:text-sm font-bold text-stone-600 leading-relaxed">
                                          請先至「1. 指定按摩師」與「2. 選擇預約日期與時間」進行選擇，確認有可預約時段後，即可完成預約，謝謝您。
                                        </p>
                                      </div>
                                    </div>
                                  ) : totalDuration > maxAvailableMins ? (
                                    <div className="border-l-4 border-red-400 bg-stone-50 px-3.5 py-3 flex items-start gap-2.5 text-red-800 text-[13px] font-semibold leading-[1.6]">
                                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                                      <div>
                                        <p className="font-bold text-red-800">超出該時段可用時長上限！</p>
                                        <p className="text-red-600 font-medium">
                                          抱歉！您選擇的時段（搭配指定按摩師），目前最多僅剩下 {maxAvailableMins} 分鐘 ({maxAvailableMins / 60} 小時) 的空閒服務時間，但您的療程總時長為 {totalDuration} 分鐘。請刪除部分項目或更換預約時段/按摩師。
                                        </p>
                                      </div>
                                    </div>
                                  ) : maxAvailableMins < 180 ? (
                                    <div className="border-l-4 border-amber-400 bg-stone-50 px-3.5 py-3 flex items-start gap-2.5 text-amber-900 text-[13px] font-semibold leading-[1.6]">
                                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                                      <div>
                                        <p className="font-bold text-amber-900">該時段剩餘服務時間有限</p>
                                        <p className="text-amber-700 font-medium">
                                          貼心提醒：您選擇的時間段目前剩餘服務時間有限，最多只能提供 {maxAvailableMins} 分鐘 ({maxAvailableMins / 60} 小時) 的療程，您最多只能選擇 {maxAvailableMins} 分鐘的療程，因為目前的能服務的時間有限。
                                        </p>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                {canCheckout ? renderLinePayCheckout() : (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full py-4 rounded-xl font-bold text-base bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/50"
                                  >
                                    請先完成預約資料
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}    

                    {/* TAB 1.5: BEGIN FITNESS BOOKING FLOW */}
                    {frontendTab === 'fitness' && (() => {
                      const finalMaleCoaches = maleCoaches;
                      const finalFemaleCoaches = femaleCoaches;
                      return (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                          
                          {/* Left Side selectors (Coach, Date, Course) */}
                          <div className="xl:col-span-7 space-y-6">
                            <BookingNotice kind="fitness" expanded={showFitnessNotice} onToggle={() => setShowFitnessNotice(prev => !prev)} />
                            
                            {/* 1. Course selection list & Fitness plan */}
                            <section className="bg-white border border-sage-100 p-4 sm:p-5 rounded-2xl shadow-sm">
                              <h3 className="text-[18px] sm:text-xl text-sage-950 font-black flex items-center gap-2.5 mb-2 font-sans">
                                <span className="w-6 h-6 rounded-full bg-sage-200 text-sage-900 flex items-center justify-center text-sm font-black">1</span>
                                預約課程
                              </h3>
                              <BookingHint title="">
                                健身體驗課已包含 InBody 量測與初步教練評估；選取後，系統會自動移除其他健身課程。
                              </BookingHint>
                              
                              <div className="flex flex-col gap-1.5">
                                <div className="relative" data-booking-course-menu>
                                  <button
                                    type="button"
                                    onClick={() => setShowFitnessCourseMenu(prev => !prev)}
                                    aria-expanded={showFitnessCourseMenu}
                                    className="w-full min-h-[48px] bg-white border border-stone-200 hover:border-sage-300 rounded-xl px-3.5 py-3 text-sm text-stone-700 font-bold focus:outline-none focus:ring-2 focus:ring-sage-100 transition flex items-center justify-between gap-3 font-sans"
                                  >
                                    <span>-- 選擇課程 --</span>
                                    <ChevronDown className={`w-4 h-4 shrink-0 text-stone-500 transition-transform ${showFitnessCourseMenu ? 'rotate-180' : ''}`} />
                                  </button>

                                  {showFitnessCourseMenu && (
                                    <div className="mt-2 rounded-xl border border-stone-200 bg-white p-2 shadow-lg space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                      <button
                                        type="button"
                                        disabled={!fitnessLessonBalance.hasPlan}
                                        onClick={() => { addToCart('f3'); setShowFitnessCourseMenu(false); }}
                                        className="w-full rounded-lg border border-sage-100 bg-sage-50/60 px-3.5 py-3 text-left transition hover:border-sage-300 hover:bg-sage-50 disabled:cursor-not-allowed disabled:border-stone-100 disabled:bg-stone-50 disabled:opacity-70"
                                      >
                                        <span className="block text-[15px] sm:text-base leading-tight font-black text-stone-900">1對1教練課</span>
                                        {fitnessLessonBalance.hasPlan ? (
                                          <>
                                            <span className="mt-1.5 block whitespace-nowrap text-[12px] min-[375px]:text-[13px] sm:text-sm font-black text-sage-900">
                                              《{fitnessLessonBalance.label}》{fitnessLessonBalance.label === '90天計畫' ? `${fitnessLessonBalance.total}堂課，` : ''}目前還有{fitnessLessonBalance.remaining}堂課
                                            </span>
                                            <span className="mt-1.5 block text-xs sm:text-[13px] font-bold text-stone-500">60分鐘（已付款）</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="mt-1.5 block text-[13px] sm:text-sm font-bold text-stone-500">購買後即可預約</span>
                                            <span className="mt-1 block text-xs sm:text-[13px] font-bold text-stone-400">60分鐘</span>
                                          </>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        disabled={hasPurchasedExperience}
                                        onClick={() => { addToCart('f1'); setShowFitnessCourseMenu(false); }}
                                        className="w-full rounded-lg border border-stone-100 bg-white px-3.5 py-3 text-left transition hover:border-sage-300 hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-45"
                                      >
                                        <span className="block text-[15px] sm:text-base leading-tight font-black text-stone-900">健身體驗課</span>
                                        <span className="mt-1.5 block text-[13px] sm:text-sm font-bold text-stone-500">每人限購1次</span>
                                        <span className="mt-1 block text-xs sm:text-[13px] font-bold text-stone-500">60分鐘　NT$1000</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => { addToCart('f2'); setShowFitnessCourseMenu(false); }}
                                        className="w-full rounded-lg border border-stone-100 bg-white px-3.5 py-3 text-left transition hover:border-sage-300 hover:bg-sage-50"
                                      >
                                        <span className="block text-[15px] sm:text-base leading-tight font-black text-stone-900">InBody量測與解說</span>
                                        <span className="mt-1.5 block text-xs sm:text-[13px] font-bold text-stone-500">30分鐘　NT$300</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </section>

                            {/* 2. Coach preference selector */}
                            <section className="bg-white border border-sage-100 p-4 sm:p-5 rounded-2xl shadow-sm">
                              <h3 className="text-[18px] sm:text-xl text-sage-950 font-black flex items-center gap-2.5 mb-2">
                                <span className="w-6 h-6 rounded-full bg-sage-200 text-sage-900 flex items-center justify-center text-sm font-black">2</span>
                                選擇教練
                              </h3>
                              <BookingHint title="">
                                請優先選擇您的主教練（或偕同教練）；如欲體驗其他教練授課，請先告知櫃台人員。
                              </BookingHint>
                              
                              <div className="space-y-4">
                                {/* Male & Female Dropdowns */}
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                  <StaffPicker
                                    label="男教練"
                                    placeholder="選擇男教練"
                                    value={finalMaleCoaches.includes(therapistPref) ? therapistPref : ''}
                                    open={openStaffMenu === 'maleCoach'}
                                    onToggle={() => setOpenStaffMenu(current => current === 'maleCoach' ? null : 'maleCoach')}
                                    onSelect={name => { setTherapistPref(name as TherapistPreference); setOpenStaffMenu(null); }}
                                    emptyMessage="暫無男教練服務"
                                    labelClassName="!text-[15px] sm:!text-base"
                                    options={(hasMaleCoachServiceThisMonth ? finalMaleCoaches : []).map(name => {
                                      const available = isTherapistAvailable(name);
                                      const isSelf = member?.therapistName === name;
                                      const note = isSelf ? '無法預約自己' : date && time && !available ? '該時段已約滿' : '點選指定教練';
                                      return { name, disabled: !available || isSelf, note };
                                    })}
                                  />
                                  <StaffPicker
                                    label="女教練"
                                    placeholder="選擇女教練"
                                    value={finalFemaleCoaches.includes(therapistPref) ? therapistPref : ''}
                                    open={openStaffMenu === 'femaleCoach'}
                                    onToggle={() => setOpenStaffMenu(current => current === 'femaleCoach' ? null : 'femaleCoach')}
                                    onSelect={name => { setTherapistPref(name as TherapistPreference); setOpenStaffMenu(null); }}
                                    emptyMessage="暫無女教練服務"
                                    labelClassName="!text-[15px] sm:!text-base"
                                    options={(hasFemaleCoachServiceThisMonth ? finalFemaleCoaches : []).map(name => {
                                      const available = isTherapistAvailable(name);
                                      const isSelf = member?.therapistName === name;
                                      const note = isSelf ? '無法預約自己' : date && time && !available ? '該時段已約滿' : '點選指定教練';
                                      return { name, disabled: !available || isSelf, note };
                                    })}
                                  />
                                </div>
                              </div>
                              {THERAPIST_DETAILS[therapistPref] && (() => {
                                const coach = THERAPIST_DETAILS[therapistPref];
                                return (
                                  <div className="customer-profile-card mt-4 flex flex-col items-center gap-4 rounded-xl border border-sage-100/70 bg-sage-50/40 p-4 sm:flex-row sm:items-start">
                                    <img src={coach.imageUrl} alt={coach.name} referrerPolicy="no-referrer" className="h-24 w-24 shrink-0 rounded-xl border border-white object-cover shadow-sm" />
                                    <div className="flex-1 space-y-2 text-center sm:text-left">
                                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                                        <span className="customer-profile-name text-base font-bold text-sage-900">{coach.name}</span>
                                        <span className="customer-profile-title text-xs font-medium text-sage-600">{coach.title}</span>
                                      </div>
                                      <div className="flex flex-wrap justify-center gap-1 sm:justify-start">
                                        {coach.specialties.map((specialty, index) => (
                                          <span key={index} className="customer-profile-specialty rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-bold text-sage-800">✦ {specialty}</span>
                                        ))}
                                      </div>
                                      <p className="customer-profile-bio text-xs font-medium leading-relaxed text-stone-500">{coach.bio}</p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </section>

                            {/* 3. Date and Time Calendar selector */}
                            <section className="bg-white border border-sage-100 p-4 sm:p-5 rounded-2xl shadow-sm">
                              <h3 className="text-[18px] sm:text-xl text-sage-950 font-black flex items-center gap-2.5 mb-2">
                                <span className="w-6 h-6 rounded-full bg-sage-200 text-sage-900 flex items-center justify-center text-sm font-black">3</span>
                                選擇服務時間
                              </h3>
                              <div className="hidden mb-4 text-stone-600 leading-relaxed font-medium font-sans">
                                <button
                                  type="button"
                                  onClick={() => setShowFitnessNotice(prev => !prev)}
                                  className="w-full min-h-[38px] rounded-md bg-sage-50 border border-sage-200 px-2.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-sage-100 transition"
                                >
                                  <span className="min-w-0 flex items-center gap-2">
                                    <span className="font-black text-sage-900 text-xs sm:text-sm whitespace-nowrap">健身課預約須知</span>
                                    <span className="rounded-md border border-rose-200/70 bg-rose-50/80 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-rose-700/80 whitespace-nowrap">初次預約請詳閱</span>
                                  </span>
                                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-sage-700 transition-transform ${showFitnessNotice ? 'rotate-180' : ''}`} />
                                </button>

                                {showFitnessNotice && (
                                  <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                                    <div className="rounded-xl bg-white border border-stone-100 p-3 space-y-2 text-[11px] sm:text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-sage-50 text-sage-800 flex items-center justify-center text-[10px] font-black">1</span>
                                        <p className="font-black text-stone-900">準時出席與課前準備</p>
                                      </div>
                                      <p><strong className="text-stone-700">健身課每節課 60 分鐘。</strong>為確保完整訓練時間，請您提早 15 分鐘至現場著裝，並先行進行伸展與暖身。</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs">
                                      <div className="rounded-xl bg-white border border-stone-100 p-3">
                                        <p className="font-black text-stone-900 mb-1">🥤 課後補給</p>
                                        <p>健身課結束後，皆可至 ZEN FLOW 櫃台兌換一杯「BCAA 乳清蛋白飲」，幫助肌肉合成與修復。</p>
                                        <p className="mt-1 text-stone-400 font-bold">限當日課後現場兌換</p>
                                      </div>
                                      <div className="rounded-xl bg-white border border-stone-100 p-3">
                                        <p className="font-black text-stone-900 mb-1">🕘 營運時間</p>
                                        <p>ZEN FLOW 每日營運至 <strong className="text-stone-800">22:00</strong>，教練課最晚接受預約時間為 <strong className="text-stone-800">21:00</strong>。</p>
                                      </div>
                                    </div>

                                    <div className="rounded-xl bg-white border border-stone-100 p-3 space-y-2 text-[11px] sm:text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-sage-50 text-sage-800 flex items-center justify-center text-[10px] font-black">2</span>
                                        <p className="font-black text-stone-900">變更、取消與遲到說明</p>
                                      </div>
                                      <p><strong className="text-stone-700">變更與取消：</strong>如欲取消或更改預約，請於課程前 1 小時主動通知；若逾時取消或無故未到，該堂課程將視同正常出席並照常扣課。</p>
                                      <p><strong className="text-stone-700">遲到說明：</strong>若學員遲到，課程仍將依原定時間結束，恕無法順延補時。</p>
                                    </div>

                                    <div className="rounded-xl bg-white border border-stone-100 p-3 space-y-2 text-[11px] sm:text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-sage-50 text-sage-800 flex items-center justify-center text-[10px] font-black">3</span>
                                        <p className="font-black text-stone-900">穿著裝備與健康提醒</p>
                                      </div>
                                      <p><strong className="text-stone-700">穿著與裝備：</strong>為了您的運動安全與器材衛生，請穿著舒適運動服飾、乾淨室內運動鞋，並攜帶個人毛巾。</p>
                                      <p><strong className="text-stone-700">健康提醒：</strong>若當日有任何身體不適、受傷、熬夜或特殊生理狀況，請務必於課前主動告知教練，以便評估並調整訓練強度。</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4">
                                {/* Custom Calendar Render */}
                                {(() => {
                                  const today = new Date();
                                  const currentYear = viewMonth.getFullYear();
                                  const currentMonth = viewMonth.getMonth();
                                  
                                  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                                  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                                  
                                  const isMinMonth = currentYear === minMonth.getFullYear() && currentMonth === minMonth.getMonth();
                                  const isMaxMonth = currentYear === maxMonth.getFullYear() && currentMonth === maxMonth.getMonth();

                                  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
                                  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                                  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
                                  
                                  const days = [];
                                  for (let i = 0; i < startingDayOfWeek; i++) {
                                    days.push(<div key={`empty-${i}`} className="h-10 sm:h-12"></div>);
                                  }
                                  
                                  for (let d = 1; d <= daysInMonth; d++) {
                                    const dateObj = new Date(currentYear, currentMonth, d);
                                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    const isPast = new Date(currentYear, currentMonth, d, 23, 59, 59) < today;
                                    const isAvailable = isDayAvailable(dateStr, availabilities, therapistPref, member?.id);
                                    const isSelected = date === dateStr;
                                    
                                    days.push(
                                      <button
                                        key={d}
                                        type="button"
                                        disabled={isPast || !isAvailable}
                                        onClick={() => { setDate(dateStr); setTime(''); }}
                                        className={`h-10 sm:h-12 text-xs sm:text-sm rounded-xl border flex flex-col items-center justify-center relative font-bold transition-all duration-200 font-sans ${
                                          isSelected 
                                            ? 'bg-sage-800 text-white border-sage-800 shadow-sm z-10' 
                                            : isPast
                                              ? 'bg-stone-50 text-stone-200 border-transparent cursor-not-allowed'
                                              : isAvailable
                                                ? 'bg-white text-stone-700 border-sage-100 hover:border-sage-400 hover:bg-sage-50/20'
                                                : 'bg-stone-50/70 text-stone-300 border-transparent cursor-not-allowed opacity-50'
                                        }`}
                                      >
                                        <span className="font-sans">{d}</span>
                                        {(!isPast && isAvailable && !isSelected) && (
                                          <div className="absolute bottom-1 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                                        )}
                                      </button>
                                    );
                                  }

                                  return (
                                    <div className="bg-sage-50/30 border border-sage-100/70 p-4 rounded-2xl">
                                      <div className="flex justify-between items-center mb-4">
                                        <button
                                          type="button"
                                          disabled={isMinMonth}
                                          onClick={() => {
                                            const prev = new Date(currentYear, currentMonth - 1, 1);
                                            setViewMonth(prev);
                                          }}
                                          className={`p-2 rounded-full transition-colors border border-transparent ${
                                            isMinMonth ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white hover:border-sage-200'
                                          }`}
                                        >
                                          <ChevronLeft className="w-4 h-4 text-stone-600" />
                                        </button>
                                        
                                        <h4 className="text-sm sm:text-base font-extrabold text-stone-800 font-sans">
                                          {currentYear}年 {currentMonth + 1}月
                                        </h4>
                                        
                                        <button
                                          type="button"
                                          disabled={isMaxMonth}
                                          onClick={() => {
                                            const next = new Date(currentYear, currentMonth + 1, 1);
                                            setViewMonth(next);
                                          }}
                                          className={`p-2 rounded-full transition-colors border border-transparent ${
                                            isMaxMonth ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white hover:border-sage-200'
                                          }`}
                                        >
                                          <ChevronRight className="w-4 h-4 text-stone-600" />
                                        </button>
                                      </div>
                                      
                                      <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                        {['一', '二', '三', '四', '五', '六', '日'].map(w => (
                                          <div key={w} className="text-[10px] sm:text-xs font-bold text-sage-500 uppercase tracking-wider py-1 font-sans">
                                            {w}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="grid grid-cols-7 gap-1">
                                        {days}
                                      </div>

                                      {date && (
                                        <div className="mt-4 p-2.5 bg-sage-800 text-white text-xs sm:text-sm rounded-xl flex items-center justify-center font-bold animate-in fade-in slide-in-from-bottom-1 font-sans">
                                          已選擇預約日期：{date.replace(/-/g, '/')} ({getWeekDay(date)})
                                        </div>
                                      )}
                                      {!date && (
                                        <p className="text-[11px] text-stone-400 text-center mt-3 font-medium font-sans">＊點選上方日曆中的日期以選擇開始時間。</p>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Time slots grid (no scroll) */}
                                {date && (
                                  <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in zoom-in-95 duration-200">
                                    {ALL_TIME_SLOTS.map(t => {
                                      const evaluationDuration = (time && time !== t) ? 30 : Math.max(30, totalDuration);
                                      const slotInfo = getDetailedSlotStatus(date, t, evaluationDuration, allOrders, member?.id, therapistPref, availabilities, false, false);
                                      const status = slotInfo.status;
                                      const available = status === 'available';
                                      const availableTherapists = slotInfo.availableTherapists;
                                      const bookedTherapist = slotInfo.bookedTherapist;
                                      
                                      return (
                                        <button
                                          key={t}
                                          disabled={!available}
                                          onClick={() => setTime(t)}
                                          className={`py-2 text-sm rounded-xl border transition-all duration-200 flex flex-col items-center justify-center font-bold font-sans ${
                                            time === t 
                                              ? 'bg-sage-800 text-white border-sage-800 shadow-sm' 
                                              : available 
                                                ? 'bg-white text-stone-700 border-sage-200 hover:border-sage-400' 
                                                : 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed opacity-60'
                                          }`}
                                        >
                                          <span className="font-sans text-sm leading-tight">{t}</span>
                                          {available && (
                                            <span className={`text-[10.5px] sm:text-[11.5px] mt-0.5 font-semibold leading-tight ${
                                              time === t ? 'text-sage-100' : 'text-emerald-600'
                                            }`}>
                                              {therapistPref && therapistPref !== '不指定' && !therapistPref.includes('即可')
                                                ? '可預約' 
                                                : availableTherapists.length > 0 
                                                  ? <span className={`grid ${availableTherapists.length === 1 ? 'grid-cols-1 justify-items-center' : 'grid-cols-2'} gap-x-1.5 gap-y-0.5 text-center`}>{availableTherapists.map(name => <span key={name}>{name}</span>)}</span>
                                                  : '可預約'}
                                            </span>
                                          )}
                                          {!available && (
                                            <span className={`text-[9px] mt-0.5 font-medium ${
                                              status === 'exceeds_shift' ? 'text-amber-600/95 font-semibold font-sans' : 'text-stone-300 font-sans'
                                            }`}>
                                              {status === 'exceeds_shift' 
                                                ? '時長不足' 
                                                : status === 'past' 
                                                  ? '時間已過' 
                                                  : bookedTherapist 
                                                    ? `已約: ${bookedTherapist}` 
                                                    : '已約滿'}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </section>

                            {/* One-on-one fitness coaching add-on */}
                            <section className="bg-white border border-sage-100 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
                              <h3 className="text-[18px] sm:text-xl leading-snug text-sage-950 font-black flex items-center gap-2 mb-2 font-sans">
                                一對一健身教練課（依個人需求加購）
                              </h3>
                              
                              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                                {/* 健身計畫 */}
                                <div className="flex min-w-0 flex-col gap-1.5" data-booking-course-menu>
                                  <label className="text-[13px] sm:text-sm font-black text-stone-500 tracking-wide pl-1 font-sans">選擇健身方案</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowFitnessPlanMenu(prev => !prev)}
                                    aria-expanded={showFitnessPlanMenu}
                                    className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left text-[14px] sm:text-[15px] font-black text-stone-700 transition hover:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-100"
                                  >
                                    <span className="min-w-0 truncate">{fitnessPlan === '無' ? '無計畫' : fitnessPlan}</span>
                                    <ChevronDown className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${showFitnessPlanMenu ? 'rotate-180' : ''}`} />
                                  </button>
                                  {showFitnessPlanMenu && (
                                    <div className="space-y-1.5 rounded-xl border border-stone-200 bg-white p-2 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                                      {[
                                        ['無', '無計畫'],
                                        ['90天計畫', '90天計畫'],
                                        ['24堂教練課', '24堂教練課'],
                                        ['48堂教練課', '48堂教練課'],
                                        ['單堂教練課', '單堂教練課']
                                      ].map(([value, label]) => (
                                        <button
                                          key={value}
                                          type="button"
                                          onClick={() => {
                                            setFitnessPlan(value);
                                            setShowFitnessPlanMenu(false);
                                            if (value === '無') {
                                              setFitnessPlanPrice(0);
                                            } else {
                                              setCart([]);
                                              setDate('');
                                              setTime('');
                                              setTherapistPref('不指定');
                                            }
                                          }}
                                          className={`w-full rounded-lg border px-3 py-3 text-left text-[15px] sm:text-base font-black transition ${fitnessPlan === value ? 'border-sage-300 bg-sage-50 text-sage-900' : 'border-stone-100 bg-white text-stone-800 hover:border-sage-300 hover:bg-sage-50'}`}
                                        >
                                          {label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* 手動輸入金額 */}
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[13px] sm:text-sm font-black text-stone-500 tracking-wide pl-1 font-sans">健身方案費用</label>
                                  <input
                                    type="number"
                                    disabled={fitnessPlan === '無'}
                                    placeholder={fitnessPlan === '無' ? '請先選擇方案' : '請洽詢教練'}
                                    value={fitnessPlan === '無' ? '' : (fitnessPlanPrice || '')}
                                    onChange={(e) => {
                                      setFitnessPlanPrice(Math.max(0, Number(e.target.value) || 0));
                                    }}
                                    className="w-full min-h-[48px] min-w-0 bg-white border border-stone-200 hover:border-sage-300 rounded-xl px-3 py-2.5 text-[13px] sm:text-sm text-stone-700 font-bold focus:outline-none focus:ring-2 focus:ring-sage-100 transition outline-none font-sans disabled:bg-stone-50 disabled:text-stone-400"
                                  />
                                </div>
                              </div>
                            </section>
                          </div>

                          {/* Right Side: Cart明細 Summary panel */}
                          <div className="xl:col-span-5 sticky top-6">
                            <div className="bg-white border border-sage-100 p-5 sm:p-6 rounded-2xl shadow-md space-y-5">
                              <h3 className="text-lg sm:text-xl text-sage-950 font-black border-b border-sage-100 pb-2.5 flex justify-between items-center font-sans">
                                <span className="inline-flex items-center gap-1 leading-none"><span className="shrink-0 text-[23px] sm:text-[25px] leading-none text-sage-700">✦</span><span className="leading-none">今日預約明細</span></span>
                                {items.length > 0 && (
                                  <span className="text-xs text-stone-500 font-normal font-sans">
                                    已選 <span className="font-sans text-sage-800 font-bold">{items.length}</span> 項
                                  </span>
                                )}
                              </h3>
                              
                              {items.length === 0 ? (
                                <div className="py-8 text-center bg-sage-50/30 rounded-xl border border-dashed border-sage-100">
                                  <p className="text-sm text-stone-400 font-medium font-sans">請在上方選擇預約課程或健身計畫</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {/* List of selected items */}
                                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {items.map(item => {
                                      const isPlanItem = item.id === 'fitness-plan-item';
                                      return (
                                        <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 bg-sage-50/30 px-3 py-2.5 rounded-lg border border-stone-100 shadow-xs">
                                          <div className="min-w-0 flex flex-col gap-0.5">
                                            <span className="text-[10px] sm:text-[11px] leading-tight font-bold text-stone-400 font-sans">{isPlanItem ? '健身計畫' : item.courseId.startsWith('f') ? '健身課程' : '按摩療程'}</span>
                                            <span className="text-[14px] sm:text-[15px] leading-tight font-black text-stone-800 break-words font-sans">{item.name}</span>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {!isPlanItem && (
                                              <span className="hidden sm:inline text-xs font-bold text-stone-400 font-sans">{item.duration} 分鐘</span>
                                            )}
                                            <span className="text-[13px] sm:text-sm font-black text-stone-700 font-sans whitespace-nowrap">NT${item.price}</span>
                                            {isPlanItem ? (
                                              <button 
                                                type="button" 
                                                onClick={() => {
                                                  setFitnessPlan('無');
                                                  setFitnessPlanPrice(0);
                                                }}
                                                className="text-stone-400 hover:text-red-500 transition-colors p-1"
                                                title="刪除"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            ) : (
                                              <button 
                                                type="button" 
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-stone-400 hover:text-red-500 transition-colors p-1"
                                                title="刪除"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Detail calculations */}
                                  <div className="bg-sage-50/50 p-4 rounded-xl border border-sage-100 space-y-3 text-xs sm:text-sm font-medium">
                                    {(date && time) && (
                                      <div className="pb-3 border-b border-sage-200/60">
                                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">預約時間時段</p>
                                        <p className="text-base font-bold text-stone-800 font-sans">
                                          {date.substring(5, 7)}/{date.substring(8, 10)} {time} ~ {minsToTime(timeToMins(time) + totalDuration)}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {!isPureFitnessPlan && (
                                      <>
                                        <div className="flex justify-between items-center py-0.5 text-stone-600 font-sans">
                                          <span>指定教練</span>
                                          <span className="font-bold text-stone-800 font-sans">{therapistPref}</span>
                                        </div>

                                        <div className="flex justify-between items-center py-0.5 text-stone-600 font-sans">
                                          <span>總服務時長</span>
                                          <span className="font-bold font-sans text-stone-800">{totalDuration} 分鐘</span>
                                        </div>
                                      </>
                                    )}

                                    <div className="flex justify-between items-center py-0.5 text-stone-600 font-sans">
                                      <span>服務小計金額</span>
                                      <span className="font-bold font-sans text-stone-800">NT$ {originalPrice.toLocaleString()}</span>
                                    </div>

                                    <div className="pt-2 mt-1 border-t border-sage-200/60 flex justify-between items-end font-sans">
                                      <span className="font-bold text-stone-800 text-sm">應付總計</span>
                                      <span className="text-xl sm:text-2xl font-bold text-sage-900 font-sans">NT$ {finalPrice.toLocaleString()}</span>
                                    </div>
                                  </div>

                                  {/* Validation and feedback panel */}
                                  <div className="animate-fadeIn">
                                    {fitnessPlan !== '無' && Number(fitnessPlanPrice) <= 0 ? (
                                      <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-start gap-3 text-amber-950 shadow-md">
                                        <span className="text-xl shrink-0 mt-0.5">⚠️</span>
                                        <div className="space-y-1">
                                          <p className="font-extrabold text-sm sm:text-base text-amber-950 tracking-wide font-sans">請洽詢教練並輸入方案金額</p>
                                          <p className="text-xs sm:text-sm font-bold text-amber-900 leading-relaxed font-sans">
                                            歡迎洽詢店內教練, 聊解不同方案內容後再行選購!!
                                          </p>
                                        </div>
                                      </div>
                                    ) : isPureFitnessPlan ? (
                                      <div className="p-4 sm:p-5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-start gap-3 text-emerald-950 shadow-md">
                                        <span className="text-xl shrink-0 mt-0.5">✨</span>
                                        <div className="space-y-1">
                                          <p className="font-extrabold text-sm sm:text-base text-emerald-950 tracking-wide font-sans">可以直接購買方案</p>
                                          <p className="text-xs sm:text-sm font-bold text-emerald-900 leading-relaxed font-sans">
                                            歡迎洽詢店內教練, 聊解不同方案內容後再行選購!!
                                          </p>
                                        </div>
                                      </div>
                                    ) : !date || !time ? (
                                      <div className="p-4 sm:p-5 bg-amber-100 border-2 border-amber-400 rounded-2xl flex items-start gap-3 text-amber-950 shadow-md">
                                        <span className="text-xl shrink-0 mt-0.5">⚠️</span>
                                        <div className="space-y-1">
                                          <p className="font-extrabold text-sm sm:text-base text-amber-950 tracking-wide font-sans">您還未選擇教練和預約時間</p>
                                          <p className="text-xs sm:text-sm font-bold text-amber-900 leading-relaxed font-sans">
                                            請先至「2. 選擇教練」與「3. 選擇服務時間」進行選擇，確認有可服務的時間後即可完成約課。
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs font-semibold leading-relaxed shadow-xs">
                                        <span className="text-base shrink-0">✨</span>
                                        <div>
                                          <p className="font-bold text-emerald-900 font-sans">請確認您想預約的健身課程項目</p>
                                          <p className="text-emerald-700 font-medium font-sans">
                                            {fitnessPlan !== '無' ? '歡迎洽詢店內教練, 聊解不同方案內容後再行選購!!' : '請確認上方預約內容無誤，即可點選下方按鈕完成約課！'}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {isPureFitnessPlan || items.some(item => item.courseId === 'f1') ? (
                                    canCheckout ? renderLinePayCheckout() : (
                                      <button type="button" disabled className="w-full py-4 rounded-xl font-bold text-base bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/50">
                                        請先完成預約資料
                                      </button>
                                    )
                                  ) : (
                                    <button 
                                      onClick={handleCheckoutClick} 
                                      disabled={!canCheckout}
                                      className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 shadow-sm font-sans ${
                                        canCheckout 
                                          ? 'bg-sage-800 text-white hover:bg-sage-700 hover:shadow-md' 
                                          : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/50'
                                      }`}
                                    >
                                      確認預約內容並完成約課
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {frontendTab === 'upcoming' && (() => {
                      const memberOrders = allOrders.filter(o => o.memberId === member.id).sort((a,b) => b.createdAt - a.createdAt);
                      const now = new Date().getTime();
                      const upcomingOrders = memberOrders.filter(o => o.status !== 'cancelled' && new Date(`${o.date}T${o.time || '00:00'}:00`).getTime() > now).sort((a,b) => new Date(`${a.date}T${a.time || '00:00'}:00`).getTime() - new Date(`${b.date}T${b.time || '00:00'}:00`).getTime());

                      return (
                        <div className="relative -top-4 space-y-4 max-w-2xl mx-auto animate-in fade-in duration-200">
                          <h3 className="min-h-[36px] px-1 py-1 text-[18px] sm:text-xl leading-tight text-sage-950 font-black flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 
                            即將到來的預約行程
                          </h3>
                          
                          {upcomingOrders.length === 0 ? (
                            <div className="p-10 text-center text-stone-400 bg-sage-50/30 border border-sage-100 rounded-2xl">
                              目前尚無即將到來的預約安排
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {upcomingOrders.map(o => {
                                const orderTimeMs = new Date(`${o.date}T${o.time || '00:00'}:00`);
                                const isVenueOrder = (o.items || []).some(item => item.courseId === 'venue');
                                const isPaidWithLinePay = !!o.linePayTransactionId && !!o.paymentMethod?.includes('已線上結帳');
                                const cancellationLeadMs = (isVenueOrder || isPaidWithLinePay ? 60 : 120) * 60 * 1000;
                                const canCancelMs = orderTimeMs.getTime() - cancellationLeadMs;
                                const canCancel = orderTimeMs.getTime() - Date.now() > cancellationLeadMs;
                                const limitDateObj = new Date(canCancelMs);
                                const limitDateStr = `${limitDateObj.getFullYear()}-${String(limitDateObj.getMonth() + 1).padStart(2, '0')}-${String(limitDateObj.getDate()).padStart(2, '0')}`;
                                const limitTimeStr = limitDateObj.toTimeString().substring(0, 5);

                                return (
                                  <div key={o.id} className="p-5 sm:p-6 bg-white border border-sage-100 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-sage-200 transition">
                                    <div className="flex-1 space-y-2">
                                      <p className="font-bold text-sage-900 text-base sm:text-lg md:text-xl font-sans whitespace-nowrap">
                                        {(o.items || []).some(i => i.id === 'fitness-plan-item') && (o.items || []).length === 1 ? (
                                          <>
                                            {o.date.replace(/-/g, '/')}({getWeekDay(o.date)}) 購買健身方案
                                          </>
                                        ) : (
                                          <>
                                            {o.date.replace(/-/g, '/')}({getWeekDay(o.date)}) {o.time} ~ {minsToTime(timeToMins(o.time) + o.totalDuration)} 
                                            <span className="text-xs text-stone-500 font-normal ml-1 sm:ml-2">({formatDuration(o.totalDuration)})</span>
                                          </>
                                        )}
                                      </p>
                                      
                                      <div className="text-stone-600 text-xs sm:text-sm space-y-1 bg-sage-50/30 p-3 rounded-lg border border-sage-100/50 font-medium">
                                        {sortOrderItems(o.items || []).map((i, idx) => (
                                          <div key={idx} className="flex justify-between">
                                            <span>{i.name.replace(/\s*\(.*?\)/g, '').trim()} {i.duration}分鐘</span>
                                            <span className="font-sans text-stone-500">NT${i.price}</span>
                                          </div>
                                        ))}
                                        <div className="text-xs text-stone-400 pt-1.5 border-t border-sage-100 mt-1.5 flex justify-between">
                                          <span>
                                            {(o.items || []).some(i => i.courseId === 'venue') 
                                              ? `計算公式：(${o.totalDuration} 分鐘 ÷ 30) × 150 = NT$${o.originalPrice}` 
                                              : `合計原價：NT$${o.originalPrice}`}
                                          </span>
                                          {o.discountAmount > 0 && (
                                            <span className="text-green-600 font-bold">折抵優惠後：NT${o.finalPrice}</span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <p className="text-stone-500 text-xs font-semibold flex items-center gap-1.5 pt-1">
                                        {(o.items || [])[0]?.courseId === 'venue' ? (
                                          <span>預約空間：<strong>{o.massageRoom || '未分配'}</strong></span>
                                        ) : (
                                          <span>技師：<strong>{formatTherapistWithAssign(o.therapistPreference, o.originalTherapistPreference)}</strong></span>
                                        )}
                                        <span className="text-stone-300">|</span>
                                        <span>付款方式：<strong>{o.paymentMethod || '現場支付'}</strong></span>
                                      </p>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-end space-y-2 mt-2 md:mt-0">
                                       <div className="flex gap-2 w-full md:w-auto">
                                         <button
                                           type="button"
                                           disabled={isVenueOrder && !canCancel}
                                           onClick={() => isVenueOrder
                                             ? handleCancelOrder(o, true)
                                             : setConfirmAction({ message: '需要修改預約（如時段或療程項目），請加官方LINE聯繫客服協助處理（@zenflow）' })}
                                           className={`flex-1 md:flex-none px-4 py-2.5 text-xs sm:text-sm rounded-xl border transition font-bold ${
                                             isVenueOrder && !canCancel
                                               ? 'text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed'
                                               : 'border-sage-200 text-stone-600 bg-white hover:bg-sage-50'
                                           }`}
                                         >
                                           {isVenueOrder ? '線上改期' : '修改預約'}
                                         </button>
                                         <button
                                           type="button"
                                           disabled={!canCancel}
                                           onClick={() => {
                                             if(canCancel) handleCancelOrder(o);
                                           }}
                                           className={`flex-1 md:flex-none px-4 py-2.5 text-xs sm:text-sm rounded-xl border transition font-bold ${
                                             canCancel 
                                               ? 'text-red-600 border-red-200 bg-red-50/20 hover:bg-red-50' 
                                               : 'text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed'
                                           }`}
                                         >
                                           {canCancel ? '線上取消' : '已鎖定'}
                                         </button>
                                       </div>
                                       {(isVenueOrder || isPaidWithLinePay) && !canCancel ? (
                                         <p className="max-w-xs text-[11px] leading-relaxed text-red-600 text-right font-medium">
                                           已超過線上取消時限，如有緊急狀況請撥打電話 0222521711與我們聯絡
                                         </p>
                                       ) : (
                                         <p className="text-[10px] text-stone-400 text-right font-medium">
                                           最遲應於 {limitDateStr.replace(/-/g, '/')} {limitTimeStr} 前取消{isVenueOrder ? '或改期' : ''}
                                         </p>
                                       )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* TAB 3: PAST HISTORY AND CANCELLED RECORDS */}
                    {frontendTab === 'history' && (() => {
                      const memberOrders = allOrders.filter(o => o.memberId === member.id).sort((a,b) => b.createdAt - a.createdAt);
                      const now = new Date().getTime();
                      const pastOrders = memberOrders.filter(o => o.status === 'cancelled' || new Date(`${o.date}T${o.time || '00:00'}:00`).getTime() <= now);

                      return (
                        <div className="relative -top-4 space-y-4 max-w-2xl mx-auto animate-in fade-in duration-200">
                          <h3 className="min-h-[36px] px-1 py-1 text-[18px] sm:text-xl leading-tight text-sage-950 font-black flex items-center gap-2 mb-2">
                            在 ZEN FLOW 留下的足跡
                          </h3>
                          
                          {pastOrders.length === 0 ? (
                            <div className="p-10 text-center text-stone-400 bg-sage-50/30 border border-sage-100 rounded-2xl">
                              目前尚無消費紀錄
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {pastOrders.map(o => {
                                const isExpanded = expandedOrders.includes(o.id);
                                const statusLabel = o.status === 'cancelled' ? '已取消' : '已結束';
                                
                                return (
                                  <div key={o.id} className="bg-white border border-sage-100 rounded-2xl overflow-hidden shadow-sm transition hover:border-sage-200">
                                    <div 
                                      onClick={() => toggleOrder(o.id)}
                                      className="p-4 sm:p-5 bg-sage-50/20 cursor-pointer flex items-center justify-between hover:bg-sage-50/40 transition gap-3"
                                    >
                                      <div className="space-y-1 min-w-0 flex-1">
                                         <p className="font-bold text-stone-800 text-[14px] sm:text-[15px] font-sans leading-[1.4]">
                                           <span className="inline mr-1.5">{o.date.replace(/-/g, '/')}({getWeekDay(o.date)})</span>
                                           {(o.items || []).some(i => i.id === 'fitness-plan-item') && (o.items || []).length === 1 ? (
                                             <span className="inline text-stone-600 text-[13px] sm:text-sm font-bold">
                                               購買健身方案
                                             </span>
                                           ) : (
                                             <span className="inline text-stone-500 text-[13px] sm:text-sm font-medium">
                                               {o.time}~{minsToTime(timeToMins(o.time) + o.totalDuration)}
                                             </span>
                                           )}
                                         </p>
                                         <p className="text-stone-500 text-[13px] sm:text-sm font-semibold leading-relaxed truncate">
                                           {(o.items || []).some(i => i.id === 'fitness-plan-item') && (o.items || []).length === 1 ? (
                                             <>單純購買方案 | 付款方式：{o.paymentMethod || '現場支付'}</>
                                           ) : (o.items || [])[0]?.courseId === 'venue' ? (
                                             <>預約空間：{o.massageRoom || '未分配'} | {formatDuration(o.totalDuration)}</>
                                           ) : (
                                             <>技師：{formatTherapistWithAssign(o.therapistPreference, o.originalTherapistPreference)} | {formatDuration(o.totalDuration)}</>
                                           )}
                                         </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 whitespace-nowrap">
                                         <span className={`text-[11px] sm:text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${
                                           o.status === 'cancelled' 
                                             ? 'bg-red-50 text-red-600 border border-red-100' 
                                             : 'bg-stone-100 text-stone-500 border border-stone-200'
                                         }`}>
                                           {statusLabel}
                                         </span>
                                         <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="p-4 sm:p-5 border-t border-sage-100 bg-sage-50/10 space-y-4 animate-in slide-in-from-top-2 duration-150">
                                         <div className="space-y-2">
                                            <label className="text-xs sm:text-[13px] font-bold text-stone-500 uppercase tracking-wider block">預約服務療程明細</label>
                                            {sortOrderItems(o.items || []).map((i, idx) => (
                                              <div key={idx} className="flex justify-between text-[14px] sm:text-[15px] text-stone-700 font-medium leading-relaxed">
                                                 <span>{i.name.replace(/\s*\(.*?\)/g, '').trim()} {i.duration}分鐘</span>
                                                 <span className="font-sans text-stone-500">NT${i.price}</span>
                                              </div>
                                            ))}
                                         </div>

                                         <div className="pt-3 border-t border-sage-100 space-y-2 text-[13px] sm:text-sm text-stone-600 font-medium leading-relaxed">
                                           <div className="flex justify-between">
                                              <span>原價總計</span>
                                              <span className="font-sans">NT${o.originalPrice}</span>
                                           </div>
                                           {o.discountAmount > 0 && (
                                             <div className="text-green-700 font-sans text-[13px] sm:text-sm leading-relaxed">
                                                <div className="flex items-center justify-between gap-3 font-black text-green-800">
                                                  <span>會員優惠折扣</span>
                                                  <span className="shrink-0 text-right">-NT${o.discountAmount}</span>
                                                </div>
                                                <div className="mt-1 space-y-0.5">
                                                  {(() => {
                                                    const formula = o.discountFormula || '活動折抵';
                                                    const massageFormula = /首時\(1200\)\+\[\((\d+)-1200\)\*50%\]\(半價\)/;
                                                    const massageMatch = formula.match(massageFormula);
                                                    const detailLines: string[] = [];

                                                    if (massageMatch) {
                                                      const massageTotal = Number(massageMatch[1]);
                                                      const halfPriceDiscount = Math.max(0, (massageTotal - 1200) * 0.5);
                                                      detailLines.push('首時1200');
                                                      detailLines.push(`首時後半價(${massageTotal}-1200)*50%=${halfPriceDiscount}`);
                                                    }
                                                    if (formula.includes('InBody免費')) detailLines.push('InBody免費');

                                                    const otherDetails = formula
                                                      .replace(massageFormula, '')
                                                      .replace(/InBody免費/g, '')
                                                      .split(/[；,]/)
                                                      .map(part => part.trim())
                                                      .filter(Boolean);
                                                    detailLines.push(...otherDetails);

                                                    return detailLines.map((line, index) => <div className="whitespace-nowrap" key={`${line}-${index}`}>{line}</div>);
                                                  })()}
                                                </div>
                                             </div>
                                           )}
                                           <div className="flex justify-between items-center pt-2.5 border-t border-sage-100">
                                              <span className="text-[15px] sm:text-base font-bold text-stone-800">應付總額</span>
                                              <span className="text-lg sm:text-xl font-bold text-sage-900 font-sans">NT$ {o.finalPrice}</span>
                                           </div>
                                         </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                )}

                {/* STEP 3: BOOKING SUCCESS PAGE */}
                {step === 3 && (
                  <div className="text-center py-16 sm:py-24 max-w-md mx-auto animate-in zoom-in-95 duration-300 space-y-6">
                    <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-500 mx-auto" />
                    <div className="space-y-2">
                      <h2 className="text-xl sm:text-2xl font-bold font-serif leading-relaxed text-sage-900">
                        {successMessage === PAYMENT_COMPLETION_MESSAGE || successMessage === ONSITE_PAYMENT_COMPLETION_MESSAGE
                          ? '預約已完成。謝謝您，選擇在 ZEN FLOW 找回身心的流動與平衡。'
                          : '預約成功！'}
                      </h2>
                      {successMessage !== PAYMENT_COMPLETION_MESSAGE && successMessage !== ONSITE_PAYMENT_COMPLETION_MESSAGE && (
                        <p className="text-stone-500 text-sm sm:text-base font-medium">{successMessage ? '您的健身課程已完成預約。' : '您的放鬆療癒之旅已完成時段排定。'}</p>
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm p-4 rounded-xl leading-relaxed font-medium whitespace-pre-line ${
                      successMessage === PAYMENT_COMPLETION_MESSAGE || successMessage === ONSITE_PAYMENT_COMPLETION_MESSAGE
                        ? 'text-stone-600 bg-sage-50/70 border border-sage-100'
                        : 'text-amber-800 bg-amber-50 border border-amber-200/50'
                    }`}>
                      {successMessage === PAYMENT_COMPLETION_MESSAGE || successMessage === ONSITE_PAYMENT_COMPLETION_MESSAGE
                        ? successMessage
                        : `✨ 貼心通知：${successMessage || '稍後我們將透過簡訊或 LINE 寄送確認通知給您。請於預約時間前 15 分鐘到店，享受我們為您準備的香氛迎賓與精油調理體驗！'}`}
                    </p>
                    <button 
                      onClick={() => {setStep(1); setCart([]); setDate(''); setTime(''); setSuccessMessage(''); setGratitudeInput(''); setPromotionCodeInput(''); setPromotionCodeStatus('idle'); setPromotionName(''); setPromotionDiscountInput(''); setSelectedPromotion(null);}} 
                      className="px-8 py-3.5 bg-sage-800 hover:bg-sage-700 text-white rounded-xl font-bold transition duration-200 text-base shadow-sm inline-block"
                    >
                      返回預約首頁
                    </button>
                  </div>
                )}

              </div>

            </div>
          </div>

        </div>
      </div>

      <footer className="px-4 pb-8 text-center text-[13px] sm:text-sm text-stone-500 font-semibold leading-[1.8] tracking-[0.03em]">
        <span className="font-bold text-stone-600">© 2026 ZEN FLOW . All rights reserved.</span><br />
        <span>流動的身心平衡 ｜ 預約您的專屬時光</span>
        <div className="mt-2 flex items-center justify-center gap-2 text-[12px] sm:text-[13px] tracking-normal">
          <button type="button" onClick={() => setLegalDocument('privacy')} className="text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-sage-800">
            隱私權政策
          </button>
          <span className="text-stone-300">｜</span>
          <button type="button" onClick={() => setLegalDocument('terms')} className="text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-sage-800">
            服務條款
          </button>
        </div>
      </footer>

      {legalDocument && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-stone-950/55 p-3 sm:p-6 backdrop-blur-sm" onClick={() => setLegalDocument(null)}>
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="zen-flow-legal-title"
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-sage-100 bg-[#fbfaf7] shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-sage-100 bg-white/90 px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sage-600">ZEN FLOW</p>
                <h2 id="zen-flow-legal-title" className="mt-1 text-xl font-black tracking-wide text-sage-950 sm:text-2xl">
                  {legalDocument === 'privacy' ? '隱私權政策' : '服務條款'}
                </h2>
                <p className="mt-1 text-xs font-semibold text-stone-400">最後更新日期：2026 年 7 月 16 日</p>
              </div>
              <button type="button" onClick={() => setLegalDocument(null)} aria-label="關閉" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-sage-300 hover:text-sage-800">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto px-5 py-5 text-[15px] leading-[1.85] text-stone-600 sm:px-8 sm:py-7 sm:text-base">
              {legalDocument === 'privacy' ? (
                <div className="space-y-6">
                  <p>ZEN FLOW（以下稱「本店」）重視您的個人資料與隱私。本政策說明您使用 ZEN FLOW 網站、會員與預約服務時，我們如何蒐集、處理、利用及保護資料。</p>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">一、我們蒐集的資料</h3>
                    <ul className="list-disc space-y-1.5 pl-5">
                      <li>會員與聯絡資料：姓名、手機號碼、生日、性別、LINE ID，以及您主動提供的資料。</li>
                      <li>服務資料：會員等級、預約日期與時段、選擇的療程、服務人員、付款方式、優惠與消費紀錄。</li>
                      <li>工作人員資料：登入帳號、身分權限、排班及服務紀錄。</li>
                      <li>系統資料：裝置或瀏覽器為維持登入狀態所保存的必要資訊，以及系統安全與錯誤紀錄。</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">二、資料使用目的</h3>
                    <p>資料僅用於會員識別與管理、安排及變更預約、付款與退款處理、優惠資格判定、服務聯繫、客戶服務、帳務與營運管理、資訊安全，以及依法應辦理的事項。</p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">三、第三方服務</h3>
                    <ul className="list-disc space-y-1.5 pl-5">
                      <li>系統使用 Firebase 提供資料庫、身分驗證或相關雲端功能；必要資料可能由其基礎設施處理。</li>
                      <li>您選擇 LINE Pay 時，系統會將完成交易所需的訂單資訊傳送至 LINE Pay；付款帳戶及支付驗證由 LINE Pay 依其政策處理，本店不會取得您的完整信用卡資料或支付密碼。</li>
                      <li>除提供服務、依法令要求或經您同意外，本店不會任意出售或交換您的個人資料。</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">四、資料保存與安全</h3>
                    <p>本店於提供服務、履行契約、處理爭議及符合法定保存義務所需期間內保存資料，並採取合理的權限管理與安全措施。網路傳輸仍無法保證絕對零風險；若發現疑似異常，請立即與本店聯繫。</p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">五、您的個人資料權利</h3>
                    <p>您可依法向本店請求查詢或閱覽、製給複本、補充或更正、停止蒐集處理或利用，以及刪除個人資料。若刪除必要資料，部分會員、預約、付款或紀錄查詢功能可能無法繼續提供；依法或處理爭議所需者，本店得於必要期間內保留。</p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">六、政策更新與聯繫方式</h3>
                    <p>本政策可能因服務或法令調整而更新，最新版將公布於本網站。個資相關問題或權利行使，請致電 <a href="tel:0222521711" className="font-bold text-sage-800 underline underline-offset-4">02-2252-1711</a>，或親洽新北市板橋區民生路三段 30-1 號 1 樓。</p>
                  </section>
                </div>
              ) : (
                <div className="space-y-6">
                  <p>歡迎使用 ZEN FLOW 會員與預約系統。當您註冊、登入、送出預約或付款，即表示您已閱讀並同意以下條款；若不同意，請停止使用相關服務並直接與本店聯繫。</p>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">一、會員與帳號</h3>
                    <ul className="list-disc space-y-1.5 pl-5">
                      <li>請提供真實、正確且可聯絡的資料，並妥善保管登入資訊。</li>
                      <li>會員優惠、堂數、折扣及其他權益依會員資格、使用紀錄與當期公告為準，不得轉讓或冒用。</li>
                      <li>若發現帳號遭未授權使用，請立即通知本店。</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">二、預約成立與服務安排</h3>
                    <ul className="list-disc space-y-1.5 pl-5">
                      <li>預約以系統顯示成功並鎖定時段為準；LINE Pay 訂單須完成付款後始完成付款程序。</li>
                      <li>請確認日期、時段、療程、服務人員及金額。若選擇「不指定」，本店將依現場排班安排合適人員。</li>
                      <li>因人員臨時狀況、設備、安全、天候或其他不可歸責因素，本店得與您聯繫協調調整時段、人員或服務內容。</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">三、付款、取消、改期與退款</h3>
                    <ul className="list-disc space-y-1.5 pl-5">
                      <li>可用付款方式與優惠以結帳頁顯示為準；LINE Pay 交易亦受 LINE Pay 的服務規範約束。</li>
                      <li>線上取消或改期的期限、是否可退款及處理方式，以預約頁與該筆訂單當下顯示的規則為準。</li>
                      <li>超過線上操作期限、未到店或遇緊急狀況，請致電 02-2252-1711，由本店依個案協助。</li>
                      <li>退款完成時間可能受 LINE Pay、發卡銀行或金融機構作業時間影響。</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">四、健康與服務安全</h3>
                    <ul className="list-disc space-y-1.5 pl-5">
                      <li>按摩、芳療、健身、InBody 與營養相關內容屬一般身心保健服務，不構成醫療診斷或治療。</li>
                      <li>如有懷孕、慢性疾病、近期手術、受傷、皮膚狀況、過敏、心血管疾病或其他健康疑慮，請於服務前主動告知並先諮詢醫療專業人員。</li>
                      <li>服務期間若感到疼痛或不適，請立即告知服務人員；本店得基於安全調整或停止服務。</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">五、網站使用與智慧財產</h3>
                    <p>網站文字、品牌識別、版面、圖片及程式內容，除另有標示外，均受相關法令保護。未經同意，不得擅自重製、修改、散布、逆向操作、干擾系統或以不正方式存取資料。</p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-lg font-black text-sage-950">六、責任、條款更新與準據法</h3>
                    <p>本店將以合理方式維持系統安全與可用性，但因網路、第三方平台、不可抗力或必要維護造成的暫時中斷，將盡力協助處理。本條款可能配合服務或法令更新，最新版公布後適用。相關事項依中華民國法律處理；如有疑問，請致電 02-2252-1711 與本店聯繫。</p>
                  </section>
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-sage-100 bg-white/90 px-5 py-3 text-center sm:px-7">
              <button type="button" onClick={() => setLegalDocument(null)} className="min-w-28 rounded-lg bg-sage-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-sage-700">我已閱讀</button>
            </footer>
          </article>
        </div>
      )}

      {/* CONFIRMATION / ALERTS MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto shadow-2xl border border-sage-100 animate-in zoom-in-95 duration-150">
            <p className="text-stone-700 font-bold text-sm sm:text-base text-center leading-relaxed mb-6">{confirmAction.message}</p>
            <div className={`flex justify-center gap-3 ${confirmAction.confirmLabel ? 'flex-col-reverse' : ''}`}>
              {confirmAction.onConfirm && (
                <button 
                  onClick={() => setConfirmAction(null)} 
                  className="flex-1 py-3 rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 transition text-sm font-bold"
                >
                  {confirmAction.cancelLabel || '取消'}
                </button>
              )}
              <button 
                onClick={() => {
                  if (confirmAction.onConfirm) confirmAction.onConfirm();
                  else setConfirmAction(null);
                }}
                className="flex-1 py-3 rounded-xl text-white bg-sage-800 hover:bg-sage-700 transition text-sm font-bold shadow-sm"
              >
                {confirmAction.confirmLabel || '確定'}
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
