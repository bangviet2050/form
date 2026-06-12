// Vietnam mobile carrier detection by phone number prefix

const CARRIERS: Record<string, { name: string; logo: string }> = {
  // Viettel
  '086': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '096': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '097': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '098': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '032': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '033': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '034': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '035': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '036': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '037': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '038': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  '039': { name: 'Viettel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Viettel_logo_2021.svg/3840px-Viettel_logo_2021.svg.png' },
  // Vinaphone
  '081': { name: 'Vinaphone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Vinaphone.svg/3840px-Logo_Vinaphone.svg.png' },
  '082': { name: 'Vinaphone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Vinaphone.svg/3840px-Logo_Vinaphone.svg.png' },
  '083': { name: 'Vinaphone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Vinaphone.svg/3840px-Logo_Vinaphone.svg.png' },
  '084': { name: 'Vinaphone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Vinaphone.svg/3840px-Logo_Vinaphone.svg.png' },
  '085': { name: 'Vinaphone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Vinaphone.svg/3840px-Logo_Vinaphone.svg.png' },
  '088': { name: 'Vinaphone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Vinaphone.svg/3840px-Logo_Vinaphone.svg.png' },
  '091': { name: 'Vinaphone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Vinaphone.svg/3840px-Logo_Vinaphone.svg.png' },
  '094': { name: 'Vinaphone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Vinaphone.svg/3840px-Logo_Vinaphone.svg.png' },
  // Mobifone
  '070': { name: 'Mobifone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MobiFone_logo.svg/3840px-MobiFone_logo.svg.png' },
  '079': { name: 'Mobifone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MobiFone_logo.svg/3840px-MobiFone_logo.svg.png' },
  '077': { name: 'Mobifone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MobiFone_logo.svg/3840px-MobiFone_logo.svg.png' },
  '076': { name: 'Mobifone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MobiFone_logo.svg/3840px-MobiFone_logo.svg.png' },
  '078': { name: 'Mobifone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MobiFone_logo.svg/3840px-MobiFone_logo.svg.png' },
  '090': { name: 'Mobifone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MobiFone_logo.svg/3840px-MobiFone_logo.svg.png' },
  '093': { name: 'Mobifone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MobiFone_logo.svg/3840px-MobiFone_logo.svg.png' },
  '089': { name: 'Mobifone', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MobiFone_logo.svg/3840px-MobiFone_logo.svg.png' },
  // Vietnamobile
  '092': { name: 'Vietnamobile', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Vietnamobile_Logo.svg/3840px-Vietnamobile_Logo.svg.png' },
  '058': { name: 'Vietnamobile', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Vietnamobile_Logo.svg/3840px-Vietnamobile_Logo.svg.png' },
  '056': { name: 'Vietnamobile', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Vietnamobile_Logo.svg/3840px-Vietnamobile_Logo.svg.png' },
}

export function detectCarrier(phone: string): { name: string; logo: string } | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 3) return null
  const prefix = digits.slice(0, 3)
  return CARRIERS[prefix] || null
}

export function isValidVietnamPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 && digits.startsWith('0')
}
