import React, { useState, useMemo } from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import GroupIcon from '@mui/icons-material/Group';
import StorageIcon from '@mui/icons-material/Storage';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import WarningIcon from '@mui/icons-material/Warning';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import Box from '@mui/material/Box';
import { NavLink, useLocation } from 'react-router-dom';
import Collapse from '@mui/material/Collapse';
import { useSelector } from 'react-redux';
import { checkAccess } from '../utils/roles';

const drawerWidth = 280;
const collapsedWidth = 80;

// Define links with their required resource key (Group Access Rights)
const dataInputMasterLinks = [
  { path: '/admin/user-master', text: 'User Master', icon: <PeopleIcon />, resourceId: 'user_master' },
  { path: '/admin/user-group-master', text: 'User Group Master', icon: <GroupIcon />, resourceId: 'user_group_master' },
  { path: '/admin/department-master', text: 'Department Master', icon: <BusinessIcon />, resourceId: 'department_master' },
  { path: '/admin/part-master', text: 'Part Master', icon: <Inventory2Icon />, resourceId: 'part_master' },
  { path: '/admin/part-group-master', text: 'Part Group Master', icon: <GroupIcon />, resourceId: 'part_group_master' },
  {
    text: 'Warehouse & Storage',
    icon: <WarehouseIcon />,
    subItems: [
      { path: '/admin/warehouse-master', text: 'Warehouse Master', icon: <WarehouseIcon />, resourceId: 'warehouse_master' },
      { path: '/admin/warehouse-locations', text: 'Warehouse Locations', icon: <LocationOnIcon />, resourceId: 'warehouse_locations' },
    ]
  },
  { path: '/admin/supplier-master', text: 'Supplier Master', icon: <GroupIcon />, resourceId: 'supplier_master' },
  { path: '/admin/machine-master', text: 'Machine Master', icon: <BuildIcon />, resourceId: 'machine_master' },
];

const stockMovementLinks = [
  { path: '/inventory/stock-in', text: 'Stock In', icon: <MoveToInboxIcon />, resourceId: 'stock_in' },
  { path: '/inventory/stock-out', text: 'Stock Out', icon: <OutboxIcon />, resourceId: 'stock_out' },
  { path: '/inventory/internal-transfer', text: 'Internal Transfer', icon: <SwapHorizIcon />, resourceId: 'internal_transfer' },
  { path: '/inventory/movement-logs', text: 'Movement Logs', icon: <HistoryIcon />, resourceId: 'movement_logs' },
  { path: '/inventory/stock-take', text: 'Stock Take', icon: <Inventory2Icon />, resourceId: 'stock_take' },
  { path: '/inventory/mrf', text: 'MRF', icon: <ReceiptLongIcon />, resourceId: 'mrf' },
];

const purchasingLinks = [
  { path: '/procurement/purchase-requisition', text: 'Purchase Requisition', icon: <ShoppingCartIcon />, resourceId: 'purchase_requisition' },
];

const reportLinks = [
  { path: '/reports/dashboard-kpis', text: 'Dashboard', icon: <DashboardIcon />, resourceId: 'dashboard' },
  { path: '/reports/stock-inquiry', text: 'Stock Inquiry', icon: <Inventory2Icon />, resourceId: 'stock_inquiry' },
  { path: '/reports/stock-valuation', text: 'Stock Valuation', icon: <ReceiptLongIcon />, resourceId: 'stock_valuation' },
  { path: '/reports/stock-movement', text: 'Movement History', icon: <SwapHorizIcon />, resourceId: 'movement_history' },
  { path: '/reports/low-stock', text: 'Low Stock Alert', icon: <WarningIcon />, resourceId: 'low_stock' },
];

