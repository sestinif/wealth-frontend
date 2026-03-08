import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { api } from '../api.js';

export default function Diary() {
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [asset, setAsset] = useState('BTC');
  const [amountEur, setAmountEur] = useState('');
  const [priceEur, setPriceEur] = useState(''); // EUR per VUAA, EUR per BTC (convertito da USD)
  const [priceUsd, setPriceUsd] = useState(''); // USD solo per BTC
  const [notes, setNotes] = useState('');
  const [useLivePrice, setUseLivePrice] = useState(true);
  const [filterAsset, setFilterAsset] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, purchasesData, pricesData] = await Promise.all([
          api.getMe(),
          api.getPurchases(),
          api.getPrices()
        ]);
        setUser(userData);
        setPurchases(purchasesData);
        setPrices(pricesData);

        if (useLivePrice && asset) {
          setPriceEur(pricesData[asset] || '');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (useLivePrice) {
      if (asset === 'BTC') {
        setPriceUsd(prices.BTC_USD || '');
        setPriceEur(prices.BTC || '');
      } else {
        setPriceEur(prices[asset] || '');
        setPriceUsd('');
      }
    }
  }, [asset, useLivePrice, prices]);

  // Per BTC: quantità = amountEur / priceEur (prezzo BTC in EUR)
  const quantity = amountEur && priceEur ? (parseFloat(amountEur) / parseFloat(priceEur)).toFixed(8) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !asset || !amountEur || !priceEur) {
      setError('Completa tutti i campi');
      return;
    }

    setSubmitting(true);
    try {
      const usd = asset === 'BTC' ? parseFloat(priceUsd) || 0 : 0;
      await api.addPurchase(date, asset, parseFloat(amountEur), parseFloat(priceEur), notes, usd);
      const updatedPurchases = await api.getPurchases();
      setPurchases(updatedPurchases);
      setAmountEur('');
      setPriceEur('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePurchase(id);
      const updatedPurchases = await api.getPurchases();
      setPurchases(updatedPurchases);
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B85A8' }}>Loading...</div>;
  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#FF5252' }}>Error loading data</div>;

  const filteredPurchases = filterAsset === 'ALL' ? purchases : purchases.filter(p => p.asset === filterAsset);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D0B21' }}>
      <Sidebar username={user.username} />
      <div style={{ flex: 1, marginLeft: '220px', marginTop: '70px' }}>
        <Topbar title="Diario" username={user.username} />
        
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(26, 23, 53, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aggiungi Acquisto</h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Data</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(139, 92, 246, 0.05)',
                      border: '1px solid rgba(139, 92, 246, 0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Asset</label>
                  <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(139, 92, 246, 0.05)',
                      border: '1px solid rgba(139, 92, 246, 0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  >
                    <option value="BTC">BTC</option>
                    <option value="VUAA">VUAA</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Importo EUR</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountEur}
                    onChange={(e) => setAmountEur(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(139, 92, 246, 0.05)',
                      border: '1px solid rgba(139, 92, 246, 0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>

                {asset === 'BTC' ? (
                  <div>
                    <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Prezzo BTC (USD $)</label>
                    <input
                      type="number"
                      step="1"
                      value={priceUsd}
                      onChange={(e) => {
                        setPriceUsd(e.target.value);
                        // Aggiorna anche priceEur se cambia manualmente USD (usa cambio approssimativo)
                        if (prices.BTC && prices.BTC_USD && parseFloat(e.target.value) > 0) {
                          const rate = prices.BTC / prices.BTC_USD;
                          setPriceEur((parseFloat(e.target.value) * rate).toFixed(2));
                        }
                      }}
                      placeholder="es. 85000"
                      disabled={useLivePrice}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(139, 92, 246, 0.05)',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                        borderRadius: '10px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        outline: 'none',
                        opacity: useLivePrice ? 0.6 : 1
                      }}
                    />
                    {priceEur && <div style={{ fontSize: '10px', color: '#8B85A8', marginTop: '4px' }}>≈ € {parseFloat(priceEur).toLocaleString('it-IT', { minimumFractionDigits: 0 })}</div>}
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Prezzo EUR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={priceEur}
                      onChange={(e) => setPriceEur(e.target.value)}
                      placeholder="0.00"
                      disabled={useLivePrice}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(139, 92, 246, 0.05)',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                        borderRadius: '10px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        outline: 'none',
                        opacity: useLivePrice ? 0.6 : 1
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <input
                  type="checkbox"
                  checked={useLivePrice}
                  onChange={(e) => setUseLivePrice(e.target.checked)}
                  id="livePrice"
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="livePrice" style={{ fontSize: '12px', color: '#8B85A8', fontWeight: '500', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  USA PREZZO LIVE
                </label>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Note</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Aggiungi una nota..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(139, 92, 246, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {error && (
                <div style={{
                  color: '#FF5252',
                  fontSize: '12px',
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(255, 82, 82, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 82, 82, 0.3)'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Quantita: <span style={{ color: '#8B5CF6' }}>{quantity}</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    opacity: submitting ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {submitting ? 'AGGIUNTA IN CORSO...' : 'AGGIUNGI'}
                </button>
              </div>
            </form>
          </div>

          <div style={{
            background: 'rgba(26, 23, 53, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acquisti</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['ALL', 'BTC', 'VUAA'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterAsset(f)}
                    style={{
                      padding: '6px 12px',
                      background: filterAsset === f ? 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)' : 'rgba(139, 92, 246, 0.1)',
                      color: '#FFFFFF',
                      border: filterAsset === f ? 'none' : '1px solid rgba(139, 92, 246, 0.15)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asset</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Importo</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantita</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prezzo</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase, idx) => (
                  <tr key={purchase.id} style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)', backgroundColor: idx % 2 === 0 ? 'rgba(139, 92, 246, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px', color: '#FFFFFF' }}>{new Date(purchase.date).toLocaleDateString('it-IT')}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: purchase.asset === 'BTC' ? 'rgba(247, 147, 26, 0.2)' : 'rgba(0, 188, 212, 0.2)', color: purchase.asset === 'BTC' ? '#F7931A' : '#00BCD4', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                        {purchase.asset}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#FFFFFF' }}>€ {purchase.amount_eur.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#8B85A8' }}>{purchase.quantity.toFixed(4)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#8B85A8' }}>€ {purchase.price_eur.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {deleteConfirm === purchase.id ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleDelete(purchase.id)}
                            style={{ padding: '4px 8px', background: '#FF5252', color: '#FFFFFF', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase' }}
                          >
                            Si
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            style={{ padding: '4px 8px', background: 'rgba(139, 92, 246, 0.2)', color: '#8B85A8', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase' }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(purchase.id)}
                          style={{ padding: '4px 8px', background: 'rgba(255, 82, 82, 0.1)', color: '#FF5252', border: '1px solid rgba(255, 82, 82, 0.3)', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase' }}
                        >
                          Elimina
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
