export interface QueryStatusFlags {
  isFetching: boolean
  isError: boolean
  isPlaceholderData: boolean
  hasData: boolean
}

/**
 * Human-readable provenance label for a placeholder-backed GitHub query.
 * `hasData` is false while the query has never resolved, which is the only
 * state where the bundled snapshot is the source.
 */
export function querySourceLabel({
  isFetching,
  isError,
  isPlaceholderData,
  hasData,
}: QueryStatusFlags): string {
  if (isFetching) {
    return 'Syncing…'
  }

  if (isError) {
    return hasData ? 'Cached GitHub data' : 'Static snapshot'
  }

  if (isPlaceholderData) {
    return 'Cached snapshot'
  }

  return 'Live from GitHub'
}
