/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Frontend from './Frontend';
import Backend from './Backend';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Dev toggle purely for demo purposes */}
      <div className="fixed bottom-4 right-4 z-50">
         <button 
           onClick={() => setIsAdmin(!isAdmin)}
           className="px-4 py-2 bg-stone-800/80 backdrop-blur-sm text-stone-200 rounded-full text-xs font-medium hover:bg-stone-900 shadow-xl border border-stone-700/50 transition flex items-center"
         >
           切換至 {isAdmin ? '前台顧客端' : '後台管理端'}
         </button>
      </div>

      {isAdmin ? <Backend /> : <Frontend />}
    </div>
  );
}
