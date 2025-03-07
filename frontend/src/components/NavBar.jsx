import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <AppBar 
      position="static" 
      sx={{ background: "linear-gradient(90deg, #6a11cb, #2575fc)" }} // Gradient background
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
          NFT Marketplace
        </Typography>
        <div>
          <Button component={Link} to="/" sx={{ color: "white", marginRight: 2 }}>
           Home
          </Button>
          <Button component={Link} to="/gallery" sx={{ color: "white", marginRight: 2 }}>
            NFT Gallery
          </Button>
          <Button component={Link} to="/profile" sx={{ color: "white", marginRight: 2 }}>
           My Profile
          </Button>
          <Button component={Link} to="/upload" sx={{ color: "white" }}>
            Upload NFT
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
