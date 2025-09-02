import { NextRequest, NextResponse } from 'next/server'
import { ProductionFilters } from '@/lib/filters/ProductionFilters'
import { CrossTabService } from '@/lib/services/CrossTabService'
import { FilterValidator } from '@/lib/validation/FilterValidator'
import { FILTER_DEFAULTS, ERROR_MESSAGES } from '@/lib/constants/FilterDefaults'
import type { FilterParams, CrossTabOptions } from '@/lib/types/FilterTypes'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Crosstab API called with new architecture')
    
    // Parse and validate filter parameters
    const searchParams = new URL(request.url).searchParams
    const filterParams: FilterParams = {
      displayMode: (searchParams.get('displayMode') as 'quantity' | 'bending' | 'brazing') || FILTER_DEFAULTS.displayMode,
      // TEMPORARY FIX: Don't apply default line code filters - let user data determine what's available
      lineCodePrefixes: searchParams.get('lineCodePrefixes')?.split(',').filter(Boolean) || [],
      machineNumbers: searchParams.get('machineNumbers')?.split(',').filter(Boolean) || [],
      subcontractors: searchParams.get('subcontractors')?.split(',').filter(Boolean) || [],
      selectedDate: searchParams.get('selectedDate') || undefined,
      showAllProductionDates: searchParams.get('showAllProductionDates') === 'true',
      maxDates: parseInt(searchParams.get('maxDates') || FILTER_DEFAULTS.maxDates.toString(), 10)
    }

    // Validate filter parameters
    const validation = FilterValidator.validateFilterParams(filterParams)
    if (!validation.isValid) {
      console.error('Filter validation failed:', validation.errors)
      return NextResponse.json({
        error: ERROR_MESSAGES.filterValidationError,
        details: validation.errors.join(', ')
      }, { status: 400 })
    }

    // Log warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('Filter validation warnings:', validation.warnings)
    }

    console.log('🔧 Filter parameters:', filterParams)

    // Create filter instance
    const filters = new ProductionFilters(filterParams)

    // Add filters based on parameters
    if (filterParams.lineCodePrefixes && filterParams.lineCodePrefixes.length > 0) {
      filters.addLineCodePrefixFilter(filterParams.lineCodePrefixes)
    }

    if (filterParams.machineNumbers && filterParams.machineNumbers.length > 0) {
      filters.addMachineNumberFilter(filterParams.machineNumbers)
    }

    if (filterParams.subcontractors && filterParams.subcontractors.length > 0) {
      filters.addSubcontractorFilter(filterParams.subcontractors)
    }

    // TEMPORARY FIX: Disable restrictive date filtering to see if data appears
    // Add date filtering
    // if (filterParams.selectedDate && !filterParams.showAllProductionDates) {
    //   // Calculate date range around selected date
    //   const dateRange = CrossTabService.calculateDateRange(filterParams.selectedDate, filterParams.showAllProductionDates)
    //   if (dateRange) {
    //     filters.addDateRangeFilter(dateRange.start, dateRange.end)
    //   }
    // } else if (filterParams.selectedDate && filterParams.showAllProductionDates) {
    //   // For single date with showAll, filter by that specific date
    //   filters.addDateFilter(filterParams.selectedDate)
    // }

    // Always filter out null due_dates
    filters.addNotNullFilter('due_date')

    // Create cross-tab options
    const options: CrossTabOptions = {
      displayMode: filterParams.displayMode,
      selectedDate: filterParams.selectedDate,
      showAllProductionDates: filterParams.showAllProductionDates || false,
      maxDates: filterParams.maxDates || FILTER_DEFAULTS.maxDates
    }

    // Generate cross-tabulation using service
    const service = new CrossTabService()
    const result = await service.generateCrossTab(filters, options)

    console.log(`✅ Cross-tab generated successfully: ${result.data.length} customers, ${result.dates.length} dates`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Crosstab API error:', error)
    
    // Handle specific error types
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json({
        error: ERROR_MESSAGES.filterValidationError,
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      error: ERROR_MESSAGES.dataFetchError,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}