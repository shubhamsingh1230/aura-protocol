"use client";

import { useState, useEffect } from 'react';
import { recordTimeSession } from '@/app/actions/time';

export function useTimeTracker(activityKey: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const storedStart = localStorage.getItem(`aura_timer_start_${activityKey}`);
    const storedAccumulated = localStorage.getItem(`aura_timer_accumulated_${activityKey}`);
    let initialElapsed = storedAccumulated ? parseInt(storedAccumulated, 10) : 0;

    if (storedStart) {
      const startTimestamp = parseInt(storedStart, 10);
      const diffSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      initialElapsed += diffSeconds;
      setIsRunning(true);
    }
    setElapsedSeconds(initialElapsed);
  }, [activityKey]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        const storedStart = localStorage.getItem(`aura_timer_start_${activityKey}`);
        const storedAccumulated = localStorage.getItem(`aura_timer_accumulated_${activityKey}`);
        const baseAccumulated = storedAccumulated ? parseInt(storedAccumulated, 10) : 0;
        
        if (storedStart) {
          const startTimestamp = parseInt(storedStart, 10);
          const currentSessionSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
          setElapsedSeconds(baseAccumulated + currentSessionSeconds);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activityKey]);

  const startTimer = () => {
    if (isRunning) return;
    localStorage.setItem(`aura_timer_start_${activityKey}`, Date.now().toString());
    setIsRunning(true);
  };

  const stopTimer = () => {
    if (!isRunning) return;
    const storedStart = localStorage.getItem(`aura_timer_start_${activityKey}`);
    let sessionElapsed = 0;
    
    if (storedStart) {
      sessionElapsed = Math.floor((Date.now() - parseInt(storedStart, 10)) / 1000);
    }

    const currentAccumulated = localStorage.getItem(`aura_timer_accumulated_${activityKey}`);
    const newTotal = (currentAccumulated ? parseInt(currentAccumulated, 10) : 0) + sessionElapsed;

    // Save total accumulated time, clear active start
    localStorage.setItem(`aura_timer_accumulated_${activityKey}`, newTotal.toString());
    localStorage.removeItem(`aura_timer_start_${activityKey}`);
    setIsRunning(false);
    
    // FIRE SERVER ACTION: Silently push the session duration to Supabase in the background
    if (sessionElapsed >= 5) {
      recordTimeSession(activityKey, sessionElapsed);
    }
  };

  const resetTimer = () => {
    localStorage.removeItem(`aura_timer_start_${activityKey}`);
    localStorage.removeItem(`aura_timer_accumulated_${activityKey}`);
    setElapsedSeconds(0);
    setIsRunning(false);
  };

  const formattedTime = [
    Math.floor(elapsedSeconds / 3600),
    Math.floor((elapsedSeconds % 3600) / 60),
    elapsedSeconds % 60,
  ]
    .map((val) => val.toString().padStart(2, '0'))
    .join(':');

  return { isRunning, elapsedSeconds, formattedTime, startTimer, stopTimer, resetTimer };
}
