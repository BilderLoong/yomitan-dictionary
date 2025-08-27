import { describe, test, expect, beforeEach } from 'bun:test';
import { splitTerms } from '../src/splitter.js';
import { validateMaxEntries } from '../src/validation.js';
import type { TermEntry } from '../src/types.js';

describe('splitTerms', () => {
  let mockTerms: TermEntry[];
  
  beforeEach(() => {
    mockTerms = [
      ['term1', 'reading1', null, 'rule1', 100, ['definition1'], 1, 'tag1'],
      ['term2', 'reading2', null, 'rule2', 90, ['definition2'], 1, 'tag2'],
      ['term3', 'reading3', null, 'rule3', 80, ['definition3'], 2, 'tag3'],
      ['term4', 'reading4', null, 'rule4', 70, ['definition4'], 2, 'tag4'],
      ['term5', 'reading5', null, 'rule5', 60, ['definition5'], 3, 'tag5'],
    ];
  });
  
  test('should split terms correctly when maxEntries is smaller than total terms', () => {
    const result = splitTerms([mockTerms], 2);
    
    expect(result.length).toBe(3);
    expect(result[0].length).toBe(2); // First two terms (sequence 1)
    expect(result[1].length).toBe(2); // Next two terms (sequence 2)  
    expect(result[2].length).toBe(1); // Last term (sequence 3)
  });
  
  test('should keep terms with same sequence together when possible', () => {
    const result = splitTerms([mockTerms], 2);
    
    // Should have 3 chunks since we have 3 sequences and maxEntries=2
    expect(result.length).toBe(3);
    
    // Each chunk should contain terms from the same sequence
    expect(result[0].every(term => term[6] === 1)).toBeTrue();
    expect(result[1].every(term => term[6] === 2)).toBeTrue();
    expect(result[2].every(term => term[6] === 3)).toBeTrue();
  });
  
  test('should split large sequence groups when maxEntries is smaller', () => {
    const result = splitTerms([mockTerms], 1);
    
    // Should have 5 chunks since each term gets its own chunk when maxEntries=1
    expect(result.length).toBe(5);
    
    // Each chunk should contain exactly one term
    result.forEach(chunk => {
      expect(chunk.length).toBe(1);
    });
  });
  
  test('should handle empty term banks', () => {
    const result = splitTerms([], 10);
    expect(result).toEqual([]);
  });
});

describe('validation', () => {
  test('should validate max entries correctly', () => {
    expect(validateMaxEntries('100')).toBe(100);
    expect(() => validateMaxEntries('0')).toThrow('Max entries must be greater than 0');
    expect(() => validateMaxEntries('-1')).toThrow('Max entries must be greater than 0');
    expect(() => validateMaxEntries('abc')).toThrow('Max entries must be a valid number');
  });
});