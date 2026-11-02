'use client';

import { useEffect } from 'react';
import WaitingOverlay from './checkout/WaitingOverlay';
import BgConfirmPopup from './checkout/BgConfirmPopup';
import PostReceiveInfoModal from './checkout/PostReceiveInfoModal';
import StockNotifyModal from './modals/StockNotifyModal';
import BackInStockToast from './modals/BackInStockToast';
import MembershipModal from './modals/MembershipModal';
import RecoveryToast from './modals/RecoveryToast';
import QuickOrderModal from './cart/QuickOrderModal';
import OrderRateLimitModal from './modals/OrderRateLimitModal';
import BulkOrderModal from './modals/BulkOrderModal';

export default function RareOverlays() {
  // সন্তান কম্পোনেন্টদের ইভেন্ট-লিসেনার বসার পর (child effect আগে চলে) GlobalOverlays-কে জানানো —
  // সে এর আগে জমা হওয়া ইভেন্টগুলো আবার পাঠায়।
  useEffect(() => {
    window.dispatchEvent(new Event('vc:rareReady'));
  }, []);

  return (
    <>
      <WaitingOverlay />
      <BgConfirmPopup />
      <PostReceiveInfoModal />
      <StockNotifyModal />
      <BackInStockToast />
      <MembershipModal />
      <RecoveryToast />
      <QuickOrderModal />
      <OrderRateLimitModal />
      <BulkOrderModal />
    </>
  );
}
