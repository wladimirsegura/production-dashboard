/**
 * Production data filtering class
 * Handles query building and parameter management for production data
 */

import type { FilterParams, FilterCondition, QueryFilters } from '@/lib/types/FilterTypes'
import { FilterValidator } from '@/lib/validation/FilterValidator'
import { FILTER_DEFAULTS } from '@/lib/constants/FilterDefaults'

export class ProductionFilters {
  private conditions: FilterCondition[] = []
  private dateRange?: { start: string; end: string }

  constructor(private params: FilterParams = { displayMode: 'quantity' }) {
    // Validate and sanitize parameters
    this.params = FilterValidator.sanitizeFilterParams(params)
  }

  /**
   * Add line code prefix filter
   * Uses SQL ILIKE for efficient prefix matching
   */
  addLineCodePrefixFilter(prefixes: string[]): this {
    if (!prefixes || prefixes.length === 0) return this

    const validation = FilterValidator.validateLineCodePrefixes(prefixes)
    if (!validation.isValid) {
      throw new Error(`Invalid line code prefixes: ${validation.errors.join(', ')}`)
    }

    // Create OR conditions for each prefix using ILIKE
    const prefixConditions: FilterCondition[] = prefixes.map(prefix => ({
      field: 'line_code',
      operator: 'ilike',
      value: `${prefix}%`
    }))

    // If multiple prefixes, we need to handle this as an OR condition
    // For now, we'll store them as separate conditions and handle OR logic in query builder
    this.conditions.push(...prefixConditions)
    
    return this
  }

  /**
   * Add machine number filter
   * Uses SQL IN for efficient categorical filtering
   */
  addMachineNumberFilter(machines: string[]): this {
    if (!machines || machines.length === 0) return this

    const validation = FilterValidator.validateMachineNumbers(machines)
    if (!validation.isValid) {
      throw new Error(`Invalid machine numbers: ${validation.errors.join(', ')}`)
    }

    this.conditions.push({
      field: 'machine_number',
      operator: 'in',
      value: machines
    })

    return this
  }

  /**
   * Add subcontractor filter
   * Uses SQL IN for efficient categorical filtering
   */
  addSubcontractorFilter(subcontractors: string[]): this {
    if (!subcontractors || subcontractors.length === 0) return this

    const validation = FilterValidator.validateSubcontractors(subcontractors)
    if (!validation.isValid) {
      throw new Error(`Invalid subcontractors: ${validation.errors.join(', ')}`)
    }

    // Handle special "blank" option for null/empty subcontractors
    const hasBlankOption = subcontractors.includes('(空白)')
    const regularSubcontractors = subcontractors.filter(s => s !== '(空白)')

    if (hasBlankOption && regularSubcontractors.length > 0) {
      // Both blank and regular subcontractors selected - use OR condition
      this.conditions.push({
        field: 'subcontractor_or_null',
        operator: 'custom',
        value: regularSubcontractors
      })
    } else if (hasBlankOption) {
      // Only blank subcontractors selected
      this.conditions.push({
        field: 'subcontractor',
        operator: 'is_null',
        value: null
      })
    } else {
      // Only regular subcontractors selected
      this.conditions.push({
        field: 'subcontractor',
        operator: 'in',
        value: regularSubcontractors
      })
    }

    return this
  }

  /**
   * Add date range filter
   * Uses SQL GTE/LTE for efficient date range queries
   */
  addDateRangeFilter(start: string, end: string): this {
    const validation = FilterValidator.validateDateRange(start, end)
    if (!validation.isValid) {
      throw new Error(`Invalid date range: ${validation.errors.join(', ')}`)
    }

    this.dateRange = { start, end }
    
    this.conditions.push(
      {
        field: 'due_date',
        operator: 'gte',
        value: start
      },
      {
        field: 'due_date',
        operator: 'lte',
        value: end
      }
    )

    return this
  }

  /**
   * Add single date filter
   */
  addDateFilter(date: string): this {
    const validation = FilterValidator.validateDate(date)
    if (!validation.isValid) {
      throw new Error(`Invalid date: ${validation.errors.join(', ')}`)
    }

    this.conditions.push({
      field: 'due_date',
      operator: 'eq',
      value: date
    })

    return this
  }

  /**
   * Add customer filter
   */
  addCustomerFilter(customerName: string): this {
    if (!customerName || customerName.trim() === '') return this

    this.conditions.push({
      field: 'customer_name',
      operator: 'eq',
      value: customerName.trim()
    })

    return this
  }

  /**
   * Add non-null filter for a field
   */
  addNotNullFilter(field: string): this {
    this.conditions.push({
      field,
      operator: 'not',
      value: null
    })

    return this
  }

