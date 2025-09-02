/**
 * Cross-tabulation service
 * Handles business logic for generating cross-tabulated production data
 */

import type { DisplayMode, CrossTabOptions } from '@/lib/types/FilterTypes'
import { ProductionFilters } from '@/lib/filters/ProductionFilters'
import { CustomerGroupingUtils } from '@/lib/constants/CustomerGroups'
import { FILTER_DEFAULTS } from '@/lib/constants/FilterDefaults'
import { supabaseAdmin } from '@/lib/supabase'

interface ProductionQueryResult {
  customer_name: string | null
  due_date: string | null
  order_quantity: number | null
  bending_count: number | null
  brazing_count: number | null
  line_code: string | null
  machine_number: string | null
}

interface ProcessedData {
  customer_name: string
  due_date: string
  workload: number
}

interface CrossTabData {
  customer: string
  dates: { [date: string]: number }
  total: number
}

export class CrossTabService {
  /**
   * Generate cross-tabulated data with filters
   */
  async generateCrossTab(
    filters: ProductionFilters, 
    options: CrossTabOptions
  ): Promise<{
    data: CrossTabData[]
    dates: string[]
    availableLineCodes: string[]
    availableMachineNumbers: string[]
    availableSubcontractors: string[]
  }> {
    // Get available options first (for filter UI)
    const availableOptions = await this.getAvailableFilterOptions()
    
    // Fetch filtered data
    const rawData = await this.fetchFilteredData(filters, options)
    
    if (!rawData || rawData.length === 0) {
      return {
        data: [],
        dates: [],
        availableLineCodes: availableOptions.lineCodes,
        availableMachineNumbers: availableOptions.machineNumbers,
        availableSubcontractors: availableOptions.subcontractors
      }
    }

    // Process raw data into workload calculations
    const processedData = this.processWorkloadData(rawData, options.displayMode)
    
    // Generate cross-tabulation
    const crossTabData = this.generateCrossTabulation(processedData)
    
    // Get and filter dates
    const dates = this.getFilteredDates(processedData, options)
    
    return {
      data: crossTabData,
      dates,
      availableLineCodes: availableOptions.lineCodes,
      availableMachineNumbers: availableOptions.machineNumbers,
      availableSubcontractors: availableOptions.subcontractors
    }
  }

  /**
   * Fetch filtered production data using batching for performance
   */
  private async fetchFilteredData(
    filters: ProductionFilters,
    _options: CrossTabOptions
  ): Promise<ProductionQueryResult[]> {
    const BATCH_SIZE = FILTER_DEFAULTS.batchSize
    let allData: ProductionQueryResult[] = []
    let offset = 0
    let hasMoreData = true
    let batchCount = 0

    while (hasMoreData) {
      batchCount++
      console.log(`📦 Fetching batch ${batchCount} (offset: ${offset}, limit: ${BATCH_SIZE})`)

      // Build base query
      let batchQuery = supabaseAdmin
        .from('productions')
        .select('customer_name, due_date, order_quantity, bending_count, brazing_count, line_code, machine_number')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1)

      // Apply filters to the batch query
      batchQuery = filters.buildQuery(batchQuery)

      const { data: batchData, error } = await batchQuery

      if (error) {
        console.error(`Batch ${batchCount} query error:`, error)
        throw new Error(`データの取得中にエラーが発生しました: ${error.message}`)
      }

      if (!batchData || batchData.length === 0) {
        console.log(`📦 Batch ${batchCount}: No more data found`)
        hasMoreData = false
      } else {
        console.log(`📦 Batch ${batchCount}: ${batchData.length} records fetched`)
        allData = allData.concat(batchData)
        offset += BATCH_SIZE

        // If we got less than BATCH_SIZE records, we've reached the end
        if (batchData.length < BATCH_SIZE) {
          console.log(`📦 Batch ${batchCount}: Last batch (${batchData.length} < ${BATCH_SIZE})`)
          hasMoreData = false
        }
      }
    }

