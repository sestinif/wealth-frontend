import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { buildComparison, RANGES } from '../utils/history';
import { formatDay, formatDayLong, pctText, TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } from '../utils/format';
import { TONE } from '../utils/marks';

const AXIS_TICK = { fill: '#9A9AA8', fontSize: 12 };
const PORTFOLIO_COLOR = '#EDEDF3';

// Returns laid over each other: the portfolio and any assets you switch on, all at 0 % on the
// same day, so the lines can be read against each other. The portfolio line is time-weighted:
// buying more never moves it, only prices do.
export default function ReturnsChart({ portfolio, options, prices, live, today }) {
  const [range, setRange] = useState('1Y');
  // VUAA and BTC start switched on (any other two if they are not held); the rest are one tap away.
  const [off, setOff] = useState(() => {
    const symbols = options.map(o => o.symbol);
    const on = ['VUAA', 'BTC'].filter(s => symbols.includes(s));
    symbols.forEach(s => { if (on.length < 2 && !on.includes(s)) on.push(s); });
    return Object.fromEntries(symbols.filter(s => !on.includes(s)).map(s => [s, true]));
  });

  const active = options.filter(o => !off[o.symbol]);
  const cmp = useMemo(
    () => buildComparison({ portfolio, symbols: active.map(o => o.symbol), prices, live, range, today }),
    [portfolio, active.map(o => o.symbol).join(','), prices, live, range, today],
  );

  const lines = [{ key: 'PORTFOLIO', name: 'Portfolio', color: PORTFOLIO_COLOR, width: 2.2 }]
    .concat(active.map(o => ({ key: o.symbol, name: o.symbol, color: o.color, width: 1.5 })));
  const nameOf = Object.fromEntries(lines.map(l => [l.key, l.name]));
  const toggle = (symbol) => setOff(o => ({ ...o, [symbol]: !o[symbol] }));
  const tone = (v) => (v == null ? '' : v >= 0 ? 'm-up' : 'm-down');

  return (
    <div className="m-card">
      <div className="m-nw__head">
        <div className="m-label">Returns</div>
        <div className="m-periods">
          {RANGES.map(([k]) => (
            <button key={k} type="button" className={`m-periods__btn ${range === k ? 'is-active' : ''}`} onClick={() => setRange(k)}>{k}</button>
          ))}
        </div>
      </div>

      <div className="m-legend">
        <span className="m-legend__item">
          <i style={{ background: PORTFOLIO_COLOR }} />Portfolio
          <b className={tone(cmp.last.PORTFOLIO)}>{cmp.last.PORTFOLIO != null ? pctText(cmp.last.PORTFOLIO) : '–'}</b>
        </span>
        {options.map(o => (
          <button key={o.symbol} type="button" className={`m-legend__item m-legend__btn ${off[o.symbol] ? 'is-off' : ''}`}
            aria-pressed={!off[o.symbol]} onClick={() => toggle(o.symbol)}>
            <i style={{ background: o.color }} />{o.symbol}
            <b className={tone(cmp.last[o.symbol])}>{!off[o.symbol] && cmp.last[o.symbol] != null ? pctText(cmp.last[o.symbol]) : ''}</b>
          </button>
        ))}
      </div>

      {cmp.rows.length > 1 ? (
        <div className="m-nw__chart">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cmp.rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={48} tickFormatter={formatDay} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${Math.round(v)}%`} domain={['auto', 'auto']} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                formatter={(v, k) => [pctText(v), nameOf[k] || k]} labelFormatter={(l) => formatDayLong(l)} />
              {lines.map(l => (
                <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={l.width} dot={false}
                  activeDot={{ r: 3.5, fill: l.color, stroke: '#1B1B24', strokeWidth: 1.5 }} connectNulls isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="m-empty">Not enough history to compare yet</div>}
      <div className="m-note">Every line starts at 0 % on {cmp.from ? formatDayLong(cmp.from) : 'the first day'}. The portfolio line leaves out the money you add.</div>
    </div>
  );
}
