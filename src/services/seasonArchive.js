// Used inside a Firebase transaction: archive and reset are one indivisible change.
export function archiveSeason(root, season) {
  if (!root || typeof root !== 'object') return;
  if (root.gamif_seasons?.[season.id]) return;
  return {
    ...root,
    gamif_seasons: { ...root.gamif_seasons, [season.id]: {
      ...season, snapshot: root['2x18_contributions'] || {},
      awardSnapshot: root.gamif_awards || {}, titleSnapshot: root.gamif_titles || {},
    } },
    '2x18_contributions': Object.fromEntries(Object.keys(root['2x18_contributions'] || {}).map(id => [id, 0])),
    gamif_awards: null,
  };
}
