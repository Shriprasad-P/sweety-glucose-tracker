import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { slots } from '../../../shared/glucose.js';
import { useSelectedDate } from '../hooks/useSelectedDate.js';
import { useResource } from '../hooks/useResource.js';
import { api } from '../services/api.js';
import { DateControl, StatePanel } from '../components/ui.jsx';
import ReadingList from '../components/ReadingList.jsx';
import ReadingEditor, { Dialog } from '../components/ReadingEditor.jsx';
import { displayDate } from '../utils/display.js';

export default function Readings() {
  const { date, today, setDate } = useSelectedDate();
  const readings = useResource(`/readings?date=${date}`);
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');

  function afterMutation(next, message) {
    setDate(next);
    readings.retry();
    setNotice(message);
  }

  async function confirmDelete() {
    setBusy(true);
    setDeleteError('');
    try {
      await api(`/readings/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      afterMutation(date, 'Reading deleted.');
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Readings</h1>
          <p className="muted">Add, edit, and review your glucose entries.</p>
        </div>
        <button
          type="button"
          className="button primary"
          onClick={() => setEditor({})}
        >
          <Plus size={18} aria-hidden="true" />
          Add reading
        </button>
      </header>
      <div className="date-bar">
        <DateControl
          date={date}
          today={today}
          onChange={(next) => {
            setDate(next);
            setNotice('');
          }}
        />
      </div>
      {notice && (
        <p className="notice" role="status">
          <Check size={17} aria-hidden="true" />
          {notice}
        </p>
      )}
      <section className="section" aria-labelledby="entries-title">
        <header className="section-head">
          <div>
            <h2 id="entries-title">{displayDate(date)}</h2>
            {readings.data && (
              <p className="muted">{readings.data.length} of 4 recorded</p>
            )}
          </div>
        </header>
        <StatePanel
          {...readings}
          empty={
            readings.data?.length === 0
              ? 'No readings recorded for this date.'
              : undefined
          }
        />
        {readings.data?.length > 0 && (
          <ReadingList
            readings={readings.data}
            onEdit={(reading) => setEditor({ reading })}
            onDelete={(reading) => {
              setDeleteError('');
              setDeleting(reading);
            }}
          />
        )}
      </section>

      {editor && (
        <ReadingEditor
          reading={editor.reading}
          date={date}
          today={today}
          preferredSlot={
            slots.find(
              ({ value }) =>
                !readings.data?.some((item) => item.slot === value),
            )?.value
          }
          onClose={() => setEditor(null)}
          onSave={(next, message) => {
            setEditor(null);
            afterMutation(next, message);
          }}
        />
      )}
      {deleting && (
        <Dialog
          title="Delete reading?"
          busy={busy}
          onClose={() => setDeleting(null)}
        >
          <p className="muted">
            Remove the{' '}
            {slots.find(({ value }) => value === deleting.slot).label} reading
            on {displayDate(deleting.date)}?
          </p>
          {deleteError && (
            <p className="error-text" role="alert">
              {deleteError}
            </p>
          )}
          <footer>
            <button
              type="button"
              className="button secondary"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button danger"
              onClick={confirmDelete}
              disabled={busy}
            >
              {busy ? 'Deleting…' : 'Delete reading'}
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
