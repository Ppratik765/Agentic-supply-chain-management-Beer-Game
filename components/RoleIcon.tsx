'use client';

import React from 'react';
import { Store, Warehouse, Truck, Factory } from 'lucide-react';
import { type Role } from '@/types';

interface RoleIconProps {
  role: Role;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export default function RoleIcon({ role, className, size = 20, style }: RoleIconProps) {
  switch (role) {
    case 'retailer':
      return <Store className={className} size={size} style={style} />;
    case 'wholesaler':
      return <Warehouse className={className} size={size} style={style} />;
    case 'distributor':
      return <Truck className={className} size={size} style={style} />;
    case 'factory':
      return <Factory className={className} size={size} style={style} />;
    default:
      return null;
  }
}
