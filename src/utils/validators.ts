import { BillStatus } from '../types';

export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const DDO_ID_REGEX = /^\d{6,7}$/;
export const BANK_ACCOUNT_REGEX = /^\d{9,18}$/;
export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
export const PIN_REGEX = /^[1-9]\d{5}$/;
export const MICR_REGEX = /^\d{9}$/;
export const MOBILE_REGEX = /^[6-9]\d{9}$/;
export const USERNAME_REGEX = /^[A-Za-z][A-Za-z0-9]{2,31}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function isValidIFSC(ifsc: string): boolean {
  if (!ifsc) return false;
  return IFSC_REGEX.test(ifsc.trim().toUpperCase());
}

export function isValidDdoId(ddoId: string): boolean {
  if (!ddoId) return false;
  return DDO_ID_REGEX.test(ddoId.trim());
}

export function isValidPan(pan: string): boolean {
  return PAN_REGEX.test((pan || '').trim().toUpperCase());
}

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test((pin || '').trim());
}

export function isValidMicr(micr: string): boolean {
  return MICR_REGEX.test((micr || '').trim());
}

export function isValidMobile(mobile: string): boolean {
  return MOBILE_REGEX.test((mobile || '').trim());
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test((username || '').trim());
}

export function assertVendorMaster(vendor: {
  pan?: string;
  city?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
  micr?: string;
  accountHolderName?: string;
  gstin: string;
}): void {
  const pan = (vendor.pan || '').trim().toUpperCase();
  if (!isValidPan(pan)) throw new Error('PAN must be 10 characters, for example ABCDE1234F.');
  if (vendor.gstin.trim().toUpperCase().slice(2, 12) !== pan) {
    throw new Error('PAN must match the 10 characters inside the GSTIN.');
  }
  if (!(vendor.city || '').trim()) throw new Error('City is required.');
  if (!isValidPin(vendor.pinCode || '')) throw new Error('PIN code must be 6 digits.');
  if (!isValidMobile(vendor.phone || '')) throw new Error('Mobile must be a 10-digit Indian number.');
  if (!EMAIL_REGEX.test((vendor.email || '').trim())) throw new Error('A valid vendor email is required.');
  if (!isValidMicr(vendor.micr || '')) throw new Error('MICR must be 9 digits.');
  if (!(vendor.accountHolderName || '').trim()) throw new Error('Name as per bank account is required.');
}

export function assertUserIdentity(user: {
  username?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
}): void {
  if (!isValidUsername(user.username || '')) {
    throw new Error('User name must start with a letter and contain only letters and numbers, with no spaces or symbols.');
  }
  if (!(user.firstName || '').trim() || !(user.lastName || '').trim()) {
    throw new Error('First name and last name are required.');
  }
  if (!isValidMobile(user.mobile || '')) throw new Error('Mobile number must be 10 digits.');
}

/**
 * Strict status lifecycle transitions:
 * Draft -> Pending Verification
 * Pending Verification -> Pending Approval | Rejected
 * Pending Approval -> Pending RTGS | Rejected
 * Pending RTGS -> Paid
 * Rejected -> Pending Verification (when Creator edits & resubmits)
 * Draft -> Draft (updates)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  Draft: ['Pending Verification', 'Draft'],
  'Pending Verification': ['Pending Approval', 'Rejected'],
  'Pending Approval': ['Pending RTGS', 'Rejected'],
  'Pending RTGS': ['Paid'],
  Rejected: ['Pending Verification', 'Draft'],
  Paid: [], // Terminal state
};

export function canTransitionStatus(from: BillStatus, to: BillStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}
