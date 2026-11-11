import { useState } from 'react';
import { useSelectedDate } from '../hooks/useSelectedDate.js';
import { useResource } from '../hooks/useResource.js';
import { DateControl, Metrics, StatePanel } from '../components/ui.jsx';
import ReadingList from '../components/ReadingList.jsx';
import { displayDate } from '../utils/display.js';

const reports = [
  { kind: 'daily', label: 'Daily' },
  { kind: 'month-to-date', label: 'Month to date' },
  { kind: 'monthly', label: 'Previous month' },
];

export default function Reports() {
  const { date, today, setDate } = useSelectedDate();
  const [kind, setKind] = useState('daily');
  const report = useResource(`/reports/${kind}?date=${date}`);
  const range =
    report.data &&
    (report.data.start === report.data.end
      ? displayDate(report.data.start)
      : `${displayDate(report.data.start)} – ${displayDate(report.data.end)}`);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="muted">Review your glucose readings over time.</p>
        </div>
        <DateControl date={date} today={today} onChange={setDate} />
      </header>
      <div className="report-controls" role="group" aria-label="Report period">
        {reports.map(({ kind: value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="section" aria-labelledby="report-title">
        <header className="section-head">
          <div>
            <h2 id="report-title">
              {reports.find((item) => item.kind === kind).label}
            </h2>
            {range && <p className="muted">{range}</p>}
          </div>
        </header>
        <StatePanel
          {...report}
          empty={
            report.data?.count === 0
              ? 'No readings recorded in this period.'
              : undefined
          }
        />
        {report.data?.count > 0 && <Metrics report={report.data} />}
      </section>
      {kind === 'daily' && report.data?.readings.length > 0 && (
        <section className="section" aria-labelledby="report-entries">
          <header className="section-head">
            <h2 id="report-entries">Readings by time slot</h2>
          </header>
          <ReadingList readings={report.data.readings} />
        </section>
      )}
    </>
  );
}
