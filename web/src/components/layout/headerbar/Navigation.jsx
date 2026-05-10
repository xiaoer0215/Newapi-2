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

      const inactiveColor = '#61708a';
      const activeColor = '#4f6fff';
      const hoverColor = '#1f2937';

      const baseStyle = {
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: isMobile ? 34 : 60,
        fontWeight: isActive ? 800 : 700,
        borderRadius: isMobile ? 999 : 0,
        padding: isMobile ? '0 10px' : '0 8px',
        fontSize: isMobile ? 14 : 14,
        textDecoration: 'none',
        transition: 'color 0.16s ease',
        position: 'relative',
        color: isActive ? activeColor : inactiveColor,
        background: 'transparent',
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
            className={`app-nav-link-v2 ${isActive ? 'is-active' : ''}`}
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
          className={`app-nav-link-v2 ${isActive ? 'is-active' : ''}`}
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
    <nav className='app-nav-menu-v2 flex items-center justify-center overflow-x-auto whitespace-nowrap scrollbar-hide' style={{ minWidth: 0 }}>
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
