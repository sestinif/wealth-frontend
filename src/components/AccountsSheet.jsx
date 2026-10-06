import React, { useEffect, useState } from 'react';
import DetailSheet from './DetailSheet';
import Avatar from './Avatar';
import Icon from './Icon';
import { api } from '../api.js';
import { ACCOUNT_GROUPS, balanceFor, logoUrl } from '../utils/accounts';
import { formatEUR, formatUSD } from '../utils/format';

// Banks and brokers, one tap from any page. Each row opens the provider's own
// login page in a new tab; where Wealth already tracks a balance, it shows it.
export default function AccountsSheet({ open, onClose }) {
  const [external, setExternal] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    api.getNetWorth()
      .then(nw => { if (alive) setExternal(nw?.external_accounts || []); })
      .catch(() => { /* balances are a bonus: the links work without them */ });
    return () => { alive = false; };
  }, [open]);

  return (
    <DetailSheet open={open} onClose={onClose} title="Accounts" subtitle="Banks and brokers">
      {ACCOUNT_GROUPS.map(group => (
        <section key={group.key}>
          <div className="m-sheet__group">{group.label}</div>
          {group.items.map(item => {
            const bal = balanceFor(item.match, external);
            return (
              <a key={item.name} className="m-acct" href={item.url} target="_blank" rel="noopener noreferrer">
                <Avatar src={logoUrl(item.logoDomain || item.domain)} label={item.name} />
                <span className="m-acct__main">
                  <span className="m-acct__name">{item.name}</span>
                  <span className="m-acct__domain">{item.domain}</span>
                </span>
                <span className="m-acct__bal">{bal ? (bal.currency === 'USD' ? formatUSD : formatEUR)(bal.amount) : ''}</span>
                <span className="m-acct__go"><Icon name="external" size={15} /></span>
              </a>
            );
          })}
        </section>
      ))}
    </DetailSheet>
  );
}
