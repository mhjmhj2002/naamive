/**
 * UI-01 response fence. Kept separate from the DOM renderer so the ordering
 * contract can be tested deterministically without a browser or network.
 */
export const canApplyProjection = ({ projection, selectedProject, selectionGeneration, requestSelectionGeneration, refreshGeneration, requestRefreshGeneration, lastAppliedRefreshGeneration, lastProjectionSeq }) =>
  projection.project_id === selectedProject
  && requestSelectionGeneration === selectionGeneration
  && requestRefreshGeneration === refreshGeneration
  && requestRefreshGeneration > lastAppliedRefreshGeneration
  && Number(projection.as_of_event_id) >= lastProjectionSeq;
