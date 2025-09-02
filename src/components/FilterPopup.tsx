'use client'

import { useState, useEffect } from 'react'

interface FilterPopupProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterState) => void
  currentFilters: FilterState
  displayMode: 'quantity' | 'bending' | 'brazing'
  availableLineCodes: string[]
  availableMachineNumbers: string[]
  availableSubcontractors: string[]
}

export interface FilterState {
  lineCodePrefixes: string[]
  machineNumbers: string[]
  subcontractors: string[]
}

export default function FilterPopup({
  isOpen,
  onClose,
  onApply,
  currentFilters,
  displayMode,
  availableLineCodes,
  availableMachineNumbers,
  availableSubcontractors
}: FilterPopupProps) {
  const [filters, setFilters] = useState<FilterState>(currentFilters)
  const [availableLineCodePrefixes, setAvailableLineCodePrefixes] = useState<string[]>([])

  useEffect(() => {
    // Update available line code prefixes whenever available line codes change
    const prefixes = [...new Set(availableLineCodes.map(code => code.charAt(0)))].sort()
    setAvailableLineCodePrefixes(prefixes)
  }, [availableLineCodes])

  useEffect(() => {
    setFilters(currentFilters)
  }, [currentFilters])

  // Auto-select "(空白)" when switching to brazing mode
  useEffect(() => {
    if (displayMode === 'brazing' && availableSubcontractors.includes('(空白)')) {
      // If no subcontractors are selected, default to "(空白)"
      if (filters.subcontractors.length === 0) {
        setFilters(prev => ({
          ...prev,
          subcontractors: ['(空白)']
        }))
      }
    }
  }, [displayMode, availableSubcontractors, filters.subcontractors.length])

  const handleLineCodePrefixChange = (prefix: string, checked: boolean) => {
    if (checked) {
      setFilters(prev => ({
        ...prev,
        lineCodePrefixes: [...prev.lineCodePrefixes, prefix]
      }))
    } else {
      setFilters(prev => ({
        ...prev,
        lineCodePrefixes: prev.lineCodePrefixes.filter(p => p !== prefix)
      }))
    }
  }

  const handleMachineNumberChange = (machineNumber: string, checked: boolean) => {
    if (checked) {
      setFilters(prev => ({
        ...prev,
        machineNumbers: [...prev.machineNumbers, machineNumber]
      }))
    } else {
      setFilters(prev => ({
        ...prev,
        machineNumbers: prev.machineNumbers.filter(m => m !== machineNumber)
      }))
    }
  }

  const handleSubcontractorChange = (subcontractor: string, checked: boolean) => {
    if (checked) {
      setFilters(prev => ({
        ...prev,
        subcontractors: [...prev.subcontractors, subcontractor]
      }))
    } else {
      setFilters(prev => ({
        ...prev,
        subcontractors: prev.subcontractors.filter(s => s !== subcontractor)
      }))
    }
  }

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  const handleReset = () => {
    const defaultMachineNumbers = [
      '30ｶﾞﾀ', 'NC-1', 'NC-2', 'NC-20', 'NC-21', 'NC-3', 'NC-30', 'NC-5', 'NC-50',
      'NC-4', 'NC-6', 'NC-9', 'NC-8', 'NC-7', 'UNC08', 'UNC02', 'UNC10', 'UNC14',
      'UNC13', 'UNC12', 'UNC15', 'UNC31', 'UNC7R', 'UNC42', 'UNC17', 'UNC16', 'UNC32', 'CHIYODA'
    ]
    
    // Default subcontractors: select "(空白)" for brazing mode
    const defaultSubcontractors = displayMode === 'brazing' && availableSubcontractors.includes('(空白)')
      ? ['(空白)']
      : []
    
    const resetFilters: FilterState = {
      lineCodePrefixes: availableLineCodePrefixes.filter(p => ['F', 'D'].includes(p)),
      machineNumbers: defaultMachineNumbers.filter(machine => availableMachineNumbers.includes(machine)),
      subcontractors: defaultSubcontractors
    }
    setFilters(resetFilters)
  }

  const handleSelectAllLineCodes = () => {
    setFilters(prev => ({
      ...prev,
      lineCodePrefixes: [...availableLineCodePrefixes]
    }))
  }

  const handleDeselectAllLineCodes = () => {
    setFilters(prev => ({
      ...prev,
      lineCodePrefixes: []
    }))
  }

  const handleSelectAllMachines = () => {
    setFilters(prev => ({
      ...prev,
      machineNumbers: [...availableMachineNumbers]
    }))
  }

  const handleDeselectAllMachines = () => {
    setFilters(prev => ({
      ...prev,
      machineNumbers: []
    }))
  }

  const handleSelectAllSubcontractors = () => {
    setFilters(prev => ({
      ...prev,
      subcontractors: [...availableSubcontractors]
    }))
  }

  const handleDeselectAllSubcontractors = () => {
    setFilters(prev => ({
      ...prev,
      subcontractors: []
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">フィルター設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Line Code Prefixes Filter */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-white">ラインコード（頭文字）</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAllLineCodes}
                className="px-2 py-1 bg-blue-700 text-white rounded text-xs hover:bg-blue-600"
              >
                全選択
              </button>
              <button
                onClick={handleDeselectAllLineCodes}
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                全解除
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {availableLineCodePrefixes.map(prefix => (
              <label key={prefix} className="flex items-center text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.lineCodePrefixes.includes(prefix)}
                  onChange={(e) => handleLineCodePrefixChange(prefix, e.target.checked)}
                  className="mr-2"
                />
                <span className="font-mono text-lg">{prefix}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Machine Number Filter - Only show for bending mode */}
        {displayMode === 'bending' && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-white">機械番号（曲げ専用）</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllMachines}
                  className="px-2 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-600"
                >
                  全選択
                </button>
                <button
                  onClick={handleDeselectAllMachines}
                  className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                >
                  全解除
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto">
              {availableMachineNumbers.map(machineNumber => (
                <label key={machineNumber} className="flex items-center text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.machineNumbers.includes(machineNumber)}
                    onChange={(e) => handleMachineNumberChange(machineNumber, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="font-mono">{machineNumber}</span>
                </label>
              ))}
            </div>
            {availableMachineNumbers.length === 0 && (
              <div className="text-gray-400 text-center py-4">
                機械番号データがありません
              </div>
            )}
          </div>
        )}

        {/* Subcontractor Filter - Only show for brazing mode */}
        {displayMode === 'brazing' && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-white">二次協力企業（ろう付け専用）</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllSubcontractors}
                  className="px-2 py-1 bg-orange-700 text-white rounded text-xs hover:bg-orange-600"
                >
                  全選択
                </button>
                <button
                  onClick={handleDeselectAllSubcontractors}
                  className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                >
                  全解除
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto">
              {availableSubcontractors.map(subcontractor => (
                <label key={subcontractor} className="flex items-center text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.subcontractors.includes(subcontractor)}
                    onChange={(e) => handleSubcontractorChange(subcontractor, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="font-mono text-sm">{subcontractor}</span>
                </label>
              ))}
            </div>
            {availableSubcontractors.length === 0 && (
              <div className="text-gray-400 text-center py-4">
                二次協力企業データがありません
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-yellow-700 text-white border border-yellow-600 rounded hover:bg-yellow-600 font-semibold"
          >
            リセット
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded hover:bg-gray-600 font-semibold"
            >
              キャンセル
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-700 text-white border border-blue-600 rounded hover:bg-blue-600 font-semibold"
            >
              適用
            </button>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 p-3 bg-gray-700 rounded text-sm text-gray-300">
          <div className="mb-1">
            <strong>選択中:</strong> ラインコード頭文字 {filters.lineCodePrefixes.length}個
            {displayMode === 'bending' && filters.machineNumbers.length > 0 && (
              <span>, 機械番号 {filters.machineNumbers.length}個</span>
            )}
            {displayMode === 'brazing' && filters.subcontractors.length > 0 && (
              <span>, 二次協力企業 {filters.subcontractors.length}個</span>
            )}
          </div>
          {filters.lineCodePrefixes.length > 0 && (
            <div>頭文字: {filters.lineCodePrefixes.join(', ')}</div>
          )}
          {displayMode === 'bending' && filters.machineNumbers.length > 0 && (
            <div>機械番号: {filters.machineNumbers.join(', ')}</div>
          )}
          {displayMode === 'brazing' && filters.subcontractors.length > 0 && (
            <div>二次協力企業: {filters.subcontractors.join(', ')}</div>
          )}
        </div>
      </div>
    </div>
  )
}