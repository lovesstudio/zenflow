/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Frontend from './Frontend';
import Backend from './Backend';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestoreDb } from './firebase';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/backend';
  });
  const [canAccessBackend, setCanAccessBackend] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const user = JSON.parse(localStorage.getItem('zf_authed_user') || 'null');
      const loginPhone = localStorage.getItem('zf_login_phone');
      return (user?.role === 'admin' || user?.role === 'therapist') && user?.phone === loginPhone;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const refreshBackendAccess = () => {
      try {
        const user = JSON.parse(localStorage.getItem('zf_authed_user') || 'null');
        const loginPhone = localStorage.getItem('zf_login_phone');
        setCanAccessBackend((user?.role === 'admin' || user?.role === 'therapist') && user?.phone === loginPhone);
      } catch {
        setCanAccessBackend(false);
      }
    };
    window.addEventListener('zf-auth-change', refreshBackendAccess);
    window.addEventListener('storage', refreshBackendAccess);
    return () => {
      window.removeEventListener('zf-auth-change', refreshBackendAccess);
      window.removeEventListener('storage', refreshBackendAccess);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setIsAdmin(window.location.pathname === '/backend');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      if (window.location.pathname !== '/backend') {
        window.history.pushState({}, '', '/backend');
      }
    } else {
      if (window.location.pathname === '/backend') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    // Sync Firestore to localStorage for cross-device updates
    // The internal components already poll localStorage every second
    const unsubMembers = onSnapshot(collection(firestoreDb, 'members'), snapshot => {
      const mems = snapshot.docs.map(doc => doc.data());
      localStorage.setItem('zf_members', JSON.stringify(mems));
    }, error => {
      console.error('Error syncing members from Firestore:', error);
    });
    
    const unsubOrders = onSnapshot(collection(firestoreDb, 'orders'), snapshot => {
      const orders = snapshot.docs.map(doc => doc.data());
      localStorage.setItem('zf_orders', JSON.stringify(orders));
    }, error => {
      console.error('Error syncing orders from Firestore:', error);
    });

    const unsubAvail = onSnapshot(collection(firestoreDb, 'availability'), snapshot => {
      const avails = snapshot.docs.map(doc => doc.data());
      localStorage.setItem('zf_availability', JSON.stringify(avails));
    }, error => {
      console.error('Error syncing availability from Firestore:', error);
    });

    const unsubPromotions = onSnapshot(collection(firestoreDb, 'promotions'), snapshot => {
      const promotions = snapshot.docs.map(doc => doc.data());
      localStorage.setItem('zf_promotions', JSON.stringify(promotions));
    }, error => {
      console.error('Error syncing promotions from Firestore:', error);
    });

    return () => {
      unsubMembers();
      unsubOrders();
      unsubAvail();
      unsubPromotions();
    };
  }, []);

  return (
    <div className="min-h-screen">
      {(isAdmin || canAccessBackend) && (
      <div className="fixed bottom-4 right-4 z-50">
         <button 
           onClick={() => setIsAdmin(!isAdmin)}
           className="px-4 py-2 bg-stone-800/80 backdrop-blur-sm text-stone-200 rounded-full text-xs font-medium hover:bg-stone-900 shadow-xl border border-stone-700/50 transition flex items-center"
         >
           切換至 {isAdmin ? '前台顧客端' : '後台管理端'}
         </button>
      </div>
      )}

      {isAdmin ? <Backend /> : <Frontend onNavigateToBackend={() => setIsAdmin(true)} />}
    </div>
  );
}
