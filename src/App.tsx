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

export default function App() {
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
                  <PlayerRankDisplay player={searchedPlayer} sortMetric={sortMetric} />
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
