import { useMemo } from 'react';
import type { PlayerActivity } from '../types';

const DAYS_PER_WEEK = 7;
const WEEKS = 7;
const HOURS_PER_DAY = 24;
const DAY_MS = 24 * 60 * 60 * 1000;
const BLUE_LEVELS = ['#0d2232', '#0d4d76', '#0b70ae', '#109de4', '#45bdff'];

interface Props {
  activity?: PlayerActivity;
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  appearances: number;
  activeHours: number;
  isFuture: boolean;
  level: number;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function intensity(activeHours: number): number {
  if (activeHours === 0) return 0;
  if (activeHours <= 1) return 1;
  if (activeHours <= 3) return 2;
  if (activeHours <= 7) return 3;
  return 4;
}

function plural(value: number, singular: string): string {
  return `${value.toLocaleString()} ${singular}${value === 1 ? '' : 's'}`;
}

export default function PlayerActivityGraph({ activity }: Props) {
  const model = useMemo(() => {
    const today = startOfDay(new Date());
    const currentMondayOffset = (today.getDay() + 6) % DAYS_PER_WEEK;
    const gridStart = new Date(today);
    gridStart.setDate(today.getDate() - currentMondayOffset - (WEEKS - 1) * DAYS_PER_WEEK);

    const byDay = new Map<string, { appearances: number; activeHours: number }>();
    const hourlyTotals = Array.from({ length: HOURS_PER_DAY }, () => 0);
    let totalAppearances = 0;
    let totalActiveHours = 0;

    for (const bucket of activity?.hours ?? []) {
      const bucketDate = new Date(bucket.hourStart);
      if (bucketDate.getTime() < gridStart.getTime() || bucketDate.getTime() >= today.getTime() + DAY_MS) {
        continue;
      }

      const key = dateKey(bucketDate);
      const current = byDay.get(key) ?? { appearances: 0, activeHours: 0 };
      current.appearances += bucket.appearances;
      current.activeHours += 1;
      byDay.set(key, current);
      hourlyTotals[bucketDate.getHours()] += bucket.appearances;
      totalAppearances += bucket.appearances;
      totalActiveHours += 1;
    }

    const days: CalendarDay[] = Array.from({ length: WEEKS * DAYS_PER_WEEK }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const values = byDay.get(dateKey(date)) ?? { appearances: 0, activeHours: 0 };
      return {
        date,
        dateKey: dateKey(date),
        appearances: values.appearances,
        activeHours: values.activeHours,
        isFuture: date.getTime() > today.getTime(),
        level: intensity(values.activeHours),
      };
    });

    const peakHour = hourlyTotals.reduce(
      (bestHour, count, hour) => count > hourlyTotals[bestHour] ? hour : bestHour,
      0,
    );

    return {
      days,
      hourlyTotals,
      totalAppearances,
      totalActiveHours,
      activeDays: days.filter(day => day.activeHours > 0).length,
      maxHourly: Math.max(1, ...hourlyTotals),
      maxDailyAppearances: Math.max(1, ...days.map(day => day.appearances)),
      peakHour,
      peakHourCount: hourlyTotals[peakHour],
    };
  }, [activity]);

