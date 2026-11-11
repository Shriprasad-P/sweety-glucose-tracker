import { useState } from 'react';
import { ArrowUpRight, Check, Coffee, Moon, Plus, Sun, Sunrise } from 'lucide-react';
import { Link } from 'react-router-dom';
import { slots } from '../../../shared/glucose.js';
import { useSession } from '../context/session.js';
import { useSelectedDate } from '../hooks/useSelectedDate.js';
import { useResource } from '../hooks/useResource.js';
import { DateControl, Metrics, StatePanel } from '../components/ui.jsx';
import ReadingEditor from '../components/ReadingEditor.jsx';
import { displayDate } from '../utils/display.js';

const icons = [Sunrise, Coffee, Sun, Moon];

export default function Dashboard() {
  const { user } = useSession();
  const { date, today, setDate } = useSelectedDate();
  const report = useResource(`/reports/daily?date=${date}`);
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const firstFree = slots.find(({ value }) => !report.data?.readings.some((reading) => reading.slot === value));
  const title = date === today ? 'Today’s reading slots' : 'Reading slots';

  return <>
    <header className="page-head">
      <div><h1>Overview</h1><p className="muted">Your personal blood glucose log.</p></div>
      <button type="button" className="button primary" onClick={() => setEditor(firstFree?.value ?? slots[0].value)}>
        <Plus size={18} aria-hidden="true" /> Add reading
      </button>
    </header>

    <div className="overview-banner">
      <div>
        <p className="banner-date">{displayDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <h2>Welcome, {user.name.split(/\s+/)[0]}.</h2>
      </div>
      <DateControl date={date} today={today} onChange={(next) => { setDate(next); setNotice(''); }} />
    </div>

    {notice && <p className="notice" role="status"><Check size={17} aria-hidden="true" />{notice}</p>}

    <section className="section" aria-labelledby="slot-title">
      <header className="section-head">
        <div><h2 id="slot-title">{title}</h2>
          {report.data && <p className="muted">{report.data.count} of 4 recorded</p>}
        </div>
        <Link className="inline-link" to={`/readings?date=${date}`}>Manage readings <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </header>
      <StatePanel {...report} />
      {report.data && <div className="slot-grid">
        {slots.map(({ value, label }, index) => {
          const entry = report.data.readings.find((reading) => reading.slot === value);
          const Icon = icons[index];
          return <article className="slot-card" key={value}>
            <span className="slot-icon"><Icon size={20} aria-hidden="true" /></span>
            <h3>{label}</h3>
            {entry ? <p className="slot-value">{entry.value} <span>mg/dL</span></p> :
              <button type="button" className="slot-add" onClick={() => setEditor(value)} aria-label={`Add ${label}`}>
                <Plus size={16} aria-hidden="true" /> Add reading
              </button>}
          </article>;
        })}
      </div>}
    </section>

    <section className="section" aria-labelledby="summary-title">
      <header className="section-head">
        <h2 id="summary-title">Daily summary</h2>
        <Link className="inline-link" to={`/reports?date=${date}`}>View reports <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </header>
      <StatePanel {...report} empty={report.data?.count === 0 ? 'Add a reading to see your daily summary.' : undefined} />
      {report.data?.count > 0 && <Metrics report={report.data} />}
    </section>

    {editor && <ReadingEditor date={date} today={today} preferredSlot={editor} onClose={() => setEditor(null)} onSave={(next, message) => {
      setEditor(null);
      setDate(next);
      report.retry();
      setNotice(message);
    }} />}
  </>;
}
