/**
 * Validation functions for dictionary splitting
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateMaxEntries(input: string): number {
  const maxEntries = parseInt(input, 10);
  
  if (isNaN(maxEntries)) {
    throw new Error('Max entries must be a valid number');
  }
  
  if (maxEntries <= 0) {
    throw new Error('Max entries must be greater than 0');
  }
  
  if (maxEntries > 1000000) {
    throw new Error('Max entries cannot exceed 1,000,000');
  }
  
  return maxEntries;
}

export function validateInputPath(inputPath: string): ValidationResult<string> {
  // Basic validation - path should not be empty
  if (!inputPath || inputPath.trim().length === 0) {
    return { success: false, error: 'Input path cannot be empty' };
  }
  
  return { success: true, data: inputPath };
}

export function validateOutputDir(outputDir: string): ValidationResult<string> {
  // Basic validation - path should not be empty
  if (!outputDir || outputDir.trim().length === 0) {
    return { success: false, error: 'Output directory cannot be empty' };
  }
  
  return { success: true, data: outputDir };
}