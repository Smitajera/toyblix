export const COMBO_AGE_GROUPS = [
  { value: '0-12 MO', label: '0–12 Months' },
  { value: '12-36 MO', label: '12–36 Months' },
  { value: '5-7 YRS', label: '5–7 Years' },
];

export const getComboAgeLabel = (value) =>
  COMBO_AGE_GROUPS.find((g) => g.value === value)?.label || value;
