import React from 'react';
import { Link } from 'react-router-dom';
import { useGetCombosQuery } from '../features/api/apiSlice';
import { COMBO_AGE_GROUPS, getComboAgeLabel } from '../constants/comboAgeGroups';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '');

const resolveImage = (img) => {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  return img.startsWith('/uploads') ? `${ASSET_BASE_URL}${img}` : img;
};

const ComboShowcase = ({ title = 'Shop by Age Combos', compact = false, hideHeader = false, filterAges = [] }) => {
  const { data: combos = [], isLoading } = useGetCombosQuery({});

  if (isLoading) return null;
  if (!combos.length) return null;

  const byAge = COMBO_AGE_GROUPS.map((g) => ({
    ...g,
    items: combos.filter((c) => c.ageGroup === g.value),
  })).filter((g) => g.items.length > 0 && (filterAges.length === 0 || filterAges.includes(g.value)));

  if (!byAge.length) return null;

  return (
    <section className={`${compact ? 'py-12' : 'py-20'} px-6`}>
      <div className="max-w-[1300px] mx-auto">
        {!hideHeader && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-red-950 tracking-tight">{title}</h2>
              <p className="text-red-950/50 font-bold mt-2">Curated toy bundles for every stage.</p>
            </div>
            <Link to="/shop?view=combos" className="text-sm font-black text-red-600 hover:text-red-800 flex items-center gap-1">
              View all <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        )}

        <div className="space-y-12">
          {byAge.map((group) => (
            <div key={group.value}>
              <h3 className="text-lg font-black text-red-950 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">child_care</span>
                {group.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.items.map((combo) => (
                  <Link
                    key={combo._id}
                    to={`/combo/${combo._id}`}
                    className="group bg-white rounded-[2rem] border border-red-50 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all"
                  >
                    <div className="aspect-[4/3] bg-red-50/50 overflow-hidden">
                      <img
                        src={resolveImage(combo.img)}
                        alt={combo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-600">{getComboAgeLabel(combo.ageGroup)}</span>
                      <h4 className="font-black text-red-950 mt-1 line-clamp-2">{combo.title}</h4>
                      <p className="text-xs text-red-950/50 font-bold mt-1">{combo.items?.length || 0} toys included</p>
                      <p className="text-xl font-black text-red-950 mt-3">₹{Number(combo.price).toLocaleString('en-IN')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComboShowcase;
