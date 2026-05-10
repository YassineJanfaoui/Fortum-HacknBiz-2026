import { useDashboardStore } from '@/lib/store';
import { Bell } from 'lucide-react';
import { useEffect } from 'react';

export function CustomerNotificationToast() {
  const { customerNotification, hideCustomerNotification } = useDashboardStore();

  useEffect(() => {
    if (customerNotification?.visible) {
      const timer = setTimeout(() => {
        hideCustomerNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [customerNotification, hideCustomerNotification]);

  if (!customerNotification?.visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: 'var(--color-background-secondary)',
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 8, padding: 16, width: 340,
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ background: 'var(--color-background-tertiary)', padding: 6, borderRadius: '50%' }}>
          <Bell size={14} color="var(--color-text-primary)" />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Customer notification sent
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
        <span>Channel:</span>
        <span style={{ color: 'var(--color-text-primary)' }}>{customerNotification.channel}</span>
        
        <span>Subject:</span>
        <span style={{ color: 'var(--color-text-primary)', fontStyle: 'italic' }}>"{customerNotification.subject}"</span>
        
        <span>Sent:</span>
        <span style={{ color: 'var(--color-text-primary)' }}>{customerNotification.time}</span>
      </div>
    </div>
  );
}