const Sidebar = ({ open, onToggle }) => {
  const location = useLocation();
  // Single state to track which section is open. Default is empty string (all closed).
  const [openSection, setOpenSection] = useState('');

  const handleToggle = (section) => {
    if (!open && onToggle) {
      onToggle(); // Pop out the sidebar if it is closed
    }
    setOpenSection((prev) => (prev === section ? '' : section));
  };

  const user = useSelector((state) => state.auth.user);

  // New Filter Logic using Dynamic Permissions (Clean, no mutation)
  const filterNodes = (nodes) => {
    return nodes.reduce((acc, node) => {
      // Check if node has subItems
      if (node.subItems) {
        const filteredSubItems = filterNodes(node.subItems);
        // If has accessible subItems OR parent itself is explicitly accessible (if we allowed empty parents)
        // Here we assume if parent has subItems, at least one must be accessible to show parent
        if (filteredSubItems.length > 0) {
          acc.push({ ...node, subItems: filteredSubItems });
        }
      } else {
        // Leaf node
        if (checkAccess(user, node.resourceId)) {
          acc.push(node);
        }
      }
      return acc;
    }, []);
  };

  // We use useMemo to avoid recalculating on every render unless user changes
  const filteredDataMasterLinks = useMemo(() => user ? filterNodes(dataInputMasterLinks) : [], [user]);
  const filteredStockMovementLinks = useMemo(() => user ? filterNodes(stockMovementLinks) : [], [user]);
  const filteredPurchasingLinks = useMemo(() => user ? filterNodes(purchasingLinks) : [], [user]);
  const filteredReportLinks = useMemo(() => user ? filterNodes(reportLinks) : [], [user]);

  if (!user) return null;

  const renderSection = (title, icon, links, sectionId, sectionColor) => {
    if (links.length === 0) return null;
    const isOpen = openSection === sectionId;
    return (
      <Box sx={{ mb: 1 }}>
        <List>
          <ListItem
            button
            onClick={() => handleToggle(sectionId)}
            sx={{
              justifyContent: open ? 'initial' : 'center',
              px: open ? 2.5 : 1, // Reduced padding when closed for better centering
              py: 1.5,
              borderLeft: open && isOpen ? `4px solid ${sectionColor}` : 'none',
              backgroundColor: isOpen && open ? `${sectionColor}08` : 'transparent',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: open ? `${sectionColor}12` : 'transparent',
              }
            }}
          >
            <ListItemIcon sx={{
              minWidth: 0,
              mr: open ? 2.5 : 0, // Remove auto margin to allow centering
              justifyContent: 'center',
              color: sectionColor,
              fontSize: 22
            }}>
              {icon}
            </ListItemIcon>
            {open && (
              <>
                <ListItemText
                  primary={title}
                  sx={{
                    m: 0,
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1e293b',
                      letterSpacing: '0.3px'
                    }
                  }}
                />
                <Box sx={{ ml: 'auto', pl: 1, display: 'flex', alignItems: 'center', color: sectionColor }}>
                  {isOpen ? <ExpandLess sx={{ fontSize: 20 }} /> : <ExpandMore sx={{ fontSize: 20 }} />}
                </Box>
              </>
            )}
          </ListItem>
          <Collapse in={isOpen && open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {links.map((item) => {
                // Check if item has subItems (nested menu)
                if (item.subItems) {
                  return (
                    <Box key={item.text}>
                      {item.subItems.map((subItem) => (
                        <ListItem
                          button
                          key={subItem.path}
                          component={NavLink}
                          to={subItem.path}
                          selected={location.pathname === subItem.path}
                          sx={{
                            pl: open ? 4 : 2,
                            pr: 2,
                            py: 1,
                            minHeight: 44,
                            borderRadius: open ? '0 8px 8px 0' : '8px',
                            mx: open ? '12px 8px' : '6px',
                            backgroundColor: location.pathname === subItem.path ? `${sectionColor}20` : 'transparent',
                            borderLeft: location.pathname === subItem.path ? `3px solid ${sectionColor}` : 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: `${sectionColor}15`,
                            },
                            justifyContent: open ? 'initial' : 'center',
                          }}
                        >
                          <ListItemIcon sx={{
                            minWidth: 0,
                            mr: open ? 2 : 0, // Centering fix
                            justifyContent: 'center',
                            color: location.pathname === subItem.path ? sectionColor : '#94a3b8',
                            fontSize: 18
                          }}>
                            {subItem.icon}
                          </ListItemIcon>
                          {open && <ListItemText
                            primary={subItem.text}
                            sx={{
                              m: 0,
                              '& .MuiListItemText-primary': {
                                fontSize: '0.9rem',
                                color: location.pathname === subItem.path ? sectionColor : '#475569',
                                fontWeight: location.pathname === subItem.path ? 600 : 500,
                              }
                            }}
                          />}
                        </ListItem>
                      ))}
                    </Box>
                  );
                }

                return (
                  <ListItem
                    button
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    selected={location.pathname === item.path}
                    sx={{
                      pl: open ? 4 : 2,
                      pr: 2,
                      py: 1,
                      minHeight: 44,
                      borderRadius: open ? '0 8px 8px 0' : '8px',
                      mx: open ? '12px 8px' : '6px',
                      backgroundColor: location.pathname === item.path ? `${sectionColor}20` : 'transparent',
                      borderLeft: location.pathname === item.path ? `3px solid ${sectionColor}` : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: `${sectionColor}15`,
                      },
                      justifyContent: open ? 'initial' : 'center',
                    }}
                  >
                    <ListItemIcon sx={{
                      minWidth: 0,
                      mr: open ? 2 : 0, // Centering fix
                      justifyContent: 'center',
                      color: location.pathname === item.path ? sectionColor : '#94a3b8',
                      fontSize: 18
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.text}
                        sx={{
                          m: 0,
                          '& .MuiListItemText-primary': {
                            fontSize: '0.9rem',
                            color: location.pathname === item.path ? sectionColor : '#475569',
                            fontWeight: location.pathname === item.path ? 600 : 500,
                          }
                        }}
                      />
                    )}
                  </ListItem>
                )
              })}
            </List>
          </Collapse>
        </List>
      </Box>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        [`& .MuiDrawer-paper`]: {
          width: open ? drawerWidth : collapsedWidth,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e1',
            borderRadius: '3px',
            '&:hover': {
              background: '#94a3b8',
            }
          }
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: open ? 2 : 1,
        py: 2,
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white'
      }}>
        {open && (
          <Typography variant="h6" sx={{
            fontWeight: 700,
            color: '#1e293b',
            fontSize: '1rem',
            letterSpacing: '0.5px'
          }}>
            Menu
          </Typography>
        )}
        <IconButton
          onClick={onToggle}
          sx={{
            color: '#64748b',
            ml: open ? 'auto' : 0,
            '&:hover': {
              backgroundColor: '#dbeafe',
              color: '#3b82f6'
            }
          }}
        >
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>

      {/* Navigation Sections */}
      <Box sx={{ py: 2, px: open ? 0 : 1 }}>
        {renderSection("Data Input Master", <SettingsIcon />, filteredDataMasterLinks, 'dataMaster', '#8b5cf6')}
        {renderSection("Stock Movement", <SwapHorizIcon />, filteredStockMovementLinks, 'stockMovement', '#06b6d4')}
        {renderSection("Purchasing", <ShoppingCartIcon />, filteredPurchasingLinks, 'purchasing', '#f59e0b')}
        {renderSection("Reports", <ReceiptLongIcon />, filteredReportLinks, 'reports', '#3b82f6')}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
