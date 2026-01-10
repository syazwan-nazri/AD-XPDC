import React, { useMemo, useState, useEffect } from "react";
// Redux & MUI
import { Provider, useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import CircularProgress from "@mui/material/CircularProgress";

// Components
import store from "./redux/store";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded Pages
const ForgotPassword = React.lazy(() => import("./pages/Auth/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/Auth/ResetPassword"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const PartMaster = React.lazy(() => import("./pages/Admin/PartMaster"));
const PartGroupMaster = React.lazy(() => import("./pages/Admin/PartGroupMaster"));
const WarehouseMaster = React.lazy(() => import("./pages/Admin/WarehouseMaster"));
const WarehouseLocations = React.lazy(() => import("./pages/Admin/WarehouseLocations"));
const Login = React.lazy(() => import("./pages/Auth/Login"));
const UserManagement = React.lazy(() => import("./pages/Admin/UserManagement"));
const UserGroupMaster = React.lazy(() => import("./pages/Admin/UserGroupMaster"));
const DepartmentMaster = React.lazy(() => import("./pages/Admin/DepartmentMaster"));
const DashboardKPIs = React.lazy(() => import("./pages/Reports/DashboardKPIs"));
const SupplierMaster = React.lazy(() => import("./pages/Admin/SupplierMaster"));
const MachineMaster = React.lazy(() => import("./pages/Admin/MachineMaster"));
const StockIn = React.lazy(() => import("./pages/Inventory/StockIn"));
const StockOut = React.lazy(() => import("./pages/Inventory/StockOut"));
const InternalTransfer = React.lazy(() => import("./pages/Inventory/InternalTransfer"));
const MovementLog = React.lazy(() => import("./pages/Inventory/MovementLog"));
const MRF = React.lazy(() => import("./pages/Inventory/MRF"));
const StockTake = React.lazy(() => import("./pages/Inventory/StockTake"));
const StockTakeProcess = React.lazy(() => import("./pages/Inventory/StockTakeProcess"));
const PurchaseRequisition = React.lazy(() => import("./pages/Procurement/PurchaseRequisition"));
const StockInquiryReport = React.lazy(() => import("./pages/Reports/StockInquiryReport"));
const StockValuationReport = React.lazy(() => import("./pages/Reports/StockValuationReport"));
const MovementHistory = React.lazy(() => import("./pages/Reports/MovementHistory"));
const LowStockReport = React.lazy(() => import("./pages/Reports/LowStockReport"));
const ChangePassword = React.lazy(() => import("./pages/Auth/ChangePassword"));

// Firebase & Utils
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { setUser, logout } from "./redux/authSlice";
import { syncUserData, getUserDocByUid } from "./utils/userManagement";

const drawerWidth = 280;
const collapsedWidth = 80;

function AuthGuard({ authReady, children }) {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady) return; // do nothing until auth state is checked

    // 1. Not logged in -> Redirect to login
    if (
      !user &&
      location.pathname !== "/login" &&
      location.pathname !== "/forgot-password" &&
      location.pathname !== "/reset-password"
    ) {
      navigate("/login");
      return;
    }

    // 2. Logged in but MUST change password -> Redirect to change-password
    if (user && user.mustChangePassword && location.pathname !== "/change-password") {
      navigate("/change-password");
      return;
    }

    // 3. Logged in and on auth pages -> Redirect to home (or change-password if needed)
    if (
      user &&
      (location.pathname === "/login" ||
        location.pathname === "/forgot-password" ||
        location.pathname === "/reset-password")
    ) {
      if (user.mustChangePassword) {
        navigate("/change-password");
      } else {
        navigate("/reports/dashboard-kpis");
      }
    }
  }, [user, location.pathname, navigate, authReady]);
  return children;
}

