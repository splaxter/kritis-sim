/**
 * ASCII Frame Components
 * Styled boxes and frames for terminal-aesthetic UI elements
 */

import { ReactNode } from 'react';

interface AsciiFrameProps {
  title?: string;
  children: ReactNode;
  variant?: 'default' | 'alert' | 'success' | 'warning' | 'error' | 'info';
  icon?: string;
  className?: string;
}

const VARIANT_STYLES = {
  default: {
    border: 'border-terminal-border',
    title: 'text-terminal-green',
    icon: '█',
  },
  alert: {
    border: 'border-terminal-danger',
    title: 'text-terminal-danger',
    icon: '⚠',
  },
  success: {
    border: 'border-terminal-green',
    title: 'text-terminal-green',
    icon: '✓',
  },
  warning: {
    border: 'border-terminal-warning',
    title: 'text-terminal-warning',
    icon: '!',
  },
  error: {
    border: 'border-terminal-danger',
    title: 'text-terminal-danger',
    icon: '✗',
  },
  info: {
    border: 'border-terminal-info',
    title: 'text-terminal-info',
    icon: 'ℹ',
  },
};

export function AsciiFrame({
  title,
  children,
  variant = 'default',
  icon,
  className = '',
}: AsciiFrameProps) {
  const styles = VARIANT_STYLES[variant];
  const displayIcon = icon || styles.icon;

  return (
    <div className={`font-mono ${className}`}>
      {/* Top border */}
      <div className={`${styles.title} flex items-center`}>
        <span>╔</span>
        {title && (
          <>
            <span className="mx-1">═══</span>
            <span className="px-1">
              [{displayIcon}] {title}
            </span>
          </>
        )}
        <span className="flex-1 overflow-hidden">
          {'═'.repeat(50)}
        </span>
        <span>╗</span>
      </div>

      {/* Content */}
      <div className={`border-l border-r ${styles.border} px-2 py-1`}>
        {children}
      </div>

      {/* Bottom border */}
      <div className={styles.title}>
        <span>╚</span>
        <span className="flex-1 overflow-hidden">
          {'═'.repeat(60)}
        </span>
        <span>╝</span>
      </div>
    </div>
  );
}

// Simpler box without title
interface AsciiBoxProps {
  children: ReactNode;
  variant?: 'single' | 'double' | 'rounded';
  className?: string;
}

const BOX_CHARS = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
};

export function AsciiBox({
  children,
  variant = 'single',
  className = '',
}: AsciiBoxProps) {
  const chars = BOX_CHARS[variant];

  return (
    <div className={`font-mono text-terminal-green ${className}`}>
      <div className="flex">
        <span>{chars.tl}</span>
        <span className="flex-1 overflow-hidden">{chars.h.repeat(50)}</span>
        <span>{chars.tr}</span>
      </div>
      <div className="flex">
        <span>{chars.v}</span>
        <div className="flex-1 px-2">{children}</div>
        <span>{chars.v}</span>
      </div>
      <div className="flex">
        <span>{chars.bl}</span>
        <span className="flex-1 overflow-hidden">{chars.h.repeat(50)}</span>
        <span>{chars.br}</span>
      </div>
    </div>
  );
}

// Alert banner with blinking effect
interface AlertBannerProps {
  message: string;
  level: 'info' | 'warning' | 'critical';
  blinking?: boolean;
}

export function AlertBanner({
  message,
  level,
  blinking = false,
}: AlertBannerProps) {
  const levelStyles = {
    info: 'text-terminal-info border-terminal-info',
    warning: 'text-terminal-warning border-terminal-warning',
    critical: 'text-terminal-danger border-terminal-danger',
  };

  const levelIcons = {
    info: '[INFO]',
    warning: '[WARNUNG]',
    critical: '[KRITISCH]',
  };

  return (
    <div
      className={`font-mono border-2 p-2 ${levelStyles[level]} ${blinking ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold">{levelIcons[level]}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
