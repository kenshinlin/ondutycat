'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, User, LogOut, Settings, Menu, X, Activity, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  // Menu items with submenu support
  const menuItems = [
    {
      id: 'alerts',
      label: t('alerts'),
      href: `/${locale}/alerts`,
      icon: Activity,
    },
    {
      id: 'issues',
      label: t('issues'),
      href: `/${locale}/issues`,
      icon: null,
      children: [
        { id: 'all', label: 'All Issues', href: `/${locale}/issues` },
        { id: 'my', label: 'My Issues', href: `/${locale}/issues?filter=my` },
      ],
    },
    {
      id: 'skills',
      label: t('skills'),
      href: `/${locale}/skills`,
      icon: null,
    },
    {
      id: 'tools',
      label: t('tools'),
      href: `/${locale}/tools`,
      icon: Wrench,
      children: [
        { id: 'list', label: 'Tool List', href: `/${locale}/tools` },
        {
          id: 'custom',
          label: 'Custom Tools',
          href: `/${locale}/tools/custom`,
        },
      ],
    },
    {
      id: 'settings',
      label: t('settings'),
      href: `/${locale}/settings`,
      icon: Settings,
      children: [
        { id: 'general', label: 'General', href: `/${locale}/settings` },
        {
          id: 'notifications',
          label: 'Notifications',
          href: `/${locale}/settings/notifications`,
        },
        {
          id: 'integrations',
          label: 'Integrations',
          href: `/${locale}/settings/integrations`,
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white h-15 flex items-center justify-center">
        <div className="animate-pulse h-4 w-32 bg-gray-200 rounded"></div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-15 items-center px-4">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center space-x-2 mr-8">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-bold text-gray-900">DOD Platform</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 flex-1">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="relative group"
              onMouseEnter={() => item.children && setOpenSubmenu(item.id)}
              onMouseLeave={() => setOpenSubmenu(null)}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex items-center space-x-1.5 py-4 text-sm font-medium transition-colors relative",
                  isActive(item.href)
                    ? "text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {item.icon && <item.icon className="w-4 h-4" />}
                <span>{item.label}</span>
                {item.children && (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
                )}
              </Link>

              {/* Submenu */}
              {item.children && openSubmenu === item.id && (
                <div className="absolute left-0 top-full pt-1">
                  <div className="rounded-md shadow-lg bg-gray-100 border border-gray-200 min-w-[180px] py-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-200 border-b border-gray-200 last:border-b-0"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.name || 'User'}
                  className="h-7 w-7 rounded-full"
                />
              ) : (
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              )}
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.user_metadata?.name || 'User'}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href={`/${locale}/settings`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="container mx-auto px-4 py-4 space-y-1">
            {menuItems.map((item) => (
              <div key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium",
                    isActive(item.href)
                      ? "text-gray-900 border-b-2 border-green-500"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>

                {/* Mobile Submenu */}
                {item.children && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
