/**
 * Customer grouping rules configuration
 * Centralizes all customer grouping logic for easy maintenance
 */

export const CUSTOMER_GROUPING_RULES = {
  // Customers that remain as individual entries
  direct: ['5110', '4217', '4176', '4293', '4106'] as string[],
  
  // Customers that get combined into single entries
  combined: {
    '4117/9': ['4117', '4119'] as string[],
    '5121/3': ['5121', '5123'] as string[]
  },
  
  // Default group for all other customers
  others: 'その他'
}

// Predefined order for displaying customers in the cross-tab
export const CUSTOMER_DISPLAY_ORDER = [
  '5110',
  '4117/9',
  '4106',
  '4217',
  '5121/3',
  '4176',
  '4293',
  'その他'
] as string[]

/**
 * Utility functions for customer grouping
 */
export class CustomerGroupingUtils {
  /**
   * Get the display name for a customer code
   * Handles the 4-digit truncation and grouping logic
   */
  static getDisplayName(customerCode: string | null): string {
    if (!customerCode) return 'Unknown'
    
    // Truncate to first 4 characters if longer
    const truncated = customerCode.length >= 4 ? customerCode.substring(0, 4) : customerCode
    
    // Check if this customer should be combined
    for (const [combinedName, codes] of Object.entries(CUSTOMER_GROUPING_RULES.combined)) {
      if (codes.includes(truncated)) {
        return combinedName
      }
    }
    
    // Check if this is a direct customer
    if (CUSTOMER_GROUPING_RULES.direct.includes(truncated)) {
      return truncated
    }
    
    // All others go to the "others" group
    return CUSTOMER_GROUPING_RULES.others
  }
  
  /**
   * Check if a customer should be displayed individually
   */
  static isDirectCustomer(customerCode: string): boolean {
    const truncated = customerCode.substring(0, 4)
    return CUSTOMER_GROUPING_RULES.direct.includes(truncated)
  }
  
  /**
   * Check if a customer is part of a combined group
   */
  static getCombinedGroupName(customerCode: string): string | null {
    const truncated = customerCode.substring(0, 4)
    
    for (const [combinedName, codes] of Object.entries(CUSTOMER_GROUPING_RULES.combined)) {
      if (codes.includes(truncated)) {
        return combinedName
      }
    }
    
    return null
  }
  
  /**
   * Get all customer codes that belong to a combined group
   */
  static getCodesForCombinedGroup(groupName: string): string[] {
    const group = CUSTOMER_GROUPING_RULES.combined[groupName as keyof typeof CUSTOMER_GROUPING_RULES.combined]
    return group ? [...group] : []
  }
  
  /**
   * Sort customers according to the predefined display order
   */
  static sortByDisplayOrder(customers: string[]): string[] {
    return customers.sort((a, b) => {
      const aIndex = CUSTOMER_DISPLAY_ORDER.indexOf(a)
      const bIndex = CUSTOMER_DISPLAY_ORDER.indexOf(b)
      
      // If both are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      
      // If only one is in the order array, it comes first
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      
      // If neither is in the order array, sort alphabetically
      return a.localeCompare(b)
    })
  }
}