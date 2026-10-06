import React, { useState } from 'react';
import Icon from './Icon';
import AccountsSheet from './AccountsSheet';

// Log Out lives in the sidebar footer now — the top edge stays quiet.
export default function Topbar({ title, username, onMenu }) {
  const isMac = navigator.platform?.includes('Mac');
  const [accountsOpen, setAccountsOpen] = useState(false);

  return (
    <div className="topbar">
      <div className="topbar__left">
        <button className="topbar__menu" onClick={onMenu} aria-label="Menu"><Icon name="menu" size={18} /></button>
        <div className="topbar__title">{title}</div>
      </div>
      <div className="topbar__right">
        <span className="cmdk-hint" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
          {isMac ? '⌘' : 'Ctrl+'}K
        </span>
        <span className="topbar__username">{username}</span>
        <button type="button" className="m-topbtn" onClick={() => setAccountsOpen(true)} aria-label="Accounts" title="Banks and brokers">
          <Icon name="bank" size={18} />
        </button>
      </div>
      <AccountsSheet open={accountsOpen} onClose={() => setAccountsOpen(false)} />
    </div>
  );
}
