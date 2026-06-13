import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_SERIES, BET_MODIFIERS, NAV_TABS, RANGE_GROUPS } from './features/lottery/constants';
import type { ActiveTab, BetEntry, BetModifier, BlockData, DrawResult, GridData } from './features/lottery/types';
import { createEmptyBlockData, createEmptyColumnData, createEmptyGrid, formatDate, formatTime12 } from './features/lottery/utils';
import { openBetReceiptWindow, openCombinedReceiptWindow, generateReceiptHtml, uploadReceiptToStorage, saveReceiptUrlToBets } from './features/lottery/receipt';
import TerminalStyles from './features/lottery/components/TerminalStyles';
import TerminalHeader from './features/lottery/components/TerminalHeader.tsx';
import InfoBar from './features/lottery/components/InfoBar';
import NavTabs from './features/lottery/components/NavTabs';
import FilterBar from './features/lottery/components/FilterBar';
import SeriesSidebar from './features/lottery/components/SeriesSidebar';
import BettingGrid from './features/lottery/components/BettingGrid';
import { useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';


// ── Advance Draw slot helpers (module-level, reused in modal) ──────────────────
const ADV_START_HOUR = 8, ADV_START_MIN = 45, ADV_END_HOUR = 22, ADV_INTERVAL = 15;
type AdvSlot = { label: string; displayLabel: string; minutes: number };
function buildAdvSlots(): AdvSlot[] {
  const slots: AdvSlot[] = [];
  const start = ADV_START_HOUR * 60 + ADV_START_MIN;
  const end = ADV_END_HOUR * 60;
  const fmtTime = (t: number) => {
    const h = Math.floor(t / 60), m = t % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${suffix}`;
  };
  for (let t = start; t <= end; t += ADV_INTERVAL) {
    slots.push({ label: fmtTime(t), displayLabel: fmtTime(t + ADV_INTERVAL), minutes: t });
  }
  return slots;
}
const ALL_ADV_SLOTS = buildAdvSlots();

const LotteryTerminal: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();

  // ── Advance Draw local state ──
  const [advanceSlots, setAdvanceSlots] = useState<string[]>([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [modalSelectedDraws, setModalSelectedDraws] = useState<Set<string>>(new Set());
  const [modalTopInput, setModalTopInput] = useState('');
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  });
  const isAdvanceMode = advanceSlots.length > 0;
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  // ── Live data from Supabase ──
  const [lastDraw, setLastDraw] = useState<DrawResult>({ drawTime: '', drawDate: '', numbers: [] });
  const [activeDrawId, setActiveDrawId] = useState<string | null>(null);
  const [activeSlotLabel, setActiveSlotLabel] = useState<string>('--:--');
  const [dbActiveSlotLabel, setDbActiveSlotLabel] = useState<string>('');
  const [placingBet, setPlacingBet] = useState(false);

  // Derived from profile
  const balance = profile?.points ?? 0;
  const freePoints = profile?.points ?? 0;

  const [currentTime, setCurrentTime] = useState(() => formatTime12(new Date()));
  const [today] = useState(() => formatDate(new Date()));
  const [countdown, setCountdown] = useState(15 * 60);
  const [slotsOver, setSlotsOver] = useState(false);
  const [nextSlotText, setNextSlotText] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('RESULT');
  const [activeMods, setActiveMods] = useState<Set<BetModifier>>(new Set());
  const [selectedRangeGroups, setSelectedRangeGroups] = useState<Set<string>>(new Set(['10-19']));
  const [checkedSeries, setCheckedSeries] = useState<Set<string>>(new Set());
  const [activeSeries, setActiveSeries] = useState<string>('1000-1099');

  const seriesBaseById = useMemo(() => {
    const m: Record<string, number> = {};
    ALL_SERIES.forEach((s) => {
      m[s.id] = s.base;
    });
    return m;
  }, []);

  const [grids, setGrids] = useState<Record<string, GridData>>(() => {
    const g: Record<string, GridData> = {};
    ALL_SERIES.forEach((s) => {
      g[s.id] = createEmptyGrid();
    });
    return g;
  });

  const [blockData, setBlockData] = useState<Record<string, BlockData>>(() => {
    const b: Record<string, BlockData> = {};
    ALL_SERIES.forEach((s) => {
      b[s.id] = createEmptyBlockData();
    });
    return b;
  });

  const [columnData, setColumnData] = useState<Record<string, Record<number, number>>>(() => {
    const c: Record<string, Record<number, number>> = {};
    ALL_SERIES.forEach((s) => {
      c[s.id] = createEmptyColumnData();
    });
    return c;
  });

  const gridRef = useRef<HTMLDivElement>(null);
  const bulkPlaceBetSupportedRef = useRef<boolean | null>(null);
  const receiptBarcodeParamSupportedRef = useRef<boolean | null>(null);

  const formatSlotEndLabel = useCallback((label: string, slotMinutes = 15): string => {
    const normalized = label.toUpperCase();
    if (normalized.includes('-') || normalized.includes('TO')) {
      const parts = normalized.split(/-|TO/).map((part) => part.trim()).filter(Boolean);
      return parts[parts.length - 1] ?? label;
    }

    const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) return label;

    const hours12 = Number(match[1]);
    const minutes = Number(match[2]);
    const suffix = match[3].toUpperCase();
    if (hours12 < 1 || hours12 > 12 || minutes < 0 || minutes > 59) return label;

    const startHours24 = (hours12 % 12) + (suffix === 'PM' ? 12 : 0);
    const start = new Date(0);
    start.setUTCHours(startHours24, minutes, 0, 0);
    const end = new Date(start.getTime() + slotMinutes * 60 * 1000);

    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });

    return formatter.format(end);
  }, []);

  const formatDrawTime = useCallback((timestamp: string | null, slotLabel: string | null): string => {
    if (slotLabel) return formatSlotEndLabel(slotLabel);

    if (!timestamp) return '--:--';

    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '--:--';

    const h24 = d.getHours();
    const m = d.getMinutes();
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }, [formatSlotEndLabel]);

  const formatDrawDate = useCallback((drawDate: string | null, scheduledAt: string | null): string => {
    if (drawDate) {
      const d = new Date(`${drawDate}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return formatDate(d);
    }

    if (scheduledAt) {
      const d = new Date(scheduledAt);
      if (!Number.isNaN(d.getTime())) return formatDate(d);
    }

    return '';
  }, []);

  // ── Advance modal: keep nowMinutes fresh so past slots disappear ──
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const availableAdvSlots = useMemo(
    () => ALL_ADV_SLOTS.filter((s) => s.minutes + ADV_INTERVAL > nowMinutes),
    [nowMinutes]
  );

  // ── Last draw result (latest resulted draw) ──
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    const fetchLastDraw = async () => {
      try {
        const { data, error } = await supabase
          .from('draws')
          .select('draw_date, scheduled_at, result_numbers, draw_timeslots(label)')
          .eq('status', 'resulted')
          .order('scheduled_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching last draw:', error);
          retryTimer = setTimeout(fetchLastDraw, 3000);
          return;
        }

        const row = data?.[0];
        if (!row) {
          // Retry a few times in case Supabase connection is still initializing
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            retryTimer = setTimeout(fetchLastDraw, 2000);
          } else {
            setLastDraw({ drawTime: '--:--', drawDate: '', numbers: [] });
          }
          return;
        }

        const drawDate = formatDrawDate(row.draw_date ?? null, row.scheduled_at ?? null);
        const slotLabel = (row.draw_timeslots as unknown as { label: string } | null)?.label ?? null;
        const drawTime = formatDrawTime(row.scheduled_at ?? null, slotLabel);
        const numbers = Array.isArray(row.result_numbers) ? row.result_numbers : [];

        setLastDraw({ drawTime, drawDate, numbers });
      } catch (err) {
        console.error('Unexpected error fetching last draw:', err);
        retryTimer = setTimeout(fetchLastDraw, 3000);
      }
    };

    fetchLastDraw();

    const channel = supabase
      .channel('draws-last-draw')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'draws' },
        () => {
          fetchLastDraw();
        }
      )
      .subscribe();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      supabase.removeChannel(channel);
    };
  }, [formatDrawDate, formatDrawTime]);

  // ── Fetch active (open) draw from Supabase ──
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const MAX_INIT_RETRIES = 4;

    const fetchActiveDraw = async () => {
      try {
        const { data, error } = await supabase
          .from('draws')
          .select('id, scheduled_at, draw_timeslots(label)')
          .eq('status', 'open')
          .order('scheduled_at', { ascending: true });

        if (error) {
          console.error('Error fetching active draw:', error);
          retryTimer = setTimeout(fetchActiveDraw, 3000);
          return;
        }

        if (data && data.length > 0) {
          // Pick the first (earliest) open draw
          setActiveDrawId(data[0].id);
          const slotLabelFromDb = (data[0].draw_timeslots as unknown as { label: string } | null)?.label ?? null;
          setDbActiveSlotLabel(slotLabelFromDb ?? '');
        } else {
          setActiveDrawId(null);
          // Retry briefly on startup to handle connection initialization lag,
          // then let the realtime subscription handle draw opens.
          if (retryCount < MAX_INIT_RETRIES) {
            retryCount++;
            retryTimer = setTimeout(fetchActiveDraw, 2000);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching active draw:', err);
        retryTimer = setTimeout(fetchActiveDraw, 3000);
      }
    };

    fetchActiveDraw();

    // Realtime subscription for draw changes
    const channel = supabase
      .channel('draws-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'draws' },
        () => {
          fetchActiveDraw();
        }
      )
      .subscribe();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Clock and Strict Local Slot Logic ──
  useEffect(() => {
    const computeSlotLogic = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      
      const currentTotalMins = h * 60 + m;
      const startMins = 8 * 60 + 45; // 08:45 AM
      const endMins = 22 * 60;   // 10:00 PM
      
      let slotStartMins = 0;
      let targetMins = 0;
      
      if (currentTotalMins >= startMins && currentTotalMins < endMins) {
        // Active slot found between 10 AM and 10 PM
        const minsPastStart = currentTotalMins - startMins;
        const slotsPassed = Math.floor(minsPastStart / 15);
        slotStartMins = startMins + slotsPassed * 15;
        targetMins = slotStartMins + 15; // Countdown to the end of this 15-min block
      } else if (currentTotalMins < startMins) {
        slotStartMins = startMins;
        targetMins = startMins; // Countdown to exactly 10:00 AM start
      } else {
        slotStartMins = startMins + 24 * 60;
        targetMins = startMins + 24 * 60; // Countdown to exactly 10:00 AM tomorrow
      }
      
      // Calculate countdown in seconds
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, targetMins, 0, 0);
      const diffSecs = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
      
      // Format slotLabel (e.g. 10:15 AM)
      const formatTime = (totalMins: number) => {
        let hr = Math.floor(totalMins / 60) % 24;
        const mn = totalMins % 60;
        const ampm = hr >= 12 ? 'PM' : 'AM';
        hr = hr % 12;
        if (hr === 0) hr = 12;
        return `${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')} ${ampm}`;
      };

      const formattedSlot = formatTime(targetMins);

      const isOver = currentTotalMins >= endMins || currentTotalMins < startMins;
      let computedNextSlotText = '';
      if (currentTotalMins >= endMins) {
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        computedNextSlotText = `08:45 AM, ${formatDate(tomorrow)}`;
      } else if (currentTotalMins < startMins) {
        computedNextSlotText = `08:45 AM, ${formatDate(now)}`;
      }

      return { diffSecs, formattedSlot, isOver, computedNextSlotText };
    };

    const updateClock = () => {
      setCurrentTime(formatTime12(new Date()));
      const { diffSecs, formattedSlot, isOver, computedNextSlotText } = computeSlotLogic();
      setCountdown(diffSecs);
      setActiveSlotLabel(formattedSlot);
      setSlotsOver(isOver);
      setNextSlotText(computedNextSlotText);
    };

    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  const countdownStr = useMemo(() => {
    const h = Math.floor(countdown / 3600);
    const m = Math.floor((countdown % 3600) / 60);
    const s = countdown % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [countdown]);

  const visibleSeries = useMemo(() => {
    if (selectedRangeGroups.size === 0) return [];
    const selectedArray = Array.from(selectedRangeGroups);
    const firstSelected = selectedArray[0];
    const group = RANGE_GROUPS.find((g) => g.id === firstSelected);
    return group?.series ?? [];
  }, [selectedRangeGroups]);

  useEffect(() => {
    if (visibleSeries.length === 0) return;
    const isActiveVisible = visibleSeries.some((s) => s.id === activeSeries);
    if (!isActiveVisible) {
      setActiveSeries(visibleSeries[0].id);
    }
  }, [visibleSeries, activeSeries]);

  const scoringSeries = useMemo(() => {
    const selected = new Set(selectedRangeGroups);
    return RANGE_GROUPS
      .filter((group) => selected.has(group.id))
      .flatMap((group) => group.series);
  }, [selectedRangeGroups]);

  const activeSeriesInfo = useMemo(
    () => ALL_SERIES.find((s) => s.id === activeSeries) ?? ALL_SERIES[0],
    [activeSeries]
  );

  const isAllChecked = useMemo(
    () => visibleSeries.every((s) => checkedSeries.has(s.id)),
    [visibleSeries, checkedSeries]
  );

  const isAllIndeterminate = useMemo(() => {
    const c = visibleSeries.filter((s) => checkedSeries.has(s.id)).length;
    return c > 0 && c < visibleSeries.length;
  }, [visibleSeries, checkedSeries]);

  const checkedVisibleSeriesIds = useMemo(
    () => visibleSeries.filter((s) => checkedSeries.has(s.id)).map((s) => s.id),
    [visibleSeries, checkedSeries]
  );

  const isCpFpActive = useMemo(() => activeMods.has('CP') || activeMods.has('FP'), [activeMods]);
  const isOddModifierActive = useMemo(() => activeMods.has('ODD'), [activeMods]);
  const isEvenModifierActive = useMemo(() => activeMods.has('EVEN'), [activeMods]);

  const isNumberDisabled = useCallback(
    (number: number): boolean => {
      if (isOddModifierActive && number % 2 === 0) return true;
      if (isEvenModifierActive && number % 2 !== 0) return true;
      return false;
    },
    [isOddModifierActive, isEvenModifierActive]
  );

  const getExpandedTargetSeriesIds = useCallback(
    (sid: string): string[] => {
      const checkedVisibleIds = visibleSeries.filter((s) => checkedSeries.has(s.id)).map((s) => s.id);
      const baseIds = checkedVisibleIds.length > 0 ? checkedVisibleIds : [sid];
      const targets = new Set<string>(baseIds);

      if (selectedRangeGroups.size > 1) {
        const selected = new Set(selectedRangeGroups);
        baseIds.forEach((baseId) => {
          const currentGroup = RANGE_GROUPS.find((g) => g.series.some((s) => s.id === baseId));
          if (!currentGroup) return;
          const seriesIndex = currentGroup.series.findIndex((s) => s.id === baseId);
          RANGE_GROUPS.forEach((group) => {
            if (selected.has(group.id) && group.series[seriesIndex]) {
              targets.add(group.series[seriesIndex].id);
            }
          });
        });
      }

      return Array.from(targets);
    },
    [selectedRangeGroups, visibleSeries, checkedSeries]
  );

  const handleTopFilter = useCallback((filterId: string) => {
    if (filterId === 'All') {
      const isAllSelected = selectedRangeGroups.size === RANGE_GROUPS.length;
      if (isAllSelected) {
        setSelectedRangeGroups(new Set(['10-19']));
        setActiveSeries('1000-1099');
      } else {
        setSelectedRangeGroups(new Set(RANGE_GROUPS.map((g) => g.id)));
      }
      return;
    }

    setSelectedRangeGroups((prev) => {
      const next = new Set(prev);
      next.has(filterId) ? next.delete(filterId) : next.add(filterId);
      return next;
    });
  }, [selectedRangeGroups]);

  const clearSeriesData = useCallback((seriesIds: string[]) => {
    setGrids((prev) => {
      const next = { ...prev };
      seriesIds.forEach((id) => { next[id] = createEmptyGrid(); });
      return next;
    });
    setBlockData((prev) => {
      const next = { ...prev };
      seriesIds.forEach((id) => { next[id] = createEmptyBlockData(); });
      return next;
    });
    setColumnData((prev) => {
      const next = { ...prev };
      seriesIds.forEach((id) => { next[id] = createEmptyColumnData(); });
      return next;
    });
  }, []);

  const handleAllCheckbox = useCallback(() => {
    if (isAllChecked) {
      clearSeriesData(visibleSeries.map((s) => s.id));
      setCheckedSeries((prev) => {
        const next = new Set(prev);
        visibleSeries.forEach((s) => next.delete(s.id));
        return next;
      });
      return;
    }
    setCheckedSeries((prev) => {
      const next = new Set(prev);
      visibleSeries.forEach((s) => next.add(s.id));
      return next;
    });
    if (!visibleSeries.find((s) => s.id === activeSeries)) {
      setActiveSeries(visibleSeries[0]?.id ?? '1000-1099');
    }
  }, [isAllChecked, visibleSeries, activeSeries, clearSeriesData]);

  const handleSeriesCheckbox = useCallback((seriesId: string) => {
    setCheckedSeries((prev) => {
      const next = new Set(prev);
      const isRemoving = next.has(seriesId);
      if (isRemoving) {
        next.delete(seriesId);
        clearSeriesData([seriesId]);
        if (activeSeries === seriesId) {
          const fallback = visibleSeries.find((s) => s.id !== seriesId)?.id;
          if (fallback) setActiveSeries(fallback);
        }
      } else {
        next.add(seriesId);
      }
      return next;
    });
  }, [clearSeriesData, activeSeries, visibleSeries]);

  const handleCellChange = useCallback((sid: string, row: number, col: number, value: number) => {
    setGrids((prev) => {
      const newGrids = { ...prev };
      const targetIds = getExpandedTargetSeriesIds(sid);
      const isCp = activeMods.has('CP');

      targetIds.forEach((targetId) => {
        const base = seriesBaseById[targetId] ?? 0;

        if (isCp) {
          // Clear entire grid first (only one CP selection at a time)
          const freshGrid: Record<number, Record<number, number>> = {};
          for (let r = 0; r < 10; r++) {
            freshGrid[r] = {};
            for (let c = 0; c < 10; c++) {
              freshGrid[r][c] = 0;
            }
          }

          if (value > 0) {
            // Fill the clicked cell
            const actualNumber = base + row * 10 + col;
            if (!isNumberDisabled(actualNumber)) {
              freshGrid[row][col] = value;
            }

            // Fill "\" diagonal (down-right and up-left from clicked cell)
            for (let i = 1; i < 10; i++) {
              const dr = row + i, dc = col + i;
              if (dr < 10 && dc < 10) {
                const num = base + dr * 10 + dc;
                if (!isNumberDisabled(num)) freshGrid[dr][dc] = value;
              }
              const ur = row - i, uc = col - i;
              if (ur >= 0 && uc >= 0) {
                const num = base + ur * 10 + uc;
                if (!isNumberDisabled(num)) freshGrid[ur][uc] = value;
              }
            }

            // Fill "/" diagonal (down-left and up-right from clicked cell)
            for (let i = 1; i < 10; i++) {
              const dr = row + i, dc = col - i;
              if (dr < 10 && dc >= 0) {
                const num = base + dr * 10 + dc;
                if (!isNumberDisabled(num)) freshGrid[dr][dc] = value;
              }
              const ur = row - i, uc = col + i;
              if (ur >= 0 && uc < 10) {
                const num = base + ur * 10 + uc;
                if (!isNumberDisabled(num)) freshGrid[ur][uc] = value;
              }
            }
          }

          newGrids[targetId] = freshGrid;
        } else {
          const actualNumber = base + row * 10 + col;
          if (isNumberDisabled(actualNumber)) return;
          newGrids[targetId] = {
            ...newGrids[targetId],
            [row]: { ...newGrids[targetId][row], [col]: value },
          };
        }
      });
      return newGrids;
    });
  }, [getExpandedTargetSeriesIds, seriesBaseById, isNumberDisabled, activeMods]);

  const handleBlockChange = useCallback((sid: string, row: number, value: number) => {
    if (isCpFpActive) return;
    const targetIds = getExpandedTargetSeriesIds(sid);
    setBlockData((prev) => {
      const newBlockData = { ...prev };
      targetIds.forEach((targetId) => {
        newBlockData[targetId] = { ...newBlockData[targetId], [row]: value };
      });
      return newBlockData;
    });
    setGrids((prev) => {
      const newGrids = { ...prev };
      targetIds.forEach((targetId) => {
        const newRow: Record<number, number> = {};
        for (let c = 0; c < 10; c++) {
          const actualNumber = (seriesBaseById[targetId] ?? 0) + row * 10 + c;
          newRow[c] = isNumberDisabled(actualNumber) ? 0 : value;
        }
        newGrids[targetId] = { ...newGrids[targetId], [row]: { ...newRow } };
      });
      return newGrids;
    });
  }, [getExpandedTargetSeriesIds, isCpFpActive, seriesBaseById, isNumberDisabled]);

  const handleColumnChange = useCallback((sid: string, col: number, value: number) => {
    if (isCpFpActive) return;
    const targetIds = getExpandedTargetSeriesIds(sid);
    setColumnData((prev) => {
      const newColumnData = { ...prev };
      targetIds.forEach((targetId) => {
        newColumnData[targetId] = { ...newColumnData[targetId], [col]: value };
      });
      return newColumnData;
    });
    setGrids((prev) => {
      const newGrids = { ...prev };
      targetIds.forEach((targetId) => {
        const grid = { ...newGrids[targetId] };
        for (let r = 0; r < 10; r++) {
          const actualNumber = (seriesBaseById[targetId] ?? 0) + r * 10 + col;
          grid[r] = { ...grid[r], [col]: isNumberDisabled(actualNumber) ? 0 : value };
        }
        newGrids[targetId] = grid;
      });
      return newGrids;
    });
  }, [getExpandedTargetSeriesIds, isCpFpActive, seriesBaseById, isNumberDisabled]);

  useEffect(() => {
    setGrids((prev) => {
      const next: Record<string, GridData> = { ...prev };
      ALL_SERIES.forEach((series) => {
        const base = series.base;
        const g = { ...next[series.id] };
        for (let r = 0; r < 10; r++) {
          const row = { ...g[r] };
          for (let c = 0; c < 10; c++) {
            const num = base + r * 10 + c;
            if (isNumberDisabled(num) && row[c] !== 0) {
              row[c] = 0;
            }
          }
          g[r] = row;
        }
        next[series.id] = g;
      });
      return next;
    });

    if (isCpFpActive) {
      setBlockData((prev) => {
        const next: Record<string, BlockData> = { ...prev };
        ALL_SERIES.forEach((s) => { next[s.id] = createEmptyBlockData(); });
        return next;
      });
      setColumnData((prev) => {
        const next: Record<string, Record<number, number>> = { ...prev };
        ALL_SERIES.forEach((s) => { next[s.id] = createEmptyColumnData(); });
        return next;
      });
    }
  }, [isNumberDisabled, isCpFpActive]);

  const getRowQt = useCallback(
    (sid: string, row: number): number => {
      const rd = grids[sid]?.[row];
      if (!rd) return 0;
      return Object.values(rd).reduce((s, v) => s + (v || 0), 0);
    },
    [grids]
  );

  const getDisplayedRowQt = useCallback(
    (row: number): number => {
      if (checkedVisibleSeriesIds.length > 1) {
        if (row < checkedVisibleSeriesIds.length) {
          return getRowQt(checkedVisibleSeriesIds[row], 0);
        }
        return 0;
      }
      return getRowQt(activeSeries, row);
    },
    [checkedVisibleSeriesIds, getRowQt, activeSeries]
  );

  const getDisplayedRowAmount = useCallback((row: number): number => getDisplayedRowQt(row) * 2, [getDisplayedRowQt]);

  const totalQt = useMemo(() => {
    let t = 0;
    scoringSeries.forEach((series) => {
      for (let r = 0; r < 10; r++) t += getRowQt(series.id, r);
    });
    return isAdvanceMode ? t * advanceSlots.length : t;
  }, [scoringSeries, getRowQt, isAdvanceMode, advanceSlots.length]);

  const totalAmount = useMemo(() => totalQt * 2, [totalQt]);

  const handleCancel = useCallback(() => {
    const g: Record<string, GridData> = {};
    const b: Record<string, BlockData> = {};
    const c: Record<string, Record<number, number>> = {};
    ALL_SERIES.forEach((s) => {
      g[s.id] = createEmptyGrid();
      b[s.id] = createEmptyBlockData();
      c[s.id] = createEmptyColumnData();
    });
    setGrids(g);
    setBlockData(b);
    setColumnData(c);
  }, []);

  const handleRefresh = useCallback(() => {
    handleCancel();
    setActiveMods(new Set());
    setSelectedRangeGroups(new Set(['10-19']));
    setCheckedSeries(new Set());
    setActiveSeries('1000-1099');
    setActiveTab('RESULT');
  }, [handleCancel]);

  // ── "Buy Free Now" — calls place_bet RPC for each bet entry ──
  const handleFreeBuyNow = useCallback(async () => {
    if (isAdvanceMode) {
      const bets: BetEntry[] = [];
      ALL_SERIES.forEach((series) => {
        const gd = grids[series.id];
        if (!gd) return;
        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 10; c++) {
            const qty = gd[r]?.[c] || 0;
            if (qty > 0) bets.push({ number: series.base + r * 10 + c, quantity: qty });
          }
        }
      });
      if (bets.length === 0) { alert('No bets placed!'); return; }

      const totalCost = bets.reduce((sum, b) => sum + b.quantity * 2, 0) * advanceSlots.length;
      if (totalCost > balance) {
        alert(`Insufficient points. Need: ${totalCost} (${advanceSlots.length} slots), Have: ${balance}`);
        return;
      }

      let betType = '4D';
      if (activeMods.has('CP')) betType = 'CP';
      else if (activeMods.has('FP')) betType = 'FP';
      else if (activeMods.has('EVEN')) betType = 'EVEN';
      else if (activeMods.has('ODD')) betType = 'ODD';

      const barcodes = advanceSlots.map((_, i) =>
        `ADV${Date.now().toString().slice(-8)}${String(i).padStart(2, '0')}`
      );

      setPlacingBet(true);
      try {
        const { data, error } = await supabase.rpc('place_advance_bets', {
          p_draw_date: todayIso,
          p_slot_labels: advanceSlots,
          p_bets: bets.map((b) => ({ number: b.number, quantity: b.quantity })),
          p_bet_type: betType,
          p_receipt_barcodes: barcodes,
        });

        if (error) { alert(`Error: ${error.message}`); await refreshProfile(); return; }
        await refreshProfile();

        const slots = Array.isArray(data) ? data : [];
        const selectedGroupLabels = RANGE_GROUPS
          .filter((g) => selectedRangeGroups.has(g.id))
          .map((g) => g.label).join(', ') || 'None';
        const selectedModsText = activeMods.size > 0 ? Array.from(activeMods).join(', ') : 'None';

        const receiptParamsArray = slots.map((slot: { slot_label: string; barcode: string; placed_bets: { number: number; quantity: number }[] }, i: number) => ({
          bets: slot.placed_bets.map((b: { number: number; quantity: number }) => ({ number: b.number, quantity: b.quantity })),
          desk: balance,
          selectedGroupLabels,
          selectedModsText,
          drawDate: today,
          drawEndTime: formatSlotEndLabel(slot.slot_label),
          receiptBarcode: slot.barcode ?? barcodes[i],
        }));

        if (!openCombinedReceiptWindow(receiptParamsArray)) alert('Advance bets placed! (Popup blocked)');

        handleCancel();
        setAdvanceSlots([]);

        void (async () => {
          if (!user?.id) return;
          for (const params of receiptParamsArray) {
            try {
              const html = generateReceiptHtml(params);
              const url = await uploadReceiptToStorage(user.id, params.receiptBarcode!, html);
              if (url) await saveReceiptUrlToBets(params.receiptBarcode!, url);
            } catch { /* non-fatal */ }
          }
        })();
      } finally {
        setPlacingBet(false);
      }
      return;
    }

    if (!activeDrawId) {
      alert('No open draw available right now.');
      return;
    }

    const bets: BetEntry[] = [];
    ALL_SERIES.forEach((series) => {
      const gd = grids[series.id];
      if (!gd) return;
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const qty = gd[r]?.[c] || 0;
          if (qty > 0) bets.push({ number: series.base + r * 10 + c, quantity: qty });
        }
      }
    });

    if (bets.length === 0) {
      alert('No bets placed!');
      return;
    }

    // Check total cost against balance
    const totalCost = bets.reduce((sum, b) => sum + b.quantity * 2, 0);
    if (totalCost > balance) {
      alert(`Insufficient points. Need: ${totalCost}, Have: ${balance}`);
      return;
    }

    setPlacingBet(true);

    // Determine bet type from active modifiers
    let betType = '4D'; // default
    if (activeMods.has('CP')) betType = 'CP';
    else if (activeMods.has('FP')) betType = 'FP';
    else if (activeMods.has('EVEN')) betType = 'EVEN';
    else if (activeMods.has('ODD')) betType = 'ODD';

    const clientReceiptBarcode = `R${Date.now().toString().slice(-12)}${Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0')}`;

    try {
      // Place bets via bulk RPC when available; fallback to existing per-bet RPC flow.
      let placedBets: Array<{ number: number; quantity: number; barcode: string }> = [];
      let supportsReceiptBarcode = receiptBarcodeParamSupportedRef.current !== false;
      let usedBulkPlacement = false;

      if (bulkPlaceBetSupportedRef.current !== false) {
        const bulkParamsBase = {
          p_draw_id: activeDrawId,
          p_bet_type: betType,
          p_bets: bets.map((b) => ({ number: b.number, quantity: b.quantity })),
        };

        let bulkData: unknown = null;
        let bulkError: { message?: string; details?: string } | null = null;

        if (supportsReceiptBarcode) {
          const attemptWithBarcode = await supabase.rpc('place_bet_bulk', {
            ...bulkParamsBase,
            p_receipt_barcode: clientReceiptBarcode,
          });
          bulkData = attemptWithBarcode.data;
          bulkError = attemptWithBarcode.error;

          if (bulkError) {
            const lockMsg = `${bulkError.message ?? ''} ${bulkError.details ?? ''}`.toLowerCase();
            const missingBulkFunction =
              lockMsg.includes('place_bet_bulk') &&
              (lockMsg.includes('does not exist') || lockMsg.includes('function'));
            const unsupportedReceiptParam =
              lockMsg.includes('p_receipt_barcode') ||
              lockMsg.includes('function place_bet_bulk') ||
              lockMsg.includes('does not exist');

            if (missingBulkFunction) {
              bulkPlaceBetSupportedRef.current = false;
            } else if (unsupportedReceiptParam) {
              supportsReceiptBarcode = false;
              receiptBarcodeParamSupportedRef.current = false;
              const fallbackBulkAttempt = await supabase.rpc('place_bet_bulk', bulkParamsBase);
              bulkData = fallbackBulkAttempt.data;
              bulkError = fallbackBulkAttempt.error;

              if (!fallbackBulkAttempt.error) {
                bulkPlaceBetSupportedRef.current = true;
              }
            }
          } else {
            receiptBarcodeParamSupportedRef.current = true;
            bulkPlaceBetSupportedRef.current = true;
          }
        } else {
          const attemptWithoutBarcode = await supabase.rpc('place_bet_bulk', bulkParamsBase);
          bulkData = attemptWithoutBarcode.data;
          bulkError = attemptWithoutBarcode.error;

          if (bulkError) {
            const lockMsg = `${bulkError.message ?? ''} ${bulkError.details ?? ''}`.toLowerCase();
            const missingBulkFunction =
              lockMsg.includes('place_bet_bulk') &&
              (lockMsg.includes('does not exist') || lockMsg.includes('function'));
            if (missingBulkFunction) {
              bulkPlaceBetSupportedRef.current = false;
            }
          } else {
            bulkPlaceBetSupportedRef.current = true;
          }
        }

        if (bulkError && bulkPlaceBetSupportedRef.current !== false) {
          alert(`Error placing bets: ${bulkError.message}`);
          await refreshProfile();
          setPlacingBet(false);
          return;
        }

        if (!bulkError && bulkPlaceBetSupportedRef.current !== false) {
          const bulkRows = Array.isArray(bulkData)
            ? bulkData
            : (bulkData as { placed_bets?: unknown } | null)?.placed_bets;

          if (Array.isArray(bulkRows) && bulkRows.length > 0) {
            placedBets = bulkRows.map((row, idx) => {
              const record = row as { number?: number; quantity?: number; barcode?: string };
              return {
                number: record.number ?? bets[idx]?.number ?? 0,
                quantity: record.quantity ?? bets[idx]?.quantity ?? 0,
                barcode: record.barcode ?? clientReceiptBarcode,
              };
            });
          } else {
            placedBets = bets.map((b) => ({
              number: b.number,
              quantity: b.quantity,
              barcode: clientReceiptBarcode,
            }));
          }
          usedBulkPlacement = true;
        }
      }

      if (!usedBulkPlacement) {
        for (const bet of bets) {
          const baseParams = {
            p_draw_id: activeDrawId,
            p_number: bet.number,
            p_bet_type: betType,
            p_quantity: bet.quantity,
          };

          let data: { barcode?: string } | null = null;
          let error: { message?: string; details?: string } | null = null;

          if (supportsReceiptBarcode) {
            const attemptWithBarcode = await supabase.rpc('place_bet', {
              ...baseParams,
              p_receipt_barcode: clientReceiptBarcode,
            });
            data = (attemptWithBarcode.data as { barcode?: string } | null) ?? null;
            error = attemptWithBarcode.error;

            if (error) {
              const lockMsg = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
              const unsupportedReceiptParam =
                lockMsg.includes('p_receipt_barcode') ||
                lockMsg.includes('function place_bet') ||
                lockMsg.includes('does not exist');

              if (unsupportedReceiptParam) {
                supportsReceiptBarcode = false;
                receiptBarcodeParamSupportedRef.current = false;
                const fallbackAttempt = await supabase.rpc('place_bet', baseParams);
                data = (fallbackAttempt.data as { barcode?: string } | null) ?? null;
                error = fallbackAttempt.error;
              }
            } else {
              receiptBarcodeParamSupportedRef.current = true;
            }
          } else {
            const fallbackAttempt = await supabase.rpc('place_bet', baseParams);
            data = (fallbackAttempt.data as { barcode?: string } | null) ?? null;
            error = fallbackAttempt.error;
          }

          if (error) {
            alert(`Error placing bet on ${bet.number}: ${error.message}`);
            // Refresh profile to get updated balance after partial placement
            await refreshProfile();
            setPlacingBet(false);
            return;
          }

          placedBets.push({
            number: bet.number,
            quantity: bet.quantity,
            barcode: data?.barcode ?? clientReceiptBarcode,
          });
        }
      }

      // Refresh profile to reflect new balance
      await refreshProfile();

      // Prepare receipt data
      const selectedGroupLabels = RANGE_GROUPS
        .filter((g) => selectedRangeGroups.has(g.id))
        .map((g) => g.label)
        .join(', ') || 'None';
      const selectedModsText = activeMods.size > 0 ? Array.from(activeMods).join(', ') : 'None';
      const receiptBarcode =
        placedBets.find((b) => b.barcode && b.barcode.length > 0)?.barcode ?? clientReceiptBarcode;

      const receiptParams = {
        bets: placedBets,
        desk: balance,
        selectedGroupLabels,
        selectedModsText,
        drawDate: today,
        drawEndTime: formatSlotEndLabel(dbActiveSlotLabel || activeSlotLabel),
        receiptBarcode,
      };

      // Open receipt popup immediately after successful placement.
      const isOpened = openBetReceiptWindow(receiptParams);
      if (!isOpened) {
        alert('Bets placed successfully! (Receipt popup blocked)');
      }

      handleCancel();

      // Fire-and-forget async post-processing to keep UI path fast.
      void (async () => {
        try {
          await refreshProfile();

          const userId = user?.id;
          if (!userId) return;

          const htmlContent = generateReceiptHtml(receiptParams);
          const publicUrl = await uploadReceiptToStorage(userId, receiptBarcode, htmlContent);
          if (publicUrl) {
            await saveReceiptUrlToBets(receiptBarcode, publicUrl);
          }
        } catch (postErr) {
          console.error('Post-bet async tasks failed:', postErr);
        }
      })();
    } catch (err) {
      alert(`Unexpected error: ${err}`);
    } finally {
      setPlacingBet(false);
    }
  }, [grids, handleCancel, selectedRangeGroups, activeMods, activeDrawId, balance, refreshProfile, activeSlotLabel, dbActiveSlotLabel, today, isAdvanceMode, advanceSlots, todayIso, user]);

  const handleNavTab = useCallback(
    (tab: ActiveTab) => {
      setActiveTab(tab);
      if (tab === 'REFRESH') handleRefresh();
      if (tab === 'CANCEL') navigate('/cancel-ticket');
      if (tab === 'RESULT') navigate('/results');
      if (tab === 'HISTORY') navigate('/history');
      if (tab === 'ADVANCE-DRAW') {
        setModalSelectedDraws(new Set(advanceSlots));
        setModalTopInput('');
        setShowAdvanceModal(true);
      }
    },
    [handleRefresh, navigate, advanceSlots]
  );

  const toggleMod = useCallback((mod: BetModifier) => {
    setActiveMods((prev) => {
      const next = new Set(prev);
      if (mod === 'EVEN') next.delete('ODD');
      if (mod === 'ODD') next.delete('EVEN');
      next.has(mod) ? next.delete(mod) : next.add(mod);
      return next;
    });
  }, []);

  const getDrawBadgeStyle = useCallback((idx: number): React.CSSProperties => {
    if (idx < 10) return { background: '#b71c1c', color: '#fff' };
    if (idx < 20) return { background: '#1b5e20', color: '#fff' };
    return { background: '#0d47a1', color: '#fff' };
  }, []);

  return (
    <>
      <TerminalStyles />

      <div className="lt-root">
        {/* ── Combined header: Logo + LastDraw info + Draw numbers ── */}
        <TerminalHeader
          freePoints={freePoints}
          lastDraw={lastDraw}
          getDrawBadgeStyle={getDrawBadgeStyle}
        />

        {/* ── Info strip + Welcome banner ── */}
        <InfoBar
          today={today}
          currentTime={currentTime}
          countdownStr={countdownStr}
          balance={balance}
          freePoints={freePoints}
          slotLabel={activeSlotLabel}
          slotsOver={slotsOver}
          nextSlotText={nextSlotText}
          onLogout={async () => {
            await signOut();
            navigate('/login');
          }}
          userProfile={profile}
        />

        <NavTabs
          tabs={NAV_TABS}
          activeTab={activeTab}
          onTabClick={handleNavTab}
          labelOverrides={isAdvanceMode ? {
            'ADVANCE-DRAW': {
              text: `ADV DRAW - ${advanceSlots.length}`,
              bg: 'linear-gradient(180deg, #ff6f00, #e65100)',
            }
          } : undefined}
        />

        {isAdvanceMode && (
          <div style={{ background: '#7b1fa2', color: '#fff', padding: '6px 16px', fontSize: 11, fontWeight: 800, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>ADVANCE — {advanceSlots.length} SLOT{advanceSlots.length > 1 ? 'S' : ''}: {advanceSlots.map((l) => formatSlotEndLabel(l)).join(', ')}</span>
            <button
              onClick={() => setAdvanceSlots([])}
              style={{ background: '#fff', color: '#7b1fa2', border: 'none', borderRadius: 3, padding: '2px 8px', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}
            >
              CANCEL
            </button>
          </div>
        )}

        {/* ── Advance Draw Modal ── */}
        {showAdvanceModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
            <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 10px 36px rgba(0,0,0,0.32)' }}>
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e0e0e0' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>Advance Draw</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 3 }}>Remaining Draw: {availableAdvSlots.length}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      const ordered = availableAdvSlots
                        .filter((s) => modalSelectedDraws.has(s.label))
                        .map((s) => s.label);
                      setAdvanceSlots(ordered);
                      setShowAdvanceModal(false);
                    }}
                    disabled={modalSelectedDraws.size === 0}
                    style={{ background: modalSelectedDraws.size === 0 ? '#ccc' : '#1565c0', color: '#fff', border: 'none', borderRadius: 5, padding: '10px 22px', fontWeight: 800, fontSize: 14, cursor: modalSelectedDraws.size === 0 ? 'default' : 'pointer' }}
                  >
                    OKAY
                  </button>
                  <button
                    onClick={() => setShowAdvanceModal(false)}
                    style={{ background: '#e0e0e0', color: '#333', border: 'none', borderRadius: 5, padding: '10px 18px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
              {/* Top-N input + Select All */}
              <div style={{ padding: '18px 24px 10px', display: 'flex', gap: 10 }}>
                <input
                  type="number"
                  min={1}
                  placeholder="Enter N (e.g. 5)"
                  value={modalTopInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModalTopInput(val);
                    const n = Number(val);
                    if (Number.isInteger(n) && n > 0) {
                      const top = availableAdvSlots.slice(0, Math.min(n, availableAdvSlots.length));
                      setModalSelectedDraws(new Set(top.map((s) => s.label)));
                    } else if (val.trim() === '') {
                      setModalSelectedDraws(new Set());
                    }
                  }}
                  style={{ flex: 1, border: '1px solid #ccc', borderRadius: 5, padding: '10px 12px', fontSize: 14 }}
                />
                <button
                  onClick={() => setModalSelectedDraws(new Set(availableAdvSlots.map((s) => s.label)))}
                  style={{ background: '#1565c0', color: '#fff', border: 'none', borderRadius: 5, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  Select All
                </button>
              </div>
              {/* Slot grid */}
              <div style={{ padding: '10px 24px 26px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {availableAdvSlots.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: 14, padding: '24px 0' }}>
                    No upcoming slots available today.
                  </div>
                )}
                {availableAdvSlots.map((slot) => {
                  const selected = modalSelectedDraws.has(slot.label);
                  return (
                    <button
                      key={slot.label}
                      onClick={() => setModalSelectedDraws((prev) => {
                        const next = new Set(prev);
                        selected ? next.delete(slot.label) : next.add(slot.label);
                        return next;
                      })}
                      style={{
                        padding: '14px 8px',
                        border: selected ? '2px solid #1565c0' : '2px solid #ddd',
                        borderRadius: 5,
                        background: selected ? '#1565c0' : '#f5f5f5',
                        color: selected ? '#fff' : '#333',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {slot.displayLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <FilterBar
          selectedRangeGroups={selectedRangeGroups}
          allSeries={ALL_SERIES}
          rangeGroups={RANGE_GROUPS}
          checkedSeries={checkedSeries}
          betModifiers={BET_MODIFIERS}
          activeMods={activeMods}
          isAllChecked={isAllChecked}
          onTopFilter={handleTopFilter}
          setCheckedSeries={setCheckedSeries}
          setSelectedRangeGroups={setSelectedRangeGroups}
          setActiveSeries={setActiveSeries}
          toggleMod={toggleMod}
        />

        <div className="lt-grid-area">
          <SeriesSidebar
            visibleSeries={visibleSeries}
            checkedSeries={checkedSeries}
            activeSeries={activeSeries}
            isAllChecked={isAllChecked}
            isAllIndeterminate={isAllIndeterminate}
            onAllCheckbox={handleAllCheckbox}
            onSeriesCheckbox={handleSeriesCheckbox}
            setActiveSeries={setActiveSeries}
          />

          <BettingGrid
            gridRef={gridRef}
            activeDrawId={activeDrawId}
            activeSeries={activeSeries}
            activeSeriesInfo={activeSeriesInfo}
            grids={grids}
            blockData={blockData}
            columnData={columnData}
            totalQt={totalQt}
            totalAmount={totalAmount}
            getRowQt={(_sid, row) => getDisplayedRowQt(row)}
            getRowAmount={(_sid, row) => getDisplayedRowAmount(row)}
            isCellDisabled={isNumberDisabled}
            isBlockDisabled={isCpFpActive}
            isColumnDisabled={isCpFpActive}
            handleBlockChange={handleBlockChange}
            handleColumnChange={handleColumnChange}
            handleCellChange={handleCellChange}
            onFreeBuyNow={handleFreeBuyNow}
            onLogout={async () => {
              await signOut();
              navigate('/login');
            }}
            placingBet={placingBet}
            countdown={countdown}
          />
        </div>
      </div>
    </>
  );
};

export default LotteryTerminal;