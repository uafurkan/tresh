/** Web'deki globals.css :root renkleriyle birebir aynı — iki platformda da aynı marka kimliği. */
export const COLORS = {
  bgDeep: '#04090E',
  bgSurface: '#0B1622',
  bgRaised: '#122236',
  contentPrimary: '#E8F1F5',
  contentSecondary: '#8FA5B3',
  water: '#34E3D6',
  overflow: '#FF9647',
} as const;

/**
 * Web'in üç fontlu kimliği (layout.tsx: --font-heading/--font-mono/--font-body)
 * ile birebir aynı — Bricolage Grotesque başlıklarda, Martian Mono rakamlarda
 * ("num" sınıfı), Hanken Grotesk gövde metninde. FONTS_READY olmadan (fontlar
 * yüklenmeden) bu isimler sistem fontuna sessizce düşer.
 */
export const FONTS = {
  headingRegular: 'BricolageGrotesque_400Regular',
  headingSemiBold: 'BricolageGrotesque_600SemiBold',
  mono: 'MartianMono_400Regular',
  monoMedium: 'MartianMono_500Medium',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodySemiBold: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',
} as const;
