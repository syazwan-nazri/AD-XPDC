export const RESOURCE_CATEGORIES = {
    ADMIN: 'Admin',
    DATA_MASTER: 'Data Master',
    INVENTORY: 'Inventory',
    PROCUREMENT: 'Procurement',
    REPORTS: 'Reports'
};

export const APP_RESOURCES = [
    { id: 'user_master', name: 'User Master', category: RESOURCE_CATEGORIES.ADMIN },
    { id: 'user_group_master', name: 'User Group Master', category: RESOURCE_CATEGORIES.ADMIN },
    { id: 'department_master', name: 'Department Master', category: RESOURCE_CATEGORIES.ADMIN },
    { id: 'part_master', name: 'Part Master', category: RESOURCE_CATEGORIES.DATA_MASTER },
    { id: 'part_group_master', name: 'Part Group Master', category: RESOURCE_CATEGORIES.DATA_MASTER },
    { id: 'warehouse_master', name: 'Warehouse Master', category: RESOURCE_CATEGORIES.DATA_MASTER },
    { id: 'warehouse_locations', name: 'Warehouse Locations', category: RESOURCE_CATEGORIES.DATA_MASTER },
    { id: 'supplier_master', name: 'Supplier Master', category: RESOURCE_CATEGORIES.DATA_MASTER },
    { id: 'machine_master', name: 'Machine Master', category: RESOURCE_CATEGORIES.DATA_MASTER },
    { id: 'stock_in', name: 'Stock In', category: RESOURCE_CATEGORIES.INVENTORY },
    { id: 'stock_out', name: 'Stock Out', category: RESOURCE_CATEGORIES.INVENTORY },
    { id: 'internal_transfer', name: 'Internal Transfer', category: RESOURCE_CATEGORIES.INVENTORY },
    { id: 'movement_logs', name: 'Movement Logs', category: RESOURCE_CATEGORIES.INVENTORY },
    { id: 'mrf', name: 'Material Requisition (MRF)', category: RESOURCE_CATEGORIES.INVENTORY, hasActions: true },
    { id: 'stock_take', name: 'Stock Take', category: RESOURCE_CATEGORIES.INVENTORY },
    { id: 'purchase_requisition', name: 'Purchase Requisition', category: RESOURCE_CATEGORIES.PROCUREMENT, hasActions: true },
    { id: 'dashboard', name: 'Dashboard', category: RESOURCE_CATEGORIES.REPORTS },
    { id: 'stock_inquiry', name: 'Stock Inquiry Report', category: RESOURCE_CATEGORIES.REPORTS },
    { id: 'stock_valuation', name: 'Stock Valuation Report', category: RESOURCE_CATEGORIES.REPORTS },
    { id: 'movement_history', name: 'Movement History Report', category: RESOURCE_CATEGORIES.REPORTS },
    { id: 'low_stock', name: 'Low Stock Report', category: RESOURCE_CATEGORIES.REPORTS },
];
