export type MemberLevel = '一般' | '金卡' | '黑卡';
export type Gender = '男' | '女';
export type TherapistPreference = '不指定' | '阿翰' | 'Ricky' | 'Kelly' | 'Kenny' | 'Mark';

export interface Member {
  id: string; // phone is used as ID
  name: string;
  birthday: string;
  gender: Gender;
  level: MemberLevel;
  note?: string;
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
  discomfortAreas?: string[];
  createdAt: number;
}

export const COURSES = [
  { id: 'a1', category: '經絡按摩', name: '全身指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'a2', category: '芳療升級(悠風)', name: '芳療油推', time: 30, price: 700, allowUpgrade: false },
  { id: 'a3', category: '芳療升級(晴空)', name: '筋膜刀', time: 30, price: 900, allowUpgrade: false },
  { id: 'q1', category: '局部舒壓(霧羽)', name: '頭頸指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'q2', category: '局部舒壓(靜岩)', name: '腰臀指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'q3', category: '局部舒壓(暖泉)', name: '手部指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'q4', category: '局部舒壓(行雲)', name: '腿足指壓', time: 30, price: 600, allowUpgrade: false },
  { id: 'l1', category: '女性專屬', name: '櫻綻·豐胸調理', time: 60, price: 1600, allowUpgrade: false },
  { id: 'l2', category: '女性專屬', name: '月輪·小顏撥筋', time: 60, price: 1600, allowUpgrade: false }
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
  },
  
  updateMemberLevel: (id: string, level: MemberLevel) => {
    const members = db.getMembers();
    const member = members.find(x => x.id === id);
    if (member) {
      member.level = level;
      localStorage.setItem('zf_members', JSON.stringify(members));
    }
  },

  updateMemberNote: (id: string, note: string) => {
    const members = db.getMembers();
    const member = members.find(x => x.id === id);
    if (member) {
      member.note = note;
      localStorage.setItem('zf_members', JSON.stringify(members));
    }
  },

  updateMemberInfo: (oldId: string, name: string, gender: Gender, birthday: string, phone: string, level: MemberLevel) => {
    const members = db.getMembers();
    const idx = members.findIndex(x => x.id === oldId);
    if (idx >= 0) {
      members[idx].name = name || members[idx].name;
      members[idx].gender = gender || members[idx].gender;
      members[idx].birthday = birthday || members[idx].birthday;
      if (level) members[idx].level = level;
      if (phone && phone !== oldId) {
        members[idx].id = phone;
        const orders = db.getOrders();
        let changed = false;
        orders.forEach(o => {
          if (o.memberId === oldId) { o.memberId = phone; changed = true; }
        });
        if (changed) localStorage.setItem('zf_orders', JSON.stringify(orders));
      }
      localStorage.setItem('zf_members', JSON.stringify(members));
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
  },
  
  deleteOrder: (id: string) => {
    let orders = db.getOrders();
    orders = orders.filter(o => o.id !== id);
    localStorage.setItem('zf_orders', JSON.stringify(orders));
  },
  updateOrder: (id: string, updates: Partial<Order>) => {
    let orders = db.getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates };
      localStorage.setItem('zf_orders', JSON.stringify(orders));
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
      .filter(o => o.date === date)
      .map(o => {
          const start = timeToMins(o.time || '00:00');
          const end = start + (o.totalDuration || 0) + 30; // 30 mins buffer
          return { start, end };
      });
}

export function isSlotAvailable(date: string, timeStr: string, requiredDuration: number, allOrders: Order[]) {
  if (!date || !timeStr) return false;
  const startMins = timeToMins(timeStr);
  const endMins = startMins + requiredDuration + 30; 
  const booked = getBookedRanges(date, allOrders);
  
  for (let m = startMins; m < endMins; m += 30) {
      let overlaps = 0;
      for (const b of booked) {
          if (m >= b.start && m < b.end) {
              overlaps++;
          }
      }
      if (overlaps >= 3) {
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
    if (!member || !member.level || member.level === '一般') return { maxTimes: 0, usedTimes: 0, isUsedUp: true };
    const maxTimes = member.level === '金卡' ? 1 : 4;
    const orderMonth = orderDateStr ? orderDateStr.substring(0, 7) : new Date().toISOString().substring(0, 7);
    const usedTimes = allOrders.filter(o => 
      o.memberId === member.id && 
      o.discountAmount > 0 && 
      (o.date?.substring(0, 7) === orderMonth)
    ).length;
    return {
        maxTimes,
        usedTimes,
        isUsedUp: usedTimes >= maxTimes
    };
}

export function calculateDiscount(member: Member, orderDateStr: string, allOrders: Order[], currentItems: {duration: number, price: number}[]): { discount: number, formulaExp: string } {
  if (!member) return { discount: 0, formulaExp: '' };
  
  const effectiveDate = orderDateStr || new Date().toISOString().substring(0, 10);
  const status = getDiscountStatus(member, effectiveDate, allOrders);
  if (status.isUsedUp) return { discount: 0, formulaExp: '' };

  const originalPrice = currentItems.reduce((sum, item) => sum + item.price, 0);

  if (originalPrice > 1200) {
    const rest = originalPrice - 1200;
    const discount = rest / 2;
    return { discount, formulaExp: `1200 + ${rest} ÷ 2` };
  }

  return { discount: 0, formulaExp: '' };
}
