import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface CrossTabData {
  customer: string
  dates: { [date: string]: number }
  total: number
}

interface ProductionQueryResult {
  customer_name: string | null
  due_date: string | null
  order_quantity: number | null
  bending_count: number | null
  brazing_count: number | null
  line_code: string | null
}

interface ProcessedData {
  customer_name: string
  due_date: string
  workload: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const selectedDate = searchParams.get('selectedDate')
    const displayMode = searchParams.get('displayMode') || 'quantity'
    const lineCodes = searchParams.get('lineCodes')?.split(',') || ['F', 'D']
    const maxDates = parseInt(searchParams.get('maxDates') || '6', 10) || 6
    const showAllProductionDates = searchParams.get('showAllProductionDates') === 'true'

    console.log('🔍 Crosstab API called:', { selectedDate, displayMode, lineCodes, maxDates, showAllProductionDates })

    // Simple approach: fetch 25 days from selected date (or today) to find 6 production days
    let startDate: string | null = null
    let endDate: string | null = null
    
    if (!showAllProductionDates) {
      // Use selected date or today as starting point
      const baseDate = selectedDate ? new Date(selectedDate) : new Date()
      
      // Go back 5 days and forward 19 days to get a good range around the selected date
      const startDateObj = new Date(baseDate)
      startDateObj.setDate(startDateObj.getDate() - 5)
      startDate = startDateObj.toISOString().split('T')[0]
      
      const endDateObj = new Date(baseDate)
      endDateObj.setDate(endDateObj.getDate() + 19)
      endDate = endDateObj.toISOString().split('T')[0]
      
      console.log(`📅 Fetching 25 days around selected date: ${startDate} to ${endDate} (selected: ${selectedDate || 'today'})`)
    } else {
      console.log(`📅 Fetching all dates for showAllProductionDates`)
    }

    // Remove unused query variable - we'll use batching approach instead
    // Filter by line codes if provided
    const shouldFilterLineCodes = lineCodes && lineCodes.length > 0
    
    // Filter by selected date if provided
    if (selectedDate) {
      // Don't filter by specific date, we'll handle date range in the batch query
      console.log(`📅 Selected date: ${selectedDate} (will be used as reference for date range)`)
    } else {
      console.log('📅 No specific date selected, fetching all dates from database')
    }
    
    // Fetch ALL records using batching (same approach as upload)
    console.log('🚀 Fetching ALL records using batching approach (like upload)')
    
    const BATCH_SIZE = 1000
    let allData: ProductionQueryResult[] = []
    let offset = 0
    let hasMoreData = true
    let batchCount = 0
    
    while (hasMoreData) {
      batchCount++
      console.log(`📦 Fetching batch ${batchCount} (offset: ${offset}, limit: ${BATCH_SIZE})`)
      
      let batchQuery = supabaseAdmin
        .from('productions')
        .select('customer_name, due_date, order_quantity, bending_count, brazing_count, line_code')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1)
      
      // Apply same filters to each batch
      if (shouldFilterLineCodes) {
        batchQuery = batchQuery.in('line_code', lineCodes)
      }
      
      // Apply date range filter for 25-day window
      if (startDate && endDate && !showAllProductionDates) {
        batchQuery = batchQuery.gte('due_date', startDate).lte('due_date', endDate)
        console.log(`📦 Batch ${batchCount}: Applying 25-day range filter ${startDate} to ${endDate}`)
      } else if (selectedDate && showAllProductionDates) {
        // For single date selection with showAll, still filter by that date
        batchQuery = batchQuery.eq('due_date', selectedDate)
        console.log(`📦 Batch ${batchCount}: Filtering by specific date ${selectedDate} for showAllProductionDates`)
      } else {
        console.log(`📦 Batch ${batchCount}: Fetching all data for showAllProductionDates`)
      }
      
      const { data: batchData, error } = await batchQuery
      
      if (error) {
        console.error(`Batch ${batchCount} query error:`, error)
        return NextResponse.json({
          error: 'データの取得中にエラーが発生しました',
          details: error.message
        }, { status: 500 })
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
    
    const data = allData
    console.log(`📊 Total records fetched: ${data.length} (from ${batchCount} batches)`)
    
    // Show all unique due_dates in raw data
    if (data && data.length > 0) {
      const rawDueDates = [...new Set(data.map((row: ProductionQueryResult) => row.due_date).filter((date: string | null): date is string => date !== null))]
      rawDueDates.sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())
      console.log(`📅 Raw dates from database (${rawDueDates.length} unique dates):`, rawDueDates)
    }

    if (!data || data.length === 0) {
      console.log('No data found for the specified filters')
      return NextResponse.json({
        data: [],
        dates: [],
        message: '指定された期間にデータがありません'
      })
    }

