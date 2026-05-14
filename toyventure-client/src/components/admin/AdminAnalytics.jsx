import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import indiaGeoJson from '../../assets/india.json';
import { getOrderItemProductId } from './utils/adminHelpers';

echarts.registerMap('India', indiaGeoJson);

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", 
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  borderColor: '#fee2e2',
  borderWidth: 1,
  textStyle: { fontWeight: 'bold' },
  borderRadius: 16,
};

const AdminAnalytics = ({ orders, productsData, onExportCSV }) => {
  const [dateRangeFilter, setDateRangeFilter] = useState('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [filterProduct, setFilterProduct] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterCustomer, setFilterCustomer] = useState('All');

  const availableProducts = useMemo(() => {
    if (!productsData?.products) return [];
    return [...new Set(productsData.products.map(p => p.title))];
  }, [productsData]);

  const availableCategories = useMemo(() => {
    if (!productsData?.products) return [];
    const cats = [];
    productsData.products.forEach(p => {
       if (Array.isArray(p.category)) p.category.forEach(c => cats.push(c));
       else if (p.category) cats.push(p.category);
    });
    return [...new Set(cats)].filter(Boolean);
  }, [productsData]);

  const analyticsData = useMemo(() => {
    if (!orders) return null;

    // --- Date Range Calculation ---
    let daysToCalculate = 7;
    let startDate = new Date();
    let endDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (dateRangeFilter === '30d') {
      daysToCalculate = 30;
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRangeFilter === 'all') {
      daysToCalculate = 365; // Arbitrary large number for label generation
      startDate = new Date(0); // Beginning of time
    } else if (dateRangeFilter === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate); startDate.setHours(0, 0, 0, 0);
      endDate   = new Date(customEndDate);   endDate.setHours(23, 59, 59, 999);
      daysToCalculate = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    }

    // Pre-calculate user order counts for 'New vs Repeat' logic
    const userOrderCounts = {};
    orders.forEach(o => {
        const uid = o.user ? (typeof o.user === 'object' ? o.user._id : o.user) : o.shippingDetails?.phone;
        if (uid) userOrderCounts[uid] = (userOrderCounts[uid] || 0) + 1;
    });

    // --- Global Filter Application ---
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate < startDate || orderDate > endDate) return false;

      if (filterStatus !== 'All' && order.orderStatus !== filterStatus) return false;
      
      if (filterPayment !== 'All') {
        const isPrepaid = order.paymentMethod !== 'cod';
        if (filterPayment === 'cod' && order.paymentMethod !== 'cod') return false;
        if (filterPayment === 'prepaid' && !isPrepaid) return false;
      }

      if (filterCustomer !== 'All') {
        const uid = order.user ? (typeof order.user === 'object' ? order.user._id : order.user) : order.shippingDetails?.phone;
        const count = uid ? userOrderCounts[uid] : 1;
        if (filterCustomer === 'new' && count > 1) return false;
        if (filterCustomer === 'repeat' && count <= 1) return false;
      }

      if (filterProduct !== 'All' || filterCategory !== 'All') {
        const matchesProduct = filterProduct === 'All' || order.orderItems?.some(item => item.title === filterProduct);
        let matchesCategory = true;
        if (filterCategory !== 'All') {
           matchesCategory = order.orderItems?.some(item => {
              const p = productsData?.products?.find(prod => prod.title === item.title || String(prod._id) === String(getOrderItemProductId(item)));
              const pCats = p ? (Array.isArray(p.category) ? p.category : [p.category]) : [];
              return pCats.includes(filterCategory);
           });
        }
        if (!matchesProduct || !matchesCategory) return false;
      }

      return true;
    });

    // --- Chart Data Generation from filteredOrders ---
    const dateLabels = [];
    if (dateRangeFilter === 'all') {
      let curr = new Date(Math.min(...filteredOrders.map(o => new Date(o.createdAt).getTime())));
      if (isNaN(curr.getTime())) curr = new Date(); // fallback
      curr.setDate(1); curr.setHours(0,0,0,0);
      while (curr <= endDate) {
        const label = curr.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (!dateLabels.includes(label)) dateLabels.push(label);
        curr.setMonth(curr.getMonth() + 1);
      }
    } else if (daysToCalculate <= 31) {
      for (let i = daysToCalculate - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        dateLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
    } else {
      let curr = new Date(startDate);
      while (curr <= endDate) {
        const label = curr.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (!dateLabels.includes(label)) dateLabels.push(label);
        curr.setMonth(curr.getMonth() + 1);
      }
    }

    const revenueDataMap = {};
    dateLabels.forEach(l => (revenueDataMap[l] = 0));

    const topToysMap = {}, categoryMap = {}, cityMap = {}, areaMap = {}, userOrdersMap = {};
    INDIAN_STATES.forEach(s => (areaMap[s] = 0));

    let pending = 0, confirmed = 0, cancelled = 0, rto = 0, delivered = 0;

    filteredOrders.forEach(order => {
      // Revenue Chart
      const isActualRevenue = order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled' && order.orderStatus !== 'refunded';
      if (isActualRevenue) {
        const orderDate = new Date(order.createdAt);
        let label = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (daysToCalculate > 31 || dateRangeFilter === 'all') label = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (revenueDataMap[label] !== undefined) revenueDataMap[label] += order.totalPrice;
      }

      // Valid check for other metrics
      const isValid = order.orderStatus !== 'cancelled' && order.orderStatus !== 'refunded';

      if (isValid) {
        const uid = order.user ? (typeof order.user === 'object' ? order.user._id : order.user) : order.shippingDetails?.phone;
        if (uid) userOrdersMap[uid] = (userOrdersMap[uid] || 0) + 1;
        
        if (order.shippingDetails?.state) {
          let s = order.shippingDetails.state.trim();
          s = s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          if (s === 'Orissa') s = 'Odisha';
          areaMap[s] = (areaMap[s] || 0) + 1;
        }

        order.orderItems?.forEach(item => {
          topToysMap[item.title] = (topToysMap[item.title] || 0) + item.qty;
          const product = productsData?.products?.find(p => p.title === item.title || String(p._id) === String(getOrderItemProductId(item)));
          const cat = product?.category || 'Uncategorized';
          if (Array.isArray(cat)) cat.forEach(c => categoryMap[c] = (categoryMap[c] || 0) + item.qty);
          else categoryMap[cat] = (categoryMap[cat] || 0) + item.qty;
        });
      }

      // Fulfillment
      const hasReturn = order.orderItems?.some(i => i.returnStatus && i.returnStatus !== 'Not Requested');
      if (order.orderStatus === 'cancelled') cancelled++;
      else if (order.orderStatus === 'refunded' || order.orderStatus === 'rto' || hasReturn) rto++;
      else if (order.orderStatus === 'delivered' || order.orderStatus === 'fulfilled') delivered++;
      else if (['confirmed', 'packed', 'dispatched'].includes(order.orderStatus)) confirmed++;
      else pending++;
    });

    const revenueData = Object.keys(revenueDataMap).map(date => ({ date, Revenue: revenueDataMap[date] }));
    const topToysData  = Object.keys(topToysMap).map(k => ({ name: k, Sales: topToysMap[k] })).sort((a, b) => b.Sales - a.Sales).slice(0, 5);
    const categoryData = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] })).sort((a, b) => b.value - a.value);
    const areaData     = Object.keys(areaMap).map(k => ({ name: k, value: areaMap[k] }));

    let newC = 0, repC = 0;
    Object.values(userOrdersMap).forEach(c => (c > 1 ? repC++ : newC++));
    const customerData = [
      { name: 'New Customers',    value: newC, color: '#f87171' },
      { name: 'Repeat Customers', value: repC, color: '#991b1b' },
    ].filter(d => d.value > 0);

    const fulfillmentData = [
      { name: 'Pending',      value: pending,    color: '#fca5a5' },
      { name: 'Confirmed',    value: confirmed,  color: '#ef4444' },
      { name: 'Cancelled',    value: cancelled,  color: '#9ca3af' },
      { name: 'RTO / Return', value: rto,        color: '#b91c1c' },
      { name: 'Delivered',    value: delivered,  color: '#16a34a' },
    ].filter(d => d.value > 0);

    return { revenueData, topToysData, fulfillmentData, categoryData, areaData, customerData, totalFiltered: filteredOrders.length };
  }, [orders, dateRangeFilter, customStartDate, customEndDate, productsData, filterProduct, filterCategory, filterStatus, filterPayment, filterCustomer]);

  if (!analyticsData) return null;

  const DonutLegend = ({ data }) => (
    <div className="absolute top-1/2 -translate-y-1/2 right-0 flex flex-col gap-3 z-10">
      {data.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-xs font-bold text-red-950/70">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
          {e.name} ({e.value})
        </div>
      ))}
    </div>
  );

  return (
    <div className="fade-in">
      {/* GLOBAL CONTROLS BAR */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-red-50 shadow-sm mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-red-950 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">tune</span> Analytics Controls
            </h3>
            <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-black border border-red-100">
                {analyticsData.totalFiltered} Orders Match
            </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-1">Products</label>
            <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="bg-red-50/50 border border-red-50 text-red-900 text-xs rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all">
              <option value="All">All Products</option>
              {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-1">Category</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-red-50/50 border border-red-50 text-red-900 text-xs rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all">
              <option value="All">All Categories</option>
              {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-1">Order Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-red-50/50 border border-red-50 text-red-900 text-xs rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all">
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="confirmed">Confirmed</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-1">Payment Type</label>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="bg-red-50/50 border border-red-50 text-red-900 text-xs rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all">
              <option value="All">All Types</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="prepaid">Prepaid</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-1">Customer Type</label>
            <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="bg-red-50/50 border border-red-50 text-red-900 text-xs rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all">
              <option value="All">All Customers</option>
              <option value="new">New Customers</option>
              <option value="repeat">Repeat Customers</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-2 border-t border-red-50 pt-4">
            <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-1">Date Range</label>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={dateRangeFilter} onChange={e => setDateRangeFilter(e.target.value)} className="bg-red-50/50 border border-red-50 text-red-900 text-xs rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all md:w-auto w-full">
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                    <option value="custom">Custom Dates</option>
                    </select>
                    {dateRangeFilter === 'custom' && (
                    <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-50 w-full md:w-auto">
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-transparent text-xs text-red-900 font-bold outline-none px-2 w-full" />
                        <span className="text-red-950/40 text-[10px] font-black uppercase">to</span>
                        <input type="date" value={customEndDate}   onChange={e => setCustomEndDate(e.target.value)}   className="bg-transparent text-xs text-red-900 font-bold outline-none px-2 w-full" />
                    </div>
                    )}
                </div>
            </div>
            
            <button onClick={onExportCSV} className="ml-auto flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl text-xs font-black tracking-wider hover:bg-red-700 transition-all shadow-md w-full md:w-auto">
              <span className="material-symbols-outlined text-[18px]">download</span> Export Report
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-4 mb-6">
            <h3 className="text-xl font-black text-red-950 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">trending_up</span> Revenue Trend
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ReactECharts
              option={{
                tooltip: { ...TOOLTIP_STYLE, trigger: 'axis', textStyle: { fontWeight: 'bold', color: '#dc2626' },
                  formatter: p => `${p[0].name}<br/><span style="color:#dc2626;font-weight:900">Revenue: ₹${p[0].value}</span>` },
                grid: { top: 20, right: 20, bottom: 20, left: 60 },
                xAxis: { type: 'category', data: analyticsData.revenueData.map(d => d.date), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#fca5a5', fontSize: 12, fontWeight: 700, margin: 15 } },
                yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { type: 'dashed', color: '#fee2e2' } }, axisLabel: { color: '#fca5a5', fontSize: 12, fontWeight: 700, formatter: '₹{value}', margin: 15 } },
                series: [{ data: analyticsData.revenueData.map(d => d.Revenue), type: 'line', smooth: true, symbolSize: 12,
                  itemStyle: { color: '#dc2626', borderColor: '#fff', borderWidth: 2 },
                  lineStyle: { color: '#dc2626', width: 4 },
                  areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(220,38,38,0.2)' }, { offset: 1, color: 'rgba(220,38,38,0)' }]) } }]
              }}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>

        {/* Best Selling Toys */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
          <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">star</span> Best Selling Toys
          </h3>
          <div className="h-[250px] w-full">
            {analyticsData.topToysData.length > 0 ? (
              <ReactECharts
                option={{
                  tooltip: { ...TOOLTIP_STYLE, trigger: 'axis', axisPointer: { type: 'shadow' } },
                  grid: { top: 10, right: 20, bottom: 10, left: 120 },
                  xAxis: { type: 'value', show: false },
                  yAxis: { type: 'category', data: analyticsData.topToysData.map(d => d.name).reverse(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#991b1b', fontSize: 11, fontWeight: 700, margin: 15, width: 100, overflow: 'truncate' } },
                  series: [{ type: 'bar', data: analyticsData.topToysData.map(d => d.Sales).reverse(), barWidth: 20, itemStyle: { color: '#dc2626', borderRadius: [0, 8, 8, 0] } }]
                }}
                style={{ height: '100%', width: '100%' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-red-950/40 font-bold">No sales data matches filters.</div>
            )}
          </div>
        </div>

        {/* Active Bottlenecks */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
          <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">pie_chart</span> Active Bottlenecks
          </h3>
          <div className="h-[250px] w-full flex items-center justify-center relative">
            {analyticsData.fulfillmentData.length > 0 ? (
              <>
                <div className="absolute inset-0 right-[120px]">
                  <ReactECharts
                    option={{
                      tooltip: { ...TOOLTIP_STYLE, trigger: 'item' },
                      series: [{ type: 'pie', radius: ['55%', '85%'], center: ['50%', '50%'],
                        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 }, label: { show: false },
                        data: analyticsData.fulfillmentData.map(d => ({ value: d.value, name: d.name, itemStyle: { color: d.color } })) }]
                    }}
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>
                <DonutLegend data={analyticsData.fulfillmentData} />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-red-950/40 font-bold text-center">
                <span className="material-symbols-outlined text-4xl block mb-2 opacity-50">done_all</span><br />Queue is empty!
              </div>
            )}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
          <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500">category</span> Sales by Category
          </h3>
          <div className="h-[250px] w-full">
            {analyticsData.categoryData.length > 0 ? (
              <ReactECharts
                option={{
                  tooltip: { ...TOOLTIP_STYLE, trigger: 'axis', axisPointer: { type: 'shadow' } },
                  grid: { top: 20, right: 20, bottom: 30, left: 30 },
                  xAxis: { type: 'category', data: analyticsData.categoryData.map(d => d.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#991b1b', fontSize: 10, fontWeight: 700, margin: 15 } },
                  yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { type: 'dashed', color: '#fee2e2' } }, axisLabel: { color: '#fca5a5', fontSize: 12, fontWeight: 700, margin: 15 } },
                  series: [{ type: 'bar', data: analyticsData.categoryData.map(d => d.value), barWidth: 30, itemStyle: { color: '#8b5cf6', borderRadius: [8, 8, 0, 0] } }]
                }}
                style={{ height: '100%', width: '100%' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-red-950/40 font-bold">No category data matches filters.</div>
            )}
          </div>
        </div>

        {/* Top Areas Map */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
          <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">location_on</span> Top Areas (India)
          </h3>
          <div className="h-[350px] w-full">
            <ReactECharts
              option={{
                tooltip: { 
                  trigger: 'item', 
                  backgroundColor: 'rgba(255,255,255,0.95)', 
                  borderColor: '#bfdbfe', 
                  borderWidth: 1, 
                  textStyle: { fontWeight: 'bold' }, 
                  borderRadius: 16, 
                  formatter: (params) => {
                    return `${params.name}<br/>Orders: ${params.value || 0}`;
                  }
                },
                visualMap: { 
                  type: 'piecewise',
                  left: 'left', 
                  top: 'bottom', 
                  pieces: [
                    { min: 50, label: '50+ Orders', color: '#1e3a8a' },
                    { min: 20, max: 49, label: '20-49 Orders', color: '#1d4ed8' },
                    { min: 5, max: 19, label: '5-19 Orders', color: '#3b82f6' },
                    { min: 1, max: 4, label: '1-4 Orders', color: '#93c5fd' },
                    { value: 0, label: '0 Orders', color: '#f8fafc' }
                  ],
                  textStyle: { color: '#64748b', fontWeight: 600, fontSize: 11 },
                  itemSymbol: 'roundRect'
                },
                series: [{ name: 'Orders', type: 'map', map: 'India', roam: true, itemStyle: { borderColor: '#cbd5e1', borderWidth: 0.5 }, emphasis: { itemStyle: { areaColor: '#fca5a5' }, label: { show: true, color: '#991b1b', fontWeight: 'bold' } }, data: analyticsData.areaData }]
              }}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>

        {/* Customer Retention */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
          <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500">group_add</span> Customer Retention
          </h3>
          <div className="h-[250px] w-full flex items-center justify-center relative">
            {analyticsData.customerData.length > 0 ? (
              <>
                <div className="absolute inset-0 right-[150px]">
                  <ReactECharts
                    option={{
                      tooltip: { ...TOOLTIP_STYLE, trigger: 'item' },
                      series: [{ type: 'pie', radius: ['55%', '85%'], center: ['50%', '50%'],
                        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 }, label: { show: false },
                        data: analyticsData.customerData.map(d => ({ value: d.value, name: d.name, itemStyle: { color: d.color } })) }]
                    }}
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>
                <DonutLegend data={analyticsData.customerData} />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-red-950/40 font-bold text-center">No customer data matches filters.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminAnalytics;
