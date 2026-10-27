import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  RotateCcw,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import api from '../services/api';
import ItemCard from '../components/ItemCard';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter States initialized from URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [reportType, setReportType] = useState(searchParams.get('type') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [campusZone, setCampusZone] = useState(searchParams.get('zone') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Data States
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Sync state when URL params change externally (e.g. from navbar or categories)
  useEffect(() => {
    if (searchParams.get('search') !== null) setSearch(searchParams.get('search'));
    if (searchParams.get('category') !== null) setCategory(searchParams.get('category'));
    if (searchParams.get('type') !== null) setReportType(searchParams.get('type'));
  }, [searchParams]);

  // Fetch Items when any filter changes
  useEffect(() => {
    fetchItems();
  }, [search, reportType, category, status, campusZone, sort, page]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (reportType !== 'all') params.append('reportType', reportType);
      if (category !== 'all') params.append('category', category);
// No status filter for regular users; resolved items are hidden.
      if (campusZone !== 'all') params.append('campusZone', campusZone);
      if (sort) params.append('sort', sort);
      params.append('page', page);
      params.append('limit', 12);

      // Update URL query parameters
      setSearchParams(params, { replace: true });

      const res = await api.get(`/items?${params.toString()}`);
      if (res.data?.success) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setReportType('all');
    setCategory('all');
    setStatus('all');
    setCampusZone('all');
    setSort('newest');
    setPage(1);
  };

  const categories = [
    'All',
    'Electronics',
    'ID Cards',
    'Books',
    'Clothing',
    'Accessories',
    'Keys & Wallets',
    'Bottles & Bags',
    'Other',
  ];

  const campusZones = [
    'All',
    'North Campus',
    'South Campus',
    'Central Hub',
    'Sports Complex',
    'Hostels',
    'Library Zone',
    'Other',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Browse Lost &amp; Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Explore {total} reported items or filter by campus zone, category, and date.
          </p>
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Status Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'lost', label: 'Lost Only' },
            { id: 'found', label: 'Found Only' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setReportType(type.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                reportType === type.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type.label}
            </button>
          ))}

        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg border ${
              viewMode === 'grid'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg border ${
              viewMode === 'list'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary Dropdown Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap items-center gap-3">
        {/* Category Dropdown */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span>Category:</span>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c === 'All' ? 'all' : c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Campus Zone Dropdown */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span>Campus Zone:</span>
          <select
            value={campusZone}
            onChange={(e) => {
              setCampusZone(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {campusZones.map((z) => (
              <option key={z} value={z === 'All' ? 'all' : z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span>Sort By:</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="date_desc">Incident Date (Recent)</option>
            <option value="date_asc">Incident Date (Past)</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(search ||
          reportType !== 'all' ||
          category !== 'all' ||
          status !== 'all' ||
          campusZone !== 'all') && (
          <button
            onClick={handleClearFilters}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All Filters
          </button>
        )}
      </div>

      {/* Items Display Area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl h-80 border border-slate-200 p-4 skeleton-shimmer"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-slate-800">No items match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Try adjusting your search terms or clearing your filters to discover more reported items.
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          {items.map((item) => (
            <ItemCard key={item._id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Page <strong className="text-slate-800">{page}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong>
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
