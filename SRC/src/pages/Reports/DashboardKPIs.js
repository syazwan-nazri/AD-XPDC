import React, { useState, useEffect } from "react";
import { Box, Typography, TextField } from "@mui/material";

const DashboardKPIs = () => {
  const [lastRefresh, setLastRefresh] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const formatDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const formattedHours = String(displayHours).padStart(2, "0");
      
      return `${year}-${month}-${day}  ${formattedHours}:${minutes} ${ampm}`;
    };

    setLastRefresh(formatDateTime());
  }, []);

  return (
    <Box>
      <Box
        sx={{
          backgroundColor: "primary.main",
          color: "white",
          p: 2,
          mb: 1,
          ml: -17,
          mr: -1,
          borderRadius: 1,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: "bold",
            color: "white",
            mb: 2,
          }}
        >
          DASHBOARD
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <TextField
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              maxWidth: 400,
              backgroundColor: "white",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
              },
            }}
          />
          <Typography
            variant="body1"
            sx={{
              color: "white",
            }}
          >
            Last Data Refresh: {lastRefresh}
          </Typography>
        </Box>
      </Box>
      {/* headers merged into their respective grey cards below */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          ml: -17,
          mr: -1,
        }}
      >
        <Box
          sx={{
            backgroundColor: "grey.300",
            p: 3,
            borderRadius: 1,
            minHeight: 400,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              p: 1,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "white",
              }}
            >
              HEADER METRICS
            </Typography>
          </Box>

          

          <Box
            sx={{
              flex: 1,
              mt: 0,
              minHeight: 0,
            }}
          >
            {/* Dashboard content box 1 */}
          </Box>
        </Box>
        <Box
          sx={{
            backgroundColor: "grey.300",
            p: 2,
            borderRadius: 1,
            minHeight: 400,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              p: 1,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "white",
              }}
            >
              QUICK ACTIONS
            </Typography>
          </Box>

          

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                backgroundColor: "white",
                p: 2,
                borderRadius: 1,
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Dashboard content box 2a */}
            </Box>

            <Box
              sx={{
                backgroundColor: "white",
                p: 2,
                borderRadius: 1,
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Dashboard content box 2b (was N/A) */}
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            backgroundColor: "grey.300",
            p: 3,
            borderRadius: 1,
            minHeight: 400,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              p: 1,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "white",
              }}
            >
              CRITICAL ALERT PANEL
            </Typography>
          </Box>

          

          <Box
            sx={{
              flex: 1,
              mt: 0,
              minHeight: 0,
            }}
          >
            {/* Dashboard content box 3 */}
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          backgroundColor: "grey.300",
          p: 3,
          borderRadius: 1,
          minHeight: 400,
          ml: -17,
          mr: -1,
          mt: 2,
        }}
      >
        {/* Dashboard content - big box */}
      </Box>
      <Box
        sx={{
          backgroundColor: "grey.300",
          p: 3,
          borderRadius: 1,
          minHeight: 400,
          ml: -17,
          mr: -1,
          mt: 2,
        }}
      >
        {/* Dashboard content - big box 2 */}
      </Box>
    </Box>
  );
};

export default DashboardKPIs;
