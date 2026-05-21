'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { HorizontalNav } from '@/components/layout/horizontal-nav';
import { User, UserPermission } from '@/types';
import { SoftwareProfileDraftProvider } from '@/contexts/software-profile-draft-context';
import { useCurrentUserPermissions } from '@/hooks/use-settings';
import { AccessDenied } from '@/components/ui/access-denied';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { isLoginPathname } from '@/lib/route-utils';

const MAX_AUTH_GATE_MS = 8000;
const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 64;

function getPostAuthRoute(): string {
  return '/dashboard';
}

const ROUTE_PERMISSIONS_ORDERED: { route: string; permission: keyof UserPermission }[] = [
  { route: '/dashboard',         permission: 'viewDashboard' },
  { route: '/parties',           permission: 'manageParty' },
  { route: '/products',          permission: 'manageProduct' },
  { route: '/items',             permission: 'manageItem' },
  { route: '/processes',         permission: 'manageProcess' },
  { route: '/boms',              permission: 'manageBom' },
  { route: '/masters',           permission: 'viewMaster' },
  { route: '/orders',            permission: 'viewOrder' },
  { route: '/purchase-indents',  permission: 'viewPI' },
  { route: '/purchase-orders',   permission: 'viewPO' },
  { route: '/inwards',           permission: 'viewInward' },
  { route: '/quality-control',   permission: 'viewQC' },
  { route: '/job-works',         permission: 'viewJobWork' },
  { route: '/productions',       permission: 'viewProduction' },
  { route: '/deliveries',        permission: 'viewDelivery' },
  { route: '/traceability',      permission: 'viewTraceability' },
  { route: '/reports',           permission: 'viewReports' },
  { route: '/settings',          permission: 'accessSettings' },
];

const ROUTE_PERMISSIONS: Record<string, keyof UserPermission> = Object.fromEntries(
  ROUTE_PERMISSIONS_ORDERED.map(({ route, permission }) => [route, permission])
);

function canAccessOtherMasters(p: UserPermission | null | undefined): boolean {
  return !!(p?.manageItemType || p?.manageItemCategory || p?.manageItemGroup ||
            p?.manageProductCategory || p?.manageMaterial || p?.manageUnit);
}

