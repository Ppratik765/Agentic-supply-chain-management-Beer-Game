import {
  type GameState,
  type Role,
  type WeekSnapshot,
  type RoleState,
  ROLES,
  DOWNSTREAM,
} from '@/types';

/**
 * Supply Chain Engine — Advances the game by one week.
 *
 * Supply Chain Simulator rules:
 * 1. Receive incoming shipments (from shipping pipeline slot 0)
 * 2. Receive incoming orders (from order pipeline slot 0, or customer demand for retailer)
 * 3. Fill orders from available inventory (inventory + incoming shipments)
 * 4. Calculate backlog if insufficient stock
 * 5. Ship outgoing (limited by available stock)
 * 6. Advance pipelines (shift delay queues)
 * 7. Place new orders into order pipeline
 * 8. Calculate costs: holdingCost * inventory + backorderCost * backlog
 * 9. Record snapshot and advance currentWeek
 */
export function advanceWeek(state: GameState): GameState {
  const next = structuredClone(state);
  const week = next.currentWeek;

  // Get customer demand for this week
  const customerDemand = next.demandPattern[week - 1] ?? 4;

  // ─── Step 1: Receive Incoming Shipments ─────────────────────────────────
  for (const role of ROLES) {
    const incoming = next.shippingPipeline[role][0];
    next.roles[role].incomingShipment = incoming;
    next.roles[role].inventory += incoming;
  }

  // ─── Step 2: Determine Incoming Orders ──────────────────────────────────
  // Retailer gets customer demand; others get from their downstream's order pipeline
  next.roles.retailer.incomingOrder = customerDemand;

  // For wholesaler, distributor, factory: incoming order = what downstream ordered THIS week
  // Orders travel instantly
  next.roles.wholesaler.incomingOrder = next.pendingOrders.retailer ?? 400;
  next.roles.distributor.incomingOrder = next.pendingOrders.wholesaler ?? 400;
  next.roles.factory.incomingOrder = next.pendingOrders.distributor ?? 400;

  // ─── Step 3 & 4: Fill Orders & Calculate Backlog ────────────────────────
  for (const role of ROLES) {
    const totalDemand = next.roles[role].incomingOrder + next.roles[role].backlog;
    const available = next.roles[role].inventory;

    if (available >= totalDemand) {
      // Can fill everything
      next.roles[role].outgoingShipment = totalDemand;
      next.roles[role].inventory = available - totalDemand;
      next.roles[role].backlog = 0;
    } else {
      // Ship what we can, rest becomes backlog
      next.roles[role].outgoingShipment = available;
      next.roles[role].backlog = totalDemand - available;
      next.roles[role].inventory = 0;
    }
  }

  // ─── Step 5: Advance Shipping Pipelines ─────────────────────────────────
  // Each role's outgoing shipment enters the downstream's shipping pipeline
  // Factory's outgoing shipment enters its own pipeline (production → self)

  // Shift pipelines: slot[0] was consumed, slot[1] becomes slot[0], new shipment enters slot[1]
  for (const role of ROLES) {
    next.shippingPipeline[role][0] = next.shippingPipeline[role][1];
  }

  // Place outgoing shipments into downstream's pipeline slot[1]
  // Retailer ships to customer (no pipeline needed, just consumed)
  // Wholesaler's outgoing → Retailer's shipping pipeline
  // Distributor's outgoing → Wholesaler's shipping pipeline
  // Factory's outgoing → Distributor's shipping pipeline
  next.shippingPipeline.retailer[1] = next.roles.wholesaler.outgoingShipment;
  next.shippingPipeline.wholesaler[1] = next.roles.distributor.outgoingShipment;
  next.shippingPipeline.distributor[1] = next.roles.factory.outgoingShipment;

  // Factory produces internally (manufacturing pipeline)
  // (the factory "ships" to itself after a production delay)
  const factoryOrder = next.pendingOrders.factory ?? 400;
  const factoryCapacity = next.roleSettings ? next.roleSettings.factory.capacityLimit : next.capacityLimit;
  const factoryProduction = Math.min(factoryOrder, factoryCapacity);
  next.shippingPipeline.factory[1] = factoryProduction;

  // ─── Step 6: Record Placed Orders ─────────────────────────────────────────
  // Each role's order travels instantly upstream (handled in Step 2 of the NEXT week's calculation)
  // For now, just record what was placed for history tracking
  for (const role of ROLES) {
    next.roles[role].orderPlaced = next.pendingOrders[role] ?? 400;
  }

  // ─── Step 7: Calculate Costs ────────────────────────────────────────────
  for (const role of ROLES) {
    const currentHoldingCost = next.roleSettings ? next.roleSettings[role].holdingCost : next.holdingCost;
    const currentBackorderCost = next.roleSettings ? next.roleSettings[role].backorderCost : next.backorderCost;
    const baseline = next.roleSettings ? next.roleSettings[role].initialInventory : next.initialInventory;
    
    // Only charge holding costs for inventory exceeding the baseline
    const billableInventory = Math.max(0, next.roles[role].inventory - baseline);
    const holdCost = currentHoldingCost * billableInventory;
    
    const backCost = currentBackorderCost * next.roles[role].backlog;
    next.roles[role].weekCost = holdCost + backCost;
    next.roles[role].totalCost += next.roles[role].weekCost;
  }

  // ─── Step 8: Record Snapshot ────────────────────────────────────────────
  const snapshot: WeekSnapshot = {
    week,
    roles: structuredClone(next.roles),
    customerDemand,
  };
  next.weekHistory.push(snapshot);

  // ─── Step 9: Advance Week ──────────────────────────────────────────────
  next.currentWeek = week + 1;
  next.ordersSubmittedThisWeek = [];
  next.pendingOrders = { retailer: 0, wholesaler: 0, distributor: 0, factory: 0 };

  // Check if game is finished
  if (next.currentWeek > next.totalWeeks) {
    next.gamePhase = 'finished';
  }

  return next;
}

