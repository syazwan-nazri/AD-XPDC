import React from "react";
import { Box, Typography } from "@mui/material";

const DashboardKPIs = () => {
  return (
    <Box>
      <Box
        sx={{
          backgroundColor: "primary.main",
          color: "white",
          p: 2,
          mb: 3,
          borderRadius: 1,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: "bold",
            textAlign: "left",
            color: "white",
          }}
        >
          ENGINEERING STORES INVENTORY MANAGER
        </Typography>
      </Box>
      <div>Dashboard KPIs (Stub)</div>
    </Box>
  );
};

export default DashboardKPIs;
