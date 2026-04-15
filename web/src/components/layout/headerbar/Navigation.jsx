/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import SkeletonWrapper from '../components/SkeletonWrapper';

const Navigation = ({
  mainNavLinks,
  isMobile,
  isLoading,
  userState,
  pricingRequireAuth,
}) => {
  const location = useLocation();

  const renderNavLinks = () => {
    return mainNavLinks.map((link) => {
      // Determine active state
      const isActive = link.to === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(link.to);

      const inactiveColor = 'var(--text-main, var(--semi-color-text-0))';
      const activeColor = 'var(--primary, #4F46E5)';
      const hoverColor = 'var(--primary, #4F46E5)';

      const baseStyle = {
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontWeight: 700,
        borderRadius: 8,
        padding: isMobile ? '4px 8px' : '5px 14px',
        fontSize: isMobile ? 15 : 16,
        textDecoration: 'none',
        transition: 'color 0.2s',
        position: 'relative',
        color: isActive ? activeColor : inactiveColor,
      };

      const linkContent = (
        <span>{link.text}</span>
      );

      const handleMouseEnter = (e) => {
        if (!isActive) e.currentTarget.style.color = hoverColor;
      };
      const handleMouseLeave = (e) => {
        if (!isActive) e.currentTarget.style.color = inactiveColor;
      };

      if (link.isExternal) {
        return (
          <a
            key={link.itemKey}
            href={link.externalLink}
            target='_blank'
            rel='noopener noreferrer'
            style={baseStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {linkContent}
          </a>
        );
      }

      let targetPath = link.to;
      if (link.itemKey === 'console' && !userState.user) targetPath = '/login';
      if (link.itemKey === 'pricing' && pricingRequireAuth && !userState.user) targetPath = '/login';

      return (
        <Link
          key={link.itemKey}
          to={targetPath}
          style={baseStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {linkContent}
        </Link>
      );
    });
  };

  return (
    <nav className='flex items-center justify-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide' style={{ minWidth: 0 }}>
      <SkeletonWrapper
        loading={isLoading}
        type='navigation'
        count={4}
        width={60}
        height={16}
        isMobile={isMobile}
      >
        {renderNavLinks()}
      </SkeletonWrapper>
    </nav>
  );
};

export default Navigation;
