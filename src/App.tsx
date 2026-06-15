import { useState } from 'react';
import { BarChart3, Settings, Terminal, Trophy } from 'lucide-react';
import { useLeaderboard } from './hooks/useLeaderboard';
import Header from './components/Header';
import TopThree from './components/TopThree';
import LeaderboardTable from './components/LeaderboardTable';
import SearchBar from './components/SearchBar';
import PlayerRankDisplay from './components/PlayerRankDisplay';
import PlayerProfileModal from './components/PlayerProfileModal';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import StatusBar from './components/StatusBar';
import GlobalStats from './components/GlobalStats';
import DebugLogs from './components/DebugLogs';
import ShopAdmin from './components/ShopAdmin';

type MainTab = 'leaderboard' | 'stats' | 'logs' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('leaderboard');
  const {
    players,
    filteredPlayers,
    topThree,
    totalPlayers,
    maxMetricValue,
    sortMetric,
    setSortMetric,
    loading,
    error,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    selectedPlayer,
    setSelectedPlayer,
    refresh,
  } = useLeaderboard();

  const searchedPlayer =
    searchQuery.trim() && filteredPlayers.length === 1 ? filteredPlayers[0] : null;
  const liveSelectedPlayer = selectedPlayer
    ? players.find(player => player.name.toLowerCase() === selectedPlayer.name.toLowerCase()) ?? selectedPlayer
    : null;

  const hasSearchQuery = Boolean(searchQuery.trim());
  const showInitialLoading = loading && players.length === 0 && !hasSearchQuery;
  const showFirstLoadError = !loading && players.length === 0 && error && !hasSearchQuery;

  const selectTab = (tab: MainTab) => {
    setActiveTab(tab);
    if (tab !== 'leaderboard' && hasSearchQuery) {
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Atmosphere — layered grid, ambient glows, vignette, grain & scanlines */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-accent/[0.05] rounded-full blur-[120px]" />
        <div className="absolute -top-32 -left-40 w-[560px] h-[560px] bg-accent/[0.04] rounded-full blur-[130px]" />
        <div className="absolute top-1/3 -right-48 w-[560px] h-[560px] bg-gold/[0.03] rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-vignette" />
        <div className="absolute inset-0 bg-grain opacity-[0.05] mix-blend-overlay" />
        <div className="absolute inset-0 scanlines opacity-50" />
      </div>

      <Header lastUpdated={lastUpdated} />

      <main className="flex-1 pb-20">
        {showInitialLoading ? (
          <LoadingState />
        ) : showFirstLoadError ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : (
          <>
            <div className="px-6 py-2">
              <div className="max-w-7xl mx-auto">
                <div className="inline-flex w-full sm:w-auto items-center gap-1.5 rounded-lg border border-line bg-surface/80 p-1 shadow-glow-accent/20">
                  <button
                    type="button"
                    onClick={() => selectTab('leaderboard')}
                    aria-pressed={activeTab === 'leaderboard'}
                    className={`flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-md px-4 font-pixel text-sm uppercase tracking-widest transition-all duration-200
                      ${activeTab === 'leaderboard'
                        ? 'bg-accent/12 text-accent border border-accent/30 shadow-glow-accent'
                        : 'border border-transparent text-ink-ghost hover:text-ink-dim hover:bg-elevated/70'
                      }`}
                  >
                    <Trophy className="h-4 w-4" />
                    Leaderboard
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab('stats')}
                    aria-pressed={activeTab === 'stats'}
                    className={`flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-md px-4 font-pixel text-sm uppercase tracking-widest transition-all duration-200
                      ${activeTab === 'stats'
                        ? 'bg-success/10 text-success border border-success/30 shadow-[0_0_20px_rgba(0,255,128,0.12)]'
                        : 'border border-transparent text-ink-ghost hover:text-ink-dim hover:bg-elevated/70'
                      }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Global Stats
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab('logs')}
                    aria-pressed={activeTab === 'logs'}
                    className={`flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-md px-4 font-pixel text-sm uppercase tracking-widest transition-all duration-200
                      ${activeTab === 'logs'
                        ? 'bg-gold/10 text-gold border border-gold/30 shadow-[0_0_20px_rgba(240,184,48,0.12)]'
                        : 'border border-transparent text-ink-ghost hover:text-ink-dim hover:bg-elevated/70'
                      }`}
                  >
                    <Terminal className="h-4 w-4" />
                    Logs
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab('admin')}
                    aria-pressed={activeTab === 'admin'}
                    className={`flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-md px-4 font-pixel text-sm uppercase tracking-widest transition-all duration-200
                      ${activeTab === 'admin'
                        ? 'bg-danger/10 text-danger border border-danger/30 shadow-[0_0_20px_rgba(255,48,80,0.12)]'
                        : 'border border-transparent text-ink-ghost hover:text-ink-dim hover:bg-elevated/70'
                      }`}
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'leaderboard' ? (
              <>
                {/* Podium — global top 3 for the active sort */}
                {!hasSearchQuery && (
                  <TopThree players={topThree} sortMetric={sortMetric} onPlayerClick={setSelectedPlayer} />
                )}

                {/* Search */}
                <SearchBar
                  query={searchQuery}
                  onChange={setSearchQuery}
                />

                {/* Body */}
                <div className="px-6 py-4">
                  <div className="max-w-7xl mx-auto space-y-5 lg:space-y-6">
                    {/* Leaderboard table */}
                    <div className="w-full">
                      <LeaderboardTable
                        players={filteredPlayers}
                        maxMetricValue={maxMetricValue}
                        sortMetric={sortMetric}
                        onSortMetricChange={setSortMetric}
                        onPlayerClick={setSelectedPlayer}
                      />
                    </div>

                    {/* Search result detail */}
                    <div>
                      <PlayerRankDisplay player={searchedPlayer} sortMetric={sortMetric} />
                    </div>
                  </div>
                </div>
              </>
            ) : activeTab === 'stats' ? (
              <GlobalStats onPlayerClick={setSelectedPlayer} />
            ) : activeTab === 'logs' ? (
              <DebugLogs />
            ) : (
              <ShopAdmin />
            )}
          </>
        )}
      </main>

      <StatusBar
        onRefresh={refresh}
        totalPlayers={totalPlayers || players.length}
        error={error}
      />

      {/* Player profile modal */}
      {liveSelectedPlayer && (
        <PlayerProfileModal
          player={liveSelectedPlayer}
          players={players}
          totalPlayers={totalPlayers || players.length}
          onClose={() => setSelectedPlayer(null)}
          onPlayerSelect={setSelectedPlayer}
        />
      )}
    </div>
  );
}
