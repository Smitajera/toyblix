import { useGetToyCategoriesQuery } from '../features/api/apiSlice';

const FALLBACK_CATEGORIES = [
  'Soft Toys', 'Wooden Wonders', 'Remote Control Cars', 'Arts & Crafts',
  'Mind Puzzles', 'Metal Machines', 'Outdoor Adventures', 'Educational Games',
  'Building & STEM', 'Light & Music',
];

export const useToyCategories = () => {
  const { data, isLoading, isError } = useGetToyCategoriesQuery();

  const activeCategories = (data || [])
    .filter((c) => c.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

  const names = activeCategories.length > 0
    ? activeCategories.map((c) => c.name)
    : FALLBACK_CATEGORIES;

  return {
    categories: names,
    toyCategories: activeCategories,
    isLoading,
    isError,
  };
};

export default useToyCategories;