/**
 * Enterprise ERP Agentic Heuristic for AI ordering.
 *
 * Parameters based on academic feedback:
 * Wholesaler: smoothness = 0.55, amplification = 1.05
 * Distributor: smoothness = 0.50, amplification = 1.10
 * Factory: smoothness = 0.45, amplification = 1.15
 */
export function calculateERPAgentOrder(
  role: Role,
  state: GameState
): number {
  let smoothness = 0.5;
  let amplification = 1.0;

  if (role === 'wholesaler') {
    smoothness = 0.55;
    amplification = 1.05;
  } else if (role === 'distributor') {
    smoothness = 0.50;
    amplification = 1.10;
  } else if (role === 'factory') {
    smoothness = 0.45;
    amplification = 1.15;
  }

  const roleState = state.roles[role];
  const capacityLimit = state.roleSettings ? state.roleSettings[role].capacityLimit : state.capacityLimit;

  // 1. Calculate Moving Average (MA) of the last 3 weeks of strict incomingOrder
  let sumOrders = roleState.incomingOrder || 400;
  let count = 1;
  const historyLen = state.weekHistory.length;
  
  if (historyLen >= 1) {
    sumOrders += state.weekHistory[historyLen - 1].roles[role].incomingOrder;
    count++;
  }
  if (historyLen >= 2) {
    sumOrders += state.weekHistory[historyLen - 2].roles[role].incomingOrder;
    count++;
  }
  const MA = sumOrders / count;

  // 2. ERP Math
  const Forecast = (smoothness * roleState.incomingOrder) + ((1 - smoothness) * MA);
  const BaseOrder = Forecast * amplification;
  const TargetSafetyStock = Forecast * 2; // 2-week shipping delay
  
  const EffectiveInventory = roleState.inventory - roleState.backlog + state.shippingPipeline[role][0] + state.shippingPipeline[role][1];
  
  const FinalOrder = Math.max(0, BaseOrder + (TargetSafetyStock - EffectiveInventory));

  // Clamp to capacity limit
  return Math.min(Math.round(FinalOrder), capacityLimit);
}
