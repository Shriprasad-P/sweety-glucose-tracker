import {
  Activity,
  ArrowDown,
  ArrowUp,
  Droplet,
  Gauge,
  Hash,
} from 'lucide-react';

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Droplet size={19} aria-hidden="true" />
      </span>
      <span>Sweety</span>
    </div>
  );
}

export function DateControl({ date, today, onChange }) {
  return (
    <label className="date-control">
      <span>Selected date</span>
      <input
        type="date"
        min="0001-01-01"
        max={today}
        value={date}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function StatePanel({ loading, error, retry, empty }) {
  if (loading)
    return (
      <div className="state-panel" role="status">
        Loading…
      </div>
    );
  if (error)
    return (
      <div className="state-panel" role="alert">
        <p>{error}</p>
        {retry && (
          <button className="button secondary" type="button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  if (empty)
    return (
      <div className="state-panel">
        <Activity size={25} aria-hidden="true" />
        <p>{empty}</p>
      </div>
    );
  return null;
}

export function Metrics({ report }) {
  const metrics = [
    { label: 'Average', value: report.average?.toFixed(1), icon: Gauge },
    { label: 'Lowest', value: report.lowest, icon: ArrowDown },
    { label: 'Highest', value: report.highest, icon: ArrowUp },
    { label: 'Readings', value: report.count, icon: Hash },
  ];
  return (
    <dl className="metrics">
      {metrics.map(({ label, value, icon: Icon }) => (
        <div className="metric" key={label}>
          <dt>
            <Icon size={16} aria-hidden="true" />
            {label}
          </dt>
          <dd>
            {value ?? '—'}
            {label !== 'Readings' && value != null && <span>mg/dL</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
