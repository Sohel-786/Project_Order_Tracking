'use client';

import { User } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { useAppSettings, useCurrentUserPermissions } from '@/hooks/use-settings';
import { LogOut, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLogout } from '@/hooks/use-auth-mutations';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

interface HeaderProps {
  user: User;
  isNavExpanded: boolean;
  onNavExpandChange: (expanded: boolean) => void;
}

export function Header({ user, isNavExpanded, onNavExpandChange }: HeaderProps) {
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();

  const logoPath = appSettings?.logoUrl;
  const logoUrl = logoPath
    ? (logoPath.startsWith('http') || logoPath.startsWith('blob:') ? logoPath : (logoPath.startsWith('/') ? logoPath : `/${logoPath}`))
    : null;
  const hasLogo = Boolean(logoUrl);
  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  const logoutMutation = useLogout();
  const handleLogout = () => logoutMutation.mutate();

  return (
    <header
      className={`bg-white dark:bg-card border-b border-secondary-200 dark:border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-sm transition-colors duration-300 ${isHorizontal
        ? 'h-16 py-2'
        : hasLogo ? 'min-h-[5rem] py-3' : 'h-16 py-3'
        }`}
    >
      <div className="flex items-center min-w-0 shrink-0 gap-6">
        {hasLogo ? (
          <div className="flex items-center shrink-0 bg-transparent">
            <img
              src={logoUrl!}
              alt=""
              className={isHorizontal
                ? 'max-w-[85px] max-h-[52px] w-auto h-auto object-contain object-center'
                : 'max-w-[110px] max-h-[72px] w-auto h-auto object-contain object-center'
              }
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center shrink-0 text-primary-600 ${isHorizontal ? 'w-[48px] h-[48px]' : 'w-[70px] h-[70px]'}`}>
            <Building2 className={isHorizontal ? 'h-6 w-6' : 'h-9 w-9'} />
          </div>
        )}

        <div className="h-10 w-px bg-secondary-200 dark:bg-border hidden lg:block" />

        <div className="flex flex-col min-w-0">
          <span className="text-base font-bold text-secondary-900 dark:text-white truncate">
            {appSettings?.companyName ?? 'Company'}
          </span>
          <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400 truncate">
            {appSettings?.softwareName ?? 'Project Order Tracking'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 min-w-0 flex-1 justify-end">
        <ThemeToggle />
        {isHorizontal && (
          <button
            onClick={() => onNavExpandChange(!isNavExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-secondary-900 dark:text-primary-300 bg-secondary-100/50 dark:bg-primary-950/20 hover:bg-secondary-200 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 transition-all font-bold border border-secondary-300 dark:border-primary-500/30 shadow-sm"
          >
            {isNavExpanded ? (<><ChevronUp className="h-4 w-4" /><span className="text-sm">Hide</span></>) : (<><ChevronDown className="h-4 w-4" /><span className="text-sm">Show</span></>)}
          </button>
        )}
        <div className="flex items-center gap-3">
          <Avatar user={user} size={isHorizontal ? 'sm' : 'md'} showName={false} />
          <div className="flex flex-col justify-center min-w-0">
            <span className={`font-semibold text-secondary-900 dark:text-white truncate ${isHorizontal ? 'text-xs' : 'text-sm'}`}>
              {user.firstName} {user.lastName}
            </span>
            <span className={`text-secondary-500 dark:text-secondary-400 truncate ${isHorizontal ? 'text-[10px]' : 'text-xs'}`}>
              {user.username}
            </span>
          </div>
        </div>
        {isHorizontal && (
          <div className="border-l border-secondary-200 dark:border-border pl-4 ml-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-secondary-900 dark:text-rose-300 bg-secondary-100/50 dark:bg-rose-950/20 border-secondary-300 dark:border-rose-900/30 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 px-3 h-9 rounded-lg transition-all duration-200 font-bold"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