function getFirstAllowedRoute(p: UserPermission | null | undefined): string {
  if (!p) return '/dashboard';
  for (const { route, permission } of ROUTE_PERMISSIONS_ORDERED) {
    const allowed = route === '/masters' ? canAccessOtherMasters(p) : !!p[permission];
    if (allowed) return route;
  }
  return '/dashboard';
}

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/parties': 'Parties',
  '/products': 'Products',
  '/items': 'Items',
  '/processes': 'Processes',
  '/boms': 'BOMs',
  '/masters': 'Masters',
  '/orders': 'Orders',
  '/purchase-indents': 'Purchase Indents',
  '/purchase-orders': 'Purchase Orders',
  '/inwards': 'Inwards',
  '/quality-control': 'QC',
  '/job-works': 'Job Works',
  '/productions': 'Production',
  '/deliveries': 'Delivery',
  '/traceability': 'Traceability',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [navExpanded, setNavExpanded] = useState(true);
  const sideWidth = sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;
  const queryClient = useQueryClient();
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoginRoute = isLoginPathname(pathname);

  useEffect(() => {
    const onCurrentUserUpdated = (e: Event) => {
      const detail = (e as CustomEvent<User>).detail;
      if (detail) setUser(detail);
    };
    window.addEventListener('currentUserUpdated', onCurrentUserUpdated);
    return () => window.removeEventListener('currentUserUpdated', onCurrentUserUpdated);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const isFixedLayout = pathname.startsWith('/purchase-orders') ||
    pathname.startsWith('/purchase-indents') ||
    pathname.startsWith('/masters') ||
    pathname.startsWith('/parties') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/items') ||
    pathname.startsWith('/processes') ||
    pathname.startsWith('/boms') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/inwards') ||
    pathname.startsWith('/job-works') ||
    pathname.startsWith('/productions') ||
    pathname.startsWith('/deliveries') ||
    pathname.startsWith('/traceability') ||
    pathname.startsWith('/quality-control');

  const { data: permissions, isLoading: permissionsLoading } = useCurrentUserPermissions(
    !isLoginRoute && !loading && !!user
  );

  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  const runValidate = useCallback(async (signal?: AbortSignal) => {
    const onLogin = isLoginPathname(pathname);
    if (!onLogin) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser((prev) => prev ?? (JSON.parse(storedUser) as User));
        } catch {
          localStorage.removeItem('user');
        }
      }
    }
    try {
      const response = await api.post('/auth/validate', {}, { signal });
      if (response.data?.user) {
        const nextUser = response.data.user as User;
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
        (window as any)._lastValidated = Date.now();
        if (onLogin) {
          router.replace(getPostAuthRoute());
          return;
        }
        return;
      }
      if (onLogin) {
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (err: unknown) {
      if (axios.isCancel(err)) return;
      const errName = err instanceof Error ? err.name : '';
      if (errName === 'CanceledError' || errName === 'AbortError') return;
      const status = (err as { response?: { status?: number } })?.response?.status;
      localStorage.removeItem('user');
      setUser(null);
      if (!onLogin && (status === 401 || status === 403)) {
        router.replace('/login');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    const controller = new AbortController();
    const tick = async () => {
      if (isLoginPathname(pathname)) {
        setLoading(true);
        await runValidate(controller.signal);
        return;
      }
      const now = Date.now();
      const lastValidated = (window as any)._lastValidated || 0;
      if (now - lastValidated < 30000 && user) {
        setLoading(false);
        return;
      }
      await runValidate(controller.signal);
    };
    tick();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, runValidate]);

  useEffect(() => {
    if (!loading) return;
    safetyTimerRef.current = setTimeout(() => {
      setLoading(false);
      if (!isLoginPathname(pathname) && !user) {
        router.replace('/login');
      }
    }, MAX_AUTH_GATE_MS);
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [loading, pathname, router, user]);

  if (loading || (permissionsLoading && !isLoginRoute) || (isLoginRoute && !!user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoginRoute) return <>{children}</>;
  if (!user) return null;

  // Permission Check
  let hasPermission = true;
  if (permissions) {
    const requiredPermissionKey = Object.keys(ROUTE_PERMISSIONS).find(route =>
      pathname === route || pathname.startsWith(`${route}/`)
    );
    if (requiredPermissionKey) {
      const allowed = requiredPermissionKey === '/masters'
        ? canAccessOtherMasters(permissions)
        : permissions[ROUTE_PERMISSIONS[requiredPermissionKey]] === true;
      if (!allowed) hasPermission = false;
    }
  }

  if (!hasPermission) {
    const firstAllowed = getFirstAllowedRoute(permissions);
    return (
      <SoftwareProfileDraftProvider>
        <div className="min-h-screen bg-background">
          {!isHorizontal && (
            <Sidebar
              userRole={user.role}
              currentUser={user}
              expanded={sidebarExpanded}
              onExpandChange={setSidebarExpanded}
              sidebarWidth={sideWidth}
            />
          )}
          <div
            className={cn(
              'transition-[margin] duration-200 ease-in-out flex flex-col',
              isFixedLayout ? 'h-screen overflow-hidden' : 'min-h-screen'
            )}
            style={{ marginLeft: isHorizontal ? 0 : sideWidth }}
          >
            <Header user={user} isNavExpanded={navExpanded} onNavExpandChange={setNavExpanded} />
            {isHorizontal && <HorizontalNav isExpanded={navExpanded} />}
            <main className={cn(
              'flex-1 flex items-center justify-center p-6',
              isFixedLayout ? 'min-h-0 overflow-y-auto' : 'overflow-visible'
            )}>
              <AccessDenied
                actionLabel={`Go to ${ROUTE_LABELS[firstAllowed] ?? 'Dashboard'}`}
                actionHref={firstAllowed}
              />
            </main>
          </div>
        </div>
      </SoftwareProfileDraftProvider>
    );
  }

  return (
    <SoftwareProfileDraftProvider>
      <div className="min-h-screen bg-background">
        {!isHorizontal && (
          <Sidebar
            userRole={user.role}
            currentUser={user}
            expanded={sidebarExpanded}
            onExpandChange={setSidebarExpanded}
            sidebarWidth={sideWidth}
          />
        )}
        <div
          className={cn(
            'transition-[margin] duration-200 ease-in-out relative z-0 flex flex-col',
            isFixedLayout ? 'h-screen overflow-hidden' : 'min-h-screen'
          )}
          style={{ marginLeft: isHorizontal ? 0 : sideWidth }}
        >
          <Header user={user} isNavExpanded={navExpanded} onNavExpandChange={setNavExpanded} />
          {isHorizontal && <HorizontalNav isExpanded={navExpanded} />}
          <main className={cn(
            'flex-1 flex flex-col',
            isFixedLayout ? 'min-h-0 overflow-y-auto' : 'overflow-visible'
          )}>
            {children}
          </main>
        </div>
      </div>
    </SoftwareProfileDraftProvider>
  );
}
