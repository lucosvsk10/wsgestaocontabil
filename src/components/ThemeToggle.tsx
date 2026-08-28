import React, { useEffect, useRef, useState } from 'react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { Moon, Palette, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const options: Array<{ value: Theme; label: string; icon: React.ElementType }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'default', label: 'Padrão', icon: Palette },
];

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const ActiveIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Palette;

  return (
    <div ref={rootRef} className="relative flex items-center">
      {open && (
        <div className="absolute right-12 top-1/2 z-[100] flex -translate-y-1/2 items-center gap-1 rounded-full border border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
          {options.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        className="h-10 w-10 rounded-full p-0 dark:border dark:border-gold/30"
        aria-label="Escolher tema visual"
        aria-expanded={open}
      >
        <ActiveIcon size={18} className={theme === 'default' ? 'text-gold' : undefined} />
      </Button>
    </div>
  );
};

export default ThemeToggle;
