// Shared admin utility functions — imported by all admin sub-components

export const getFulfillmentMeta = (status) => {
  switch (status) {
    case 'confirmed': return { label: 'Confirmed', className: 'bg-red-50 border-red-100 text-red-700', icon: 'thumb_up' };
    case 'packed':    return { label: 'Packed',    className: 'bg-red-100 border-red-200 text-red-800', icon: 'inventory_2' };
    case 'dispatched':return { label: 'Dispatched',className: 'bg-red-600 border-red-700 text-white', icon: 'local_shipping' };
    case 'delivered':
    case 'fulfilled': return { label: 'Delivered', className: 'bg-green-50 border-green-200 text-green-700', icon: 'check_circle' };
    default:          return { label: 'Processing',className: 'bg-white border-red-50 text-red-950/60', icon: 'hourglass_empty' };
  }
};

export const getPaymentMeta = (status) => {
  switch (status) {
    case 'paid':     return { label: 'Paid',     className: 'bg-green-50 border-green-200 text-green-700', icon: 'check_circle' };
    case 'failed':   return { label: 'Failed',   className: 'bg-red-950 border-red-900 text-white', icon: 'error' };
    case 'refunded': return { label: 'Refunded', className: 'bg-red-50 border-red-100 text-red-700', icon: 'replay' };
    default:         return { label: 'Pending',  className: 'bg-white border-red-100 text-red-600', icon: 'timer' };
  }
};

export const resolveImage = (imgPath) => {
  if (!imgPath) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
  const baseUrl = apiBaseUrl.replace('/api', '');
  return `${baseUrl}${imgPath}`;
};

export const getOrderItemProductId = (item) => {
  const itemId = item?.product || item?._id;
  return typeof itemId === 'object' ? itemId?._id : itemId;
};

export const getNextAction = (orderStatus) => {
  if (!orderStatus || orderStatus === 'paid' || orderStatus === 'created' || orderStatus === 'pending_payment') {
    return { label: 'Mark Confirmed', nextStatus: 'confirmed', bg: 'bg-red-600 hover:bg-red-700 text-white' };
  }
  if (orderStatus === 'confirmed')  return { label: 'Mark Packed',      nextStatus: 'packed',     bg: 'bg-red-700 hover:bg-red-800 text-white' };
  if (orderStatus === 'packed')     return { label: 'Mark Dispatched',  nextStatus: 'dispatched', bg: 'bg-red-950 hover:bg-black text-white' };
  if (orderStatus === 'dispatched') return { label: 'Mark Delivered',   nextStatus: 'delivered',  bg: 'bg-green-600 hover:bg-green-700 text-white' };
  return null;
};
