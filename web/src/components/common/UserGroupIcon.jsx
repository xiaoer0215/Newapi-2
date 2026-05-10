import React, { useMemo } from 'react';
import {
  isInlineSvgMarkup,
  sanitizeInlineSvgMarkup,
  resolveUserGroupIconSrc,
} from '../../helpers/userGroupIcon';

const UserGroupIcon = ({
  value,
  alt = 'group-icon',
  wrapperClassName = '',
  imgClassName = '',
  svgClassName = '',
}) => {
  const trimmedValue = String(value || '').trim();
  const isInlineSvg = isInlineSvgMarkup(trimmedValue);
  const sanitizedSvg = useMemo(
    () => (isInlineSvg ? sanitizeInlineSvgMarkup(trimmedValue) : ''),
    [isInlineSvg, trimmedValue],
  );

  if (!trimmedValue) {
    return null;
  }

  if (isInlineSvg) {
    return (
      <span className={wrapperClassName} aria-label={alt} role='img'>
        <span
          className={svgClassName}
          dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
        />
      </span>
    );
  }

  return (
    <span className={wrapperClassName}>
      <img
        src={resolveUserGroupIconSrc(trimmedValue)}
        alt={alt}
        className={imgClassName}
        referrerPolicy='no-referrer'
      />
    </span>
  );
};

export default UserGroupIcon;
