'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import FilterPopup, { FilterState } from '@/components/FilterPopup'

interface CrossTabData {
  customer: string
  dates: { [date: string]: number }
  total: number
}

interface UploadReport {
  totalRecords: number
  inserted: number
  updated: number
  processingTime: number
  fileName: string
  chunks?: number
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [testing, setTesting] = useState(false)
  const [debugging, setDebugging] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadReport, setUploadReport] = useState<UploadReport | null>(null)
  const [lastUploadedFile, setLastUploadedFile] = useState<string>('')
  const [crossTabData, setCrossTabData] = useState<CrossTabData[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => {
    // Set today's date as default in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0]
  })
  const [displayMode, setDisplayMode] = useState<'quantity' | 'bending' | 'brazing'>('quantity')
  const [lineCodeFilter, setLineCodeFilter] = useState<string[]>([]) // Will be populated from API
  const [lineCodePrefixFilter, setLineCodePrefixFilter] = useState<string[]>([]) // For filtering by first character
  const [availableLineCodes, setAvailableLineCodes] = useState<string[]>([])
  const [availableLineCodePrefixes, setAvailableLineCodePrefixes] = useState<string[]>([])
  const [availableMachineNumbers, setAvailableMachineNumbers] = useState<string[]>([])
  const [availableSubcontractors, setAvailableSubcontractors] = useState<string[]>([])
  const [subcontractorFilter, setSubcontractorFilter] = useState<string[]>([])
  const [machineNumberFilter, setMachineNumberFilter] = useState<string[]>([
    '30ｶﾞﾀ', 'NC-1', 'NC-2', 'NC-20', 'NC-21', 'NC-3', 'NC-30', 'NC-5', 'NC-50',
    'NC-4', 'NC-6', 'NC-9', 'NC-8', 'NC-7', 'UNC08', 'UNC02', 'UNC10', 'UNC14',
    'UNC13', 'UNC12', 'UNC15', 'UNC31', 'UNC7R', 'UNC42', 'UNC17', 'UNC16', 'UNC32', 'CHIYODA'
  ])
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage('ファイルを選択してください')
      return
    }

    setUploading(true)
    setUploadStatus('アップロードを開始中...')
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Use streaming API for real-time updates
      const response = await fetch('/api/upload-csv-chunked?stream=true', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.status) {
                setUploadStatus(data.status)
              } else if (data.complete) {
                if (data.message) {
                  setMessage(`成功: ${data.message}`)
                  
                  // Set upload report for detailed display
                  if (data.details) {
                    setUploadReport({
                      totalRecords: data.details.totalRecords || 0,
                      inserted: data.details.inserted || 0,
                      updated: data.details.updated || 0,
                      processingTime: data.details.processingTime || 0,
                      fileName: data.details.fileName || file.name,
                      chunks: data.details.chunks || 1
                    })
                    // Update last uploaded file name
                    setLastUploadedFile(data.details.fileName || file.name)
                  }
                  
                  setFile(null)
                  // Reset file input
                  const fileInput = document.getElementById('file-input') as HTMLInputElement
                  if (fileInput) fileInput.value = ''
                  // Refresh data
                  fetchCrossTabData()
                } else if (data.error) {
                  setMessage(`エラー: ${data.error}`)
                  setUploadReport(null)
                }
              } else if (data.error) {
                setMessage(`エラー: ${data.error}`)
                setUploadReport(null)
                break
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError)
            }
          }
        }
      }
      
    } catch (error) {
      setMessage(`エラー: ${error instanceof Error ? error.message : 'アップロード中にエラーが発生しました'}`)
      setUploadReport(null)
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
      setTimeout(() => setUploadStatus(''), 3000) // Reset status after 3 seconds
    }
  }

  const handleTestUpload = async () => {
    setTesting(true)
    setMessage('')

    try {
      const response = await fetch('/api/test-upload', {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`テスト成功: ${result.message}`)
        // Refresh data after successful test
        fetchCrossTabData()
      } else {
        setMessage(`テストエラー: ${result.error}`)
        if (result.details) {
          console.error('Test error details:', result.details)
        }
      }
    } catch (error) {
      setMessage('テストアップロード中にエラーが発生しました')
      console.error('Test upload error:', error)
    } finally {
      setTesting(false)
    }
  }

  const handleDebugData = async () => {
    setDebugging(true)
    setMessage('')

    try {
      const response = await fetch('/api/debug-data')
      const result = await response.json()

      if (response.ok) {
        console.log('Debug data result:', result)
        const minDate = result.dateRange?.min || 'なし'
        const maxDate = result.dateRange?.max || 'なし'
        setMessage(`デバッグ情報: 総レコード数 ${result.totalRecords}件, 日付範囲: ${minDate} ～ ${maxDate}`)
      } else {
        setMessage(`デバッグエラー: ${result.error}`)
      }
    } catch (error) {
      setMessage('デバッグ中にエラーが発生しました')
      console.error('Debug error:', error)
    } finally {
      setDebugging(false)
    }
  }

  const handleCleanupData = async () => {
    if (!confirm('本当にすべてのデータを削除しますか？この操作は元に戻せません。')) {
      return
    }

    setCleaning(true)
    setMessage('')

    try {
      const response = await fetch('/api/cleanup-data', {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`クリーンアップ成功: ${result.message}`)
        // Refresh data after cleanup
        fetchCrossTabData()
      } else {
        setMessage(`クリーンアップエラー: ${result.error}`)
      }
    } catch (error) {
      setMessage('クリーンアップ中にエラーが発生しました')
      console.error('Cleanup error:', error)
    } finally {
      setCleaning(false)
    }
  }

  const handlePreviewCSV = async () => {
    if (!file) {
      setMessage('ファイルを選択してください')
      return
    }

    setPreviewing(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/preview-csv', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        console.log('CSV Preview Result:', result)
        const headerCount = result.headers?.length || 0
        setMessage(`プレビュー成功: エンコーディング=${result.encoding}, 行数=${result.totalRows}, 列数=${headerCount}`)
        console.log('CSV Headers (after replacement):', result.headers)
        console.log('Sample Data:', result.sampleData)
      } else {
        setMessage(`プレビューエラー: ${result.error}`)
        if (result.details) {
          console.error('Preview error details:', result.details)
        }
      }
    } catch (error) {
      setMessage('プレビュー中にエラーが発生しました')
      console.error('Preview error:', error)
    } finally {
      setPreviewing(false)
    }
  }


  // Function to show all production dates (not limited to 6)
  const showAllProductionDates = () => {
    // Set selectedDate to empty and fetch all production dates
    setSelectedDate('')
    fetchCrossTabDataWithAllDates()
  }

  const fetchCrossTabDataWithAllDates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('displayMode', displayMode)
      params.append('lineCodes', lineCodeFilter.join(','))
      params.append('showAllProductionDates', 'true') // Show all production dates without limit

      console.log('=== FRONTEND: fetchCrossTabDataWithAllDates ===')
      console.log('Request params:', { displayMode, lineCodes: lineCodeFilter, showAllProductionDates: true })
      console.log('Full URL:', `/api/crosstab?${params}`)

      const response = await fetch(`/api/crosstab?${params}`)
      const result = await response.json()

      console.log('=== FRONTEND: API Response (All Production Dates) ===')
      console.log('Response status:', response.status)
      console.log('All dates received from backend (including zero production):', result.dates)
      console.log('Number of all dates received:', result.dates?.length || 0)

      if (response.ok) {
        const crossTabData = result.data || []
        setCrossTabData(crossTabData)
        
        // Filter dates to show only those with production data (no limiting)
        const allDates: string[] = result.dates || []
        const datesWithProduction = allDates.filter((date: string) => {
          const totalForDate = crossTabData.reduce((sum: number, row: CrossTabData) => sum + (row.dates[date] || 0), 0)
          return totalForDate > 0
        })
        
        setDates(datesWithProduction) // Show ALL dates with production (no 6-date limit)
        
        console.log('=== FRONTEND: State Updated (All Production Dates) ===')
        console.log('CrossTab data rows:', crossTabData.length)
        console.log('All dates from backend:', allDates)
        console.log('All production dates set in state:', datesWithProduction)
      } else {
        setMessage(`データ取得エラー: ${result.error}`)
      }
    } catch (error) {
      setMessage('データ取得中にエラーが発生しました')
      console.error('=== FRONTEND: Fetch Error (All Dates) ===', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Update available line code prefixes whenever available line codes change
    const prefixes = [...new Set(availableLineCodes.map(code => code.charAt(0)))].sort()
    setAvailableLineCodePrefixes(prefixes)
    
    // Select 'F' and 'D' prefixes by default
    if (prefixes.length > 0 && lineCodePrefixFilter.length === 0) {
      const defaultPrefixes = prefixes.filter(p => ['F', 'D'].includes(p))
      setLineCodePrefixFilter(defaultPrefixes)
    }
  }, [availableLineCodes])

  const handleLineCodePrefixChange = (prefix: string, checked: boolean) => {
    if (checked) {
      setLineCodePrefixFilter([...lineCodePrefixFilter, prefix])
    } else {
      setLineCodePrefixFilter(lineCodePrefixFilter.filter(p => p !== prefix))
    }
  }

  const fetchCrossTabData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('displayMode', displayMode)
      
      // Add lineCodePrefixes if we have some selected
      if (lineCodePrefixFilter.length > 0) {
        params.append('lineCodePrefixes', lineCodePrefixFilter.join(','))
      }
      
      // Add machineNumbers if we have some selected and we're in bending mode
      if (displayMode === 'bending' && machineNumberFilter.length > 0) {
        params.append('machineNumbers', machineNumberFilter.join(','))
      }
      
      // Add subcontractors if we have some selected and we're in brazing mode
      if (displayMode === 'brazing' && subcontractorFilter.length > 0) {
        params.append('subcontractors', subcontractorFilter.join(','))
      }
      
      // If selectedDate is not empty, show 6 days from that date
      if (selectedDate) {
        params.append('selectedDate', selectedDate)
      }
      // Otherwise, show 6 days from today (default behavior)

      console.log('=== FRONTEND: fetchCrossTabData ===')
      console.log('Request params:', {
        displayMode,
        lineCodePrefixes: lineCodePrefixFilter,
        machineNumbers: machineNumberFilter,
        selectedDate: selectedDate || 'today'
      })
      console.log('Full URL:', `/api/crosstab?${params}`)

      const response = await fetch(`/api/crosstab?${params}`)
      const result = await response.json()

      console.log('=== FRONTEND: API Response ===')
      console.log('Response status:', response.status)
      console.log('Dates received from backend:', result.dates)
      console.log('Available line codes:', result.availableLineCodes)
      console.log('Available machine numbers:', result.availableMachineNumbers)
      console.log('Number of dates received:', result.dates?.length || 0)

      if (response.ok) {
        const crossTabData = result.data || []
        setCrossTabData(crossTabData)
        setDates(result.dates || [])
        
        // Update available line codes for prefix generation
        if (result.availableLineCodes && availableLineCodes.length === 0) {
          const lineCodes = result.availableLineCodes.sort()
          setAvailableLineCodes(lineCodes)
        }
        
        // Update available machine numbers
        if (result.availableMachineNumbers) {
          const machineNumbers = result.availableMachineNumbers.filter(Boolean).sort()
          setAvailableMachineNumbers(machineNumbers)
        }
        
        // Update available subcontractors
        if (result.availableSubcontractors) {
          const subcontractors = result.availableSubcontractors.filter(Boolean).sort()
          setAvailableSubcontractors(subcontractors)
        }
        
        console.log('=== FRONTEND: State Updated ===')
        console.log('CrossTab data rows:', crossTabData.length)
        console.log('Dates set in state:', result.dates)
      } else {
        setMessage(`データ取得エラー: ${result.error}`)
      }
    } catch (error) {
      setMessage('データ取得中にエラーが発生しました')
      console.error('=== FRONTEND: Fetch Error ===', error)
    } finally {
      setLoading(false)
    }
  }, [displayMode, selectedDate, lineCodePrefixFilter, machineNumberFilter, subcontractorFilter, availableLineCodes.length])

  const navigateDates = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate)
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1) // Go back 1 day
    } else {
      currentDate.setDate(currentDate.getDate() + 1) // Go forward 1 day
    }
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  useEffect(() => {
    fetchCrossTabData()
  }, [fetchCrossTabData])

  // Auto-select "(空白)" subcontractor when switching to brazing mode
  useEffect(() => {
    if (displayMode === 'brazing' && availableSubcontractors.includes('(空白)')) {
      // If no subcontractors are selected, default to "(空白)"
      if (subcontractorFilter.length === 0) {
        setSubcontractorFilter(['(空白)'])
      }
    }
  }, [displayMode, availableSubcontractors, subcontractorFilter.length])

  useEffect(() => {
    setMessage('')
  }, [selectedDate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${date.getMonth() + 1}/${date.getDate()}\n${days[date.getDay()]}`
  }

  // Calculate column totals with memoization
  const columnTotals = useMemo(() => {
    const totals: { [date: string]: number } = {}
    dates.forEach(date => {
      totals[date] = crossTabData.reduce((sum, row) => sum + (row.dates[date] || 0), 0)
    })
    return totals
  }, [crossTabData, dates])

  const getDisplayModeLabel = () => {
    switch (displayMode) {
      case 'quantity': return '本数'
      case 'bending': return '曲げ'
      case 'brazing': return 'ろう付け'
      default: return '本数'
    }
  }


  const handleFilterApply = useCallback((filters: FilterState) => {
    setLineCodePrefixFilter(filters.lineCodePrefixes)
    setMachineNumberFilter(filters.machineNumbers)
    setSubcontractorFilter(filters.subcontractors)
  }, [])

  const getCurrentFilters = useCallback((): FilterState => ({
    lineCodePrefixes: lineCodePrefixFilter,
    machineNumbers: machineNumberFilter,
    subcontractors: subcontractorFilter
  }), [lineCodePrefixFilter, machineNumberFilter, subcontractorFilter])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-center text-white">生産管理ダッシュボード</h1>
        
        {/* CSV Upload Section */}
        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white border-b border-gray-600 pb-2">CSVファイルアップロード</h2>
          {lastUploadedFile && (
            <div className="mb-4 text-sm text-gray-300">
              最後にアップロードしたファイル: <span className="font-semibold text-blue-300">{lastUploadedFile}</span>
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-500 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handlePreviewCSV}
                disabled={previewing || !file}
                className="px-4 py-2 bg-yellow-700 text-white border border-yellow-600 rounded hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
              >
                {previewing ? 'プレビュー中...' : 'プレビュー'}
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="px-4 py-2 bg-blue-700 text-white border border-blue-600 rounded hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
              >
                {uploading ? 'アップロード中...' : 'アップロード'}
              </button>
              <button
                onClick={handleTestUpload}
                disabled={testing}
                className="px-4 py-2 bg-green-700 text-white border border-green-600 rounded hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
              >
                {testing ? 'テスト中...' : 'テストデータ挿入'}
              </button>
              <button
                onClick={handleDebugData}
                disabled={debugging}
                className="px-4 py-2 bg-purple-700 text-white border border-purple-600 rounded hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
              >
                {debugging ? 'デバッグ中...' : 'データ確認'}
              </button>
              <button
                onClick={handleCleanupData}
                disabled={cleaning}
                className="px-4 py-2 bg-red-700 text-white border border-red-600 rounded hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
              >
                {cleaning ? 'クリーンアップ中...' : 'データ削除'}
              </button>
            </div>
          </div>
          {/* Upload Status */}
          {uploading && uploadStatus && (
            <div className="mt-4 p-3 bg-blue-900 text-blue-200 border border-blue-600 rounded">
              <div className="text-sm font-mono">
                {uploadStatus}
              </div>
            </div>
          )}
          
          {message && (
            <div className={`mt-4 p-3 border rounded ${message.startsWith('成功') || message.startsWith('テスト成功') || message.startsWith('デバッグ') || message.startsWith('クリーンアップ成功') || message.startsWith('プレビュー成功') ? 'bg-green-900 text-green-200 border-green-600' : 'bg-red-900 text-red-200 border-red-600'}`}>
              {message}
            </div>
          )}
          
          {/* Upload Report */}
          {uploadReport && (
            <div className="mt-4 p-4 bg-blue-900 text-blue-200 border border-blue-600 rounded">
              <h3 className="font-semibold text-lg mb-3 text-blue-100">📊 アップロード結果レポート</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-800 p-3 rounded">
                  <div className="text-blue-300 text-xs uppercase tracking-wide">総レコード数</div>
                  <div className="text-xl font-bold text-white">{uploadReport.totalRecords.toLocaleString()}</div>
                </div>
                <div className="bg-green-800 p-3 rounded">
                  <div className="text-green-300 text-xs uppercase tracking-wide">新規追加</div>
                  <div className="text-xl font-bold text-white">{uploadReport.inserted.toLocaleString()}</div>
                </div>
                <div className="bg-yellow-800 p-3 rounded">
                  <div className="text-yellow-300 text-xs uppercase tracking-wide">更新</div>
                  <div className="text-xl font-bold text-white">{uploadReport.updated.toLocaleString()}</div>
                </div>
                <div className="bg-purple-800 p-3 rounded">
                  <div className="text-purple-300 text-xs uppercase tracking-wide">処理時間</div>
                  <div className="text-xl font-bold text-white">{(uploadReport.processingTime / 1000).toFixed(1)}秒</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-300">
                ファイル: {uploadReport.fileName}
                {uploadReport.chunks && uploadReport.chunks > 1 && (
                  <span className="ml-2 px-2 py-1 bg-blue-700 rounded text-xs">
                    {uploadReport.chunks}個のチャンクで処理
                  </span>
                )}
              </div>
              <button
                onClick={() => setUploadReport(null)}
                className="mt-3 px-3 py-1 bg-blue-700 text-blue-200 rounded text-xs hover:bg-blue-600"
              >
                レポートを閉じる
              </button>
            </div>
          )}
        </div>

        {/* Filter Section */}
        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white border-b border-gray-600 pb-2">期間フィルター</h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">基準日</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-500 rounded px-3 py-2 bg-gray-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">表示モード</label>
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as 'quantity' | 'bending' | 'brazing')}
                className="border border-gray-500 rounded px-3 py-2 bg-gray-700 text-white"
              >
                <option value="quantity">本数</option>
                <option value="bending">曲げ</option>
                <option value="brazing">ろう付け</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">フィルター</label>
              <button
                onClick={() => setIsFilterPopupOpen(true)}
                className="px-4 py-2 bg-purple-700 text-white border border-purple-600 rounded hover:bg-purple-600 font-semibold"
              >
                🔍 詳細フィルター
              </button>
              <div className="mt-2 text-xs text-gray-400">
                {lineCodePrefixFilter.length > 0 && (
                  <span>頭文字: {lineCodePrefixFilter.join(', ')}</span>
                )}
                {displayMode === 'bending' && machineNumberFilter.length > 0 && (
                  <span className="ml-2">機械: {machineNumberFilter.length}台</span>
                )}
                {displayMode === 'brazing' && subcontractorFilter.length > 0 && (
                  <span className="ml-2">協力企業: {subcontractorFilter.length}社</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => navigateDates('prev')}
                disabled={loading || !selectedDate}
                className="px-3 py-2 bg-blue-700 text-white border border-blue-600 rounded hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
              >
                ← 前日
              </button>
              <button
                onClick={showAllProductionDates}
                disabled={loading}
                className="px-3 py-2 bg-orange-700 text-white border border-orange-600 rounded hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
              >
                全生産日
              </button>
              <button
                onClick={() => navigateDates('next')}
                disabled={loading || !selectedDate}
                className="px-3 py-2 bg-blue-700 text-white border border-blue-600 rounded hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
              >
                翌日 →
              </button>
            </div>
            <button
              onClick={fetchCrossTabData}
              disabled={loading}
              className="px-4 py-2 bg-green-700 text-white border border-green-600 rounded hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed mt-6 font-semibold"
            >
              {loading ? '読み込み中...' : '更新'}
            </button>
          </div>
        </div>

        {/* Cross Tab Table */}
        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-white border-b border-gray-600 pb-2">
            得意先別作業工数（{getDisplayModeLabel()}）
            {!selectedDate && dates.length <= 6 && (
              <span className="ml-4 text-sm font-normal text-green-400">
                {new Date().toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </span>
            )}
            {!selectedDate && dates.length > 6 && <span className="ml-4 text-sm font-normal text-orange-400">全生産日を表示中（{dates.length}日分）</span>}
            {selectedDate && <span className="ml-4 text-sm font-normal text-blue-400">{selectedDate}周辺の6日分</span>}
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-300">データを読み込み中...</div>
          ) : crossTabData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">データがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border-2 border-gray-500">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="border-2 border-gray-500 px-4 py-3 text-left font-bold text-white bg-gray-600">得意先</th>
                    {dates.map((date) => (
                      <th key={date} className="border-2 border-gray-500 px-2 py-3 text-center font-bold text-white bg-gray-600 min-w-[80px] whitespace-pre-line">
                        {formatDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crossTabData.map((row, index) => (
                    <tr key={row.customer} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                      <td className="border-2 border-gray-500 px-4 py-2 font-bold text-white bg-gray-700">{row.customer}</td>
                      {dates.map((date) => (
                        <td key={date} className="border-2 border-gray-500 px-2 py-2 text-center text-white font-medium">
                          {row.dates[date] ? row.dates[date].toLocaleString() : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-yellow-800">
                    <td className="border-2 border-gray-500 px-4 py-2 font-bold text-white bg-yellow-700">合計</td>
                    {dates.map((date) => {
                      const columnTotal = columnTotals[date] || 0
                      return (
                        <td key={date} className="border-2 border-gray-500 px-2 py-2 text-center font-bold text-white">
                          {columnTotal.toLocaleString()}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Filter Popup */}
        <FilterPopup
          isOpen={isFilterPopupOpen}
          onClose={() => setIsFilterPopupOpen(false)}
          onApply={handleFilterApply}
          currentFilters={getCurrentFilters()}
          displayMode={displayMode}
          availableLineCodes={availableLineCodes}
          availableMachineNumbers={availableMachineNumbers}
          availableSubcontractors={availableSubcontractors}
        />
      </div>
    </div>
  )
}