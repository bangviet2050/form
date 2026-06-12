// Staff permissions types and defaults — NOT a 'use server' file

export interface StaffPermissions {
  categories: {
    deviceType: boolean
    deviceModel: boolean
    accessories: boolean
    conditionBefore: boolean
    conditionAfter: boolean
    receivedBy: boolean
    repairedBy: boolean
  }
  tabs: {
    reports: boolean
    logs: boolean
  }
}

export const DEFAULT_PERMISSIONS: StaffPermissions = {
  categories: {
    deviceType: false,
    deviceModel: false,
    accessories: false,
    conditionBefore: false,
    conditionAfter: false,
    receivedBy: false,
    repairedBy: false,
  },
  tabs: {
    reports: false,
    logs: false,
  },
}
