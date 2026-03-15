import { useState } from 'react';
import { CategoryIconId, CATEGORY_TO_ICON } from './types';

interface CategoryIconProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4 text-xs',
  md: 'w-6 h-6 text-sm',
  lg: 'w-8 h-8 text-base',
};

// ASCII/Unicode fallback icons for each category
const FALLBACK_ICONS: Record<CategoryIconId, string> = {
  security: '🛡️',
  network: '🔗',
  helpdesk: '🎧',
  hardware: '🖥️',
  'vendor-management': '🤝',
  compliance: '📋',
  linux: '🐧',
  windows: '🪟',
  email: '📧',
  phone: '📞',
};

// Terminal-style ASCII icons (for pure ASCII mode)
const ASCII_ICONS: Record<CategoryIconId, string> = {
  security: '[#]',
  network: '<->',
  helpdesk: '[?]',
  hardware: '[=]',
  'vendor-management': '[&]',
  compliance: '[✓]',
  linux: '[$]',
  windows: '[>]',
  email: '[@]',
  phone: '[~]',
};

interface CategoryIconProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  useAscii?: boolean;
  className?: string;
}

export function CategoryIcon({
  category,
  size = 'md',
  useAscii = false,
  className = '',
}: CategoryIconProps) {
  const [imageError, setImageError] = useState(false);

  // Map category string to icon ID
  const iconId: CategoryIconId = CATEGORY_TO_ICON[category] || 'hardware';
  const imagePath = `/assets/images/icons/${iconId}.png`;

  if (imageError || useAscii) {
    // Use ASCII or emoji fallback
    const icon = useAscii ? ASCII_ICONS[iconId] : FALLBACK_ICONS[iconId];
    return (
      <span
        className={`inline-flex items-center justify-center ${SIZE_CLASSES[size]} ${className}`}
        title={category.replace(/_/g, ' ')}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center ${SIZE_CLASSES[size]} ${className}`}
      title={category.replace(/_/g, ' ')}
    >
      <img
        src={imagePath}
        alt={category}
        onError={() => setImageError(true)}
        className="w-full h-full object-contain"
      />
    </span>
  );
}
