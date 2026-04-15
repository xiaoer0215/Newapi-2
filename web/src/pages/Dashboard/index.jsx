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
import Dashboard from '../../components/dashboard';

const Detail = () => (
  <div className='mt-[60px] px-2' style={{
      minHeight: 'calc(100vh - 60px)',
      background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #e0f2fe 100%)',
      paddingTop: '20px',
      paddingBottom: '40px'
  }}>
    <Dashboard />
  </div>
);

export default Detail;