    console.log(`📊 Total records fetched: ${allData.length} (from ${batchCount} batches)`)
    return allData
  }

  /**
   * Process raw data into workload calculations based on display mode
   */
  private processWorkloadData(
    data: ProductionQueryResult[], 
    displayMode: DisplayMode
  ): ProcessedData[] {
    return data
      .filter(row => row.due_date) // Only filter out NULL due_date
      .map((row: ProductionQueryResult) => {
        // Use customer grouping utility for consistent naming
        const customerName = CustomerGroupingUtils.getDisplayName(row.customer_name)
        
        let workload = 0
        const quantity = row.order_quantity || 0
        const bendingCount = row.bending_count || 0
        const brazingCount = row.brazing_count || 0

        switch (displayMode) {
          case 'quantity':
            workload = quantity
            break
          case 'bending':
            workload = quantity * bendingCount
            break
          case 'brazing':
            workload = quantity * brazingCount
            break
          default:
            workload = quantity
        }

        return {
          customer_name: customerName,
          due_date: row.due_date!,
          workload: workload
        }
      })
  }

  /**
   * Generate cross-tabulation from processed data
   */
  private generateCrossTabulation(processedData: ProcessedData[]): CrossTabData[] {
    // Group by customer and calculate totals for each date
    const customerMap = new Map<string, CrossTabData>()

    processedData.forEach((row: ProcessedData) => {
      const customer = row.customer_name
      const date = row.due_date
      const workload = row.workload

      if (!customerMap.has(customer)) {
        customerMap.set(customer, {
          customer,
          dates: {},
          total: 0
        })
      }

      const customerData = customerMap.get(customer)!
      
      if (!customerData.dates[date]) {
        customerData.dates[date] = 0
      }
      
      customerData.dates[date] += workload
      customerData.total += workload
    })

    // Convert to array and sort by customer display order
    const crossTabData = Array.from(customerMap.values())
    const sortedCustomers = CustomerGroupingUtils.sortByDisplayOrder(
      crossTabData.map(item => item.customer)
    )

    return sortedCustomers.map(customerName => 
      crossTabData.find(item => item.customer === customerName)!
    ).filter(Boolean)
  }

  /**
   * Get filtered dates based on options
   */
  private getFilteredDates(processedData: ProcessedData[], options: CrossTabOptions): string[] {
    // Get unique dates and sort them (ascending - oldest to newest)
    const uniqueDates = [...new Set(processedData.map((row: ProcessedData) => row.due_date))]
      .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())

    console.log(`📅 Found ${uniqueDates.length} unique dates after processing:`, uniqueDates)

    // Filter dates to only include those with actual production data
    const datesWithData = uniqueDates.filter(date => {
      const totalForDate = processedData
        .filter(row => row.due_date === date)
        .reduce((sum, row) => sum + row.workload, 0)
      return totalForDate > 0
    })

    console.log(`🔍 Filtered to ${datesWithData.length} dates with production data`)

    // Apply date limiting logic
    if (!options.showAllProductionDates) {
      if (options.selectedDate) {
        // If a specific date is selected, find its index and show dates from there
        const selectedIndex = datesWithData.findIndex(date => date === options.selectedDate)
        if (selectedIndex !== -1) {
          console.log(`📊 Selecting ${options.maxDates} days starting from ${options.selectedDate} (index ${selectedIndex})`)
          return datesWithData.slice(selectedIndex, selectedIndex + options.maxDates)
        } else {
          console.log(`📊 Selected date ${options.selectedDate} not found, showing first ${options.maxDates} days`)
          return datesWithData.slice(0, options.maxDates)
        }
      } else {
        // No specific date selected, show first maxDates days
        console.log(`📊 No specific date selected, showing first ${options.maxDates} days from ${datesWithData.length} available`)
        return datesWithData.slice(0, options.maxDates)
      }
    } else {
      console.log(`📊 Showing ALL ${datesWithData.length} production dates`)
      return datesWithData
    }
  }

  /**
   * Get available filter options (cached for performance)
   */
  private async getAvailableFilterOptions(): Promise<{
    lineCodes: string[]
    machineNumbers: string[]
    subcontractors: string[]
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('productions')
        .select('machine_number, line_code, subcontractor')
        .not('due_date', 'is', null)

      if (error) {
        console.error('Error fetching available options:', error)
        return { lineCodes: [], machineNumbers: [], subcontractors: [] }
      }

      if (!data) {
        return { lineCodes: [], machineNumbers: [], subcontractors: [] }
      }

      // Improve type safety by defining the expected row structure
      interface OptionsRow {
        machine_number: string | null
        line_code: string | null
        subcontractor: string | null
      }

      const machineNumbers = [...new Set(data
        .map((row: OptionsRow) => row.machine_number)
        .filter((machine: string | null): machine is string =>
          machine !== null && machine.trim() !== ''
        )
      )] as string[]

      const lineCodes = [...new Set(data
        .map((row: OptionsRow) => row.line_code)
        .filter((code: string | null): code is string =>
          code !== null && code.trim() !== ''
        )
      )] as string[]

      const subcontractors = [...new Set(data
        .map((row: OptionsRow) => row.subcontractor)
        .filter((sub: string | null): sub is string =>
          sub !== null && sub.trim() !== ''
        )
      )] as string[]

      // Add special "blank" option for null/empty subcontractors
      const subcontractorOptions = ['(空白)', ...subcontractors.sort()]

      return {
        lineCodes: lineCodes.sort(),
        machineNumbers: machineNumbers.sort(),
        subcontractors: subcontractorOptions
      }
    } catch (error) {
      console.error('Error in getAvailableFilterOptions:', error)
      return { lineCodes: [], machineNumbers: [], subcontractors: [] }
    }
  }

  /**
   * Calculate date range around a selected date
   */
  static calculateDateRange(selectedDate: string, showAllDates: boolean = false): {
    start: string
    end: string
  } | null {
    if (showAllDates) {
      return null // No date range limit
    }

    const baseDate = new Date(selectedDate)
    
    // Go back 5 days and forward 19 days (25 day window)
    const startDate = new Date(baseDate)
    startDate.setDate(startDate.getDate() - FILTER_DEFAULTS.dateRangeBuffer.before)
    
    const endDate = new Date(baseDate)
    endDate.setDate(endDate.getDate() + FILTER_DEFAULTS.dateRangeBuffer.after)
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  }
}