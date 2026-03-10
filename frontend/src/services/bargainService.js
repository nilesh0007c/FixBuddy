import api from '../api/axiosInstance';

const bargainService = {
  initNegotiation: async (bookingId, initialOffer) => {
    const { data } = await api.post('/bargain/init', { bookingId, initialOffer });
    return data;
  },

  submitCounter: async (negotiationId, { amount, message }) => {
    const { data } = await api.post(`/bargain/${negotiationId}/counter`, { amount, message });
    return data;
  },

  acceptOffer: async (negotiationId) => {
    const { data } = await api.post(`/bargain/${negotiationId}/accept`);
    return data;
  },

  rejectOffer: async (negotiationId) => {
    const { data } = await api.post(`/bargain/${negotiationId}/reject`);
    return data;
  },

  getNegotiation: async (negotiationId) => {
    const { data } = await api.get(`/bargain/${negotiationId}`);
    return data;
  }
};

export default bargainService;