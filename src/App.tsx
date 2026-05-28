import { useLeaderboard } from './hooks/useLeaderboard';
import Header from './components/Header';
import TopThree from './components/TopThree';
import LeaderboardTable from './components/LeaderboardTable';
import SearchBar from './components/SearchBar';
import PlayerRankDisplay from './components/PlayerRankDisplay';
import PlayerProfileModal from './components/PlayerProfileModal';
import LoadingState from './components/LoadingState';
import StatusBar from './components/StatusBar';

export default function App() {
  const {
    players,
    filteredPlayers,
    topThree,
    maxKills,
    loading,
    error,
    lastUpdated,
    countdown,
    searchQuery,
    setSearchQuery,
    selectedPlayer,
    setSelectedPlayer,
    refresh,
  } = useLeaderboard();

  const searchedPlayer =
    searchQuery.trim() && filteredPlayers.length === 1 ? filteredPlayers[0] : null;

  const showFirstLoadError = !loading && players.length === 0 && error;

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Ambient top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[260px] bg-accent/[0.035] rounded-full blur-3xl pointer-events-none" />

      <Header lastUpdated={lastUpdated} />

      <main className="flex-1 pb-20">
        {loading && players.length === 0 ? (
          <LoadingState />
        ) : showFirstLoadError ? (
          /* Only show full error page if we have zero data at all */
          <div className="px-6">
            <div className="max-w-7xl mx-auto">
              <div className="card p-8 text-center border-danger/20">
                <p className="font-pixel text-base font-bold text-ink uppercase tracking-wider mb-2">
                  Connection Failed
                </p>
                <p className="font-pixel text-xs text-ink-ghost mb-4">{error}</p>
                <button onClick={refresh} className="btn-ghost mx-auto flex items-center gap-2 text-sm">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Top-3 Podium — hidden while searching */}
            {topThree.length >= 3 && !searchQuery && (
              <TopThree players={topThree} />
            )}

            {/* Search */}
            <SearchBar
              query={searchQuery}
              onChange={setSearchQuery}
              resultCount={filteredPlayers.length}
              totalCount={players.length}
            />

            {/* Body grid */}
            <div className="px-6 py-4">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
                {/* Leaderboard table */}
                <div className="lg:col-span-2 xl:col-span-3">
                  <LeaderboardTable
                    players={filteredPlayers}
                    maxKills={maxKills}
                    onPlayerClick={setSelectedPlayer}
                  />
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <PlayerRankDisplay player={searchedPlayer} />
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <StatusBar
        countdown={countdown}
        onRefresh={refresh}
        totalPlayers={players.length}
        error={error}
      />

      {/* Player profile modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          players={players}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
