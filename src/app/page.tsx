'use client'

import { useState, useEffect } from 'react'

interface CrossTabData {
  customer: string
  dates: { [date: string]: number }
  total: number
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [testing, setTesting] = useState(false)
  const [debugging, setDebugging] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [message, setMessage] = useState('')
  const [crossTabData, setCrossTabData] = useState<CrossTabData[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState('') // Empty means show from today
  const [displayMode, setDisplayMode] = useState<'quantity' | 'bending' | 'brazing'>('quantity')
  const [lineCodeFilter, setLineCodeFilter] = useState<string[]>([]) // Will be populated from API
  const [availableLineCodes, setAvailableLineCodes] = useState<string[]>([])

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
    setUploadProgress(0)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Use XMLHttpRequest to track both upload and batch processing progress
      const xhr = new XMLHttpRequest()
      
      // Track current batch and total batches
      let currentBatch = 0
      let totalBatches = 1 // Default to 1, will be updated from server response
      
      // Create a promise to handle the XHR response
      const uploadPromise = new Promise((resolve, reject) => {
        // Set up progress tracking for file upload (10% of progress)
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            // File upload is only 10% of the total progress
            const uploadPercentage = (event.loaded / event.total) * 10
            setUploadProgress(Math.min(10, uploadPercentage))
          }
        })
        
        // Set up progress tracking for batch processing (90% of progress)
        // We'll use a custom response handler to track batch progress
        xhr.addEventListener('readystatechange', () => {
          // Check for progress headers in partial responses
          if (xhr.readyState === 3 || xhr.readyState === 4) { // LOADING or DONE
            try {
              // Try to parse any partial response as JSON
              const responseText = xhr.responseText
              if (responseText && responseText.trim()) {
                const result = JSON.parse(responseText)
                
                // Check if we have batch progress information
                if (result.currentBatch !== undefined && result.totalBatches !== undefined) {
                  currentBatch = result.currentBatch
                  totalBatches = result.totalBatches
                  
                  // Calculate batch progress directly based on batch count
                  // Each batch is one step, and the full bar represents the total number of batches
                  if (totalBatches > 0) {
                    // File upload is 10%, batch processing is 90%
                    // So we start at 10% and each batch adds (90 / totalBatches)% to the progress
                    const batchProgress = 10 + ((currentBatch / totalBatches) * 90)
                    setUploadProgress(Math.min(99, batchProgress))
                  }
                }
              }
            } catch {
              // Ignore JSON parsing errors for partial responses
              // This is expected as the response might be incomplete
            }
          }
        })
        
