import React, { useState } from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import GroupIcon from '@mui/icons-material/Group';
import StorageIcon from '@mui/icons-material/Storage';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import WarningIcon from '@mui/icons-material/Warning';
import Box from '@mui/material/Box';
import { NavLink, useLocation } from 'react-router-dom';
import Collapse from '@mui/material/Collapse';
import { useSelector } from 'react-redux';
import { getRoleByGroupId, hasPermission } from '../utils/roles';

const drawerWidth = 280;
const collapsedWidth = 80;

// Define links with their required permission key
const dataInputMasterLinks = [
  { path: '/admin/user-master', text: 'User Master', icon: <PeopleIcon />, permission: 'canAccessUserManagement' },
  { path: '/admin/user-group-master', text: 'User Group Master', icon: <GroupIcon />, permission: 'canAccessUserManagement' },
  { path: '/admin/part-master', text: 'Part Master', icon: <Inventory2Icon />, permission: 'canAccessPartMaster' },
  { path: '/admin/part-group-master', text: 'Part Group Master', icon: <GroupIcon />, permission: 'canAccessPartGroupMaster' },
  { 
    text: 'Storage Master', 
    icon: <StorageIcon />, 
    permission: 'canAccessStorageLocations',
    subItems: [
      { path: '/admin/bin-master', text: 'Storage Master', icon: <StorageIcon />, permission: 'canAccessStorageLocations' },
      { path: '/admin/storage-locations', text: 'Storage Locations', icon: <StorageIcon />, permission: 'canAccessStorageLocations' },
    ]
  },
  { path: '/admin/supplier-master', text: 'Supplier Master', icon: <GroupIcon />, permission: 'canAccessSupplierManagement' },
  { path: '/admin/machine-master', text: 'Machine Master', icon: <BuildIcon />, permission: 'canAccessAssetRegistry' },
];

const stockMovementLinks = [
  { path: '/inventory/stock-in', text: 'Stock In', icon: <MoveToInboxIcon />, permission: 'canAccessInventory' },
  { path: '/inventory/stock-out', text: 'Stock Out', icon: <OutboxIcon />, permission: 'canAccessInventory' },
  { path: '/inventory/internal-transfer', text: 'Internal Transfer', icon: <SwapHorizIcon />, permission: 'canAccessInventory' },
  { path: '/inventory/movement-logs', text: 'Movement Logs', icon: <HistoryIcon />, permission: 'canAccessInventory' },
  { path: '/inventory/stock-take', text: 'Stock Take', icon: <Inventory2Icon />, permission: 'canAccessStockTake' },
  { path: '/inventory/mrf', text: 'MRF', icon: <ReceiptLongIcon />, permission: 'canAccessMRF' },
];

const purchasingLinks = [
  { path: '/procurement/purchase-requisition', text: 'Purchase Requisition', icon: <ShoppingCartIcon />, permission: 'canAccessProcurement' },
];

const reportLinks = [
  { path: '/reports/dashboard-kpis', text: 'Dashboard', icon: <DashboardIcon />, permission: 'canAccessReports' },
  { path: '/reports/stock-inquiry', text: 'Stock Inquiry', icon: <Inventory2Icon />, permission: 'canAccessReports' },
  { path: '/reports/stock-valuation', text: 'Stock Valuation', icon: <ReceiptLongIcon />, permission: 'canAccessStockValuation' },
  { path: '/reports/stock-movement', text: 'Movement History', icon: <SwapHorizIcon />, permission: 'canAccessReports' },
  { path: '/reports/low-stock', text: 'Low Stock Alert', icon: <WarningIcon />, permission: 'canAccessReports' },
];

const Sidebar = ({ open, onToggle }) => {
  const location = useLocation();
  const [dataMasterOpen, setDataMasterOpen] = useState(true);
  const [stockMovementOpen, setStockMovementOpen] = useState(true);
  const [purchasingOpen, setPurchasingOpen] = useState(true);

  const toggleDataMaster = () => setDataMasterOpen((prev) => !prev);
  const toggleStockMovement = () => setStockMovementOpen((prev) => !prev);
  const togglePurchasing = () => setPurchasingOpen((prev) => !prev);

  const user = useSelector((state) => state.auth.user);
  const userRole = user ? getRoleByGroupId(user.groupId) : null;

  // Filter links
  const filterLinks = (links) => links.filter(link =>
    !link.permission || (userRole && hasPermission(userRole, link.permission))
  );

  const filteredDataMasterLinks = filterLinks(dataInputMasterLinks);
  const filteredStockMovementLinks = filterLinks(stockMovementLinks);
  const filteredPurchasingLinks = filterLinks(purchasingLinks);
  const filteredReportLinks = filterLinks(reportLinks);

  if (!user) return null;

  const renderSection = (title, icon, links, isOpen, toggleOpen, sectionColor) => {
    if (links.length === 0) return null;
    return (
      <Box sx={{ mb: 1 }}>
        <List>
          <ListItem 
            button 
            onClick={toggleOpen} 
            sx={{ 
              justifyContent: open ? 'initial' : 'center', 
              px: open ? 2.5 : 1,
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
              mr: open ? 2.5 : 'auto', 
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
                            pl: open ? 5.5 : 2,
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
                            mr: open ? 2 : 'auto', 
                            justifyContent: 'center',
                            color: location.pathname === subItem.path ? sectionColor : '#94a3b8',
                            fontSize: 18
                          }}>
                            {subItem.icon}
                          </ListItemIcon>
                          {open && (
                            <ListItemText 
                              primary={subItem.text}
                              sx={{
                                m: 0,
                                '& .MuiListItemText-primary': {
                                  fontSize: '0.9rem',
                                  color: location.pathname === subItem.path ? sectionColor : '#475569',
                                  fontWeight: location.pathname === subItem.path ? 600 : 500,
                                }
                              }}
                            />
                          )}
                        </ListItem>
                      ))}
                    </Box>
                  );
                }
                // Regular menu item
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
                      mr: open ? 2 : 'auto', 
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
                );
              })}
            </List>
          </Collapse>
        </List>
      </Box>
    );
  };

  return (
    <Drawer
      variant="persistent"
      open={open}
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
        {renderSection("Data Input Master", <SettingsIcon />, filteredDataMasterLinks, dataMasterOpen, toggleDataMaster, '#8b5cf6')}
        {renderSection("Stock Movement", <SwapHorizIcon />, filteredStockMovementLinks, stockMovementOpen, toggleStockMovement, '#06b6d4')}
        {renderSection("Purchasing", <ShoppingCartIcon />, filteredPurchasingLinks, purchasingOpen, togglePurchasing, '#f59e0b')}

        {/* Reports section */}
        {filteredReportLinks.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <List>
              {open && (
                <Typography variant="subtitle2" sx={{ 
                  px: 3, 
                  pt: 2, 
                  pb: 1, 
                  color: '#3b82f6',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  Reports
                </Typography>
              )}
              {filteredReportLinks.map((item) => (
                <ListItem
                  key={item.path}
                  button
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
                    backgroundColor: location.pathname === item.path ? '#dbeafe' : 'transparent',
                    borderLeft: location.pathname === item.path ? '3px solid #3b82f6' : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#dbeafe',
                    },
                    justifyContent: open ? 'initial' : 'center',
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 0, 
                    mr: open ? 2 : 'auto', 
                    justifyContent: 'center',
                    color: location.pathname === item.path ? '#3b82f6' : '#94a3b8',
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
                          color: location.pathname === item.path ? '#3b82f6' : '#475569',
                          fontWeight: location.pathname === item.path ? 600 : 500,
                        }
                      }}
                    />
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
