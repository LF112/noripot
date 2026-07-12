import { useEffect, useState } from 'react';

export function usePollCountdown(interval: number, isValidating: boolean) {
  const [nextPollAt, setNextPollAt] = useState(() => Date.now() + interval);
  const [seconds, setSeconds] = useState(() => Math.ceil(interval / 1000));

  useEffect(() => {
    if (!isValidating) setNextPollAt(Date.now() + interval);
  }, [interval, isValidating]);

  useEffect(() => {
    const update = () => {
      setSeconds(Math.max(0, Math.ceil((nextPollAt - Date.now()) / 1000)));
    };
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [nextPollAt]);

  return seconds;
}
