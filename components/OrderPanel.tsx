import { useState, useEffect } from 'react';
import { type Role, type RoleState, ROLE_META, ROLE_COLORS } from '@/types';
import RoleIcon from '@/components/RoleIcon';
import { Check, Package, Bot, X, Minus, Plus } from 'lucide-react';

interface OrderPanelProps {
  role: Role;
  roleState: RoleState;
  capacityLimit: number;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  currentWeek: number; // 1. ADD THIS LINE
  aiRecommendation: string | null;
  onSubmitOrder: (quantity: number) => void;
  onRequestHelp: () => Promise<{ recommendation: string; orderQuantity: number } | null>;
}

export default function OrderPanel({
  role,
  roleState,
  capacityLimit,
  isSubmitting,
  hasSubmitted,
  currentWeek, // 2. DESTRUCTURE IT HERE
  aiRecommendation,
  onSubmitOrder,
  onRequestHelp,
}: OrderPanelProps) {
  const [orderQty, setOrderQty] = useState<number | ''>(400);
  const [showModal, setShowModal] = useState(false);
  const [cachedRec, setCachedRec] = useState<{ text: string, qty: number } | null>(null);

  const meta = ROLE_META[role];
  const colors = ROLE_COLORS[role];

  // 3. CHANGE THE DEPENDENCY ARRAY TO currentWeek
  useEffect(() => {
    setCachedRec(null);
  }, [currentWeek]);

  const handleSubmit = () => {
    const qty = orderQty === '' ? 0 : orderQty;
    const clamped = Math.max(0, Math.min(qty, capacityLimit));
    onSubmitOrder(clamped);
  };

  const handleAIHelpClick = async () => {
    setShowModal(true); 
    
    // If we already asked the AI this week, just show the modal with the cache
    if (cachedRec) {
      return; 
    }

    // Otherwise, fetch a new answer from Gemini
    const res = await onRequestHelp();
    if (res && typeof res.orderQuantity === 'number') {
      setCachedRec({ text: res.recommendation, qty: res.orderQuantity });
    }
  };

  return (
    <div
      className="glass-card-static p-4 sm:p-5 animate-fade-in-up relative"
      style={{ borderColor: colors.glow }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 sm:gap-3 mb-4">
        <RoleIcon role={role} size={20} style={{ color: colors.primary }} />
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold truncate" style={{ color: colors.primary }}>
            {meta.label} — Place Your Order
          </h3>
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
            Decide how many units to order from upstream
          </p>
        </div>
      </div>

      {/* Current Situation Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
        <StatBox label="Inventory" value={roleState.inventory} color={colors.primary} />
        <StatBox label="Backlog" value={roleState.backlog} color={roleState.backlog > 0 ? '#f87171' : '#64748b'} />
        <StatBox label="Incoming Order" value={roleState.incomingOrder} color={colors.primary} />
        <StatBox label="Last Shipment" value={roleState.incomingShipment} color={colors.primary} />
      </div>

      {/* Order Input */}
      {hasSubmitted ? (
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]">
          <span className="text-lg text-[var(--color-success)] flex-shrink-0"><Check size={20} /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-success)]">
              Order Submitted
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
              Waiting for other roles to submit their orders...
            </p>
          </div>
          <div className="ml-auto spinner flex-shrink-0" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Quantity row */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Order Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                className="w-10 h-10 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center text-lg font-bold hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)] cursor-pointer flex-shrink-0"
                onClick={() => setOrderQty(Math.max(0, (orderQty === '' ? 0 : orderQty) - 10))}
              >
                <Minus size={16} />
              </button>
              <input
                id="order-quantity-input"
                type="number"
                min={0}
                max={capacityLimit}
                value={orderQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setOrderQty('');
                  } else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) {
                      setOrderQty(Math.max(0, Math.min(parsed, capacityLimit)));
                    }
                  }
                }}
                className="input-field text-center text-xl font-bold tabular-nums flex-1 max-w-[120px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ color: colors.primary }}
              />
              <button
                className="w-10 h-10 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center text-lg font-bold hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)] cursor-pointer flex-shrink-0"
                onClick={() => setOrderQty(Math.min(capacityLimit, (orderQty === '' ? 0 : orderQty) + 10))}
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1.5">
              Max capacity: {capacityLimit} units
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <button
              id="submit-order-btn"
              className="btn-primary h-11 flex-1 flex items-center justify-center gap-2"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner" />
                  Processing...
                </>
              ) : (
                <>
                  <Package size={16} />
                  <span>Place Order</span>
                </>
              )}
            </button>

            <button
              id="ai-help-btn"
              className="btn-secondary h-11 flex-1 sm:flex-initial sm:min-w-[160px] flex items-center justify-center gap-2"
              onClick={handleAIHelpClick}
              disabled={isSubmitting}
            >
              <Bot size={16} />
              <span>Get Recommendation</span>
            </button>
          </div>
        </div>
      )}

      {/* The Centered Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in-up">
          <div className="modal-card max-w-sm w-full p-5 shadow-2xl border border-[var(--border-subtle)] relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-2 text-[#a78bfa] mb-3 font-bold">
              <Bot size={18} />
              <h2>AI Strategic Advisor</h2>
            </div>
            
            <div className="min-h-[60px] flex items-center">
              {cachedRec || aiRecommendation ? (
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  {cachedRec?.text || aiRecommendation}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <div className="spinner scale-75" />
                  Analyzing supply chain data...
                </div>
              )}
            </div>

            <button
              onClick={() => {
                // Check if we have a cached AI recommendation
                if (cachedRec) {
                  // Push the AI's number into the input box (clamped to capacity)
                  setOrderQty(Math.max(0, Math.min(cachedRec.qty, capacityLimit)));
                }
                // Close the modal
                setShowModal(false);
              }}
              className="mt-5 w-full btn-secondary py-2 border border-[var(--color-wholesaler)] text-[var(--color-wholesaler)] hover:bg-[var(--color-wholesaler)] hover:text-white transition-all"
            >
              Apply Recommendation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl p-2.5 sm:p-3 bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
      <div className="stat-label text-[9px] sm:text-[0.7rem]">{label}</div>
      <div className="stat-value mt-1" style={{ color, fontSize: 'clamp(1.1rem, 3vw, 1.4rem)' }}>
        {value}
      </div>
    </div>
  );
}