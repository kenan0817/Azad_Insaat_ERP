import React from 'react';
import { Building2, Hammer } from 'lucide-react';

type BrandLogoSize = 'sm' | 'md' | 'lg';
type BrandLogoTone = 'light' | 'dark';

interface BrandLogoProps {
  size?: BrandLogoSize;
  tone?: BrandLogoTone;
  showSubtitle?: boolean;
  className?: string;
}

const sizeMap: Record<BrandLogoSize, {
  gap: string;
  mark: string;
  icon: number;
  badge: string;
  badgeIcon: number;
  title: string;
  subtitle: string;
}> = {
  sm: {
    gap: 'gap-2',
    mark: 'w-9 h-9 rounded-xl',
    icon: 18,
    badge: 'w-4 h-4 -right-1 -bottom-1',
    badgeIcon: 10,
    title: 'text-lg',
    subtitle: 'text-[10px]',
  },
  md: {
    gap: 'gap-3',
    mark: 'w-11 h-11 rounded-2xl',
    icon: 22,
    badge: 'w-5 h-5 -right-1 -bottom-1',
    badgeIcon: 12,
    title: 'text-xl',
    subtitle: 'text-xs',
  },
  lg: {
    gap: 'gap-4',
    mark: 'w-16 h-16 rounded-2xl',
    icon: 32,
    badge: 'w-7 h-7 -right-1.5 -bottom-1.5',
    badgeIcon: 15,
    title: 'text-3xl',
    subtitle: 'text-sm',
  },
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  tone = 'dark',
  showSubtitle = false,
  className = '',
}) => {
  const classes = sizeMap[size];
  const primaryText = tone === 'light' ? 'text-white' : 'text-slate-900';
  const accentText = tone === 'light' ? 'text-sky-200' : 'text-blue-700';
  const subtitleText = tone === 'light' ? 'text-slate-300' : 'text-slate-500';

  return (
    <div className={`flex items-center ${classes.gap} ${className}`}>
      <div className={`relative ${classes.mark} shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25 ring-1 ring-white/20`}>
        <Building2 size={classes.icon} strokeWidth={2.2} className="text-white" />
        <span className={`absolute ${classes.badge} rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shadow-md ring-2 ${tone === 'light' ? 'ring-slate-950' : 'ring-white'}`}>
          <Hammer size={classes.badgeIcon} strokeWidth={2.4} />
        </span>
      </div>
      <div className="[font-family:'Manrope',Inter,sans-serif] leading-none min-w-0">
        <div className={`${classes.title} font-extrabold ${primaryText} whitespace-nowrap`}>
          Azad<span className={accentText}>Insaat</span>
        </div>
        {showSubtitle && (
          <div className={`${classes.subtitle} ${subtitleText} font-semibold mt-1 whitespace-nowrap`}>
            Tikinti materialları ERP
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
