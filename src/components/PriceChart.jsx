import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer } from 'recharts';
import { buildPriceChart, RANGES } from '../utils/history';
import { formatDay, formatDayLong, formatEUR, pctText, TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } from '../utils/format';

const AXIS_TICK = { fill: '#9A9AA8', fontSize: 12 };

// Prices below €1 (dex tokens) need decimals; everything else reads better without.
const eurTick = (v) => {
  const n = Number(v) || 0;
  if (n >= 1000) return `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  if (n >= 10) return `€${Math.round(n)}`;
  return `€${n.toFixed(n >= 1 ? 2 : 4)}`;
};

// One asset's price with its 50- and 200-day averages and the days you bought.
export default function PriceChart({ options, prices, live, purchases, today }) {
  const [symbol, setSymbol] = useState(options[0]?.symbol);
  const [range, setRange] = useState('1Y');
  const current = options.find(o => o.symbol === symbol) || options[0];

  const chart = useMemo(
    () => (current ? buildPriceChart({ symbol: current.symbol, prices, live, purchases, range, today }) : { rows: [], buys: [], avgCost: null }),
    [current?.symbol, prices, live, purchases, range, today],
  );
  const last = chart.rows[chart.rows.length - 1];
  const vsCost = last && chart.avgCost ? ((last.close / chart.avgCost) - 1) * 100 : null;

  return (
    <div className="m-card">
      <div className="m-nw__head">
        <div className="m-label">Price and Trend</div>
        <div className="m-periods">
          {RANGES.map(([k]) => (
            <button key={k} type="button" className={`m-periods__btn ${range === k ? 'is-active' : ''}`} onClick={() => setRange(k)}>{k}</button>
          ))}
        </div>
      </div>

      <p className="m-explain">The price of one asset. The thin line is its average over the last 50 days and the dotted one over 200 days: when the price sits above them, the trend is up. Rings are the days you bought, and the dashed line is what you paid on average.</p>

      <div className="m-legend">
        {options.map(o => (
          <button key={o.symbol} type="button" className={`m-legend__item m-legend__btn ${o.symbol === current?.symbol ? '' : 'is-off'}`}
            aria-pressed={o.symbol === current?.symbol} onClick={() => setSymbol(o.symbol)}>
            <i style={{ background: o.color }} />{o.symbol}
          </button>
        ))}
      </div>

      {last ? (
        <>
          <div className="m-pricehead">
            <span className="m-pricehead__value">{formatEUR(last.close, last.close < 1 ? 4 : 2)}</span>
            {vsCost != null && (
              <span className={vsCost >= 0 ? 'm-up' : 'm-down'}>{pctText(vsCost)} <span className="m-label">vs your average cost {formatEUR(chart.avgCost, chart.avgCost < 1 ? 4 : 2)}</span></span>
            )}
          </div>
          <div className="m-nw__chart">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chart.rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={48} tickFormatter={formatDay} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} tickFormatter={eurTick} domain={['auto', 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
                  cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                  formatter={(v, k) => [v == null ? '–' : formatEUR(v, v < 1 ? 4 : 2), k === 'close' ? 'Price' : k === 'sma50' ? '50-day average' : '200-day average']}
                  labelFormatter={(l) => formatDayLong(l)} />
                {chart.avgCost && <ReferenceLine y={chart.avgCost} stroke="rgba(255,255,255,0.28)" strokeDasharray="4 4" />}
                <Line type="monotone" dataKey="sma200" stroke="#9A9AA8" strokeWidth={1.25} strokeDasharray="2 3" dot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="sma50" stroke="#EDEDF3" strokeWidth={1.25} strokeOpacity={0.7} dot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="close" stroke={current.color} strokeWidth={1.75} dot={false}
                  activeDot={{ r: 3.5, fill: current.color, stroke: '#1B1B24', strokeWidth: 1.5 }} isAnimationActive={false} />
                {chart.buys.map((b, i) => (
                  <ReferenceDot key={`${b.date}-${i}`} x={b.date} y={b.price} r={3.5} fill="#1B1B24" stroke={current.color} strokeWidth={1.75} ifOverflow="extendDomain" />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="m-note">
            <span className="m-key m-key--solid" style={{ background: current.color }} />Price
            <span className="m-key m-key--line" />50-day average
            <span className="m-key m-key--dots" />200-day average
            <span className="m-key m-key--ring" style={{ borderColor: current.color }} />Your purchases
          </div>
        </>
      ) : <div className="m-empty">No price history for {current?.symbol || 'this asset'} yet</div>}
    </div>
  );
}
