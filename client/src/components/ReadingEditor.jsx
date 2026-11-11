import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  glucoseError,
  isCalendarDate,
  messages,
  slots,
} from '../../../shared/glucose.js';
import { useResource } from '../hooks/useResource.js';
import { api } from '../services/api.js';

export function Dialog({ title, onClose, busy, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2 id="dialog-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          disabled={busy}
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export default function ReadingEditor({
  reading,
  date: initialDate,
  today,
  preferredSlot,
  onClose,
  onSave,
}) {
  const [date, setDate] = useState(reading?.date ?? initialDate);
  const [slot, setSlot] = useState(
    reading?.slot ?? preferredSlot ?? slots[0].value,
  );
  const [value, setValue] = useState(reading ? String(reading.value) : '');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data: entries } = useResource(
    `/readings?date=${encodeURIComponent(date)}`,
  );

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const number =
      value.trim() === ''
        ? ''
        : /^\d+$/.test(value.trim())
          ? Number(value)
          : NaN;
    const invalid = glucoseError(number);
    if (!isCalendarDate(date))
      return setError({ field: 'date', message: 'Choose a valid date.' });
    if (date > today)
      return setError({ field: 'date', message: messages.future });
    if (invalid) return setError({ field: 'value', message: invalid });
    if (entries?.length === slots.length && reading?.date !== date) {
      return setError({ field: 'date', message: messages.fullDay });
    }
    if (
      entries?.some((entry) => entry.slot === slot && entry.id !== reading?.id)
    ) {
      return setError({ field: 'slot', message: messages.duplicate(slot) });
    }

    setBusy(true);
    try {
      await api(reading ? `/readings/${reading.id}` : '/readings', {
        method: reading ? 'PUT' : 'POST',
        body: { date, slot, value: number },
      });
      onSave(date, reading ? 'Reading updated.' : 'Reading added.');
    } catch (error) {
      setError(error);
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={reading ? 'Edit reading' : 'Add reading'}
      onClose={onClose}
      busy={busy}
    >
      <form className="form-stack" onSubmit={submit} noValidate>
        <label>
          Date
          <input
            type="date"
            value={date}
            max={today}
            min="0001-01-01"
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={error?.field === 'date'}
            required
          />
        </label>
        <label>
          Time slot
          <select
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
            aria-invalid={error?.field === 'slot'}
          >
            {slots.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Glucose value <span className="field-hint">(mg/dL)</span>
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. 105"
            aria-invalid={error?.field === 'value'}
            required
          />
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error.message}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save reading'}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
