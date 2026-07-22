import { firestoreDb } from './firebase';
import { doc, setDoc, deleteDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

export type MemberLevel = '一般' | '金卡' | '黑卡' | '場租教練' | '場租按摩師' | '店內按摩師' | '店內教練';
export type Gender = '男' | '女';
export type TherapistPreference = '不指定按摩師' | '阿翰' | 'Ricky' | 'Kenny' | 'Mark' | '男按摩師即可' | 'Alice' | 'Kelly' | 'Miki' | '女按摩師即可' | '不指定' | '男按摩師' | '女按摩師' | string;

export interface TimeSlot {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface TherapistAvailability {
  id: string; // therapistName_date
  therapistName: string;
  date: string; // "YYYY-MM-DD"
  slots: TimeSlot[];
}

export interface Member {
  id: string; // phone is used as ID
  name: string;
  birthday: string;
  gender: Gender;
  level: MemberLevel;
  memberLevel?: '一般' | '金卡' | '黑卡';
  lineId?: string;
  lineUserId?: string;
  isProfileCompleted?: boolean;
  note?: string;
  referredBy?: string;
  referredMonth?: string;
  referrerType?: 'staff' | 'gold' | 'black';
  referrerId?: string;
  primaryTherapist?: string;
  primaryCoach?: string;
  secondaryCoach?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  createdAt: number;
  role?: 'member' | 'therapist' | 'admin';
  roles?: ('member' | 'therapist' | 'admin')[];
  password?: string;
  therapistName?: string; // Links member account to a specific therapist name
  selectedIdentities?: string[];
  fitnessPlan?: string;
}

export interface OrderItem {
  id: string; // unique cart item id
  courseId: string;
  name: string;
  price: number;
  duration: number;
  isUpgrade?: boolean;
}

export interface Order {
  id: string;
  memberId: string;
  date: string;
  time: string;
  status?: 'pending' | 'completed' | 'cancelled' | 'no_show';
  therapistPreference: TherapistPreference;
  items: OrderItem[];
  totalDuration: number;
  originalPrice: number;
  discountAmount: number;
  discountFormula?: string;
  gratitudeDiscount?: number;
  promotionName?: string;
  promotionCode?: string;
  promotionDiscount?: number;
  customerLineUserId?: string;
  therapistMemberId?: string;
  therapistLineUserId?: string;
  receptionistLineUserId?: string;
  lineNotificationSentPhases?: string[];
  lineNotificationSentAt?: string;
  lineNotificationRecipientCount?: number;
  lineNotificationStatus?: 'sent' | 'failed';
  finalPrice: number;
  paymentMethod?: string;
  paymentStatus?: 'paid_rescheduled' | 'refunded' | 'refund_pending' | 'other';
  paymentStatusNote?: string;
  linePayTransactionId?: string;
  linePayPaidAt?: number;
  linePayRefundTransactionId?: string;
  linePayRefundedAt?: number;
  refundStatus?: 'refunded' | 'refund_failed';
  note?: string;
  isAssignedByShop?: boolean;
  isConfirmed?: boolean;
  discomfortAreas?: string[];
  massageRoom?: string;
  originalTherapistPreference?: TherapistPreference;
  isFitness?: boolean;
  createdAt: number;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  appliesTo: 'all' | 'massage' | 'fitness';
  startDate: string;
  endDate: string;
  minimumSpend: number;
  memberUsageLimit: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export const COURSES = [
  // 全身療程
  { id: 'm1', category: '全身療程', name: '指壓60分鐘', time: 60, price: 1200, allowUpgrade: false },
  { id: 'm2', category: '全身療程', name: '指壓90分鐘', time: 90, price: 1800, allowUpgrade: false },
  { id: 'm3', category: '全身療程', name: '指壓120分鐘', time: 120, price: 2400, allowUpgrade: false },
  { id: 'm4', category: '全身療程', name: '油推30分鐘', time: 30, price: 700, allowUpgrade: false },
  { id: 'm5', category: '全身療程', name: '油推60分鐘', time: 60, price: 1400, allowUpgrade: false },

  // 局部療程
  { id: 'q1', category: '局部療程', name: '頭頸指壓30分鐘', time: 30, price: 600, allowUpgrade: false },
  { id: 'q2', category: '局部療程', name: '腰臀指壓30分鐘', time: 30, price: 600, allowUpgrade: false },
  { id: 'q3', category: '局部療程', name: '手部指壓30分鐘', time: 30, price: 600, allowUpgrade: false },
  { id: 'q4', category: '局部療程', name: '腿足指壓30分鐘', time: 30, price: 600, allowUpgrade: false },
  { id: 'q5', category: '局部療程', name: '局部油推30分鐘', time: 30, price: 700, allowUpgrade: false },

  // 加購療程
  { id: 'a3', category: '局部療程', name: '筋膜刀30分鐘', time: 30, price: 800, allowUpgrade: false },
  { id: 'a4', category: '加購療程', name: '筋膜刀60分鐘', time: 60, price: 1600, allowUpgrade: false, visible: false },
  { id: 'a5', category: '加購療程', name: '背部刮痧15分鐘', time: 15, price: 300, allowUpgrade: false },
  { id: 'a6', category: '加購療程', name: '背部拔罐15分鐘', time: 15, price: 300, allowUpgrade: false },
  { id: 'i1', category: '加購療程', name: 'InBody量測與解說30分鐘', time: 30, price: 300, allowUpgrade: false },

  // 健身課程
  { id: 'f1', category: '健身預約', name: '體驗課60分鐘', time: 60, price: 1000, allowUpgrade: false },
  { id: 'f2', category: '健身預約', name: 'InBody量測與解說30分鐘', time: 30, price: 300, allowUpgrade: false },
  { id: 'f3', category: '健身預約', name: '1對1教練課60分鐘(購課學員)', time: 60, price: 0, allowUpgrade: false }
];

export const db = {
  getMembers: (): Member[] => {
    try {
      return JSON.parse(localStorage.getItem('zf_members') || '[]');
    } catch {
      return [];
    }
  },
  
  saveMember: (m: Member) => {
    const members = db.getMembers();
    const idx = members.findIndex(x => x.id === m.id);
    if (idx >= 0) members[idx] = m;
    else members.push(m);
    localStorage.setItem('zf_members', JSON.stringify(members));
    try { setDoc(doc(firestoreDb, 'members', m.id), m).catch(console.error); } catch(e){}
  },
  
  updateMemberLevel: (id: string, level: MemberLevel) => {
    const members = db.getMembers();
    const member = members.find(x => x.id === id);
    if (member) {
      member.level = level;
      localStorage.setItem('zf_members', JSON.stringify(members));
      try { updateDoc(doc(firestoreDb, 'members', id), { level }).catch(console.error); } catch(e){}
    }
  },

  updateMemberNote: (id: string, note: string) => {
    const members = db.getMembers();
    const member = members.find(x => x.id === id);
    if (member) {
      member.note = note;
      localStorage.setItem('zf_members', JSON.stringify(members));
      try { updateDoc(doc(firestoreDb, 'members', id), { note }).catch(console.error); } catch(e){}
    }
  },

  updateMemberInfo: (oldId: string, name: string, gender: Gender, birthday: string, phone: string, level: MemberLevel, lineId?: string, referredBy?: string, referredMonth?: string, primaryTherapist?: string, membershipStartDate?: string, membershipEndDate?: string, role?: 'member' | 'therapist' | 'admin', password?: string, therapistName?: string, roles?: ('member' | 'therapist' | 'admin')[], memberLevel?: '一般' | '金卡' | '黑卡', selectedIdentities?: string[], fitnessPlan?: string, primaryCoach?: string, secondaryCoach?: string) => {
    const members = db.getMembers();
    const idx = members.findIndex(x => x.id === oldId);
    if (idx >= 0) {
      const updatedMember: Member = { ...members[idx], name: name || members[idx].name, gender: gender || members[idx].gender, birthday: birthday || members[idx].birthday };
      if (lineId !== undefined) updatedMember.lineId = lineId;
      if (level !== undefined) updatedMember.level = level;
      if (memberLevel !== undefined) updatedMember.memberLevel = memberLevel;
      if (selectedIdentities !== undefined) updatedMember.selectedIdentities = selectedIdentities;
      if (referredBy !== undefined) updatedMember.referredBy = referredBy;
      if (referredMonth !== undefined) updatedMember.referredMonth = referredMonth;
      if (primaryTherapist !== undefined) updatedMember.primaryTherapist = primaryTherapist;
      if (primaryCoach !== undefined) updatedMember.primaryCoach = primaryCoach;
      if (secondaryCoach !== undefined) updatedMember.secondaryCoach = secondaryCoach;
      if (membershipStartDate !== undefined) updatedMember.membershipStartDate = membershipStartDate;
      if (membershipEndDate !== undefined) updatedMember.membershipEndDate = membershipEndDate;
      if (role !== undefined) updatedMember.role = role;
      if (roles !== undefined) updatedMember.roles = roles;
      if (password !== undefined) updatedMember.password = password;
      if (therapistName !== undefined) updatedMember.therapistName = therapistName;
      if (fitnessPlan !== undefined) updatedMember.fitnessPlan = fitnessPlan;

      if (phone && phone !== oldId) {
        updatedMember.id = phone;
        const orders = db.getOrders();
        let changed = false;
        orders.forEach(o => {
          if (o.memberId === oldId) { 
            o.memberId = phone; changed = true; 
            try { updateDoc(doc(firestoreDb, 'orders', o.id), { memberId: phone }).catch(console.error); } catch(e){}
          }
        });
        if (changed) localStorage.setItem('zf_orders', JSON.stringify(orders));
        try { 
          deleteDoc(doc(firestoreDb, 'members', oldId)).catch(console.error); 
        } catch(e){}
      }
      members[idx] = updatedMember;
      localStorage.setItem('zf_members', JSON.stringify(members));
      try { setDoc(doc(firestoreDb, 'members', updatedMember.id), updatedMember).catch(console.error); } catch(e){}
    }
  },

  getMemberByPhone: (phone: string): Member | undefined => {
    return db.getMembers().find(m => m.id === phone);
  },

  deleteMember: (id: string) => {
    let members = db.getMembers();
    members = members.filter(m => m.id !== id);
    localStorage.setItem('zf_members', JSON.stringify(members));
    try { deleteDoc(doc(firestoreDb, 'members', id)).catch(console.error); } catch(e){}
  },

  getOrders: (): Order[] => {
    try {
      return JSON.parse(localStorage.getItem('zf_orders') || '[]');
    } catch {
      return [];
    }
  },
  
  saveOrder: (o: Order) => {
    const orders = db.getOrders();
    orders.push(o);
    localStorage.setItem('zf_orders', JSON.stringify(orders));
    try { setDoc(doc(firestoreDb, 'orders', o.id), o).catch(console.error); } catch(e){}
  },
  
  deleteOrder: (id: string) => {
    let orders = db.getOrders();
    orders = orders.filter(o => o.id !== id);
    localStorage.setItem('zf_orders', JSON.stringify(orders));
    try { deleteDoc(doc(firestoreDb, 'orders', id)).catch(console.error); } catch(e){}
  },

  getAvailability: (): TherapistAvailability[] => {
    try {
      return JSON.parse(localStorage.getItem('zf_availability') || '[]');
    } catch {
      return [];
    }
  },

  saveAvailability: (a: TherapistAvailability) => {
    const items = db.getAvailability();
    const idx = items.findIndex(x => x.therapistName === a.therapistName && x.date === a.date);
    if (idx >= 0) {
      items[idx] = a;
    } else {
      items.push(a);
    }
    localStorage.setItem('zf_availability', JSON.stringify(items));
    try { setDoc(doc(firestoreDb, 'availability', a.id), a).catch(console.error); } catch(e){}
  },

  deleteAvailability: (id: string) => {
    let items = db.getAvailability();
    items = items.filter(x => x.id !== id);
    localStorage.setItem('zf_availability', JSON.stringify(items));
    try { deleteDoc(doc(firestoreDb, 'availability', id)).catch(console.error); } catch(e){}
  },

  getPromotions: (): Promotion[] => {
    try {
      return JSON.parse(localStorage.getItem('zf_promotions') || '[]');
    } catch {
      return [];
    }
  },

  savePromotion: (promotion: Promotion) => {
    const promotions = db.getPromotions();
    const normalized = { ...promotion, code: promotion.code.trim().toUpperCase(), updatedAt: Date.now() };
    const index = promotions.findIndex(item => item.id === normalized.id);
    if (index >= 0) promotions[index] = normalized;
    else promotions.push(normalized);
    localStorage.setItem('zf_promotions', JSON.stringify(promotions));
    try { setDoc(doc(firestoreDb, 'promotions', normalized.id), normalized).catch(console.error); } catch(e){}
  },

  deletePromotion: (id: string) => {
    const promotions = db.getPromotions().filter(item => item.id !== id);
    localStorage.setItem('zf_promotions', JSON.stringify(promotions));
    try { deleteDoc(doc(firestoreDb, 'promotions', id)).catch(console.error); } catch(e){}
  },

  syncMembers: async () => {
    return db.getMembers();
  },

  syncOrders: async () => {
    return db.getOrders();
  },

  syncAvailability: async () => {
    return db.getAvailability();
  },

  syncPromotions: async () => {
    return db.getPromotions();
  },

  updateOrder: (id: string, updates: Partial<Order>) => {
    let orders = db.getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates };
      localStorage.setItem('zf_orders', JSON.stringify(orders));
      try { updateDoc(doc(firestoreDb, 'orders', id), updates).catch(console.error); } catch(e){}
    }
  }
};

export function timeToMins(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minsToTime(m: number) {
  const h = Math.floor(m / 60);
  const min = (m % 60).toString().padStart(2, '0');
  return `${h.toString().padStart(2, '0')}:${min}`;
}

export function getBookedRanges(date: string, allOrders: Order[]) {
  return allOrders
      .filter(o => o.date === date && o.status !== 'cancelled' && o.status !== 'no_show')
      .map(o => {
          const start = timeToMins(o.time || '00:00');
          const end = start + (o.totalDuration || 0) + 30; // 30 mins buffer
          return { start, end };
      });
}

export function sortOrderItems<T extends {name: string, duration?: number, price?: number}>(items: T[]): T[] {
  if (!items || !Array.isArray(items)) return [];
  const getWeight = (name: string) => {
    // 1. 全身療程 - 指壓 (e.g., 指壓60分鐘, 指壓90分鐘, 指壓120分鐘)
    if (name.includes('指壓') && (name.includes('60') || name.includes('90') || name.includes('120')) && !name.includes('頭頸') && !name.includes('腰臀') && !name.includes('手部') && !name.includes('腿足')) {
      return 1;
    }
    if (name === '全身按摩' || name === '全身指壓') return 1;

    // 2. 局部療程 - 指壓 (e.g., 頭頸指壓30分鐘, 腰臀指壓30分鐘, etc.)
    if (name.includes('頭頸') || name.includes('腰臀') || name.includes('手部') || name.includes('腿足') || (name.includes('指壓') && name.includes('30'))) {
      return 2;
    }

    // 3. 全身療程 - 油推 (e.g., 油推30分鐘, 油推60分鐘)
    if (name.includes('油推') || name.includes('芳療')) {
      return 3;
    }

    // 4. 加購療程 - 筋膜刀 (e.g., 筋膜刀30分鐘, 筋膜刀60分鐘)
    if (name.includes('筋膜刀')) {
      return 4;
    }

    // 5. 加購療程 - InBody
    if (name.includes('InBody')) {
      return 5;
    }

    // Fallbacks
    if (name.includes('指壓')) return 1.5;
    return 6;
  };

  return [...items].sort((a, b) => getWeight(a.name) - getWeight(b.name));
}

export type SlotStatus = 'available' | 'past' | 'exceeds_shift' | 'fully_booked';

export interface SlotInfo {
  status: SlotStatus;
  availableTherapists: string[];
  bookedTherapist?: string;
}

export function isTimeRangeCovered(slots: { start: string; end: string }[], startMins: number, finishMins: number): boolean {
  if (!slots || slots.length === 0) return false;
  for (let m = startMins; m < finishMins; m += 30) {
    const hasCoverage = slots.some(s => {
      const sStart = timeToMins(s.start);
      const sEnd = timeToMins(s.end);
      return sStart <= m && sEnd >= m + 30;
    });
    if (!hasCoverage) return false;
  }
  return true;
}

export function getDetailedSlotStatus(
  date: string,
  timeStr: string,
  requiredDuration: number,
  allOrders: Order[],
  memberId?: string,
  therapistPref?: string,
  availabilities: TherapistAvailability[] = [],
  hasOilCourse?: boolean,
  hasFemaleExclusive?: boolean
): SlotInfo {
  if (!date || !timeStr) {
    return { status: 'past', availableTherapists: [] };
  }

  const duration = Math.max(30, requiredDuration);
  const startMins = timeToMins(timeStr);
  const finishMins = startMins + duration;

  // Rule: Must be at least 30 minutes/60 minutes in the future if date is today
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (date === todayStr) {
    const currentMins = now.getHours() * 60 + now.getMinutes();
    // Maintain the 60-minute future check from previous version
    if (startMins < currentMins + 60) {
      return { status: 'past', availableTherapists: [] };
    }
  }

  const today = new Date();
  const dateParts = date.split('-');
  const slotDateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (slotDateObj < todayDateOnly) {
    return { status: 'past', availableTherapists: [] };
  }

  if (finishMins > (22 * 60)) {
    return { status: 'exceeds_shift', availableTherapists: [] }; // Ensure service ends by 22:00
  }

  const linkedMassageMembers = db.getMembers().filter(m =>
    !!m.therapistName && (
      m.selectedIdentities?.includes('therapist_in') ||
      (!m.selectedIdentities?.length && m.level === '店內按摩師')
    )
  );
  const REAL_THERAPISTS = linkedMassageMembers.map(m => m.therapistName as string);
  const maleTherapists = linkedMassageMembers.filter(m => m.gender === '男').map(m => m.therapistName as string);
  const femaleTherapists = linkedMassageMembers.filter(m => m.gender === '女').map(m => m.therapistName as string);
  const linkedTherapistNames = [...maleTherapists, ...femaleTherapists];

  const coachMembers = db.getMembers().filter(m =>
    !!m.therapistName && (
      m.selectedIdentities?.includes('coach_in') ||
      (!m.selectedIdentities?.length && m.level === '店內教練')
    )
  );
  const coachNames = coachMembers.map(m => m.therapistName as string);
  const maleCoaches = coachMembers.filter(m => m.gender === '男').map(m => m.therapistName as string);
  const femaleCoaches = coachMembers.filter(m => m.gender === '女').map(m => m.therapistName as string);

  // Identify candidates based on preference
  let candidates: string[] = [];
  const normalizedPref = therapistPref || '不指定按摩師';
  const isFitness = normalizedPref.includes('教練') || normalizedPref === '不指定' || normalizedPref === '男即可' || normalizedPref === '女即可' || coachNames.includes(normalizedPref);

  if (isFitness) {
    const activeCoachNames = coachNames;
    const activeMaleCoaches = maleCoaches;
    const activeFemaleCoaches = femaleCoaches;

    if (normalizedPref === '不指定教練' || normalizedPref === '不指定') {
      candidates = activeCoachNames;
    } else if (normalizedPref === '男教練即可' || normalizedPref === '男即可') {
      candidates = activeMaleCoaches;
    } else if (normalizedPref === '女教練即可' || normalizedPref === '女即可') {
      candidates = activeFemaleCoaches;
    } else {
      candidates = [normalizedPref];
    }
  } else {
    if (normalizedPref === '不指定按摩師' || normalizedPref === '不指定') {
      candidates = REAL_THERAPISTS;
    } else if (normalizedPref === '男按摩師即可' || normalizedPref === '男按摩師') {
      candidates = maleTherapists;
    } else if (normalizedPref === '女按摩師即可' || normalizedPref === '女按摩師') {
      candidates = femaleTherapists;
    } else {
      candidates = [normalizedPref];
    }
  }

  // Apply specialization rules
  // 1. Mark cannot perform Oil/Aroma course (hasOilCourse)
  // 2. Only Kelly can perform Female Exclusive courses (hasFemaleExclusive)
  candidates = candidates.filter(name => {
    if (name === 'Mark' && hasOilCourse) return false;
    if (hasFemaleExclusive && name !== 'Kelly') return false;
    return true;
  });

  // 3. Exclude the logged-in therapist from candidates to prevent booking oneself
  let selfTherapistName: string | undefined = undefined;
  if (memberId) {
    const member = db.getMembers().find(m => m.id === memberId);
    if (member && member.therapistName) {
      selfTherapistName = member.therapistName;
    }
  }

  if (selfTherapistName) {
    candidates = candidates.filter(name => name !== selfTherapistName);
  }

  if (candidates.length === 0) {
    return { status: 'exceeds_shift', availableTherapists: [] };
  }

  let scheduleMatchCount = 0;
  const availableTherapists: string[] = [];
  let bookedTherapist: string | undefined = undefined;

  for (const tName of candidates) {
    const avail = availabilities.find(a => a.therapistName === tName && a.date === date);
    if (!avail || !avail.slots || avail.slots.length === 0) {
      continue;
    }

    const isInShift = isTimeRangeCovered(avail.slots, startMins, finishMins);

    if (!isInShift) {
      continue;
    }

    scheduleMatchCount++;

    // Check overlaps
    const overlaps = allOrders.some(o => {
      if (o.date !== date || o.status === 'cancelled' || o.status === 'no_show' || o.therapistPreference !== tName) return false;
      const oStart = timeToMins(o.time || '00:00');
      const oEnd = oStart + (o.totalDuration || 0) + 30;
      return startMins < oEnd && (startMins + requiredDuration + 30) > oStart;
    });

    if (!overlaps) {
      availableTherapists.push(tName);
    } else {
      bookedTherapist = tName;
    }
  }

  // If no scheduled therapist matches the requested time
  if (scheduleMatchCount === 0) {
    return { status: 'exceeds_shift', availableTherapists: [] };
  }

  if (availableTherapists.length > 0) {
    return { status: 'available', availableTherapists };
  }

  // If all scheduled candidates are booked, find the actual booked therapist's name
  if (!bookedTherapist) {
    const bookedNames = candidates.filter(tName => {
      return allOrders.some(o => {
        if (o.date !== date || o.status === 'cancelled' || o.status === 'no_show' || o.therapistPreference !== tName) return false;
        const oStart = timeToMins(o.time || '00:00');
        const oEnd = oStart + (o.totalDuration || 0) + 30;
        return startMins < oEnd && (startMins + requiredDuration + 30) > oStart;
      });
    });
    if (bookedNames.length > 0) {
      bookedTherapist = bookedNames[0];
    }
  }

  return {
    status: 'fully_booked',
    availableTherapists: [],
    bookedTherapist
  };
}

export function getSlotStatus(
  date: string, 
  timeStr: string, 
  requiredDuration: number, 
  allOrders: Order[], 
  memberId?: string, 
  therapistPref?: string, 
  availabilities: TherapistAvailability[] = [],
  hasOilCourse?: boolean,
  hasFemaleExclusive?: boolean
): SlotStatus {
  return getDetailedSlotStatus(
    date, 
    timeStr, 
    requiredDuration, 
    allOrders, 
    memberId, 
    therapistPref, 
    availabilities,
    hasOilCourse,
    hasFemaleExclusive
  ).status;
}

export function isSlotAvailable(
  date: string, 
  timeStr: string, 
  requiredDuration: number, 
  allOrders: Order[], 
  memberId?: string, 
  therapistPref?: string, 
  availabilities: TherapistAvailability[] = [],
  hasOilCourse?: boolean,
  hasFemaleExclusive?: boolean
): boolean {
  return getSlotStatus(
    date, 
    timeStr, 
    requiredDuration, 
    allOrders, 
    memberId, 
    therapistPref, 
    availabilities,
    hasOilCourse,
    hasFemaleExclusive
  ) === 'available';
}

export function isDayAvailable(date: string, availabilities: TherapistAvailability[] = [], therapistPref?: string, memberId?: string) {
  if (!date) return false;

  let selfTherapistName: string | undefined = undefined;
  if (memberId) {
    const member = db.getMembers().find(m => m.id === memberId);
    if (member && member.therapistName) {
      selfTherapistName = member.therapistName;
    }
  }

  const normalizedPref = therapistPref || '不指定按摩師';

  const allMembers = db.getMembers();
  const linkedMassageMembers = allMembers.filter(m =>
    !!m.therapistName && (
      m.selectedIdentities?.includes('therapist_in') ||
      (!m.selectedIdentities?.length && m.level === '店內按摩師')
    )
  );
  const maleTherapists = linkedMassageMembers.filter(m => m.gender === '男').map(m => m.therapistName as string);
  const femaleTherapists = linkedMassageMembers.filter(m => m.gender === '女').map(m => m.therapistName as string);
  const linkedTherapistNames = [...maleTherapists, ...femaleTherapists];
  const coachMembers = allMembers.filter(m =>
    !!m.therapistName && (
      m.selectedIdentities?.includes('coach_in') ||
      (!m.selectedIdentities?.length && m.level === '店內教練')
    )
  );
  const coachNames = coachMembers.map(m => m.therapistName as string);
  const maleCoaches = coachMembers.filter(m => m.gender === '男').map(m => m.therapistName as string);
  const femaleCoaches = coachMembers.filter(m => m.gender === '女').map(m => m.therapistName as string);

  const isFitness = normalizedPref.includes('教練') || normalizedPref === '不指定' || normalizedPref === '男即可' || normalizedPref === '女即可' || coachNames.includes(normalizedPref);

  if (isFitness) {
    const activeCoachNames = coachNames;
    const activeMaleCoaches = maleCoaches;
    const activeFemaleCoaches = femaleCoaches;

    if (normalizedPref === '不指定教練' || normalizedPref === '不指定') {
      return availabilities.some(a => 
        a.date === date && 
        (!selfTherapistName || a.therapistName !== selfTherapistName) && 
        activeCoachNames.includes(a.therapistName) &&
        a.slots && 
        a.slots.length > 0
      );
    }
    if (normalizedPref === '男教練即可' || normalizedPref === '男即可' || normalizedPref === '女教練即可' || normalizedPref === '女即可') {
      const isMale = normalizedPref.includes('男');
      let compatibleCoaches = isMale ? activeMaleCoaches : activeFemaleCoaches;
      if (selfTherapistName) {
        compatibleCoaches = compatibleCoaches.filter(t => t !== selfTherapistName);
      }
      return availabilities.some(a => a.date === date && compatibleCoaches.includes(a.therapistName) && a.slots && a.slots.length > 0);
    }

    if (selfTherapistName && normalizedPref === selfTherapistName) {
      return false;
    }
    return availabilities.some(a => a.therapistName === normalizedPref && a.date === date && a.slots && a.slots.length > 0);
  }

  if (normalizedPref === '不指定按摩師' || normalizedPref === '不指定') {
    return availabilities.some(a => 
      a.date === date && 
      (!selfTherapistName || a.therapistName !== selfTherapistName) && 
      linkedTherapistNames.includes(a.therapistName) &&
      a.slots && 
      a.slots.length > 0
    );
  }
  if (normalizedPref === '男按摩師即可' || normalizedPref === '女按摩師即可' || normalizedPref === '男按摩師' || normalizedPref === '女按摩師') {
    const isMale = normalizedPref.startsWith('男');
    let compatibleTherapists = isMale ? maleTherapists : femaleTherapists;
    
    if (selfTherapistName) {
      compatibleTherapists = compatibleTherapists.filter(t => t !== selfTherapistName);
    }
    
    return availabilities.some(a => a.date === date && compatibleTherapists.includes(a.therapistName) && a.slots && a.slots.length > 0);
  }
  
  if (selfTherapistName && normalizedPref === selfTherapistName) {
    return false;
  }
  
  return availabilities.some(a => a.therapistName === normalizedPref && a.date === date && a.slots && a.slots.length > 0);
}

export const ALL_TIME_SLOTS: string[] = [];
for (let h = 10; h <= 21; h++) {
  ALL_TIME_SLOTS.push(`${h}:00`);
  ALL_TIME_SLOTS.push(`${h}:30`);
}

export function getDiscountStatus(member: Member, orderDateStr: string, allOrders: Order[]) {
    const effectiveLevel = member.memberLevel || member.level;
    if (!member || !effectiveLevel || !['金卡', '黑卡'].includes(effectiveLevel)) return { maxTimes: 0, usedTimes: 0, isUsedUp: true, inbodyMaxTimes: 0, inbodyUsedTimes: 0, inbodyIsUsedUp: true };
    const maxTimes = effectiveLevel === '金卡' ? 1 : 4;
    const inbodyMaxTimes = effectiveLevel === '金卡' ? 1 : 4;
    const orderMonth = orderDateStr ? orderDateStr.substring(0, 7) : new Date().toISOString().substring(0, 7);
    
    let usedTimes = 0;
    let inbodyUsedTimes = 0;
    
    allOrders.forEach(o => {
      if (o.memberId === member.id && o.status !== 'cancelled' && (o.date?.substring(0, 7) === orderMonth)) {
         if (o.discountAmount > 0) {
             const hasMassageDiscount = o.discountFormula ? o.discountFormula.includes('1200') : true;
             const hasInBodyDiscount = o.discountFormula ? o.discountFormula.includes('InBody') : false;
             
             if (hasMassageDiscount && (!o.discountFormula || !o.discountFormula.includes('InBody') || o.discountAmount > 200)) usedTimes++;
             if (hasInBodyDiscount) inbodyUsedTimes++;
         }
      }
    });

    return {
        maxTimes,
        usedTimes,
        isUsedUp: usedTimes >= maxTimes,
        inbodyMaxTimes,
        inbodyUsedTimes,
        inbodyIsUsedUp: inbodyUsedTimes >= inbodyMaxTimes
    };
}

export function calculateDiscount(member: Member, orderDateStr: string, allOrders: Order[], currentItems: {name: string, duration: number, price: number}[]): { discount: number, formulaExp: string } {
  if (!member) return { discount: 0, formulaExp: '' };
  
  const effectiveDate = orderDateStr || new Date().toISOString().substring(0, 10);
  const status = getDiscountStatus(member, effectiveDate, allOrders);

  const inbodyItem = currentItems.find(i => i.name.includes('InBody'));
  const hasInBody = !!inbodyItem;
  const massageItems = currentItems.filter(i => !i.name.includes('InBody'));

  const massagePrice = massageItems.reduce((sum, item) => sum + item.price, 0);
  let discount = 0;
  let formulaParts = [];

  if (!status.isUsedUp && massagePrice > 1200) {
    const rest = massagePrice - 1200;
    discount += rest / 2;
    formulaParts.push(`首時(1200)+[(${massagePrice}-1200)*50%](半價)`);
  }

  if (hasInBody && !status.inbodyIsUsedUp) {
    discount += inbodyItem ? inbodyItem.price : 300;
    formulaParts.push(`InBody免費`);
  }

  return { discount, formulaExp: formulaParts.join(' , ') };
}
