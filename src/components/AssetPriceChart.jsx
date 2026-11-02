import React, { useEffect, useMemo, useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import { ASSET_RANGES, buildAssetSeries, changePct, isIntraday } from '../utils/assetChart';
import { formatEUR, pctText, TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } from '../utils/format';

const AXIS_TICK = { fill: '#9A9AA8', fontSize: 13 };
const EN = 'en-GB';

const eurTick = (v) => {
  const n = Number(v) || 0;
  // A day or a week barely moves a big price: "€76k" twice in a row says nothing, so write it whole.
  if (n >= 1000) return `€${Math.round(n).toLocaleString('en-US')}`;
  if (n >= 10) return `€${Math.round(n)}`;
  return `€${n.toFixed(n >= 1 ? 2 : 4)}`;
};

const tickFor = (range) => (ms) => {
  const d = new Date(ms);
  if (range === '1D') return d.toLocaleTimeString(EN, { hour: '2-digit', minute: '2-digit' });
  if (range === '7D') return d.toLocaleDateString(EN, { weekday: 'short', day: 'numeric' });
  if (range === '1M') return d.toLocaleDateString(EN, { month: 'short', day: 'numeric' });
  return d.toLocaleDateString(EN, { month: 'short', year: '2-digit' });
};
const labelFor = (range) => (ms) => {
  const d = new Date(ms);
  return isIntraday(range)
    ? d.toLocaleString(EN, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(EN, { day: 'numeric', month: 'short', year: 'numeric' });
};

// Daily closes of every asset, read once and kept for ten minutes: the server has them cached too.
let dailyCache = null;
const loadDaily = async () => {
  if (dailyCache && Date.now() - dailyCache.at < 10 * 60 * 1000) return dailyCache.assets;
  const h = await api.getPriceHistory();
  if (h.complete) dailyCache = { at: Date.now(), assets: h.assets || {} };
  return h.assets || {};
};

// The price of the asset alone (not your portfolio) over 1D / 7D / 1M / 1Y.
export default function AssetPriceChart({ symbol, color, live }) {
  const [range, setRange] = useState('1D');
  const [raw, setRaw] = useState(null);       // null while loading, otherwise the answer for (symbol, range)
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setRaw(null); setFailed(false);
    const job = isIntraday(range)
      ? api.getIntradayPrices(symbol, range).then(r => ({ intraday: r.points || [] }))
      : loadDaily().then(all => ({ daily: all[symbol]?.points || [] }));
    job.then(r => { if (alive) setRaw(r); }).catch(() => { if (alive) { setFailed(true); setRaw({}); } });
    return () => { alive = false; };
  }, [symbol, range]);

  const rows = useMemo(
    () => (raw ? buildAssetSeries({ range, ...raw, live }) : []),
    [raw, range, live],
  );
  const move = changePct(rows);
  const tick = tickFor(range);

  return (
    <div className="m-assetchart">
      <div className="m-nw__head">
        <div className="m-pricehead">
          {rows.length > 1 && (
            <>
              <span className="m-label">{symbol} price</span>
              <span>{formatEUR(rows[rows.length - 1].price, rows[rows.length - 1].price < 1 ? 4 : 2)}</span>
              {move != null && <span className={move >= 0 ? 'm-up' : 'm-down'}>{pctText(move)}</span>}
            </>
          )}
        </div>
        <div className="m-periods">
          {ASSET_RANGES.map(k => (
            <button key={k} type="button" className={`m-periods__btn ${range === k ? 'is-active' : ''}`}
              aria-pressed={range === k} onClick={() => setRange(k)}>{k}</button>
          ))}
        </div>
      </div>
      <div className="m-nw__chart" style={{ minHeight: 180 }}>
        {raw == null ? <div className="m-empty">Loading…</div>
          : rows.length < 2 ? <div className="m-empty">{failed ? 'Prices are not available right now' : `No ${range} prices for ${symbol} yet`}</div>
          : (
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tick={AXIS_TICK}
                  tickLine={false} axisLine={false} minTickGap={48} tickFormatter={tick} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={62} tickFormatter={eurTick} domain={['auto', 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
                  cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                  formatter={(v) => [formatEUR(v, v < 1 ? 4 : 2), 'Price']} labelFormatter={labelFor(range)} />
                <Line type="monotone" dataKey="price" stroke={color} strokeWidth={1.75} dot={false}
                  activeDot={{ r: 3.5, fill: color, stroke: '#1B1B24', strokeWidth: 1.5 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
      </div>
    </div>
  );
}