function AppShell({ toggleTheme }) {
  const theme = useTheme();

  // Initialize user groups and sync data




  const location = useLocation();
  // Sidebar open/collapse (start CLOSED!)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Use 'md' (900px) as breakpoint for mobile/tablet behavior
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarTempOpen, setSidebarTempOpen] = useState(false);

  // Redux auth
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [authReady, setAuthReady] = useState(false);

  // Effect: After login, close the sidebar by default
  useEffect(() => {
    if (user) {
      setSidebarOpen(false);
      setSidebarTempOpen(false);
    }
  }, [user]);

  // Listen to Firebase Auth state & set authReady
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Sync user data whenever they log in
          await syncUserData(firebaseUser);

          // Fetch user document to get groupId and other user data
          const userDoc = await getUserDocByUid(firebaseUser.uid);
          const userData = userDoc.exists() ? userDoc.data() : {};

          // Fetch Group Permissions dynamically
          let groupPermissions = {};
          if (userData.groupId) {
            try {
              const groupRef = doc(db, 'groups', userData.groupId);
              const groupSnap = await getDoc(groupRef);
              if (groupSnap.exists()) {
                groupPermissions = groupSnap.data().permissions || {};
              }
            } catch (err) {
              console.error("Error fetching group permissions:", err);
            }
          }

          dispatch(
            setUser({
              email: firebaseUser.email,
              uid: firebaseUser.uid,
              groupId: userData.groupId || null,
              username: userData.username || null,
              department: userData.department || null,
              mustChangePassword: userData.mustChangePassword || false,
              groupPermissions: groupPermissions, // Store dynamic permissions
            })
          );
        } else {

          dispatch(logout());
        }
      } catch (error) {
        console.error("Error during auth state change:", error);
        dispatch(logout());
      } finally {
        setAuthReady(true);
      }
    });
    return unsub;
  }, [dispatch]);

  // Sidebar logic
  const handleSidebarMenu = () =>
    isMobile ? setSidebarTempOpen((v) => !v) : setSidebarOpen((v) => !v);
  const handleSidebarClose = () => setSidebarTempOpen(false);
  const sideBarActualOpen = isMobile ? sidebarTempOpen : sidebarOpen;

  // Logout logic
  const onLogout = async () => {
    await signOut(auth);
    dispatch(logout());
  };

  // For AppBar flex with sidebar: add marginLeft like content area
  const getMarginLeft = () => {
    if (!user || isMobile) return 0;
    return sidebarOpen ? `${drawerWidth}px` : `${collapsedWidth}px`;
  };

  // Render loader while determining auth
  if (!authReady) {
    return (
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor={theme.palette.background.default}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthGuard authReady={authReady}>
      <Box sx={{ display: "flex" }}>
        <Box
          sx={{
            width: "100%",
            zIndex: theme.zIndex.drawer + 1,
            position: "fixed",
            top: 0,
            left: 0,
            marginLeft: getMarginLeft(),
            transition: "margin 0.2s",
          }}
        >
          <Navbar
            theme={theme}
            toggleTheme={toggleTheme}
            user={user}
            onLogout={onLogout}
            onMenuClick={handleSidebarMenu}
          />
        </Box>
        {/* Sidebar Drawer */}
        {user && (
          <Sidebar
            open={isMobile ? sideBarActualOpen : sidebarOpen}
            onToggle={isMobile ? handleSidebarClose : () => setSidebarOpen((v) => !v)}
            isMobile={isMobile}
          />
        )}
        {/* Main content flexes to sidebar width on desktop */}
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            p: 3,
            transition: "margin 0.2s",
            width: "100%",
            minWidth: 0, // Crucial for flex items to shrink below content size
            minHeight: "100vh",
            background: theme.palette.background.default,
            overflowX: "hidden",
            // Since Sidebar is now variant="permanent" and flexShrink={0}, it takes up space in the flex container.
            // The main content with flexGrow={1} will automatically fill the remaining space.
            // No manual marginLeft is needed.
          })}
        >
          {/* Offset for fixed AppBar */}
          <Box sx={{ minHeight: 64 }} />

          <React.Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
              <CircularProgress />
            </Box>
          }>
            <Routes>
              <Route path="/" element={<Navigate to="/reports/dashboard-kpis" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Reports */}
              <Route element={<ProtectedRoute resourceId="dashboard" />}>
                <Route path="/reports/dashboard-kpis" element={<DashboardKPIs />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="stock_inquiry" />}>
                <Route path="/reports/stock-inquiry" element={<StockInquiryReport />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="movement_history" />}>
                <Route path="/reports/stock-movement" element={<MovementHistory />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="low_stock" />}>
                <Route path="/reports/low-stock" element={<LowStockReport />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="stock_valuation" />}>
                <Route path="/reports/stock-valuation" element={<StockValuationReport />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route path="/change-password" element={<ChangePassword />} />
              </Route>

              {/* Admin Modules */}
              <Route element={<ProtectedRoute resourceId="user_master" />}>
                <Route path="/admin/user-master" element={<UserManagement />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="user_group_master" />}>
                <Route path="/admin/user-group-master" element={<UserGroupMaster />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="department_master" />}>
                <Route path="/admin/department-master" element={<DepartmentMaster />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="supplier_master" />}>
                <Route path="/admin/supplier-master" element={<SupplierMaster />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="part_master" />}>
                <Route path="/admin/part-master" element={<PartMaster />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="part_group_master" />}>
                <Route path="/admin/part-group-master" element={<PartGroupMaster />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="warehouse_master" />}>
                <Route path="/admin/warehouse-master" element={<WarehouseMaster />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="warehouse_locations" />}>
                <Route path="/admin/warehouse-locations" element={<WarehouseLocations />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="machine_master" />}>
                <Route path="/admin/machine-master" element={<MachineMaster />} />
              </Route>

              {/* Inventory Modules */}
              <Route element={<ProtectedRoute resourceId="stock_in" />}>
                <Route path="/inventory/stock-in" element={<StockIn />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="stock_out" />}>
                <Route path="/inventory/stock-out" element={<StockOut />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="internal_transfer" />}>
                <Route path="/inventory/internal-transfer" element={<InternalTransfer />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="movement_logs" />}>
                <Route path="/inventory/movement-logs" element={<MovementLog />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="mrf" />}>
                <Route path="/inventory/mrf" element={<MRF />} />
              </Route>
              <Route element={<ProtectedRoute resourceId="stock_take" />}>
                <Route path="/inventory/stock-take" element={<StockTake />} />
                <Route path="/inventory/stock-take/process" element={<StockTakeProcess />} />
              </Route>

              {/* Procurement */}
              <Route element={<ProtectedRoute resourceId="purchase_requisition" />}>
                <Route path="/procurement/purchase-requisition" element={<PurchaseRequisition />} />
              </Route>

              {/* Other role-protected routes here */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Suspense>
        </Box>
      </Box>
    </AuthGuard >
  );
}

function AppWrapper() {
  const [mode, setMode] = useState("light");
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppShell toggleTheme={() => setMode((m) => (m === "light" ? "dark" : "light"))} />
      </Router>
    </ThemeProvider>
  );
}

const App = () => (
  <Provider store={store}>
    <AppWrapper />
  </Provider>
);

export default App;
