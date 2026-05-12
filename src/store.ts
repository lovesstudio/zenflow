import { firestoreDb } from './firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export type MemberLevel = '一般' | '金卡' | '黑卡';
export type Gender = '男' | '女';
export type TherapistPreference = '不指定按摩師' | '阿翰(男)' | 'Ricky(男)' | 'Kenny(男)' | 'Mark(男)' | '男按摩師即可' | 'Alice(女)' | 'Kelly(女)' | 'Miki(女)' | '女按摩師即可' | '不指定' | '阿翰' | 'Ricky' | 'Kelly' | 'Kenny' | 'Mark' | '男按摩師' | '女按摩師';

export interface Member {
  id: string; // phone is used as ID
  name: string;
  birthday: string;
  gender: Gender;
  level: MemberLevel;
  lineId?: string;
  note?: string;
  referredBy?: string;
  referredMonth?: string;
  primaryTherapist?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  createdAt: number;
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
  status?: 'pending' | 'completed' | 'cancelled';
  therapistPreference: TherapistPreference;
  items: OrderItem[];
  totalDuration: number;
  originalPrice: number;
  discountAmount: number;
  discountFormula?: string;
  finalPrice: number;
  paymentMethod?: string;
  note?: string;
  isAssignedByShop?: boolean;
  isConfirmed?: boolean;
  discomfortAreas?: string[];
  createdAt: number;
}

export const COURSES = [
  { id: 'a1', category: '經絡按摩', name: '全身指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'a2', category: '芳療升級(悠風)', name: '芳療油推', time: 30, price: 700, allowUpgrade: false },
  { id: 'a3', category: '運動按摩(晴空)', name: '筋膜刀', time: 30, price: 900, allowUpgrade: false },
  { id: 'q1', category: '局部舒壓(霧羽)', name: '頭頸指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'q2', category: '局部舒壓(靜岩)', name: '腰臀指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'q3', category: '局部舒壓(暖泉)', name: '手部指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'q4', category: '局部舒壓(行雲)', name: '腿足指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'l1', category: '女性專屬', name: '櫻綻·豐胸調理', time: 60, price: 1600, allowUpgrade: false },
  { id: 'l2', category: '女性專屬', name: '月輪·小顏撥筋', time: 60, price: 1600, allowUpgrade: false },
  { id: 'i1', category: '健康量測', name: 'InBody量測與解說', time: 30, price: 200, allowUpgrade: false }
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

  updateMemberInfo: (oldId: string, name: string, gender: Gender, birthday: string, phone: string, level: MemberLevel, lineId?: string, referredBy?: string, referredMonth?: string, primaryTherapist?: string, membershipStartDate?: string, membershipEndDate?: string) => {
    const members = db.getMembers();
    const idx = members.findIndex(x => x.id === oldId);
    if (idx >= 0) {
      const updatedMember = { ...members[idx], name: name || members[idx].name, gender: gender || members[idx].gender, birthday: birthday || members[idx].birthday };
      if (lineId !== undefined) updatedMember.lineId = lineId;
      if (level !== undefined) updatedMember.level = level;
      if (referredBy !== undefined) updatedMember.referredBy = referredBy;
      if (referredMonth !== undefined) updatedMember.referredMonth = referredMonth;
      if (primaryTherapist !== undefined) updatedMember.primaryTherapist = primaryTherapist;
      if (membershipStartDate !== undefined) updatedMember.membershipStartDate = membershipStartDate;
      if (membershipEndDate !== undefined) updatedMember.membershipEndDate = membershipEndDate;
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
      .filter(o => o.date === date && o.status !== 'cancelled')
      .map(o => {
          const start = timeToMins(o.time || '00:00');
          const end = start + (o.totalDuration || 0) + 30; // 30 mins buffer
          return { start, end };
      });
}

export function sortOrderItems<T extends {name: string, duration?: number, price?: number}>(items: T[]): T[] {
  const getWeight = (name: string) => {
    if (name.includes('指壓') || name.includes('豐胸') || name.includes('小顏') || name.includes('局部')) return 1;
    if (name.includes('油推')) return 2;
    if (name.includes('筋膜刀')) return 3;
    if (name.includes('InBody')) return 4;
    return 5;
  };
  return [...items].sort((a, b) => getWeight(a.name) - getWeight(b.name));
}

export function isSlotAvailable(date: string, timeStr: string, requiredDuration: number, allOrders: Order[], memberId?: string, therapistPref?: string) {
  if (!date || !timeStr) return false;
  const startMins = timeToMins(timeStr);

  const today = new Date();
  const slotDateObj = new Date(date);
  
  if (
    today.getFullYear() === slotDateObj.getFullYear() &&
    today.getMonth() === slotDateObj.getMonth() &&
    today.getDate() === slotDateObj.getDate()
  ) {
    const currentMins = today.getHours() * 60 + today.getMinutes();
    if (startMins < currentMins + 60) {
      return false;
    }
  }

  const finishMins = startMins + requiredDuration;
  if (finishMins > (22 * 60)) return false; // Ensure service ends by 22:00
  
  const endMins = startMins + requiredDuration + 30; // +30 for the overlap check buffer
  
  // Get existing overlapping orders
  const intersectingOrders = allOrders.filter(o => o.date === date && o.status !== 'cancelled').map(o => {
    return {
      order: o,
      start: timeToMins(o.time || '00:00'),
      end: timeToMins(o.time || '00:00') + (o.totalDuration || 0) + 30
    }
  });

  for (let m = startMins; m < endMins; m += 30) {
      let overlaps = 0;
      let hasSameMember = false;
      let hasSameTherapist = false;

      for (const b of intersectingOrders) {
          if (m >= b.start && m < b.end) {
              overlaps++;
              if (memberId && b.order.memberId === memberId) {
                  hasSameMember = true;
              }
              if (therapistPref && therapistPref !== '不指定按摩師' && b.order.therapistPreference === therapistPref) {
                  hasSameTherapist = true;
              }
          }
      }
      
      if (overlaps >= 5 || hasSameMember || hasSameTherapist) {
          return false;
      }
  }
  return true;
}

export const ALL_TIME_SLOTS: string[] = [];
for (let h = 10; h <= 21; h++) {
  ALL_TIME_SLOTS.push(`${h}:00`);
  ALL_TIME_SLOTS.push(`${h}:30`);
}

export function getDiscountStatus(member: Member, orderDateStr: string, allOrders: Order[]) {
    if (!member || !member.level || member.level === '一般') return { maxTimes: 0, usedTimes: 0, isUsedUp: true, inbodyMaxTimes: 0, inbodyUsedTimes: 0, inbodyIsUsedUp: true };
    const maxTimes = member.level === '金卡' ? 1 : 4;
    const inbodyMaxTimes = member.level === '金卡' ? 1 : 4;
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

  const hasInBody = currentItems.some(i => i.name === 'InBody量測與解說');
  const massageItems = currentItems.filter(i => i.name !== 'InBody量測與解說');

  const massagePrice = massageItems.reduce((sum, item) => sum + item.price, 0);
  let discount = 0;
  let formulaParts = [];

  if (!status.isUsedUp && massagePrice > 1200) {
    const rest = massagePrice - 1200;
    discount += rest / 2;
    formulaParts.push(`首時(1200)+[(${massagePrice}-1200)*50%](半價)`);
  }

  if (hasInBody && !status.inbodyIsUsedUp) {
    discount += 200;
    formulaParts.push(`InBody免費`);
  }

  return { discount, formulaExp: formulaParts.join(' , ') };
}
