import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNegotiation, submitOffer, acceptOffer, clearNegotiation } from '../redux/slices/bargainSlice';

export const useNegotiation = (negotiationId) => {
  const dispatch = useDispatch();
  const { current: negotiation, loading, error } = useSelector(s => s.bargain);

  useEffect(() => {
    if (negotiationId) dispatch(fetchNegotiation(negotiationId));
    return () => dispatch(clearNegotiation());
  }, [negotiationId, dispatch]);

  const counterOffer = useCallback((amount, message = '') => {
    return dispatch(submitOffer({ negotiationId, amount, message }));
  }, [negotiationId, dispatch]);

  const accept = useCallback(() => {
    return dispatch(acceptOffer(negotiationId));
  }, [negotiationId, dispatch]);

  const savingsPercent = negotiation
    ? (((negotiation.originalPrice - negotiation.currentOffer) / negotiation.originalPrice) * 100).toFixed(1)
    : 0;

  const roundsLeft = negotiation
    ? negotiation.maxRounds - negotiation.currentRound
    : 0;

  return { negotiation, loading, error, counterOffer, accept, savingsPercent, roundsLeft };
};