  return (
    <>
      <section
        className="dossier-tile relative bg-elevated rounded-lg p-4 border border-line overflow-hidden"
        style={{ animationDelay: '440ms' }}
        aria-labelledby="daily-activity-heading"
      >
        <div className="absolute inset-x-0 top-0 h-24 pointer-events-none bg-gradient-to-b from-[#109de4]/[0.06] to-transparent" />

        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <p className="font-pixel text-xs text-[#45bdff] uppercase tracking-[0.22em] mb-1">49-Day Field Log</p>
            <h3 id="daily-activity-heading" className="font-pixel text-lg text-ink uppercase tracking-[0.16em]">
              Daily Activity
            </h3>
            <p className="font-pixel text-sm text-ink-ghost mt-0.5">Active hours recorded each day · local time</p>
          </div>

          <div className="flex gap-5 font-pixel tabular-nums">
            <div>
              <p className="text-xl text-[#45bdff] leading-none">{model.activeDays}</p>
              <p className="text-xs text-ink-ghost uppercase tracking-wider mt-1">Active days</p>
            </div>
            <div className="border-l border-line pl-5">
              <p className="text-xl text-ink leading-none">{model.totalActiveHours}</p>
              <p className="text-xs text-ink-ghost uppercase tracking-wider mt-1">Total hours</p>
            </div>
          </div>
        </div>

        <div className="relative rounded-md border border-line/80 bg-surface/45 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{ backgroundImage: 'linear-gradient(to bottom, transparent 24%, #132030 25%, transparent 26%, transparent 49%, #132030 50%, transparent 51%, transparent 74%, #132030 75%, transparent 76%)' }}
          />

          <div className="overflow-x-auto">
            <div className="min-w-[760px] px-4 pt-4 pb-3">
              <div
                className="relative grid gap-1.5 h-[142px] items-end"
                style={{ gridTemplateColumns: `repeat(${model.days.length}, minmax(0, 1fr))` }}
                aria-label="Active hours by day for the last seven weeks"
              >
                {model.days.map(day => {
                  const fullDate = day.date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  });
                  const detail = day.isFuture
                    ? `${fullDate}: upcoming`
                    : `${fullDate}: ${plural(day.appearances, 'appearance')} across ${plural(day.activeHours, 'active hour')}`;
                  const barHeight = day.activeHours > 0
                    ? Math.max(7, (day.activeHours / HOURS_PER_DAY) * 100)
                    : 2.5;
                  const signal = day.appearances / model.maxDailyAppearances;

                  return (
                    <div
                      key={day.dateKey}
                      className={`relative h-full flex items-end justify-center group ${day.isFuture ? 'opacity-30' : ''}`}
                      title={detail}
                      aria-label={detail}
                      role="img"
                    >
                      <div
                        className="relative w-full min-w-[5px] rounded-t-[3px] transition-[height,filter,opacity] duration-300 group-hover:brightness-125"
                        style={{
                          height: `${barHeight}%`,
                          background: day.activeHours > 0
                            ? `linear-gradient(to top, ${BLUE_LEVELS[Math.max(1, day.level)]}, #45bdff)`
                            : '#153046',
                          opacity: day.activeHours > 0 ? 0.58 + signal * 0.42 : 0.38,
                          boxShadow: day.activeHours > 0 ? `0 0 ${5 + signal * 8}px rgba(69,189,255,${0.18 + signal * 0.3})` : 'none',
                        }}
                      >
                        {day.activeHours > 0 && (
                          <span className="absolute inset-x-0 top-0 h-px bg-white/70" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="grid gap-1.5 mt-2 font-pixel text-xs text-ink-ghost tabular-nums"
                style={{ gridTemplateColumns: `repeat(${model.days.length}, minmax(0, 1fr))` }}
                aria-hidden="true"
              >
                {model.days.map((day, index) => (
                  <span key={day.dateKey} className="whitespace-nowrap">
                    {index % DAYS_PER_WEEK === 0
                      ? day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-2 mt-3 font-pixel text-xs text-ink-ghost">
          <span>Bar height = active hours</span>
          <span>Brightness = appearances</span>
        </div>
      </section>

      <section
        className="dossier-tile relative bg-elevated rounded-lg p-4 border border-line overflow-hidden"
        style={{ animationDelay: '500ms' }}
        aria-labelledby="hourly-activity-heading"
      >
        <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-t from-[#109de4]/[0.05] to-transparent" />

        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <p className="font-pixel text-xs text-[#45bdff] uppercase tracking-[0.22em] mb-1">Engagement Rhythm</p>
            <h3 id="hourly-activity-heading" className="font-pixel text-lg text-ink uppercase tracking-[0.16em]">
              Hourly Activity
            </h3>
            <p className="font-pixel text-sm text-ink-ghost mt-0.5">Appearance frequency across a 24-hour cycle</p>
          </div>

          <div className="sm:text-right font-pixel tabular-nums">
            <p className="text-xs text-ink-ghost uppercase tracking-wider">Peak window</p>
            <p className="text-xl text-[#45bdff] leading-none mt-1">
              {model.peakHourCount > 0
                ? `${String(model.peakHour).padStart(2, '0')}:00–${String((model.peakHour + 1) % HOURS_PER_DAY).padStart(2, '0')}:00`
                : 'No signal'}
            </p>
            <p className="text-xs text-ink-dim mt-1">
              {model.peakHourCount > 0 ? plural(model.peakHourCount, 'appearance') : 'No recorded appearances'}
            </p>
          </div>
        </div>

        <div className="relative rounded-md border border-line/80 bg-surface/45 overflow-hidden">
          <div className="grid grid-cols-4 border-b border-line/70 font-pixel text-xs text-ink-ghost uppercase tracking-wider">
            {['Night · 00–06', 'Morning · 06–12', 'Day · 12–18', 'Evening · 18–24'].map((label, index) => (
              <span
                key={label}
                className={`px-3 py-2 ${index > 0 ? 'border-l border-line/70' : ''} ${index % 2 === 0 ? 'bg-[#071824]/60' : 'bg-[#0c2232]/45'}`}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="relative px-4 pt-4 pb-3 overflow-x-auto">
            <div className="min-w-[640px]">
              <div
                className="absolute inset-x-4 top-4 h-[138px] pointer-events-none opacity-55"
                style={{ backgroundImage: 'linear-gradient(to bottom, #132030 1px, transparent 1px)', backgroundSize: '100% 34.5px' }}
              />

              <div
                className="relative grid gap-2 h-[138px] items-end"
                style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                aria-label="Appearances by hour of day"
              >
                {model.hourlyTotals.map((count, hour) => {
                  const isPeak = count > 0 && count === model.maxHourly;
                  const height = count > 0 ? Math.max(10, (count / model.maxHourly) * 76) : 2.5;
                  return (
                    <div
                      key={hour}
                      className="relative h-full flex items-end group"
                      title={`${String(hour).padStart(2, '0')}:00–${String((hour + 1) % HOURS_PER_DAY).padStart(2, '0')}:00 · ${plural(count, 'appearance')}`}
                    >
                      <div
                        className="relative w-full rounded-t-[3px] bg-gradient-to-t from-[#0b70ae] to-[#45bdff] transition-[height,filter,opacity] duration-300 group-hover:brightness-125"
                        style={{
                          height: `${height}%`,
                          opacity: count > 0 ? 0.45 + (count / model.maxHourly) * 0.55 : 0.22,
                          boxShadow: isPeak ? '0 0 14px rgba(69,189,255,0.55)' : 'none',
                        }}
                      >
                        {isPeak && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#8ed8ff] shadow-[0_0_8px_#45bdff]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="grid gap-2 mt-2 font-pixel text-xs text-ink-ghost tabular-nums"
                style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                aria-hidden="true"
              >
                {model.hourlyTotals.map((_, hour) => (
                  <span key={hour} className="text-center">
                    {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-2 mt-3 font-pixel text-xs text-ink-ghost">
          <span>Each column = one local hour</span>
          <span>{plural(model.totalAppearances, 'appearance')} in the last 7 weeks</span>
        </div>
      </section>
    </>
  );
}
