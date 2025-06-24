import { BrowserRouter, Routes, Route } from "react-router-dom";
import Monitor from "./components/Monitor";
import AdminPanel from "./components/AdminPanel";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Monitor />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
