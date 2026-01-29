import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import ImportPage from './components/ImportPage';
import DatabasePage from './components/DatabasePage';
import PlayerDetail from './components/PlayerDetail';
import PalmaresPage from './components/PalmaresPage';
import AdminLayout from './components/admin/AdminLayout';
import './App.css';

function App() {
    return (
        <Router>
            <div className="app">
                <nav className="nav">
                    <div className="nav-content">
                        <div className="nav-title">⚽ Football Player Database</div>
                        <NavLink to="/import" className="nav-link">
                            Import Players
                        </NavLink>
                        <NavLink to="/database" className="nav-link">
                            Database
                        </NavLink>
                        <NavLink to="/palmares" className="nav-link">
                            Palmares
                        </NavLink>
                        <NavLink to="/admin" className="nav-link">
                            Administration
                        </NavLink>
                    </div>
                </nav>

                <Routes>
                    <Route path="/" element={<DatabasePage />} />
                    <Route path="/import" element={<ImportPage />} />
                    <Route path="/database" element={<DatabasePage />} />
                    <Route path="/palmares" element={<PalmaresPage />} />
                    <Route path="/player/:id" element={<PlayerDetail />} />
                    <Route path="/admin/*" element={<AdminLayout />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