        // Set up completion handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText)
              resolve(result)
            } catch {
              reject(new Error('Invalid response format'))
            }
          } else {
            try {
              const result = JSON.parse(xhr.responseText)
              // Check if we have batch progress information
              if (result.insertedSoFar !== undefined && result.error) {
                // Update progress based on how many batches were completed
                const partialMessage = `${result.insertedSoFar}件のデータが保存されました（処理中にエラーが発生）`
                setMessage(partialMessage)
                reject(new Error(result.error))
              } else {
                reject(new Error(result.error || `Error: ${xhr.status}`))
              }
            } catch {
              reject(new Error(`Error: ${xhr.status}`))
            }
          }
        })
        
        // Set up error handler
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })
        
        // Set up abort handler
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'))
        })
      })
      
      // Add timeout to prevent hanging - increased for large files
      const timeoutId = setTimeout(() => xhr.abort(), 300000) // 5 minute timeout
      
      // Open and send the request
      xhr.open('POST', '/api/upload-csv', true)
      xhr.send(formData)
      
      // Wait for the upload to complete
      const result = await uploadPromise as { message: string }
      
      clearTimeout(timeoutId)
      setUploadProgress(100) // Complete the progress
      
      setMessage(`成功: ${result.message}`)
      setFile(null)
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      // Refresh data
      fetchCrossTabData()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('aborted')) {
          setMessage('アップロードがタイムアウトしました（5分）。ファイルサイズが大きすぎる可能性があります。')
        } else {
          setMessage(`エラー: ${error.message || 'アップロード中にエラーが発生しました'}`)
        }
      } else {
        setMessage('アップロード中にエラーが発生しました')
      }
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
      if (uploadProgress !== 100) {
        setUploadProgress(0)
      }
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

  const fetchCrossTabData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('displayMode', displayMode)
      
      // Only add lineCodes if we have some selected
      if (lineCodeFilter.length > 0) {
        params.append('lineCodes', lineCodeFilter.join(','))
      }
      
      // If selectedDate is not empty, show 6 days from that date
      if (selectedDate) {
        params.append('selectedDate', selectedDate)
      }
      // Otherwise, show 6 days from today (default behavior)

      console.log('=== FRONTEND: fetchCrossTabData ===')
      console.log('Request params:', { displayMode, lineCodes: lineCodeFilter, selectedDate: selectedDate || 'today' })
      console.log('Full URL:', `/api/crosstab?${params}`)

      const response = await fetch(`/api/crosstab?${params}`)
      const result = await response.json()

      console.log('=== FRONTEND: API Response ===')
      console.log('Response status:', response.status)
      console.log('Dates received from backend:', result.dates)
      console.log('Available line codes:', result.availableLineCodes)
      console.log('Number of dates received:', result.dates?.length || 0)

      if (response.ok) {
        const crossTabData = result.data || []
        setCrossTabData(crossTabData)
        setDates(result.dates || [])
        
        // Update available line codes and set all as selected initially
        if (result.availableLineCodes && availableLineCodes.length === 0) {
          const lineCodes = result.availableLineCodes.sort()
          setAvailableLineCodes(lineCodes)
          setLineCodeFilter(lineCodes) // Select all line codes by default
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
  }

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
  }, [displayMode, lineCodeFilter, selectedDate])

  useEffect(() => {
    setMessage('')
  }, [selectedDate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${date.getMonth() + 1}/${date.getDate()}\n${days[date.getDay()]}`
  }

  // Calculate column totals
  const calculateColumnTotals = () => {
    const totals: { [date: string]: number } = {}
    dates.forEach(date => {
      totals[date] = crossTabData.reduce((sum, row) => sum + (row.dates[date] || 0), 0)
    })
    return totals
  }

  const getDisplayModeLabel = () => {
    switch (displayMode) {
      case 'quantity': return '本数'
      case 'bending': return '曲げ'
      case 'brazing': return 'ろう付け'
      default: return '本数'
    }
  }

  const handleLineCodeChange = (lineCode: string, checked: boolean) => {
    if (checked) {
      setLineCodeFilter([...lineCodeFilter, lineCode])
    } else {
      setLineCodeFilter(lineCodeFilter.filter(code => code !== lineCode))
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-center text-white">生産管理ダッシュボード</h1>
        
        {/* CSV Upload Section */}
        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white border-b border-gray-600 pb-2">CSVファイルアップロード</h2>
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
          {/* Progress Bar */}
          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>アップロード中...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {message && (
            <div className={`mt-4 p-3 border rounded ${message.startsWith('成功') || message.startsWith('テスト成功') || message.startsWith('デバッグ') || message.startsWith('クリーンアップ成功') || message.startsWith('プレビュー成功') ? 'bg-green-900 text-green-200 border-green-600' : 'bg-red-900 text-red-200 border-red-600'}`}>
              {message}
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
              <label className="block text-sm font-medium text-gray-300 mb-1">ラインコード</label>
              <div className="flex gap-2 flex-wrap">
                {availableLineCodes.map(code => (
                  <label key={code} className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={lineCodeFilter.includes(code)}
                      onChange={(e) => handleLineCodeChange(code, e.target.checked)}
                      className="mr-1"
                    />
                    {code}
                  </label>
                ))}
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
            {!selectedDate && dates.length <= 6 && <span className="ml-4 text-sm font-normal text-green-400">直近6日分の生産データ</span>}
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
                      const columnTotal = calculateColumnTotals()[date] || 0
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
      </div>
    </div>
  )
}
