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
import { Button, Card, Typography } from '@douyinfe/semi-ui';
import { ArrowRight, Gift } from 'lucide-react';
const InvitationCard = ({ t }) => {
  const goAffiliate = () => {
    window.location.href = '/console/affiliate';
  };

  const title = '邀请奖励';
  const desc = '当前邀请已下线，请在推广页面进行推广。';
  const buttonText = '前往推广页面';

  return (
    <Card className='legacy-invitation-card !rounded-2xl shadow-sm border-0'>
      <div className='legacy-invitation-card__inner'>
        <div className='legacy-invitation-card__icon'>
          <Gift size={18} />
        </div>
        <div className='legacy-invitation-card__body'>
          <Typography.Text className='legacy-invitation-card__title'>
            {t(title)}
          </Typography.Text>
          <div className='legacy-invitation-card__desc'>
            {t(desc)}
          </div>
        </div>
        <Button
          type='primary'
          theme='solid'
          icon={<ArrowRight size={15} />}
          onClick={goAffiliate}
          className='legacy-invitation-card__button !rounded-xl'
        >
          {t(buttonText)}
        </Button>
      </div>
    </Card>
  );
};

export default InvitationCard;
