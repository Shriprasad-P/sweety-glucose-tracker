import { useSearchParams } from 'react-router-dom';
import { calendarToday, isCalendarDate } from '../../../shared/glucose.js';
import { useSession } from '../context/session.js';

export function useSelectedDate() {
  const [params, setParams] = useSearchParams();
  const { timeZone } = useSession();
  const today = calendarToday(timeZone);
  const requested = params.get('date');
  const date =
    isCalendarDate(requested) && requested <= today ? requested : today;

  function setDate(next) {
    if (isCalendarDate(next) && next <= today)
      setParams({ date: next }, { replace: true });
  }

  return { date, setDate, today };
}
