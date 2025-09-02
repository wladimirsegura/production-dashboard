/**
 * Centralized filter types for the production dashboard
 * This file defines all filter-related interfaces and types
 */

export type DisplayMode = 'quantity' | 'bending' | 'brazing'

export interface FilterParams {
  lineCodePrefixes?: string[]
  machineNumbers?: string[]
  subcontractors?: string[]
  dateRange?: {
    start: string
    end: string
  }
  selectedDate?: string
  displayMode: DisplayMode
  showAllProductionDates?: boolean
  maxDates?: number
}

export interface FilterState {
  lineCodePrefixes: string[]
  machineNumbers: string[]
  subcontractors: string[]
}

export interface CrossTabOptions {
  displayMode: DisplayMode
  selectedDate?: string
  showAllProductionDates: boolean
  maxDates: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface FilterCondition {
  field: string
  operator: 'eq' | 'in' | 'ilike' | 'gte' | 'lte' | 'not' | 'is_null' | 'custom'
  value: string | string[] | number | boolean | null
}

export interface QueryFilters {
  conditions: FilterCondition[]
  dateRange?: {
    start: string
    end: string
  }
}

export interface AvailableFilterOptions {
  lineCodes: string[]
  lineCodePrefixes: string[]
  machineNumbers: string[]
  subcontractors: string[]
  dateRange: {
    min: string
    max: string
  }
}