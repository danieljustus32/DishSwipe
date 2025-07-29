import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Common fractions mapping for better user experience
const COMMON_FRACTIONS: Record<string, string> = {
  '0.125': '1/8',
  '0.1667': '1/6',
  '0.16667': '1/6',
  '0.166667': '1/6',
  '0.2': '1/5',
  '0.25': '1/4',
  '0.3333': '1/3',
  '0.33333': '1/3',
  '0.333333': '1/3',
  '0.375': '3/8',
  '0.4': '2/5',
  '0.5': '1/2',
  '0.6': '3/5',
  '0.625': '5/8',
  '0.6667': '2/3',
  '0.66667': '2/3',
  '0.666667': '2/3',
  '0.75': '3/4',
  '0.8': '4/5',
  '0.875': '7/8',
  '1.25': '1 1/4',
  '1.3333': '1 1/3',
  '1.33333': '1 1/3',
  '1.333333': '1 1/3',
  '1.5': '1 1/2',
  '1.6667': '1 2/3',
  '1.66667': '1 2/3',
  '1.666667': '1 2/3',
  '1.75': '1 3/4',
  '2.25': '2 1/4',
  '2.5': '2 1/2',
  '2.75': '2 3/4',
  '3.25': '3 1/4',
  '3.5': '3 1/2',
  '3.75': '3 3/4',
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function decimalToFraction(decimal: number, tolerance: number = 0.001): string {
  // Handle whole numbers
  if (Number.isInteger(decimal)) {
    return decimal.toString();
  }

  const wholePart = Math.floor(decimal);
  const fractionalPart = decimal - wholePart;

  // Try to find the fraction with smallest denominator
  for (let denominator = 2; denominator <= 64; denominator++) {
    const numerator = Math.round(fractionalPart * denominator);
    if (Math.abs(fractionalPart - numerator / denominator) < tolerance) {
      if (numerator === 0) {
        return wholePart.toString();
      }
      
      const commonDivisor = gcd(numerator, denominator);
      const simplifiedNum = numerator / commonDivisor;
      const simplifiedDen = denominator / commonDivisor;
      
      if (wholePart === 0) {
        return `${simplifiedNum}/${simplifiedDen}`;
      } else {
        return `${wholePart} ${simplifiedNum}/${simplifiedDen}`;
      }
    }
  }

  // If no simple fraction found, return original
  return decimal.toString();
}

export function formatQuantity(amount: string | null): string {
  if (!amount || amount.trim() === '') {
    return '';
  }

  // First check if it's already in a good format (contains fraction slash or is whole number)
  if (amount.includes('/') || !amount.includes('.')) {
    return amount;
  }

  // Parse the quantity string to extract number and unit
  const match = amount.match(/^([0-9]*\.?[0-9]+)\s*(.*)$/);
  if (!match) {
    return amount;
  }

  const [, numberStr, unit] = match;
  const number = parseFloat(numberStr);
  
  if (isNaN(number)) {
    return amount;
  }

  // Check common fractions first for exact matches
  const roundedStr = number.toFixed(6);
  for (const [decimal, fraction] of Object.entries(COMMON_FRACTIONS)) {
    if (roundedStr.startsWith(decimal)) {
      return unit ? `${fraction} ${unit}` : fraction;
    }
  }

  // Try algorithmic conversion
  const fraction = decimalToFraction(number);
  return unit ? `${fraction} ${unit}` : fraction;
}

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
