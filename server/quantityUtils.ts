// Parse a quantity string to extract numeric value and unit
export function parseQuantity(amount: string | null): { value: number; unit: string } {
  if (!amount || amount.trim() === '') {
    return { value: 0, unit: '' };
  }

  const match = amount.match(/^([0-9]*\.?[0-9]+)\s*(.*)$/);
  if (!match) {
    return { value: 0, unit: amount };
  }

  const [, numberStr, unit] = match;
  const value = parseFloat(numberStr);
  
  return {
    value: isNaN(value) ? 0 : value,
    unit: unit.trim()
  };
}

// Combine two quantities with the same unit
export function combineQuantities(amount1: string | null, amount2: string | null): string {
  const parsed1 = parseQuantity(amount1);
  const parsed2 = parseQuantity(amount2);

  // If units don't match, we can't combine them
  if (parsed1.unit !== parsed2.unit) {
    return amount1 || amount2 || '';
  }

  const combinedValue = parsed1.value + parsed2.value;
  return combinedValue > 0 ? `${combinedValue} ${parsed1.unit}`.trim() : parsed1.unit;
}

// Check if two ingredient names are similar enough to be considered the same
export function areIngredientsSimilar(name1: string, name2: string): boolean {
  const normalize = (name: string) => name.toLowerCase().trim()
    .replace(/\s+/g, ' ')  // normalize whitespace
    .replace(/[.,;:!?()-]/g, ''); // remove punctuation

  const normalized1 = normalize(name1);
  const normalized2 = normalize(name2);

  // Exact match after normalization
  if (normalized1 === normalized2) {
    return true;
  }

  // Check if one is contained in the other (e.g., "tomato" and "fresh tomato")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }

  return false;
}