  /**
   * Build Supabase query from filter conditions
   */
  buildQuery(baseQuery: any): any {
    let query = baseQuery

    // SIMPLIFIED APPROACH: Handle line code OR conditions first, then apply other filters
    const lineCodeConditions = this.conditions.filter(c =>
      c.field === 'line_code' && c.operator === 'ilike'
    )
    const otherConditions = this.conditions.filter(c =>
      !(c.field === 'line_code' && c.operator === 'ilike')
    )

    // Apply line code OR conditions if any
    if (lineCodeConditions.length > 0) {
      if (lineCodeConditions.length === 1) {
        // Single line code condition
        query = query.ilike('line_code', lineCodeConditions[0].value as string)
      } else {
        // Multiple line code conditions - use OR
        const orConditions = lineCodeConditions.map(c =>
          `line_code.ilike.${c.value}`
        ).join(',')
        query = query.or(orConditions)
      }
    }

    // Apply all other conditions
    for (const condition of otherConditions) {
      switch (condition.operator) {
        case 'eq':
          query = query.eq(condition.field, condition.value)
          break
        case 'in':
          query = query.in(condition.field, condition.value as string[])
          break
        case 'ilike':
          query = query.ilike(condition.field, condition.value as string)
          break
        case 'gte':
          query = query.gte(condition.field, condition.value)
          break
        case 'lte':
          query = query.lte(condition.field, condition.value)
          break
        case 'not':
          if (condition.value === null) {
            query = query.not(condition.field, 'is', null)
          } else {
            query = query.not(condition.field, 'eq', condition.value)
          }
          break
        case 'is_null':
          query = query.is(condition.field, null)
          break
        case 'custom':
          if (condition.field === 'subcontractor_or_null') {
            // Handle OR condition for subcontractor (regular values OR null)
            const subcontractors = condition.value as string[]
            const orConditions = [
              'subcontractor.is.null',
              ...subcontractors.map(sub => `subcontractor.eq.${sub}`)
            ].join(',')
            query = query.or(orConditions)
          }
          break
      }
    }

    console.log('🔧 Applied filter conditions:', {
      lineCodeConditions: lineCodeConditions.length,
      otherConditions: otherConditions.length,
      totalConditions: this.conditions.length
    })

    return query
  }

  /**
   * Convert filters to URL search parameters
   */
  toURLParams(): URLSearchParams {
    const params = new URLSearchParams()

    params.append('displayMode', this.params.displayMode)

    if (this.params.lineCodePrefixes && this.params.lineCodePrefixes.length > 0) {
      params.append('lineCodePrefixes', this.params.lineCodePrefixes.join(','))
    }

    if (this.params.machineNumbers && this.params.machineNumbers.length > 0) {
      params.append('machineNumbers', this.params.machineNumbers.join(','))
    }

    if (this.params.subcontractors && this.params.subcontractors.length > 0) {
      params.append('subcontractors', this.params.subcontractors.join(','))
    }

    if (this.params.selectedDate) {
      params.append('selectedDate', this.params.selectedDate)
    }

    if (this.params.dateRange) {
      params.append('startDate', this.params.dateRange.start)
      params.append('endDate', this.params.dateRange.end)
    }

    if (this.params.showAllProductionDates) {
      params.append('showAllProductionDates', 'true')
    }

    if (this.params.maxDates && this.params.maxDates !== FILTER_DEFAULTS.maxDates) {
      params.append('maxDates', this.params.maxDates.toString())
    }

    return params
  }

  /**
   * Create filters from URL search parameters
   */
  static fromURLParams(searchParams: URLSearchParams): ProductionFilters {
    const params: FilterParams = {
      displayMode: (searchParams.get('displayMode') as any) || 'quantity',
      lineCodePrefixes: searchParams.get('lineCodePrefixes')?.split(',').filter(Boolean) || [],
      machineNumbers: searchParams.get('machineNumbers')?.split(',').filter(Boolean) || [],
      subcontractors: searchParams.get('subcontractors')?.split(',').filter(Boolean) || [],
      selectedDate: searchParams.get('selectedDate') || undefined,
      showAllProductionDates: searchParams.get('showAllProductionDates') === 'true',
      maxDates: parseInt(searchParams.get('maxDates') || '13', 10)
    }

    // Handle date range
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate && endDate) {
      params.dateRange = { start: startDate, end: endDate }
    }

    return new ProductionFilters(params)
  }

  /**
   * Get current filter parameters
   */
  getParams(): FilterParams {
    return { ...this.params }
  }

  /**
   * Get filter conditions for debugging
   */
  getConditions(): FilterCondition[] {
    return [...this.conditions]
  }

  /**
   * Clear all filters
   */
  clear(): this {
    this.conditions = []
    this.dateRange = undefined
    this.params = { displayMode: 'quantity' }
    return this
  }

  /**
   * Clone the current filter instance
   */
  clone(): ProductionFilters {
    const cloned = new ProductionFilters(this.params)
    cloned.conditions = [...this.conditions]
    cloned.dateRange = this.dateRange ? { ...this.dateRange } : undefined
    return cloned
  }
}