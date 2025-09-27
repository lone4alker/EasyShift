'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs({ customItems = null }) {
  const pathname = usePathname();

  // If custom items are provided, use them
  if (customItems) {
    return (
      <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm overflow-x-auto">
        {customItems.map((item, index) => (
          <div key={index} className="flex items-center flex-shrink-0">
            {index > 0 && <span className="text-slate-400 mx-1 sm:mx-2 flex-shrink-0">/</span>}
            {item.href ? (
              <Link 
                href={item.href} 
                className="text-slate-500 hover:text-blue-600 transition-colors duration-200 flex items-center group px-2 py-1 sm:px-1 sm:py-0 rounded min-h-[32px] sm:min-h-0"
              >
                {item.icon && (
                  <span className="mr-1 group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                    {item.icon}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </Link>
            ) : (
              <span className="text-slate-700 font-medium flex items-center px-2 py-1 sm:px-1 sm:py-0">
                {item.icon && <span className="mr-1 flex-shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
            )}
          </div>
        ))}
      </nav>
    );
  }

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(segment => segment !== '');
  
  const breadcrumbItems = [
    {
      label: 'Home',
      href: '/',
      icon: (
        <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    }
  ];

  // Build breadcrumb items from path segments
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    // Format segment label
    let label = segment.charAt(0).toUpperCase() + segment.slice(1);
    if (label === 'Owner') label = 'Owner Portal';
    if (label === 'Staff') label = 'Staff Portal';
    if (label === 'Login') label = 'Sign In';
    if (label === 'Signup') label = 'Sign Up';
    if (label === 'Dash') label = 'Dashboard';

    breadcrumbItems.push({
      label,
      href: isLast ? null : currentPath
    });
  });

  // Don't show breadcrumbs on home page
  if (pathname === '/') {
    return null;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
      <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3">
        <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm overflow-x-auto">
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center flex-shrink-0">
              {index > 0 && <span className="text-slate-400 mx-1 sm:mx-2 flex-shrink-0">/</span>}
              {item.href ? (
                <Link 
                  href={item.href} 
                  className="text-slate-500 hover:text-blue-600 transition-colors duration-200 flex items-center group px-2 py-2 sm:px-1 sm:py-0 rounded min-h-[36px] sm:min-h-0 touch-manipulation"
                >
                  {item.icon && (
                    <span className="mr-1 group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span className="text-slate-700 font-medium flex items-center px-2 py-2 sm:px-1 sm:py-0">
                  {item.icon && <span className="mr-1 flex-shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </span>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}