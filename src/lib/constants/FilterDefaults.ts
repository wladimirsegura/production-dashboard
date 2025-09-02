/**
 * Default filter values and configuration constants
 * Centralizes all hardcoded values for easy maintenance
 */

import type { DisplayMode } from '@/lib/types/FilterTypes'

export const FILTER_DEFAULTS = {
  // Line code prefixes that are selected by default
  lineCodePrefixes: ['F', 'D'],
  
  // Default machine numbers for bending mode
  machineNumbers: [
    '30ｶﾞﾀ', 'NC-1', 'NC-2', 'NC-20', 'NC-21', 'NC-3', 'NC-30', 'NC-5', 'NC-50',
    'NC-4', 'NC-6', 'NC-9', 'NC-8', 'NC-7', 'UNC08', 'UNC02', 'UNC10', 'UNC14',
    'UNC13', 'UNC12', 'UNC15', 'UNC31', 'UNC7R', 'UNC42', 'UNC17', 'UNC16', 'UNC32', 'CHIYODA'
  ],
  
  // Default subcontractors for brazing mode (empty by default - will be populated from API)
  subcontractors: [] as string[],
  
  // Display mode settings
  displayMode: 'quantity' as DisplayMode,
  
  // Date and pagination settings
  maxDates: 13,
  showAllProductionDates: false,
  
  // Query performance settings
  batchSize: 1000,
  chunkSize: 8000,
  
  // Date range calculation (days around selected date)
  dateRangeBuffer: {
    before: 5,
    after: 19
  }
} as const

export const DISPLAY_MODE_LABELS = {
  quantity: '本数',
  bending: '曲げ',
  brazing: 'ろう付け'
} as const

export const QUERY_LIMITS = {
  maxRecordsPerBatch: 1000,
  maxFilesPerRequest: 5,
  maxDateRange: 365, // days
  maxLineCodePrefixes: 10,
  maxMachineNumbers: 50
} as const

export const ERROR_MESSAGES = {
  noFileSelected: 'ファイルを選択してください',
  invalidFileType: 'CSVファイルを選択してください',
  dataFetchError: 'データの取得中にエラーが発生しました',
  filterValidationError: 'フィルター設定に問題があります',
  dateRangeError: '日付範囲が無効です',
  tooManyFilters: 'フィルター条件が多すぎます'
} as const

export const SUCCESS_MESSAGES = {
  dataLoaded: 'データを正常に読み込みました',
  filtersApplied: 'フィルターを適用しました',
  uploadComplete: 'アップロードが完了しました'
} as const