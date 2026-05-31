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
            {/* Podium — global top 3 */}
            {!searchQuery.trim() && (
              <TopThree players={players} onPlayerClick={setSelectedPlayer} />
            )}

            {/* Search */}
            <SearchBar
              query={searchQuery}
              onChange={setSearchQuery}
            />

            {/* Body */}
            <div className="px-6 py-4">
              <div className="w-full space-y-5 lg:space-y-6">
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
                  <PlayerRankDisplay player={searchedPlayer} />
                </div>
              </div>
            </div>
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
        />
      )}
    </div>
  );
}
