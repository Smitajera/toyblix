import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import indiaGeoJson from '../../assets/india.json';
import { getOrderItemProductId } from './utils/adminHelpers';

echarts.registerMap('India', indiaGeoJson);

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

  const analyticsData = useMemo(() => {
    if (!orders) return null;

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
    } else if (dateRangeFilter === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate); startDate.setHours(0, 0, 0, 0);
      endDate   = new Date(customEndDate);   endDate.setHours(23, 59, 59, 999);
      daysToCalculate = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    }

    const dateLabels = [];
    if (daysToCalculate <= 31) {
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

    orders.forEach(order => {
      if (order.paymentStatus !== 'paid' && order.paymentMethod !== 'cod') return;
      const orderDate = new Date(order.createdAt);
      if (orderDate >= startDate && orderDate <= endDate) {
        let label = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (daysToCalculate > 31) label = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (revenueDataMap[label] !== undefined) revenueDataMap[label] += order.totalPrice;
      }
    });

    const revenueData = Object.keys(revenueDataMap).map(date => ({ date, Revenue: revenueDataMap[date] }));

    const topToysMap = {}, categoryMap = {}, cityMap = {}, areaMap = {}, userOrdersMap = {};

    orders.forEach(order => {
      const uid = order.user
        ? (typeof order.user === 'object' ? order.user._id : order.user)
        : order.shippingDetails?.phone;
      if (uid) userOrdersMap[uid] = (userOrdersMap[uid] || 0) + 1;

      const isPaid = order.paymentStatus === 'paid' || order.paymentMethod === 'cod';
      if (order.shippingDetails?.city && isPaid) {
        const city = order.shippingDetails.city.trim().toUpperCase();
        cityMap[city] = (cityMap[city] || 0) + 1;
      }
      if (order.shippingDetails?.state && isPaid) {
        let s = order.shippingDetails.state.trim();
        s = s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        areaMap[s] = (areaMap[s] || 0) + 1;
      }
      if (isPaid) {
        order.orderItems?.forEach(item => {
          topToysMap[item.title] = (topToysMap[item.title] || 0) + item.qty;
          const product = productsData?.products?.find(
            p => p.title === item.title || String(p._id) === String(getOrderItemProductId(item))
          );
          const cat = product?.category || 'Uncategorized';
          categoryMap[cat] = (categoryMap[cat] || 0) + item.qty;
        });
      }
    });

    const topToysData  = Object.keys(topToysMap).map(k => ({ name: k, Sales: topToysMap[k] })).sort((a, b) => b.Sales - a.Sales).slice(0, 5);
    const categoryData = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] })).sort((a, b) => b.value - a.value);
    const areaData     = Object.keys(areaMap).map(k => ({ name: k, value: areaMap[k] }));

    let newC = 0, repC = 0;
    Object.values(userOrdersMap).forEach(c => (c > 1 ? repC++ : newC++));
    const customerData = [
      { name: 'New Customers',    value: newC, color: '#f87171' },
      { name: 'Repeat Customers', value: repC, color: '#991b1b' },
    ].filter(d => d.value > 0);

    let pending = 0, confirmed = 0, cancelled = 0, rto = 0, delivered = 0;
    orders.forEach(o => {
      const hasReturn = o.orderItems?.some(i => i.returnStatus && i.returnStatus !== 'Not Requested');
      if (o.orderStatus === 'cancelled') cancelled++;
      else if (o.orderStatus === 'refunded' || o.orderStatus === 'rto' || hasReturn) rto++;
      else if (o.orderStatus === 'delivered' || o.orderStatus === 'fulfilled') delivered++;
      else if (['confirmed', 'packed', 'dispatched'].includes(o.orderStatus)) confirmed++;
      else pending++;
    });
    const fulfillmentData = [
      { name: 'Pending',      value: pending,    color: '#fca5a5' },
      { name: 'Confirmed',    value: confirmed,  color: '#ef4444' },
      { name: 'Cancelled',    value: cancelled,  color: '#9ca3af' },
      { name: 'RTO / Return', value: rto,        color: '#b91c1c' },
      { name: 'Delivered',    value: delivered,  color: '#16a34a' },
    ].filter(d => d.value > 0);

    return { revenueData, topToysData, fulfillmentData, categoryData, areaData, customerData };
  }, [orders, dateRangeFilter, customStartDate, customEndDate, productsData]);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">

      {/* Revenue Trend */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm lg:col-span-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-red-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500">trending_up</span> Revenue Trend
            </h3>
            <button onClick={onExportCSV} className="hidden sm:flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={dateRangeFilter} onChange={e => setDateRangeFilter(e.target.value)} className="bg-red-50 border border-red-100 text-red-900 text-xs rounded-lg p-2.5 font-bold outline-none">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom Dates</option>
            </select>
            {dateRangeFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-100">
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-transparent text-xs text-red-900 font-bold outline-none px-1" />
                <span className="text-red-950/40 text-xs">to</span>
                <input type="date" value={customEndDate}   onChange={e => setCustomEndDate(e.target.value)}   className="bg-transparent text-xs text-red-900 font-bold outline-none px-1" />
              </div>
            )}
          </div>
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
                yAxis: { type: 'category', data: analyticsData.topToysData.map(d => d.name).reverse(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#991b1b', fontSize: 11, fontWeight: 700, margin: 15 } },
                series: [{ type: 'bar', data: analyticsData.topToysData.map(d => d.Sales).reverse(), barWidth: 20, itemStyle: { color: '#dc2626', borderRadius: [0, 8, 8, 0] } }]
              }}
              style={{ height: '100%', width: '100%' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-red-950/40 font-bold">No sales data yet.</div>
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
            <div className="flex items-center justify-center h-full text-red-950/40 font-bold">No category data yet.</div>
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
              tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#bfdbfe', borderWidth: 1, textStyle: { fontWeight: 'bold' }, borderRadius: 16, formatter: '{b}<br/>Orders: {c}' },
              visualMap: { min: 0, max: Math.max(...(analyticsData.areaData.length ? analyticsData.areaData.map(d => d.value) : [10])), left: 'left', top: 'bottom', text: ['High', 'Low'], calculable: true, inRange: { color: ['#eff6ff', '#3b82f6', '#1e3a8a'] } },
              series: [{ name: 'Orders', type: 'map', map: 'India', roam: true, itemStyle: { areaColor: '#eff6ff', borderColor: '#93c5fd' }, emphasis: { itemStyle: { areaColor: '#60a5fa' }, label: { show: true, color: '#fff' } }, data: analyticsData.areaData }]
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
            <div className="flex items-center justify-center h-full text-red-950/40 font-bold text-center">No customer data yet.</div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AdminAnalytics;
