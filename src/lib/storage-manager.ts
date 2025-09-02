import { supabaseAdmin } from './supabase'

export interface StorageUploadResult {
  success: boolean
  fileName?: string
  path?: string
  error?: string
}

export interface BulkProcessResult {
  success: boolean
  inserted: number
  updated: number
  errors: string[]
  processingTime: number
  fileName: string
  totalRecords: number
}

export interface UploadDetails {
  totalRecords: number
  inserted: number
  updated: number
  processingTime: number
  fileName: string
}

/**
 * Upload CSV file to Supabase Storage
 */
export async function uploadCSVToStorage(
  file: File, 
  content: string
): Promise<StorageUploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    
    // Create processed file
    const processedFile = new File([content], fileName, { type: 'text/csv' })
    
    console.log(`Uploading ${fileName} to Supabase Storage...`)
    
    const { data, error } = await supabaseAdmin.storage
      .from('csv-uploads')
      .upload(fileName, processedFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    console.log('File uploaded successfully:', data.path)
    
    return {
      success: true,
      fileName,
      path: data.path
    }
  } catch (error) {
    console.error('Upload exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    }
  }
}

/**
 * Trigger bulk processing via Edge Function
 */
export async function triggerBulkProcessing(fileName: string): Promise<BulkProcessResult> {
  try {
    console.log('Triggering bulk processing for:', fileName)
    
    const { data, error } = await supabaseAdmin.functions
      .invoke('bulk-upsert-productions', {
        body: { fileName }
      })

    if (error) {
      console.error('Edge Function error:', error)
      throw new Error(`Edge Function failed: ${error.message}`)
    }

    const result = data as BulkProcessResult
    console.log('Bulk processing result:', result)
    
    return result
  } catch (error) {
    console.error('Bulk processing exception:', error)
    return {
      success: false,
      inserted: 0,
      updated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown processing error'],
      processingTime: 0,
      fileName,
      totalRecords: 0
    }
  }
}

/**
 * Clean up uploaded file from storage
 */
export async function cleanupStorageFile(fileName: string): Promise<void> {
  try {
    console.log('Cleaning up storage file:', fileName)
    
    const { error } = await supabaseAdmin.storage
      .from('csv-uploads')
      .remove([fileName])
    
    if (error) {
      console.error('Cleanup error:', error)
    } else {
      console.log('File cleaned up successfully:', fileName)
    }
  } catch (error) {
    console.error('Cleanup exception:', error)
  }
}

/**
 * Get storage file info
 */
export async function getStorageFileInfo(fileName: string) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('csv-uploads')
      .list('', {
        search: fileName
      })
    
    if (error) {
      console.error('File info error:', error)
      return null
    }
    
    return data.find(file => file.name === fileName)
  } catch (error) {
    console.error('File info exception:', error)
    return null
  }
}

/**
 * List all CSV files in storage
 */
export async function listStorageFiles() {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('csv-uploads')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (error) {
      console.error('List files error:', error)
      return []
    }
    
    return data
  } catch (error) {
    console.error('List files exception:', error)
    return []
  }
}

/**
 * Complete bulk upload workflow
 */
export async function performBulkUpload(
  file: File,
  processedContent: string
): Promise<{
  success: boolean
  message?: string
  details?: any
  error?: string
}> {
  let uploadedFileName: string | undefined
  
  try {
    // Step 1: Upload to storage
    const uploadResult = await uploadCSVToStorage(file, processedContent)
    
    if (!uploadResult.success) {
      return {
        success: false,
        error: `アップロードに失敗しました: ${uploadResult.error}`
      }
    }
    
    uploadedFileName = uploadResult.fileName
    
    // Step 2: Process via Edge Function
    const processResult = await triggerBulkProcessing(uploadResult.path!)
    
    if (!processResult.success) {
      return {
        success: false,
        error: `データ処理に失敗しました: ${processResult.errors.join(', ')}`,
        details: {
          processed: processResult.inserted,
          total: processResult.totalRecords,
          processingTime: processResult.processingTime
        }
      }
    }
    
    // Step 3: Return success
    return {
      success: true,
      message: `${processResult.totalRecords}件のデータを正常に処理しました`,
      details: {
        totalRecords: processResult.totalRecords,
        processed: processResult.inserted,
        processingTime: processResult.processingTime,
        fileName: file.name
      }
    }
    
  } catch (error) {
    // Clean up on error
    if (uploadedFileName) {
      await cleanupStorageFile(uploadedFileName)
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}