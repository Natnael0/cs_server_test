import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Category from "./pages/Category";
import Build from "./pages/Build";
import PartDetail from "./pages/PartDetail";
import Quiz from "./quiz/Quiz";
import { BuildProvider } from "./context/BuildContext";
import "./index.css";

export default function App() {
  return (
    <BuildProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          {/* explicit paths for each category (excluding tower/mouse/keyboard/monitor) */}
          <Route path="/cpu" element={<Category />} />
          <Route path="/cpu/:partId" element={<PartDetail />} />
          <Route path="/motherboards" element={<Category />} />
          <Route path="/motherboards/:partId" element={<PartDetail />} />
          <Route path="/gpu" element={<Category />} />
          <Route path="/gpu/:partId" element={<PartDetail />} />
          <Route path="/memory" element={<Category />} />
          <Route path="/memory/:partId" element={<PartDetail />} />
          <Route path="/storage" element={<Category />} />
          <Route path="/storage/:partId" element={<PartDetail />} />
          <Route path="/psu" element={<Category />} />
          <Route path="/psu/:partId" element={<PartDetail />} />
          <Route path="/coolers" element={<Category />} />
          <Route path="/coolers/:partId" element={<PartDetail />} />
          <Route path="/case" element={<Category />} />
          <Route path="/case/:partId" element={<PartDetail />} />
          <Route path="/monitor" element={<Category />} />
          <Route path="/monitor/:partId" element={<PartDetail />} />
          <Route path="/os" element={<Category />} />
          <Route path="/os/:partId" element={<PartDetail />} />
          <Route path="/build" element={<Build />} />
        </Routes>
      </BrowserRouter>
    </BuildProvider>
  );
}