    // Calculate work load based on display mode
    const processedData: ProcessedData[] = (data as ProductionQueryResult[])
      .filter(row => row.due_date) // Only filter out NULL due_date
      .map((row: ProductionQueryResult) => {
        // Use 'Unknown' for NULL customer_name
        const customerName = row.customer_name || 'Unknown'
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

    console.log(`🔄 Processed ${processedData.length} records (from ${data?.length || 0} raw records)`)

    // Get unique dates and sort them (昇順 - 古い日付が左に、新しい日付が右に来るようにソート)
    const uniqueDates = [...new Set(processedData.map((row: ProcessedData) => row.due_date))]
      .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())
    
    console.log(`📅 Found ${uniqueDates.length} unique dates after processing:`, uniqueDates)

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

    // Filter and group customers according to requirements
    const filteredData: CrossTabData[] = []
    const othersData: CrossTabData = {
      customer: 'その他',
      dates: {},
      total: 0
    }

    // Initialize others data dates
    uniqueDates.forEach(date => {
      othersData.dates[date] = 0
    })

    // Process each customer
    customerMap.forEach((data, customer) => {
      if (customer === '5110' || customer === '4217' || customer === '4176' || customer === '4293') {
        // Direct customers
        filteredData.push(data)
      } else if (customer === '4117' || customer === '4119') {
        // Combine 4117 and 4119 into 4117/9
        let combined = filteredData.find(item => item.customer === '4117/9')
        if (!combined) {
          combined = {
            customer: '4117/9',
            dates: {},
            total: 0
          }
          uniqueDates.forEach(date => {
            combined!.dates[date] = 0
          })
          filteredData.push(combined)
        }
        
        uniqueDates.forEach(date => {
          combined!.dates[date] += data.dates[date] || 0
        })
        combined.total += data.total
      } else if (customer === '5121' || customer === '5123') {
        // Combine 5121 and 5123 into 5121/3
        let combined = filteredData.find(item => item.customer === '5121/3')
        if (!combined) {
          combined = {
            customer: '5121/3',
            dates: {},
            total: 0
          }
          uniqueDates.forEach(date => {
            combined!.dates[date] = 0
          })
          filteredData.push(combined)
        }
        
        uniqueDates.forEach(date => {
          combined!.dates[date] += data.dates[date] || 0
        })
        combined.total += data.total
      } else {
        // All other customers go to "その他"
        uniqueDates.forEach(date => {
          othersData.dates[date] += data.dates[date] || 0
        })
        othersData.total += data.total
      }
    })

    // Add "その他" if it has data
    if (othersData.total > 0) {
      filteredData.push(othersData)
    }

    // Sort by predefined order
    const customerOrder = ['5110', '4117/9', '4217', '5121/3', '4176', '4293', 'その他']
    filteredData.sort((a, b) => {
      const aIndex = customerOrder.indexOf(a.customer)
      const bIndex = customerOrder.indexOf(b.customer)
      return aIndex - bIndex
    })

    // Filter dates to only include those with actual production data
    let datesWithData = uniqueDates.filter(date => {
      const totalForDate = filteredData.reduce((sum, row) => sum + (row.dates[date] || 0), 0)
      return totalForDate > 0
    })
    
    console.log(`🔍 Filtered to ${datesWithData.length} dates with production data (from ${uniqueDates.length} total dates)`)

    // Apply limiting logic: show 6 days from selected date or all production days
    if (!showAllProductionDates) {
      if (selectedDate) {
        // If a specific date is selected, find its index in the sorted dates
        const selectedIndex = datesWithData.findIndex(date => date === selectedDate);
        if (selectedIndex !== -1) {
          // If found, take 6 days starting from the selected date
          console.log(`📊 Selecting 6 days starting from ${selectedDate} (index ${selectedIndex})`)
          datesWithData = datesWithData.slice(selectedIndex, selectedIndex + 6);
          // If we don't have enough dates after the selected date, just show what we have
          if (datesWithData.length < 6) {
            console.log(`📊 Only ${datesWithData.length} days available from selected date ${selectedDate}`)
          }
        } else {
          console.log(`📊 Selected date ${selectedDate} not found in available dates, showing first 6 days`)
          if (datesWithData.length > 6) {
            datesWithData = datesWithData.slice(0, 6);
          }
        }
      } else {
        // No specific date selected, show first 6 days
        if (datesWithData.length > 6) {
          console.log(`📊 No specific date selected, showing first 6 days from ${datesWithData.length} available`)
          datesWithData = datesWithData.slice(0, 6);
        } else {
          console.log(`📊 Showing all ${datesWithData.length} available production days (less than 6 in total)`)
        }
      }
    } else {
      console.log(`📊 Showing ALL ${datesWithData.length} production dates (showAllProductionDates=true)`)
    }

    console.log(`✅ Final result: ${datesWithData.length} dates returned:`, datesWithData)

    return NextResponse.json({
      data: filteredData,
      dates: datesWithData,
      availableLineCodes: [...new Set(allData.map((row: ProductionQueryResult) => row.line_code).filter((code: string | null): code is string => code !== null))]
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'クロス集計データの生成中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}