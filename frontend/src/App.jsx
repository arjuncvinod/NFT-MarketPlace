import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/NavBar";
import Home from "./components/Home";
import NFTGallery from "./components/NFTGallery";
import NFTUploader from "./components/NFTUploader";

function App() {
  return (
    <Router>
    <Toaster position="bottom-center" reverseOrder={false} />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<NFTGallery />} />
        <Route path="/upload" element={<NFTUploader />} />
      </Routes>
    </Router>
  );
}

export default App;
