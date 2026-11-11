import { Pencil, Trash2 } from 'lucide-react';
import { slots } from '../../../shared/glucose.js';

export default function ReadingList({ readings, onEdit, onDelete }) {
  return <ul className="reading-list">
    {readings.map((reading) => {
      const label = slots.find(({ value }) => value === reading.slot).label;
      return <li key={reading.id}>
        <div className="reading-label">{label}</div>
        <div className="reading-value">{reading.value} <span>mg/dL</span></div>
        {onEdit && <div className="row-actions">
          <button type="button" className="icon-button" aria-label={`Edit ${label}`} title="Edit" onClick={() => onEdit(reading)}>
            <Pencil size={17} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button danger-icon" aria-label={`Delete ${label}`} title="Delete" onClick={() => onDelete(reading)}>
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>}
      </li>;
    })}
  </ul>;
}
