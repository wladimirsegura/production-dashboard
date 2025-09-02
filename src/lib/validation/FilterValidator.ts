/**
 * Filter validation utilities
 * Centralizes all filter validation logic
 */

import type { FilterParams, ValidationResult } from '@/lib/types/FilterTypes'
import { QUERY_LIMITS, ERROR_MESSAGES } from '@/lib/constants/FilterDefaults'

export class FilterValidator {
  /**
   * Validate line code prefixes
   */
  static validateLineCodePrefixes(prefixes: string[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (prefixes.length === 0) {
      warnings.push('ラインコード頭文字が選択されていません')
    }

    if (prefixes.length > QUERY_LIMITS.maxLineCodePrefixes) {
      errors.push(`ラインコード頭文字は最大${QUERY_LIMITS.maxLineCodePrefixes}個まで選択できます`)
    }

    // Validate each prefix is a single character
    for (const prefix of prefixes) {
      if (!prefix || prefix.length !== 1) {
        errors.push(`無効なラインコード頭文字: ${prefix}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate machine numbers
   */
  static validateMachineNumbers(machines: string[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (machines.length > QUERY_LIMITS.maxMachineNumbers) {
      errors.push(`機械番号は最大${QUERY_LIMITS.maxMachineNumbers}個まで選択できます`)
    }

    // Check for empty or invalid machine numbers
    const invalidMachines = machines.filter(machine => !machine || machine.trim() === '')
    if (invalidMachines.length > 0) {
      errors.push('空の機械番号が含まれています')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate subcontractors
   */
  static validateSubcontractors(subcontractors: string[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (subcontractors.length > QUERY_LIMITS.maxMachineNumbers) {
      errors.push(`二次協力企業は最大${QUERY_LIMITS.maxMachineNumbers}個まで選択できます`)
    }

    // Check for empty or invalid subcontractor names
    const invalidSubcontractors = subcontractors.filter(sub => !sub || sub.trim() === '')
    if (invalidSubcontractors.length > 0) {
      errors.push('空の二次協力企業名が含まれています')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate date range
   */
  static validateDateRange(start: string, end: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if dates are valid
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (isNaN(startDate.getTime())) {
      errors.push('開始日が無効です')
    }

    if (isNaN(endDate.getTime())) {
      errors.push('終了日が無効です')
    }

    if (errors.length === 0) {
      // Check if start is before end
      if (startDate >= endDate) {
        errors.push('開始日は終了日より前である必要があります')
      }

      // Check if date range is too large
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > QUERY_LIMITS.maxDateRange) {
        errors.push(`日付範囲は最大${QUERY_LIMITS.maxDateRange}日まで指定できます`)
      }

      // Warn if date range is very large
      if (daysDiff > 90) {
        warnings.push('日付範囲が大きいため、処理に時間がかかる可能性があります')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate a single date string
   */
  static validateDate(dateString: string): ValidationResult {
    const errors: string[] = []
    
    if (!dateString) {
      errors.push('日付が指定されていません')
      return { isValid: false, errors }
    }

    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      errors.push('無効な日付形式です')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate display mode
   */
  static validateDisplayMode(mode: string): ValidationResult {
    const errors: string[] = []
    const validModes = ['quantity', 'bending', 'brazing']

    if (!validModes.includes(mode)) {
      errors.push(`無効な表示モード: ${mode}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate all filter parameters at once
   */
  static validateFilterParams(params: FilterParams): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []

    // Validate display mode
    const displayModeResult = this.validateDisplayMode(params.displayMode)
    allErrors.push(...displayModeResult.errors)

    // Validate line code prefixes if provided
    if (params.lineCodePrefixes && params.lineCodePrefixes.length > 0) {
      const prefixResult = this.validateLineCodePrefixes(params.lineCodePrefixes)
      allErrors.push(...prefixResult.errors)
      if (prefixResult.warnings) allWarnings.push(...prefixResult.warnings)
    }

    // Validate machine numbers if provided
    if (params.machineNumbers && params.machineNumbers.length > 0) {
      const machineResult = this.validateMachineNumbers(params.machineNumbers)
      allErrors.push(...machineResult.errors)
      if (machineResult.warnings) allWarnings.push(...machineResult.warnings)
    }

    // Validate subcontractors if provided
    if (params.subcontractors && params.subcontractors.length > 0) {
      const subcontractorResult = this.validateSubcontractors(params.subcontractors)
      allErrors.push(...subcontractorResult.errors)
      if (subcontractorResult.warnings) allWarnings.push(...subcontractorResult.warnings)
    }

    // Validate date range if provided
    if (params.dateRange) {
      const dateRangeResult = this.validateDateRange(params.dateRange.start, params.dateRange.end)
      allErrors.push(...dateRangeResult.errors)
      if (dateRangeResult.warnings) allWarnings.push(...dateRangeResult.warnings)
    }

    // Validate selected date if provided
    if (params.selectedDate) {
      const dateResult = this.validateDate(params.selectedDate)
      allErrors.push(...dateResult.errors)
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    }
  }

  /**
   * Sanitize filter parameters
   * Removes invalid values and applies defaults
   */
  static sanitizeFilterParams(params: Partial<FilterParams>): FilterParams {
    return {
      displayMode: params.displayMode && ['quantity', 'bending', 'brazing'].includes(params.displayMode) 
        ? params.displayMode 
        : 'quantity',
      lineCodePrefixes: params.lineCodePrefixes?.filter(p => p && p.length === 1) || [],
      machineNumbers: params.machineNumbers?.filter(m => m && m.trim() !== '') || [],
      subcontractors: params.subcontractors?.filter(s => s && s.trim() !== '') || [],
      dateRange: params.dateRange,
      selectedDate: params.selectedDate,
      showAllProductionDates: params.showAllProductionDates || false,
      maxDates: params.maxDates && params.maxDates > 0 ? params.maxDates : 13
    }
  }
}